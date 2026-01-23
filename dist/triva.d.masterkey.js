/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

import crypto from "crypto";
import os from "os";

const ALGO = "aes-256-gcm";

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

export {
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey
}