/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

import crypto from "crypto";  // Node v22+ supports this
import fs from "fs/promises";
import path from "path";
import os from "os";

// File Management
async function readFile(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function writeFile(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

// Crypto
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function encrypt(text, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final()
  ]);

  return Buffer.concat([
    iv,
    cipher.getAuthTag(),
    encrypted
  ]).toString("base64");
}

function decrypt(payload, key) {
  const buffer = Buffer.from(payload, "base64");

  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString("utf8");
}

// Master Key
function getMachineKey() {
  const fingerprint = [
    os.hostname(),
    os.platform(),
    os.arch()
  ].join("|");

  return crypto.scryptSync(fingerprint, "secure-store", 32);
}

function encryptMasterKey(masterKey) {
  const iv = crypto.randomBytes(12);
  const key = getMachineKey();

  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(masterKey),
    cipher.final()
  ]);

  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
}

function decryptMasterKey(payload) {
  const key = getMachineKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

const generateMasterKey = () => crypto.randomBytes(32);

// Path
function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let curr = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof curr[keys[i]] !== "object" || curr[keys[i]] === null) {
      curr[keys[i]] = {};
    }
    curr = curr[keys[i]];
  }

  curr[keys[keys.length - 1]] = value;
}

function deleteByPath(obj, path) {
  const keys = path.split(".");
  let curr = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!curr[keys[i]]) return false;
    curr = curr[keys[i]];
  }

  return delete curr[keys[keys.length - 1]];
}

// Old

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

export { SecureStore };
