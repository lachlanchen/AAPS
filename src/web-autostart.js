"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8797;
const DEFAULT_SIMPLE_PORT = 8798;
const MAX_PORT_ATTEMPTS = 50;

function normalizeHost(host) {
  return String(host || process.env.AAPS_WEB_HOST || process.env.AAPS_HOST || process.env.HOST || DEFAULT_HOST).trim() || DEFAULT_HOST;
}

function normalizePort(port) {
  const parsed = Number(port || process.env.AAPS_WEB_PORT || process.env.AAPS_PORT || process.env.PORT || DEFAULT_PORT);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : DEFAULT_PORT;
}

function normalizeUi(ui) {
  return String(ui || process.env.AAPS_STUDIO_UI || "classic").trim().toLowerCase() === "simple" ? "simple" : "classic";
}

function webUrl(host, port) {
  return `http://${host}:${port}`;
}

function pythonRecoveryLines() {
  const lines = [
    "AAPS Studio needs Python 3 to run backend/aaps_codex_server.py.",
    "Install Python 3, then verify one of these commands works: python3 --version, python --version, or py -3 --version.",
    "If Python is installed but not on PATH, set AAPS_PYTHON_BIN to the absolute Python executable path.",
  ];
  if (process.platform === "win32") {
    lines.push("Windows: install Python 3 from python.org or the Microsoft Store; the `py -3` launcher is supported.");
  } else if (process.platform === "darwin") {
    lines.push("macOS: use python.org, Homebrew (`brew install python`), or pyenv, then reinstall/run AAPS from a shell with that Python on PATH.");
  } else {
    lines.push("Linux: install python3 with your distro package manager, for example `sudo apt install python3` on Ubuntu/Debian.");
  }
  return lines;
}

function formatPythonRecovery(error = "") {
  return `${error ? `${error}\n` : ""}${pythonRecoveryLines().join("\n")}`;
}

function splitCommand(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function pythonCandidates(env = process.env) {
  const override = String(env.AAPS_PYTHON_BIN || env.PYTHON || "").trim();
  if (override) {
    const parts = splitCommand(override);
    return [{ command: parts[0], prefixArgs: parts.slice(1), explicit: true, label: override }];
  }
  const candidates = process.platform === "win32" ? ["python3", "python", "py -3"] : ["python3", "python"];
  return candidates.map((item) => {
    const parts = splitCommand(item);
    return { command: parts[0], prefixArgs: parts.slice(1), explicit: false, label: item };
  });
}

function resolvePythonLauncher({ env = process.env, cwd = process.cwd() } = {}) {
  const failures = [];
  for (const candidate of pythonCandidates(env)) {
    if (!candidate.command) continue;
    const result = childProcess.spawnSync(candidate.command, [...candidate.prefixArgs, "--version"], {
      cwd,
      env,
      encoding: "utf8",
      timeout: 2500,
      windowsHide: true,
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    if (!result.error && result.status === 0 && /^Python\s+3\./i.test(output)) {
      return {
        ok: true,
        command: candidate.command,
        prefixArgs: candidate.prefixArgs,
        label: candidate.label,
        version: output,
        explicit: candidate.explicit,
      };
    }
    failures.push(`${candidate.label}: ${result.error ? result.error.message : output || `exit ${result.status}`}`);
    if (candidate.explicit) break;
  }
  return {
    ok: false,
    command: "",
    prefixArgs: [],
    label: "",
    version: "",
    failures,
    error: formatPythonRecovery(`Python 3 was not found for AAPS Studio startup. Tried: ${failures.join("; ") || "(none)"}`),
  };
}

function aapsHome() {
  return path.resolve(process.env.AAPS_HOME || path.join(os.homedir(), ".aaps"));
}

function webPreferencePath() {
  return path.join(aapsHome(), "webapp.json");
}

function startupLogPath() {
  return path.join(aapsHome(), "webapp-startup.log");
}

function readWebAppPreference() {
  try {
    const data = JSON.parse(fs.readFileSync(webPreferencePath(), "utf8"));
    return { autoStart: data.autoStart !== false, path: webPreferencePath() };
  } catch (_error) {
    return { autoStart: true, path: webPreferencePath() };
  }
}

function writeWebAppPreference({ autoStart = true } = {}) {
  const file = webPreferencePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ autoStart: Boolean(autoStart), updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  return readWebAppPreference();
}

function webAutoStartDisabled() {
  if (process.env.AAPS_NO_WEB_AUTO_START === "1" || process.env.AAPS_SKIP_WEB_AUTO_START === "1") return true;
  return readWebAppPreference().autoStart === false;
}

function fetchHealthDetails(host, port, timeoutMs = 450) {
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
          resolve({
            ok: Boolean(res.statusCode === 200 && json.ok && (json.app === "aaps" || json.settings || json.runtime)),
            statusCode: res.statusCode,
            ...json,
          });
        } catch (_error) {
          resolve({ ok: false });
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false });
    });
    req.on("error", () => resolve({ ok: false }));
  });
}

async function fetchHealth(host, port, timeoutMs = 450) {
  return (await fetchHealthDetails(host, port, timeoutMs)).ok;
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

async function waitForHealth(host, port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fetchHealth(host, port, 700)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function listenerPids(port) {
  return new Promise((resolve) => {
    childProcess.execFile("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      resolve(
        String(stdout || "")
          .split(/\s+/)
          .map((value) => Number(value))
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
      );
    });
  });
}

async function waitForPortRelease(host, port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await fetchHealth(host, port, 220)) && (await canListen(host, port))) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

