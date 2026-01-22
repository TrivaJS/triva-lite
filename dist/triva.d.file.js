/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

const fs = require("fs/promises");
const path = require("path");

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

module.exports = { readFile, writeFile };
