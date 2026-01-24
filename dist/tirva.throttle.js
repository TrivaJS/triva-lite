const crypto = require('crypto');

class Throttle {
  constructor(options = {}) {
    if (!options.limit || !options.window_ms) {
      throw new Error('limit and window_ms are required');
    }

    // Base defaults
    this.baseConfig = {
      limit: options.limit,
      windowMs: options.window_ms,
      burstLimit: options.burst_limit || 20,
      burstWindowMs: options.burst_window_ms || 1000,
      banThreshold: options.ban_threshold || 5,
      banMs: options.ban_ms || 24 * 60 * 60 * 1000,
      violationDecayMs: options.violation_decay_ms || 60 * 60 * 1000,
      uaRotationThreshold: options.ua_rotation_threshold || 5
    };

    // Optional policy resolver
    this.policies =
      typeof options.policies === 'function'
        ? options.policies
        : null;

    this.namespace = options.namespace || 'throttle';
  }

  /* ---------------- Utilities ---------------- */

  _now() {
    return Date.now();
  }

  _hashUA(ua) {
    return crypto.createHash('sha256').update(ua).digest('hex');
  }

  _key(ip, uaHash) {
    return `${this.namespace}:${ip}:${uaHash}`;
  }

  _ipKey(ip) {
    return `${this.namespace}:ip:${ip}`;
  }

  _banKey(ip) {
    return `${this.namespace}:ban:${ip}`;
  }

  _weightFromUA(ua) {
    const l = ua.toLowerCase();

    if (
      l.includes('bot') ||
      l.includes('crawler') ||
      l.includes('spider') ||
      l.includes('scrapy') ||
      l.includes('curl') ||
      l.includes('wget')
    ) return 5;

    if (
      l.includes('openai') ||
      l.includes('gpt') ||
      l.includes('anthropic') ||
      l.includes('claude') ||
      l.includes('ai')
    ) return 10;

    return 1;
  }

  _resolveConfig(context, ip, ua) {
    if (!this.policies) return this.baseConfig;

    const override = this.policies({ ip, ua, context }) || {};
    return { ...this.baseConfig, ...override };
  }

  /* ---------------- Main Check ---------------- */

  async check(ip, ua, context = {}) {
    if (!ip || !ua) {
      return { restricted: true, reason: 'invalid_identity' };
    }

    const now = this._now();
    const uaHash = this._hashUA(ua);

    const config = this._resolveConfig(context, ip, ua);

    const key = this._key(ip, uaHash);
    const ipKey = this._ipKey(ip);
    const banKey = this._banKey(ip);

    /* ---------- Auto-ban ---------- */

    const ban = await db.get(banKey);
    if (ban && ban.banned_until > now) {
      return { restricted: true, reason: 'auto_ban' };
    }

    /* ---------- UA rotation (IP-only fallback) ---------- */

    let ipRecord = await db.get(ipKey);
    if (!ipRecord) ipRecord = { uas: [] };

    if (!ipRecord.uas.includes(uaHash)) {
      ipRecord.uas.push(uaHash);
      if (ipRecord.uas.length > config.uaRotationThreshold) {
        return { restricted: true, reason: 'ua_rotation' };
      }
      await db.set(ipKey, ipRecord);
    }

    /* ---------- Load UA record ---------- */

    let record = await db.get(key);
    if (!record) {
      record = {
        hits: [],
        burst: [],
        violations: 0,
        last_violation: 0
      };
    }

    /* ---------- Violation decay ---------- */

    if (
      record.violations > 0 &&
      now - record.last_violation > config.violationDecayMs
    ) {
      record.violations--;
      record.last_violation = now;
    }

    const baseWeight = this._weightFromUA(ua);
    const weight =
      typeof config.weight_multiplier === 'number'
        ? Math.ceil(baseWeight * config.weight_multiplier)
        : baseWeight;

    /* ---------- Cleanup ---------- */

    record.hits = record.hits.filter(
      ts => ts >= now - config.windowMs
    );

    record.burst = record.burst.filter(
      ts => ts >= now - config.burstWindowMs
    );

    /* ---------- Burst limit ---------- */

    if (record.burst.length + weight > config.burstLimit) {
      await this._violation(record, key, banKey, config);
      return { restricted: true, reason: 'burst_limit' };
    }

    /* ---------- Sliding window ---------- */

    if (record.hits.length + weight > config.limit) {
      await this._violation(record, key, banKey, config);
      return { restricted: true, reason: 'sliding_window' };
    }

    /* ---------- Record hit ---------- */

    for (let i = 0; i < weight; i++) {
      record.hits.push(now);
      record.burst.push(now);
    }

    await db.set(key, record);

    return { restricted: false, reason: 'ok' };
  }

  /* ---------------- Violations ---------------- */

  async _violation(record, key, banKey, config) {
    record.violations++;
    record.last_violation = this._now();

    if (record.violations >= config.banThreshold) {
      await db.set(banKey, {
        banned_until: this._now() + config.banMs
      });
    }

    await db.set(key, record);
  }
}

module.exports = Throttle;
