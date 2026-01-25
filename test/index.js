import express from "express";
import { createMiddleware } from "../index.js";

const app = express();

/* ---------------- Triva Middleware ---------------- */

app.use(
  createMiddleware({
    rateLimit: {
      limit: 5,            // 5 requests
      window_ms: 10_000,   // per 10 seconds
      burst_limit: 3,      // fast burst
      burst_window_ms: 1_000,
      ban_threshold: 3,    // auto-ban after 3 violations
      ban_ms: 60_000       // 1 minute ban
    }
  })
);

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