async function stopAapsWebApp({ host = DEFAULT_HOST, preferredPort = DEFAULT_PORT } = {}) {
  const normalizedHost = normalizeHost(host);
  const port = normalizePort(preferredPort);
  const url = webUrl(normalizedHost, port);
  const health = await fetchHealthDetails(normalizedHost, port);

  if (!health.ok) {
    if (await canListen(normalizedHost, port)) return { ok: true, stopped: false, alreadyStopped: true, host: normalizedHost, port, url };
    return { ok: false, stopped: false, host: normalizedHost, port, url, error: `No AAPS Studio health endpoint responded on ${url}.` };
  }

  const pids = new Set();
  if (Number.isInteger(Number(health.pid)) && Number(health.pid) > 0) pids.add(Number(health.pid));
  for (const pid of await listenerPids(port)) pids.add(pid);
  if (pids.size === 0) return { ok: false, stopped: false, host: normalizedHost, port, url, error: `Could not identify AAPS Studio process on ${url}.` };

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (_error) {
      // Already stopped or not owned by this user.
    }
  }
  if (await waitForPortRelease(normalizedHost, port, 3500)) return { ok: true, stopped: true, host: normalizedHost, port, url, pids: [...pids], forced: false };

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch (_error) {
      // Ignore.
    }
  }
  const released = await waitForPortRelease(normalizedHost, port, 2000);
  return released
    ? { ok: true, stopped: true, host: normalizedHost, port, url, pids: [...pids], forced: true }
    : { ok: false, stopped: false, host: normalizedHost, port, url, pids: [...pids], error: `AAPS Studio on ${url} did not stop.` };
}

async function findReusableOrFreeWebPort({ host = DEFAULT_HOST, preferredPort = 0, attempts = MAX_PORT_ATTEMPTS, restart = false, ui = "classic" } = {}) {
  const normalizedHost = normalizeHost(host);
  const desiredUi = normalizeUi(ui);
  const startPort = normalizePort(preferredPort || (desiredUi === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT));
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    if (port >= 65536) break;
    const health = await fetchHealthDetails(normalizedHost, port);
    if (health.ok) {
      if (normalizeUi(health.ui || "classic") !== desiredUi && !restart) continue;
      if (restart) {
        const stopped = await stopAapsWebApp({ host: normalizedHost, preferredPort: port });
        if (!stopped.ok) return { port, host: normalizedHost, url: "", reused: false, available: false, stopped, error: stopped.error };
        return { port, host: normalizedHost, url: webUrl(normalizedHost, port), reused: false, available: true, restarted: true, stopped };
      }
      return { port, host: normalizedHost, url: webUrl(normalizedHost, port), reused: true, available: false, health };
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
  preferredPort = 0,
  ui = "classic",
  mockCodex = false,
  restart = false,
  respectAutoStartDisable = true,
} = {}) {
  if (respectAutoStartDisable && webAutoStartDisabled()) {
    return { ok: false, disabled: true, url: "" };
  }

  const selectedUi = normalizeUi(ui);
  const selectedPort = preferredPort || (selectedUi === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT);
  const candidate = await findReusableOrFreeWebPort({ host, preferredPort: selectedPort, restart, ui: selectedUi });
  if (!candidate.port) {
    return { ok: false, error: candidate.error || `No available AAPS Studio port from ${normalizePort(selectedPort)}.`, url: "" };
  }
  if (candidate.error) return { ok: false, error: candidate.error, url: "" };
  if (candidate.reused) {
    return { ok: true, reused: true, started: false, ...candidate };
  }

  const env = {
    ...process.env,
    AAPS_HOST: candidate.host,
    AAPS_PORT: String(candidate.port),
    AAPS_STUDIO_PROJECT: cwd,
    AAPS_STUDIO_UI: selectedUi,
  };
  if (mockCodex || process.env.AAPS_MOCK_CODEX === "1") env.AAPS_MOCK_CODEX = "1";
  const python = resolvePythonLauncher({ env, cwd });
  if (!python.ok) {
    return {
      ok: false,
      error: python.error,
      url: "",
      host: candidate.host,
      port: candidate.port,
      python,
    };
  }

  const logPath = startupLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  let spawnError = null;
  const child = childProcess.spawn(python.command, [...python.prefixArgs, path.join(packageDir, "backend", "aaps_codex_server.py"), "--host", candidate.host, "--port", String(candidate.port), "--ui", selectedUi], {
    cwd,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env,
  });
  fs.closeSync(logFd);
  child.on("error", (error) => {
    spawnError = error;
  });
  child.unref();

  const healthy = await waitForHealth(candidate.host, candidate.port);
  if (!healthy && spawnError) {
    return { ok: false, error: `Could not start AAPS Studio with ${python.label}: ${spawnError.message}\nStartup log: ${logPath}`, url: "", host: candidate.host, port: candidate.port, python, logPath };
  }
  return healthy
    ? { ok: true, reused: false, started: true, restarted: Boolean(candidate.restarted), stopped: candidate.stopped, pid: child.pid, python, logPath, ...candidate }
    : { ok: false, error: `Started AAPS Studio process ${child.pid} with ${python.label}, but ${candidate.url}/api/health did not become ready. Startup log: ${logPath}`, url: "", host: candidate.host, port: candidate.port, python, logPath };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_SIMPLE_PORT,
  ensureAapsWebApp,
  fetchHealth,
  fetchHealthDetails,
  findReusableOrFreeWebPort,
  formatPythonRecovery,
  readWebAppPreference,
  resolvePythonLauncher,
  stopAapsWebApp,
  webAutoStartDisabled,
  writeWebAppPreference,
};
