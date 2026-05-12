"use strict";

const childProcess = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const readline = require("readline");

const DEFAULT_PACKAGE_NAME = "@lazyingart/aaps";
const DEFAULT_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STARTUP_CHECK_INTERVAL_MS = 0;
const DEFAULT_FAILURE_RETRY_MS = 6 * 60 * 60 * 1000;
const UPDATE_CHOICES = [
  ["update", "Update now", "Install latest globally, then continue."],
  ["skip-once", "Skip this time", "Continue with the current version for this run."],
  ["skip-version", "Skip this version", "Do not ask again until a newer release appears."],
];
const START_COMMANDS = new Set(["", "chat", "interactive"]);
const SKIP_COMMANDS = new Set([
  "help",
  "--help",
  "-h",
  "version",
  "--version",
  "-v",
  "update",
  "upgrade",
  "parse",
  "validate",
  "compile",
  "compile-project",
  "missing",
  "generate-block",
  "generate-script",
  "prepare-setup",
  "plan",
  "check",
  "audit",
  "run",
  "check-block",
  "run-block",
  "webapp",
  "web",
  "studio",
]);

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function aapsHome() {
  return path.resolve(process.env.AAPS_HOME || path.join(os.homedir(), ".aaps"));
}

function updateCachePath() {
  return path.join(aapsHome(), "update-check.json");
}

function parseVersion(value) {
  const match = String(value || "").trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1] || 0), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareSemver(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function isNewerVersion(latest, current) {
  return compareSemver(latest, current) > 0;
}

function isGlobalNpmInstall(packageDir, packageName = DEFAULT_PACKAGE_NAME) {
  const normalized = path.resolve(packageDir || "").replaceAll("\\", "/").toLowerCase();
  return normalized.includes(`/node_modules/${packageName.toLowerCase()}`);
}

function envDisablesAutoUpdate() {
  const disabled = [process.env.AAPS_NO_AUTO_UPDATE, process.env.AAPS_AUTO_UPDATE]
    .map((value) => String(value || "").toLowerCase());
  if (["1", "true", "yes", "on"].includes(disabled[0])) return true;
  if (disabled[1] && ["0", "false", "no", "off"].includes(disabled[1])) return true;
  return false;
}

function shouldAutoUpdateCommand(argv = []) {
  if (argv.includes("--no-auto-update")) return false;
  if (argv.includes("--help") || argv.includes("-h") || argv.includes("--version") || argv.includes("-v")) return false;
  const command = String(argv[0] || "").trim();
  if (SKIP_COMMANDS.has(command)) return false;
  if (START_COMMANDS.has(command)) return true;
  return true;
}

function isStartupUpdateCommand(argv = []) {
  const command = String(argv[0] || "").trim();
  return START_COMMANDS.has(command);
}

function intervalFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(updateCachePath(), "utf8"));
  } catch (_error) {
    return {};
  }
}

async function writeCache(cache) {
  const file = updateCachePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

function npmLatestVersion(packageName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(npmCommand(), ["view", packageName, "version", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, npm_config_fund: "false", npm_config_audit: "false" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`npm view timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `npm view exited with ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (_error) {
        resolve(stdout.trim());
      }
    });
  });
}

function installLatest(packageName) {
  return new Promise((resolve) => {
    const child = childProcess.spawn(npmCommand(), ["install", "-g", `${packageName}@latest`, "--no-audit", "--no-fund"], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (error) => resolve({ ok: false, error: error.message }));
    child.on("exit", (code, signal) => {
      resolve({ ok: code === 0, code, error: code === 0 ? "" : `npm install exited with ${signal || code}` });
    });
  });
}

