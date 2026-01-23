/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */

'use strict';

import { db } from './triva.db.js'
import { build } from './triva.build.js';

class MiddlewareCore {
  constructor(options = {}) {
    this.options = options;
    this.port = options.port || "6850"; // Port Configuration

    // Init Timeout
    this.isInitialized = false;
    this.initPromise = this.initialize();
        
    this.ready = this._init();
  }

  /**
   * Initializes the config
   * 
   * @private
   */

  async _init() {
    try {
      if (await db.get('config.setup_complete')) {
        return;
      } else {
        await build(this.port);
        return;
      }
    } catch {
      await build(this.port);
      return;
    }
  }

  /**
   * @return {boolean} Delays Public API use until configuration
   * @private
   */

  async initialize() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isInitialized = true;
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
