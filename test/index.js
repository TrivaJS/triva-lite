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

/* ---------------- Test Routes ---------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Request allowed",
    rateLimit: req.triva?.rateLimit
  });
});

app.get("/slow", async (req, res) => {
  await new Promise(r => setTimeout(r, 500));
  res.send("Slow response OK");
});

/* ---------------- Error Handler ---------------- */

app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ error: "internal_error" });
});

/* ---------------- Start Server ---------------- */

app.listen(3000, () => {
  console.log("Express test server running on http://localhost:3000");
});
