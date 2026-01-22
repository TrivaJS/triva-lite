/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

const crypto = require("crypto");
const { readFile, writeFile } = require("./triva.d.file");
const { encrypt, decrypt } = require("./triva.d.crypto");
const { encryptMasterKey, decryptMasterKey } = require("./triva.d.masterkey");
const {
  getByPath,
  setByPath,
  deleteByPath
} = require("./triva.d.path");

class SecureStore {
  constructor(options = {}) {
    this.file = options.file || "./triva.db";

    this.data = {};
    this.masterKey = null;

    this._dirty = false;
    this._writeTimer = null;
    this._writeInProgress = false;

    this.ready = this._init();
  }

  /* -----------------------------
     INIT
  ------------------------------ */

  async _init() {
    const existing = await readFile(this.file);

    if (!existing) {
      this.masterKey = crypto.randomBytes(32);
      await this._flush(true);
      return;
    }

    const parsed = JSON.parse(existing);
    this.masterKey = decryptMasterKey(parsed._meta.key);
    this.data = JSON.parse(decrypt(parsed.payload, this.masterKey));
  }

  /* -----------------------------
     WRITE-BEHIND ENGINE
  ------------------------------ */

  _scheduleFlush() {
    this._dirty = true;

    if (this._writeTimer) return;

    this._writeTimer = setTimeout(() => {
      this._writeTimer = null;
      this._flush();
    }, 50);
  }

  async _flush(force = false) {
    if (this._writeInProgress) return;
    if (!this._dirty && !force) return;

    this._writeInProgress = true;
    this._dirty = false;

    const payload = encrypt(
      JSON.stringify(this.data),
      this.masterKey
    );

    await writeFile(
      this.file,
      JSON.stringify({
        _meta: { key: encryptMasterKey(this.masterKey) },
        payload
      })
    );

    this._writeInProgress = false;
  }

  /* -----------------------------
     PUBLIC API (PATH-FIRST)
  ------------------------------ */

  async get(path) {
    await this.ready;
    return getByPath(this.data, path);
  }

  async has(path) {
    await this.ready;
    return getByPath(this.data, path) !== undefined;
  }

  async set(path, value) {
    await this.ready;
    setByPath(this.data, path, value);
    this._scheduleFlush();
    return value;
  }

  async delete(path) {
    await this.ready;
    const existed = deleteByPath(this.data, path);
    if (existed) this._scheduleFlush();
    return existed;
  }

  async add(path, amount) {
    await this.ready;

    const current = getByPath(this.data, path);
    const next = (typeof current === "number" ? current : 0) + amount;

    setByPath(this.data, path, next);
    this._scheduleFlush();
    return next;
  }

  async subtract(path, amount) {
    return this.add(path, -amount);
  }

  async push(path, value) {
    await this.ready;

    const current = getByPath(this.data, path);
    const next = Array.isArray(current) ? current : [];

    next.push(value);
    setByPath(this.data, path, next);

    this._scheduleFlush();
    return next;
  }

  /* -----------------------------
     SAFETY
  ------------------------------ */

  async close() {
    await this._flush(true);
  }
}

module.exports = { SecureStore };
