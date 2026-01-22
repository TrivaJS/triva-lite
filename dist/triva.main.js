/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

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
    // Placeholder for logging / analytics
    // MUST be fast & non-blocking
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
