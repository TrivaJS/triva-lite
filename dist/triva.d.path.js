/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

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

export {
  getByPath,
  setByPath,
  deleteByPath
};
