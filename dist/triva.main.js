/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

import { log } from "./triva.log.js";
import Throttle from "./triva.throttle.js";

class MiddlewareCore {
  constructor(options = {}) {
    this.options = options;

    // Initialize throttle if enabled
    if (options.throttle) {
      this.throttle = new Throttle(options.throttle);
    }
  }

  async handle(req, res, next) {
    try {
      /* ---------------- Throttle Intercept ---------------- */

      if (this.throttle) {
        const ip =
          req.socket?.remoteAddress ||
          req.connection?.remoteAddress;

        const ua = req.headers['user-agent'];

        const result = await this.throttle.check(ip, ua);

        // Attach snapshot for logging / downstream usage
        req.triva = req.triva || {};
        req.triva.throttle = result;

        if (result.restricted) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'throttled',
              reason: result.reason
            })
          );
          return;
        }
      }

      /* ---------------- Continue Pipeline ---------------- */

      if (typeof next === "function") {
        next();
      }

      // Non-blocking snapshot
      queueMicrotask(() => {
        this.processSnapshot(req, res);
      });

    } catch (err) {
      if (typeof next === "function") {
        return next(err);
      }
      throw err;
    }
  }

  processSnapshot(req, res) {
    this.buildLog(req, res);
  }

  async buildLog(req, res) {
    await log.push(req, res);
  }
}

function createMiddleware(options = {}) {
  const core = new MiddlewareCore(options);

  return function middleware(req, res, next) {
    core.handle(req, res, next);
  };
}

export { createMiddleware };