async function restartCurrentProcess() {
  return await new Promise((resolve) => {
    const child = childProcess.spawn(process.argv[0], process.argv.slice(1), {
      cwd: process.cwd(),
      detached: false,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", (error) => resolve({ ok: false, error: error.message, exitCode: 1 }));
    child.on("exit", (code, signal) => {
      resolve({
        ok: code === 0,
        exitCode: code ?? (signal ? 130 : 1),
        signal: signal || "",
        error: code === 0 ? "" : `restarted process exited with ${signal || code}`,
      });
    });
  });
}

function renderSelector(output, { current, latest, packageName, selectedIndex, renderedLines }) {
  const rows = [
    `AAPS update available: ${current} -> ${latest}`,
    `Package: ${packageName}`,
    "Use Up/Down to choose, Enter to confirm, Esc to skip.",
    "",
    ...UPDATE_CHOICES.map((choice, index) => {
      const cursor = index === selectedIndex ? ">" : " ";
      return `${cursor} ${choice[1].padEnd(17)} ${choice[2]}`;
    }),
  ];
  if (renderedLines > 0) output.write(`\x1b[${renderedLines}A\x1b[J`);
  output.write(`${rows.join("\n")}\n`);
  return rows.length;
}

async function promptUpdateChoice({ current, latest, packageName, input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") return "skip-once";
  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  let renderedLines = 0;
  let selectedIndex = 0;
  return await new Promise((resolve) => {
    function finish(choice) {
      input.off("keypress", onKeypress);
      input.setRawMode(Boolean(wasRaw));
      if (!wasRaw) input.pause();
      output.write("\n");
      resolve(choice);
    }
    function render() {
      renderedLines = renderSelector(output, { current, latest, packageName, selectedIndex, renderedLines });
    }
    function onKeypress(_chunk, key = {}) {
      if (key.ctrl && key.name === "c") {
        input.setRawMode(Boolean(wasRaw));
        if (!wasRaw) input.pause();
        output.write("\n");
        process.exit(130);
      }
      if (key.name === "up" || key.name === "left") {
        selectedIndex = (selectedIndex - 1 + UPDATE_CHOICES.length) % UPDATE_CHOICES.length;
        render();
      } else if (key.name === "down" || key.name === "right" || key.name === "tab") {
        selectedIndex = (selectedIndex + 1) % UPDATE_CHOICES.length;
        render();
      } else if (key.name === "return" || key.name === "enter") {
        finish(UPDATE_CHOICES[selectedIndex][0]);
      } else if (key.name === "escape") {
        finish("skip-once");
      }
    }
    input.setRawMode(true);
    input.resume();
    render();
    input.on("keypress", onKeypress);
  });
}

async function maybeAutoUpdate({
  argv = [],
  force = false,
  manual = false,
  packageDir = "",
  packageName = DEFAULT_PACKAGE_NAME,
  packageVersion = "",
  latestVersion = npmLatestVersion,
  installPackage = installLatest,
  selectUpdateAction = promptUpdateChoice,
  restart = false,
  restartProcess = restartCurrentProcess,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  if (!manual && !force && !shouldAutoUpdateCommand(argv)) return { checked: false, skipped: "command" };
  if (!manual && !force && envDisablesAutoUpdate()) return { checked: false, skipped: "disabled" };
  if (!manual && !force && process.env.CI) return { checked: false, skipped: "ci" };
  if (!manual && !force && !stdout.isTTY) return { checked: false, skipped: "non-tty" };

  if (!isGlobalNpmInstall(packageDir, packageName)) {
    if (manual) {
      stdout.write("AAPS update skipped: this looks like a source checkout, not a global npm install.\n");
      stdout.write(`To update a published install, run: npm install -g ${packageName}@latest\n`);
    }
    return { checked: false, skipped: "source-checkout" };
  }

  const now = Date.now();
  const cache = await readCache();
  let latest = String(cache.latest || "");
  const checkedAt = Number(cache.checkedAt || 0);
  const startupInterval = intervalFromEnv("AAPS_AUTO_UPDATE_STARTUP_INTERVAL_MS", DEFAULT_STARTUP_CHECK_INTERVAL_MS);
  const normalInterval = intervalFromEnv("AAPS_AUTO_UPDATE_INTERVAL_MS", DEFAULT_CHECK_INTERVAL_MS);
  const interval = !manual && !force && isStartupUpdateCommand(argv) ? startupInterval : normalInterval;
  const stale = force || now - checkedAt >= interval;

  if (stale || !latest) {
    try {
      latest = String(await latestVersion(packageName, intervalFromEnv("AAPS_AUTO_UPDATE_TIMEOUT_MS", 5000)) || "");
      await writeCache({ ...cache, checkedAt: now, latest, packageName, latestCheckedBy: "npm-view" });
    } catch (error) {
      if (manual) stderr.write(`Could not check npm latest version: ${error.message}\n`);
      return { checked: false, skipped: "latest-check-failed", error: error.message };
    }
  }

  if (!isNewerVersion(latest, packageVersion)) {
    if (manual) stdout.write(`AAPS is up to date (${packageVersion}).\n`);
    return { checked: true, latest, current: packageVersion, updated: false };
  }

  const failedAt = Number(cache.lastInstallFailedAt || 0);
  if (!force && failedAt && now - failedAt < intervalFromEnv("AAPS_AUTO_UPDATE_FAILURE_RETRY_MS", DEFAULT_FAILURE_RETRY_MS)) {
    return { checked: true, latest, current: packageVersion, updated: false, skipped: "recent-install-failure" };
  }

  if (!manual && !force) {
    if (cache.skippedVersion === latest) {
      return { checked: true, latest, current: packageVersion, updated: false, skipped: "skipped-version" };
    }
    const choice = await selectUpdateAction({ current: packageVersion, latest, packageName, input: process.stdin, output: stdout });
    if (choice === "skip-version") {
      await writeCache({ ...cache, checkedAt: now, latest, skippedVersion: latest, skippedAt: now, packageName });
      stdout.write(`Skipped AAPS ${latest}. Run \`aaps update\` to install it later.\n`);
      return { checked: true, latest, current: packageVersion, updated: false, skipped: "skip-version" };
    }
    if (choice !== "update") {
      stdout.write(`Skipped update for this run. Run \`aaps update\` to install ${latest} later.\n`);
      return { checked: true, latest, current: packageVersion, updated: false, skipped: "skip-once" };
    }
  }

  stdout.write(`AAPS update available: ${packageVersion} -> ${latest}\n`);
  stdout.write(`Running: npm install -g ${packageName}@latest\n`);
  const install = await installPackage(packageName);
  if (!install.ok) {
    await writeCache({ ...cache, checkedAt: now, latest, lastInstallFailedAt: now, lastInstallError: install.error, packageName });
    stderr.write(`AAPS auto-update failed: ${install.error}\n`);
    stderr.write(`You can update manually with: npm install -g ${packageName}@latest\n`);
    return { checked: true, latest, current: packageVersion, updated: false, error: install.error };
  }
  await writeCache({ ...cache, checkedAt: now, latest, lastInstallSucceededAt: now, lastInstallFailedAt: 0, lastInstallError: "", packageName });
  stdout.write(`AAPS updated to ${latest}.\n`);
  if (restart) {
    stdout.write("Restarting AAPS with the updated package...\n");
    const restarted = await restartProcess();
    return {
      checked: true,
      latest,
      current: packageVersion,
      updated: true,
      restarted: true,
      exitCode: restarted.exitCode,
      error: restarted.error,
    };
  }
  return { checked: true, latest, current: packageVersion, updated: true };
}

module.exports = {
  compareSemver,
  isGlobalNpmInstall,
  isNewerVersion,
  maybeAutoUpdate,
  promptUpdateChoice,
  shouldAutoUpdateCommand,
};
