"use strict";

const childProcess = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8797;
const MAX_PORT_ATTEMPTS = 50;

function normalizeHost(host) {
  return String(host || process.env.AAPS_WEB_HOST || process.env.AAPS_HOST || process.env.HOST || DEFAULT_HOST).trim() || DEFAULT_HOST;
}

function normalizePort(port) {
  const parsed = Number(port || process.env.AAPS_WEB_PORT || process.env.AAPS_PORT || process.env.PORT || DEFAULT_PORT);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : DEFAULT_PORT;
}

function webUrl(host, port) {
  return `http://${host}:${port}`;
}

function fetchHealth(host, port, timeoutMs = 450) {
  return new Promise((resolve) => {
    const req = http.get(`${webUrl(host, port)}/api/health`, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(body || "{}");
          resolve(Boolean(res.statusCode === 200 && json.ok && (json.app === "aaps" || json.settings || json.runtime)));
        } catch (_error) {
          resolve(false);
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function canListen(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function waitForHealth(host, port, timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fetchHealth(host, port, 350)) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

async function findReusableOrFreeWebPort({ host = DEFAULT_HOST, preferredPort = DEFAULT_PORT, attempts = MAX_PORT_ATTEMPTS } = {}) {
  const normalizedHost = normalizeHost(host);
  const startPort = normalizePort(preferredPort);
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    if (port >= 65536) break;
    if (await fetchHealth(normalizedHost, port)) {
      return { port, host: normalizedHost, url: webUrl(normalizedHost, port), reused: true, available: false };
    }
    if (await canListen(normalizedHost, port)) {
      return { port, host: normalizedHost, url: webUrl(normalizedHost, port), reused: false, available: true };
    }
  }
  return { port: 0, host: normalizedHost, url: "", reused: false, available: false };
}

async function ensureAapsWebApp({
  packageDir = path.resolve(__dirname, ".."),
  cwd = process.cwd(),
  host = DEFAULT_HOST,
  preferredPort = DEFAULT_PORT,
  mockCodex = false,
  respectAutoStartDisable = true,
} = {}) {
  if (respectAutoStartDisable && (process.env.AAPS_NO_WEB_AUTO_START === "1" || process.env.AAPS_SKIP_WEB_AUTO_START === "1")) {
    return { ok: false, disabled: true, url: "" };
  }

  const candidate = await findReusableOrFreeWebPort({ host, preferredPort });
  if (!candidate.port) {
    return { ok: false, error: `No available AAPS Studio port from ${normalizePort(preferredPort)}.`, url: "" };
  }
  if (candidate.reused) {
    return { ok: true, reused: true, started: false, ...candidate };
  }

  const env = {
    ...process.env,
    AAPS_HOST: candidate.host,
    AAPS_PORT: String(candidate.port),
    AAPS_STUDIO_PROJECT: cwd,
  };
  if (mockCodex || process.env.AAPS_MOCK_CODEX === "1") env.AAPS_MOCK_CODEX = "1";

  const child = childProcess.spawn("python3", [path.join(packageDir, "backend", "aaps_codex_server.py"), "--host", candidate.host, "--port", String(candidate.port)], {
    cwd,
    detached: true,
    stdio: "ignore",
    env,
  });
  child.unref();

  const healthy = await waitForHealth(candidate.host, candidate.port);
  return healthy
    ? { ok: true, reused: false, started: true, pid: child.pid, ...candidate }
    : { ok: false, error: `Started AAPS Studio process ${child.pid}, but ${candidate.url}/api/health did not become ready.`, url: "" };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  ensureAapsWebApp,
  fetchHealth,
  findReusableOrFreeWebPort,
};
