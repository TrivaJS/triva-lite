import Fastify from "fastify";
import { createMiddleware, log } from "triva";

const app = Fastify();

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
 * Fastify → Express-style Adapter
 * -------------------------------------------------- */
/**
 * Triva expects (req, res, next)
 * Fastify exposes (request, reply)
 * We adapt once, cleanly.
 */
app.addHook("onRequest", async (request, reply) => {
  await new Promise((resolve, reject) => {
    triva(request.raw, reply.raw, err =>
      err ? reject(err) : resolve()
    );
  });
});

/* --------------------------------------------------
 * Routes — Normal Traffic (Generates Logs)
 * -------------------------------------------------- */

app.get("/", async () => {
  return {
    message: "Fastify + Triva running",
    routes: [
      "/api/public",
      "/api/admin",
      "/logs",
      "/logs/:id",
      "/logs/filter/bots",
      "/logs/delete/:id",
      "/logs/clear"
    ]
  };
});

app.get("/api/public", async () => {
  return {
    ok: true,
    endpoint: "public"
  };
});

app.get("/api/admin", async () => {
  return {
    ok: true,
    endpoint: "admin"
  };
});

/* --------------------------------------------------
 * LOG RETRIEVAL
 * -------------------------------------------------- */

/**
 * GET ALL LOGS
 */
app.get("/logs", async () => {
  const logs = await log.get("all");
  return {
    count: logs.length,
    logs
  };
});

/**
 * GET LOG BY ID
 */
app.get("/logs/:id", async (request, reply) => {
  const entry = await log.get(request.params.id);

  if (!entry) {
    reply.code(404);
    return { error: "Log not found" };
  }

  return entry;
});

/* --------------------------------------------------
 * FILTERED LOG EXAMPLES
 * -------------------------------------------------- */

/**
 * All non-bot traffic
 */
app.get("/logs/filter/humans", async () => {
  return await log.get.filter({
    bot: false
  });
});

/**
 * All bots
 */
app.get("/logs/filter/bots", async () => {
  return await log.get.filter({
    bot: true
  });
});

/**
 * Chrome on Windows only
 */
app.get("/logs/filter/chrome-windows", async () => {
  return await log.get.filter({
    browser: { name: "Chrome" },
    os: { name: "Windows" }
  });
});

/**
 * AI crawlers only
 */
app.get("/logs/filter/ai", async () => {
  return await log.get.filter({
    aiCrawler: true
  });
});

/* --------------------------------------------------
 * LOG DELETION
 * -------------------------------------------------- */

/**
 * DELETE SINGLE LOG
 */
app.delete("/logs/delete/:id", async (request, reply) => {
  const ok = await log.delete(request.params.id);

  if (!ok) {
    reply.code(404);
    return { deleted: false };
  }

  return { deleted: true };
});

/**
 * CLEAR ALL LOGS
 */
app.delete("/logs/clear", async () => {
  await log.clear();
  return { cleared: true };
});

/* --------------------------------------------------
 * Server
 * -------------------------------------------------- */

app.listen({ port: 3000 }, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log("🚀 Fastify server running at http://localhost:3000");
});
