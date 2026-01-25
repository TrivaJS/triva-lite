// log.query.js
import { log } from "./triva.log.js";

/* --------------------------------------------------
 * Internal executor
 * -------------------------------------------------- */

async function run(filters) {
  return log.get.filter(filters);
}

/* --------------------------------------------------
 * Traffic type
 * -------------------------------------------------- */

async function bots() {
  return run({ bot: true });
}

async function humans() {
  return run({ bot: false });
}

async function aiAgents() {
  return run({ aiBot: true });
}

async function aiCrawlers() {
  return run({ aiCrawler: true });
}

/* --------------------------------------------------
 * Platform
 * -------------------------------------------------- */

async function byBrowser(name, options = {}) {
  return run({
    browser: { name, ...options }
  });
}

async function byOS(name, options = {}) {
  return run({
    os: { name, ...options }
  });
}

async function byCPU(architecture) {
  return run({ cpu: architecture });
}

async function byDevice(type) {
  return run({ device: type });
}

/* --------------------------------------------------
 * Request
 * -------------------------------------------------- */

async function byMethod(method) {
  return run({
    request: { method }
  });
}

async function byURL(url) {
  return run({
    request: { url }
  });
}

/* --------------------------------------------------
 * Composite queries
 * -------------------------------------------------- */

async function desktopHumans() {
  return run({
    device: "desktop",
    bot: false
  });
}

async function chromeOnWindows() {
  return run({
    browser: { name: "Chrome" },
    os: { name: "Windows" }
  });
}

/* --------------------------------------------------
 * Post-filter helpers (sync)
 * -------------------------------------------------- */

function since(timestamp, logs) {
  return logs.filter(l => l.timestamp >= timestamp);
}

function between(start, end, logs) {
  return logs.filter(
    l => l.timestamp >= start && l.timestamp <= end
  );
}

function last(ms, logs) {
  return since(Date.now() - ms, logs);
}

/* --------------------------------------------------
 * Sorting / aggregation
 * -------------------------------------------------- */

function sortByTime(logs, direction = "desc") {
  return [...logs].sort((a, b) =>
    direction === "asc"
      ? a.timestamp - b.timestamp
      : b.timestamp - a.timestamp
  );
}

function countBy(key, logs) {
  return logs.reduce((acc, l) => {
    const v = l[key] ?? "unknown";
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

function countByNested(path, logs) {
  return logs.reduce((acc, l) => {
    const v = path.reduce((o, k) => o?.[k], l) ?? "unknown";
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

/* --------------------------------------------------
 * Export as a single object
 * -------------------------------------------------- */

export const query = {
  bots,
  humans,
  aiAgents,
  aiCrawlers,

  byBrowser,
  byOS,
  byCPU,
  byDevice,

  byMethod,
  byURL,

  desktopHumans,
  chromeOnWindows,

  since,
  between,
  last,

  sortByTime,
  countBy,
  countByNested
};
