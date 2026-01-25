import express from "express";
import { createMiddleware } from "../index.js";

const app = express();

/* ---------------- Triva Middleware ---------------- */

const middleware = new createMiddleware({
  redirectTraffic: true,
  retention: {
    enabled: true,
    maxEntries: 100000
  },
  throttle: {
    limit: 1500,
    window_ms: 24 * 60 * 60 * 1000,
    burst_limit: 25,
    burst_window_ms: 1000
  }
});

app.use(middleware);