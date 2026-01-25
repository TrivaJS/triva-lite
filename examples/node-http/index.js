/**
 * Example: Triva + Native Node.js HTTP Server
 * No frameworks, no dependencies
 */

import http from "node:http";
import { createMiddleware, log } from "triva";

/* --------------------------------------------------
 * Triva Configuration
 * -------------------------------------------------- */

const triva = createMiddleware({
  throttle: {
    limit: 50,
    window_ms: 60_000,
    burst_limit: 10,
    burst_window_ms: 1_000
  },

  retention: {
    enabled: true,
    maxEntries: 5_000
  }
});

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data, null, 2));
}

/* --------------------------------------------------
 * Server
 * -------------------------------------------------- */

const server = http.createServer((req, res) => {
  // Run Triva middleware first
  triva(req, res, async err => {
    if (err) {
      return sendJSON(res, 500, { error: "middleware_error" });
    }

    /* ---------------- Routing ---------------- */

    const { method, url } = req;

    /* Root */
    if (method === "GET" && url === "/") {
      return sendJSON(res, 200, {
        message: "Node.js HTTP + Triva running",
        routes: [
          "/api/public",
          "/api/admin",
          "/logs",
          "/logs/:id",
          "/logs/filter/bots",
          "/logs/delete/:id",
          "/logs/clear"
        ]
      });
    }

    /* Sample API */
    if (method === "GET" && url === "/api/public") {
      return sendJSON(res, 200, {
        ok: true,
        endpoint: "public"
      });
    }

    if (method === "GET" && url === "/api/admin") {
      return sendJSON(res, 200, {
        ok: true,
        endpoint: "admin"
      });
    }

    /* ---------------- Logs ---------------- */

    if (method === "GET" && url === "/logs") {
      const logs = await log.get("all");
      return sendJSON(res, 200, {
        count: logs.length,
        logs
      });
    }

    if (method === "GET" && url.startsWith("/logs/filter/bots")) {
      const logs = await log.get.filter({ bot: true });
      return sendJSON(res, 200, logs);
    }

    if (method === "GET" && url.startsWith("/logs/filter/humans")) {
      const logs = await log.get.filter({ bot: false });
      return sendJSON(res, 200, logs);
    }

    if (method === "GET" && url.startsWith("/logs/")) {
      const id = url.split("/")[2];
      if (!id) return sendJSON(res, 400, { error: "missing_id" });

      const entry = await log.get(id);
      if (!entry) {
        return sendJSON(res, 404, { error: "log_not_found" });
      }

      return sendJSON(res, 200, entry);
    }

    if (method === "DELETE" && url.startsWith("/logs/delete/")) {
      const id = url.split("/")[3];
      if (!id) return sendJSON(res, 400, { error: "missing_id" });

      const deleted = await log.delete(id);
      return sendJSON(res, 200, { deleted });
    }

    if (method === "DELETE" && url === "/logs/clear") {
      await log.clear();
      return sendJSON(res, 200, { cleared: true });
    }

    /* ---------------- Fallback ---------------- */

    sendJSON(res, 404, { error: "not_found" });
  });
});

/* --------------------------------------------------
 * Start Server
 * -------------------------------------------------- */

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 Node.js HTTP server running at http://localhost:${PORT}`);
});
