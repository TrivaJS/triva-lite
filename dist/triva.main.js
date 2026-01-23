/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

import { log } from "./triva.log.js";

class MiddlewareCore {
  constructor(options = {}) {
    this.options = options;
  }

  handle(req, res, next) {

    // Security Review (IP Comp, bot, ai, crawler review)

    if (typeof next === "function") {
      next();
    }

    queueMicrotask(() => {
      this.processSnapshot(req, res);
    });
  }

  processSnapshot(req, res) {
    this.buildLog(req, res)
  }

  async buildLog(req, res) {
    console.log('test')
    await log.push(req, res);
    return;
  }

}

function createMiddleware(options = {}) {
  const core = new MiddlewareCore(options);

  return function middleware(req, res, next) {
    try {
      core.handle(req, res, next);
    } catch (err) {
      if (typeof next === "function") {
        return next(err);
      }
    }
  };
}

export { createMiddleware };
