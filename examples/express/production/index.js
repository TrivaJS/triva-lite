/**
 * Example: Triva + Express
 * Demonstrates full configuration and all log capabilities
 */

import express from "express";
import { createMiddleware, log } from "triva";

const app = express();

/* --------------------------------------------------
 * Triva Middleware Configuration
 * -------------------------------------------------- */

const triva = createMiddleware({
  throttle: {
    limit: 100,
    window_ms: 60_000,
    burst_limit: 20,
    burst_window_ms: 1_000
  },

  retention: {
    enabled: true,
    maxEntries: 10_000
  }
});

/* --------------------------------------------------
 * Middleware
 * -------------------------------------------------- */

// JSON body parsing (not required for logging, just realism)
app.use(express.json());

// Triva middleware (auto-logs requests)
app.use(triva);

/* --------------------------------------------------
 * Routes — Normal Traffic (Generates Logs)
 * -------------------------------------------------- */

app.get("/", (req, res) => {
  res.json({
    message: "Express + Triva running",
    routes: [
      "/api/public",
      "/api/admin",
      "/logs",
      "/logs/:id",
      "/logs/filter/bots",
      "/logs/filter/chrome-windows",
      "/logs/delete/:id",
      "/logs/clear"
    ]
  });
});

app.get("/api/public", (req, res) => {
  res.json({
    ok: true,
    endpoint: "public"
  });
});

app.get("/api/admin", (req, res) => {
  res.json({
    ok: true,
    endpoint: "admin"
  });
});

/* --------------------------------------------------
 * LOG RETRIEVAL
 * -------------------------------------------------- */

/**
 * Retrieve ALL logs
 */
app.get("/logs", async (req, res) => {
  const logs = await log.get("all");
  res.json({
    count: logs.length,
    logs
  });
});

/**
 * Retrieve a SINGLE log by ID
 */
app.get("/logs/:id", async (req, res) => {
  const entry = await log.get(req.params.id);

  if (!entry) {
    return res.status(404).json({ error: "Log not found" });
  }

  res.json(entry);
});

/* --------------------------------------------------
 * FILTERED LOG QUERIES
 * -------------------------------------------------- */

/**
 * Human traffic only
 */
app.get("/logs/filter/humans", async (req, res) => {
  const logs = await log.get.filter({
    bot: false
  });

  res.json(logs);
});

/**
 * All bots
 */
app.get("/logs/filter/bots", async (req, res) => {
  const logs = await log.get.filter({
    bot: true
  });

  res.json(logs);
});

/**
 * Chrome on Windows
 */
app.get("/logs/filter/chrome-windows", async (req, res) => {
  const logs = await log.get.filter({
    browser: { name: "Chrome" },
    os: { name: "Windows" }
  });

  res.json(logs);
});

/**
 * AI crawlers only
 */
app.get("/logs/filter/ai", async (req, res) => {
  const logs = await log.get.filter({
    aiCrawler: true
  });

  res.json(logs);
});

/* --------------------------------------------------
 * LOG DELETION
 * -------------------------------------------------- */

/**
 * Delete a SINGLE log entry
 */
app.delete("/logs/delete/:id", async (req, res) => {
  const deleted = await log.delete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ deleted: false });
  }

  res.json({ deleted: true });
});

/**
 * Clear ALL logs
 * ⚠️ Extreme caution endpoint
 */
app.delete("/logs/clear", async (req, res) => {
  await log.clear();
  res.json({ cleared: true });
});

/* --------------------------------------------------
 * Server
 * -------------------------------------------------- */

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
