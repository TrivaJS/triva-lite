import { db } from "./triva.db.js";
import { parseUA } from "@trivajs/ua-parser";
import { query } from "./triva.log.query.js";

let retentionPolicy = {
  enabled: false,
  maxEntries: 0
};

async function enforceRetention() {
  if (!retentionPolicy.enabled) return;
  if (!retentionPolicy.maxEntries) return;

  const logs = (await db.get("logs")) ?? [];

  if (logs.length <= retentionPolicy.maxEntries) return;

  const excess = logs.length - retentionPolicy.maxEntries;
  const trimmed = logs.slice(excess);

  await db.set("logs", trimmed);
}

export const log = {
  // INTERNAL — CALLED BY MIDDLEWARE
  _setRetention(policy) {
    retentionPolicy = policy;
  },

  // --------------------------------
  // WRITE LOG (IMMUTABLE)
  // --------------------------------
  async push(req) {
    const ua = parseUA(req.headers["user-agent"] || "");

    const lastID = (await db.get("last_logID")) ?? 0;
    const id = lastID + 1;
    await db.set("last_logID", id);

    const logEntry = Object.freeze({
      id: id.toString(),
      timestamp: Date.now(),

      ip: req.socket?.remoteAddress ?? null,

      cpu: ua.cpu?.architecture ?? null,
      device: ua.device?.type ?? "desktop",
      engine: ua.engine?.name ?? null,

      os: {
        name: ua.os?.name ?? null,
        version: ua.os?.version ?? null
      },

      browser: {
        name: ua.browser?.name ?? null,
        version: ua.browser?.version ?? null,
        major: ua.browser?.major ?? null
      },

      bot: ua.isBot ?? false,
      aiBot: ua.isAIBot ?? false,
      aiCrawler: ua.isAICrawler ?? false,

      request: {
        method: req.method,
        url: req.url
      },

      rawUA: req.headers["user-agent"] ?? null
    });

    await db.push("logs", logEntry);
    await enforceRetention();
  },

  // --------------------------------
  // GET LOGS
  // --------------------------------
  get: {
    async all() {
      return (await db.get("logs")) ?? [];
    },

    async byId(id) {
      const logs = (await db.get("logs")) ?? [];
      return logs.find(l => l.id === id) ?? null;
    },

    async filter(filters = {}) {
      const logs = (await db.get("logs")) ?? [];

      return logs.filter(entry => {
        for (const [key, value] of Object.entries(filters)) {
          if (!(key in entry)) continue;

          const stored = entry[key];

          if (typeof stored === "object" && stored !== null) {
            if (
              typeof value === "object" &&
              !Object.entries(value).every(
                ([k, v]) => stored[k] === v
              )
            ) return false;
          } else {
            if (stored !== value) return false;
          }
        }
        return true;
      });
    }
  },

  // --------------------------------
  // DELETE SINGLE LOG
  // --------------------------------
  async delete(id) {
    const logs = (await db.get("logs")) ?? [];
    const filtered = logs.filter(l => l.id !== id);

    if (filtered.length === logs.length) return false;

    await db.set("logs", filtered);
    return true;
  },

  // --------------------------------
  // CLEAR ALL LOGS
  // --------------------------------
  async clear() {
    await db.set("logs", []);
  }
};

// Attach query helpers
log.query = query;
