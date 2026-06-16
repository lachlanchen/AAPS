#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const readline = require("readline");
const AAPS = require("../src/aaps");
const Versioning = require("../src/project-versioning");
const { maybeAutoUpdate } = require("../src/auto-update");
const {
  DEFAULT_PORT,
  DEFAULT_SIMPLE_PORT,
  ensureAapsWebApp,
  fetchHealthDetails,
  readWebAppPreference,
  resolvePythonLauncher,
  stopAapsWebApp,
  writeWebAppPreference,
} = require("../src/web-autostart");

const SKIP_DIRS = new Set([".git", ".aaps-work", "node_modules", "vendor", "runtime", "__pycache__"]);
const useColor = Boolean(process.stdin.isTTY && process.stdout.isTTY && process.env.AAPS_NO_COLOR !== "1");
const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  userBg: "\x1b[48;5;24m\x1b[38;5;231m",
  aapsBg: "\x1b[48;5;29m\x1b[38;5;231m",
  stateBg: "\x1b[48;5;23m\x1b[38;5;231m",
  systemBg: "\x1b[48;5;236m\x1b[38;5;245m",
  cursorHide: "\x1b[?25l",
  cursorShow: "\x1b[?25h",
};
const ROLE_LABEL_WIDTH = "system".length;
const PROMPT_LABEL_WIDTH = "user>".length;
const LARGE_LAUNCH_TITLE = [
  " █████╗  █████╗ ██████╗ ███████╗",
  "██╔══██╗██╔══██╗██╔══██╗██╔════╝",
  "███████║███████║██████╔╝███████╗",
  "██╔══██║██╔══██║██╔═══╝ ╚════██║",
  "██║  ██║██║  ██║██║     ███████║",
  "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝",
];

function usage() {
  return [
    "Usage:",
    "  aaps parse <file> [--project .]",
    "  aaps compile <file> [--project .] [--mode check|suggest|apply|interactive|force] [--json]",
    "  aaps manifest <file> [--project .] [--mode check|suggest|apply|interactive|force] [--json]",
    "  aaps compile-project [--project .] [--mode check|suggest|apply] [--json]",
    "  aaps manifest-project [--project .] [--mode check|suggest|apply] [--json]",
    "  aaps missing <file> [--project .] [--json]",
    "  aaps generate-block <name> [--project .] [--mode apply] [--json]",
    "  aaps generate-script <name-or-path> [--project .] [--mode apply] [--json]",
    "  aaps prepare-setup <file> [--project .] [--json]",
    "  aaps plan <file> [--project .] [--json]",
    "  aaps check <file> [--project .] [--json]",
    "  aaps audit [file] [--project .] [--json]",
    "  aaps snapshot [--project .] [--label name] [--json]",
    "  aaps checkpoint [--project .] [--label name] [--init-git] [--json]",
    "  aaps versions [--project .] [--limit 120] [--json]",
    "  aaps guide blocks|report [--json]",
    "  aaps check-block <file> --block <id> [--project .] [--json]",
    "  aaps run <file> [--project .] [--json]",
    "  aaps run-block <file> --block <id> [--project .] [--json]",
    "  aaps prompt \"goal\" [--project .] [--backend codex|aginti|print] [--json]",
    "  aaps \"goal\" [--project .] [--backend codex|aginti|print] [--json]",
    "  aaps validate [file] [--project .] [--json]",
    "  aaps chat [--project .] [--backend codex|aginti|print] [--session default]",
    "  aaps webapp [simple|start|stop|restart|reuse|enable|disable|status] [--project .] [--host 127.0.0.1] [--port 8797] [--ui classic|simple] [--json]",
    "  aaps doctor [--project .] [--host 127.0.0.1] [--port 8797] [--json]",
    "  aaps studio [--project .] [--host 127.0.0.1] [--port 8797] [--ui classic|simple] [--mock-codex]",
    "  aaps update",
    "  aaps --version",
    "",
    "Options:",
    "  --project <dir>   AAPS project root. Defaults to current directory.",
    "  --block <id>      Block ID or execution-plan path fragment for run-block.",
    "  --mode <mode>     Compile mode: check, suggest, apply, interactive, or force.",
    "  --host <host>     Studio host for `aaps studio`.",
    "  --port <port>     Studio port for `aaps studio`.",
    "  --ui <mode>       Studio UI mode: classic on 8797 or simple on 8798 by default.",
    "  --run-root <dir>  Runtime output directory for `run` and `run-block`.",
    "  --run-id <id>     Stable run identifier for reproducible test runs.",
    "  --set <name=value> Override an AAPS input or parameter at runtime; repeatable.",
    "  --dry-run         Build plan/readiness and skip action side effects.",
    "  --backend <name>  Prompt backend for direct goals. Defaults to codex.",
    "  --codex-session <id> Resume an existing Codex exec session for direct prompts.",
    "  --codex-resume-last Resume the latest Codex exec session for direct prompts.",
    "  --session <id>    Shared chat session for syncing CLI and Studio. Defaults to default.",
    "  --session-name <name> Friendly name stored in the AAPS session database.",
    "  --label <name>    Version snapshot label for `aaps snapshot`.",
    "  --init-git        Initialize project-local git before `aaps checkpoint`.",
    "  --no-auto-update Skip startup update checks for global npm installs.",
    "  --auto-update     Force a startup update check for global npm installs.",
    "  --provider <name> Provider passed to AgInTi backend.",
    "  --routing <mode>  Routing passed to AgInTi backend. Defaults to complex for backend implementation.",
    "  --aginti-safety <safe|normal|danger> Safety shortcut passed to AgInTi backend.",
    "  --sandbox-mode <mode> Sandbox mode passed to AgInTi backend.",
    "  --package-install-policy <policy> Package policy passed to AgInTi backend.",
    "  --approve-package-installs Approve package installs for the AgInTi backend run.",
    "  --allow-destructive Pass trusted host/destructive approval to AgInTi backend.",
    "  --print-prompt    Save and print the generated backend prompt without running it.",
    "  --audit-scope <entry|project> Post-backend audit scope. Defaults to entry for prompt backends.",
    "  --mock-codex      Start Studio with AAPS_MOCK_CODEX=1.",
    "  --no-webapp       Do not auto-start the local Studio for `aaps chat`.",
    "  --json            Print machine-readable JSON where supported.",
  ].join("\n");
}

function parseArgs(argv) {
  const command = argv[2] || "chat";
  const positional = [];
  const options = { project: "." };
  for (let index = 3; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      if (key === "set") options.set = [...(Array.isArray(options.set) ? options.set : []), "true"];
      else options[key] = true;
    }
    else {
      if (key === "set") options.set = [...(Array.isArray(options.set) ? options.set : []), next];
      else options[key] = next;
      index += 1;
    }
  }
  return { command, positional, options };
}

function toProjectPath(file) {
  return file.split(path.sep).join("/");
}

function safeRelative(base, value, label = "path") {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  const normalized = path.normalize(text);
  if (path.isAbsolute(normalized) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`${label} must be project-relative: ${value}`);
  }
  const resolved = path.resolve(base, normalized);
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes project root: ${value}`);
  }
  return resolved;
}

function readManifest(projectDir) {
  const manifestPath = path.join(projectDir, "aaps.project.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function scanAapsFiles(projectDir) {
  const files = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".aaps")) {
        const full = path.join(dir, entry.name);
        files[toProjectPath(path.relative(projectDir, full))] = fs.readFileSync(full, "utf8");
      }
    }
  }
  walk(projectDir);
  return files;
}

function resolveEntry(projectDir, manifest, fileArg) {
  const file = fileArg || (manifest && (manifest.activeFile || manifest.defaultMain));
  if (!file) throw new Error("Provide a .aaps file or set activeFile/defaultMain in aaps.project.json.");
  const full = safeRelative(projectDir, file, "AAPS file");
  if (!fs.existsSync(full)) throw new Error(`AAPS file not found: ${file}`);
  return toProjectPath(path.relative(projectDir, full));
}

function parseProjectAware(projectDir, fileArg) {
  const manifest = readManifest(projectDir);
  if (manifest) {
    const entry = resolveEntry(projectDir, manifest, fileArg);
    return { manifest, entry, ir: AAPS.parseAAPSProject(scanAapsFiles(projectDir), entry, manifest) };
  }
  const full = safeRelative(projectDir, fileArg, "AAPS file");
  return {
    manifest: null,
    entry: toProjectPath(path.relative(projectDir, full)),
    ir: AAPS.parseAAPS(fs.readFileSync(full, "utf8"), { sourceFile: toProjectPath(path.relative(projectDir, full)) }),
  };
}

function print(value, asJson) {
  if (asJson) console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function packageVersion() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    return String(manifest.version || "latest");
  } catch (_error) {
    return "latest";
  }
}

function compactLine(value, limit = 110) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text;
}

function backendSlug(value) {
  return String(value || "backend").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "backend";
}

function splitCliWords(value) {
  const words = [];
  String(value || "").replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_match, doubleQuoted, singleQuoted, bare) => {
    words.push(doubleQuoted ?? singleQuoted ?? bare ?? "");
    return "";
  });
  return words;
}

function color(value, ...codes) {
  if (!useColor || !codes.length) return String(value);
  return `${codes.join("")}${value}${ansi.reset}`;
}

function stripAnsi(value) {
  return String(value || "").replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function visibleLength(value) {
  return stripAnsi(value).length;
}

function terminalWidth() {
  return Math.max(Number(process.stdout.columns) || 88, 48);
}

function padVisible(value, width) {
  return `${value}${" ".repeat(Math.max(width - visibleLength(value), 0))}`;
}

function terminalHyperlink(url = "", text = url) {
  if (!useColor || process.env.AAPS_NO_HYPERLINK === "1") return String(text || "");
  const safeUrl = String(url || "").replace(/[\x00-\x1f\x7f]/g, "");
  return safeUrl ? `\x1b]8;;${safeUrl}\x07${text}\x1b]8;;\x07` : String(text || "");
}

function linkifyTerminalUrl(line = "", url = "") {
  if (!url || !String(line).includes(url)) return String(line || "");
  return String(line).replace(url, terminalHyperlink(url, url));
}

function labelText(name, { prompt = false } = {}) {
  const raw = String(name || "");
  const width = prompt || raw.endsWith(">") ? PROMPT_LABEL_WIDTH : ROLE_LABEL_WIDTH;
  const aligned = raw.endsWith(">") ? raw.padStart(width, " ") : raw.padEnd(width, " ");
  return ` ${aligned} `;
}

function label(name, bgCode) {
  return color(labelText(name), bgCode, ansi.bold);
}

function printStripe(role, text = "", bgCode = ansi.systemBg) {
  const content = String(text ?? "");
  const rows = content.split(/\r?\n/);
  rows.forEach((row, index) => {
    const prefix = index === 0 ? label(role, bgCode) : label("", bgCode);
    console.log(`${prefix} ${row}`);
  });
}

function printAapsMessage(text = "") {
  printStripe("aaps", text, ansi.aapsBg);
}

function printStateMessage(text = "") {
  printStripe("state", text, ansi.stateBg);
}

function printErrorMessage(text = "") {
  printStripe("error", text, ansi.systemBg);
}

function printChatHeader({ version = packageVersion(), webAppUrl = "", webAppNotice = "", backend = "codex" } = {}) {
  const width = Math.min(Math.max(terminalWidth() - 2, 74), 112);
  const titleWidth = Math.max(...LARGE_LAUNCH_TITLE.map((line) => visibleLength(line)));
  const titleFits = width >= titleWidth + 4;
  const top = `╭${"─".repeat(width - 2)}╮`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;
  const line = (value = "") => `│ ${padVisible(value, width - 4)} │`;
  console.log(color(top, ansi.cyan));
  if (titleFits) {
    for (const row of LARGE_LAUNCH_TITLE) console.log(color(line(row), ansi.cyan));
  } else {
    console.log(color(line("AAPS"), ansi.cyan, ansi.bold));
  }
  console.log(color(line(`AAPS v${version} - prompt-native workflows, blocks, parse, compile, run, and Studio.`), ansi.cyan));
  console.log(color(line(`backend: ${backend}    cwd: ${process.cwd()}`), ansi.dim));
  const tagline = webAppUrl ? `webapp: ${webAppUrl}` : webAppNotice || "";
  if (tagline) console.log(color(line(linkifyTerminalUrl(tagline, webAppUrl)), ansi.green));
  console.log(color(bottom, ansi.cyan));
}

function runCliInProject(projectDir, args, { capture = false } = {}) {
  return childProcess.spawnSync(process.execPath, [path.join(__dirname, "aaps.js"), ...args], {
    cwd: projectDir,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, AAPS_NO_WEB_AUTO_START: "1" },
  });
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\"'\"'")}'`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isExecutableFile(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    if (process.platform === "win32") return true;
    return Boolean(stat.mode & 0o111);
  } catch (_error) {
    return false;
  }
}

function commandPathCandidates(command) {
  const home = os.homedir();
  const pathExts = process.platform === "win32"
    ? String(process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean)
    : [""];
  const dirs = [
    ...String(process.env.PATH || "").split(path.delimiter),
    path.join(home, ".local", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".yarn", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".volta", "bin"),
    path.join(home, ".cargo", "bin"),
    path.join(home, "Library", "pnpm"),
    path.join(home, ".local", "share", "pnpm"),
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    "/usr/local/sbin",
    "/usr/bin",
    "/bin",
  ];
  for (const root of [
    path.join(home, ".nvm", "versions", "node"),
    path.join(home, ".asdf", "installs", "nodejs"),
  ]) {
    try {
      for (const version of fs.readdirSync(root)) dirs.push(path.join(root, version, "bin"));
    } catch (_error) {
      // Optional toolchain manager directory.
    }
  }
  try {
    const fnmRoot = path.join(home, ".fnm", "node-versions");
    for (const version of fs.readdirSync(fnmRoot)) dirs.push(path.join(fnmRoot, version, "installation", "bin"));
  } catch (_error) {
    // Optional toolchain manager directory.
  }
  const candidates = [];
  for (const dir of unique(dirs.map((item) => path.resolve(item || ".")))) {
    for (const ext of pathExts) candidates.push(path.join(dir, `${command}${ext}`));
  }
  return candidates;
}

function shellResolveCommand(command, cwd) {
  const shells = unique([
    process.env.SHELL,
    process.platform === "win32" ? "" : "/bin/zsh",
    process.platform === "win32" ? "" : "/bin/bash",
    process.platform === "win32" ? "" : "/bin/sh",
  ]);
  for (const shell of shells) {
    const shellName = path.basename(shell);
    const args = shellName === "sh" ? ["-c", `command -v ${shellQuote(command)} 2>/dev/null`] : ["-lc", `command -v ${shellQuote(command)} 2>/dev/null`];
    const result = childProcess.spawnSync(shell, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2500,
    });
    const found = String(result.stdout || "").trim().split(/\r?\n/)[0] || "";
    if (!found) continue;
    if (path.isAbsolute(found) && isExecutableFile(found)) return found;
    if (!found.includes(" ") && found === command) return found;
  }
  return "";
}

function npmGlobalBinDir(cwd) {
  const result = childProcess.spawnSync("npm", ["prefix", "-g"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 2500,
  });
  const prefix = String(result.stdout || "").trim();
  return prefix ? path.join(prefix, "bin") : "";
}

function resolveCommand(command, cwd, envVar = "") {
  const override = String(envVar ? process.env[envVar] || "" : "").trim();
  const explicit = override || command;
  if (explicit.includes(path.sep) || (process.platform === "win32" && explicit.includes("\\"))) {
    const full = path.resolve(explicit.replace(/^~/, os.homedir()));
    if (isExecutableFile(full)) return { command: full, source: envVar || "explicit", pathEnv: process.env.PATH || "" };
  }
  if (override && !override.includes(path.sep)) {
    const resolvedOverride = resolveCommand(override, cwd, "");
    if (resolvedOverride.ok) return { ...resolvedOverride, source: envVar };
  }
  const shellFound = shellResolveCommand(command, cwd);
  if (shellFound) {
    const dir = path.isAbsolute(shellFound) ? path.dirname(shellFound) : "";
    return {
      ok: true,
      command: shellFound,
      source: "login-shell",
      pathEnv: unique([dir, process.env.PATH || ""].filter(Boolean)).join(path.delimiter),
    };
  }
  const npmBin = npmGlobalBinDir(cwd);
  const candidates = unique([...commandPathCandidates(command), npmBin ? path.join(npmBin, command) : ""]);
  for (const candidate of candidates) {
    if (isExecutableFile(candidate)) {
      return {
        ok: true,
        command: candidate,
        source: "path-scan",
        pathEnv: unique([path.dirname(candidate), process.env.PATH || ""].filter(Boolean)).join(path.delimiter),
      };
    }
  }
  return {
    ok: false,
    command,
    source: "not-found",
    pathEnv: process.env.PATH || "",
    searched: unique([
      envVar ? `$${envVar}` : "",
      "login shell",
      "npm global prefix",
      "~/.local/bin",
      "~/.npm-global/bin",
      "~/.bun/bin",
      "~/.volta/bin",
      "~/.nvm/versions/node/*/bin",
      "~/.fnm/node-versions/*/installation/bin",
      "/opt/homebrew/bin",
      "/usr/local/bin",
    ]),
  };
}

function allExecutableCommandPaths(command, cwd = process.cwd()) {
  const fromShell = [];
  const shellArgs =
    process.platform === "win32"
      ? ["where", command]
      : ["sh", "-lc", `command -v -a ${shellQuote(command)} 2>/dev/null || which -a ${shellQuote(command)} 2>/dev/null || true`];
  const result =
    process.platform === "win32"
      ? childProcess.spawnSync(shellArgs[0], shellArgs.slice(1), { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2500 })
      : childProcess.spawnSync(shellArgs[0], shellArgs.slice(1), { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2500 });
  String(result.stdout || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => fromShell.push(item));
  const fromScan = commandPathCandidates(command).filter(isExecutableFile);
  return unique([...fromShell, ...fromScan]);
}

function normalizePromptBackend(value) {
  const backend = String(value || process.env.AAPS_BACKEND || "codex").trim().toLowerCase();
  if (["codex", "codex-cli", "codex_cli"].includes(backend)) return "codex";
  if (["aginti", "agintiflow", "aginti-flow"].includes(backend)) return "aginti";
  if (["print", "dry-run", "dryrun", "prompt"].includes(backend)) return "print";
  return backend || "codex";
}

function normalizeStudioUi(value) {
  return String(value || process.env.AAPS_STUDIO_UI || "classic").trim().toLowerCase() === "simple" ? "simple" : "classic";
}

function collectWorkflowCandidates(projectDir, fileArg = "", options = {}) {
  if (fileArg) {
    const full = safeRelative(projectDir, fileArg, "AAPS file");
    if (!fs.existsSync(full)) throw new Error(`AAPS file not found: ${fileArg}`);
    return [toProjectPath(path.relative(projectDir, full))];
  }
  const manifest = readManifest(projectDir);
  const files = Object.keys(scanAapsFiles(projectDir)).sort();
  const preferred = [];
  if (manifest?.activeFile && files.includes(manifest.activeFile)) preferred.push(manifest.activeFile);
  if (manifest?.defaultMain && files.includes(manifest.defaultMain)) preferred.push(manifest.defaultMain);
  if (options.scope === "entry") {
    if (preferred.length) return [...new Set(preferred)].slice(0, 20);
    const manifestWorkflows = Array.isArray(manifest?.files?.workflows)
      ? manifest.files.workflows.filter((file) => files.includes(file))
      : [];
    if (manifestWorkflows.length) return [...new Set(manifestWorkflows)].slice(0, 20);
    if (Number.isFinite(options.sinceMs)) {
      const changed = files.filter((file) => {
        try {
          return fs.statSync(path.join(projectDir, file)).mtimeMs >= options.sinceMs - 1000;
        } catch (_error) {
          return false;
        }
      });
      return changed.slice(0, 20);
    }
    return [];
  }
  const workflowFiles = files.filter((file) => file.startsWith("workflows/"));
  const candidates = [...new Set([...preferred, ...workflowFiles, ...files])];
  return candidates.slice(0, 20);
}

function collectOutputPorts(node, ports = []) {
  if (!node || typeof node !== "object") return ports;
  if (Array.isArray(node.outputPorts)) ports.push(...node.outputPorts);
  for (const key of ["tasks", "blocks", "stages", "skills", "children"]) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) collectOutputPorts(child, ports);
    }
  }
  return ports;
}

function checkDeclaredOutputs(projectDir, ir) {
  const seen = new Set();
  const outputs = [];
  for (const port of collectOutputPorts(ir.pipeline || {})) {
    const value = String(port.value || "").trim();
    if (!value || value.includes("${") || path.isAbsolute(value) || seen.has(value)) continue;
    seen.add(value);
    const full = path.resolve(projectDir, value);
    const rel = path.relative(projectDir, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      outputs.push({ name: port.name || "", path: value, exists: false, size: 0, error: "escapes_project" });
      continue;
    }
    let stat = null;
    try {
      stat = fs.statSync(full);
    } catch (_error) {
      stat = null;
    }
    outputs.push({
      name: port.name || "",
      type: port.type || "",
      path: toProjectPath(rel),
      exists: Boolean(stat),
      size: stat?.size || 0,
      nonempty: Boolean(stat && stat.size > 0),
    });
  }
  return outputs;
}

function runAapsSelf(projectDir, args) {
  const result = childProcess.spawnSync(process.execPath, [path.join(__dirname, "aaps.js"), ...args], {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    command: ["node", path.join(__dirname, "aaps.js"), ...args],
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function auditAapsBackendResult(projectDir, fileArg = "", options = {}) {
  const workflows = collectWorkflowCandidates(projectDir, fileArg, options);
  const audit = {
    ok: false,
    status: workflows.length ? "checked" : "no_workflows",
    workflowCount: workflows.length,
    workflows: [],
  };
  for (const workflow of workflows) {
    const item = {
      file: workflow,
      parseOk: false,
      compileOk: false,
      declaredOutputs: [],
      missingOutputs: [],
      diagnostics: [],
      compileStatus: "",
      compileDir: "",
    };
    try {
      const parsed = parseProjectAware(projectDir, workflow);
      item.parseOk = parsed.ir.diagnostics.length === 0;
      item.diagnostics = parsed.ir.diagnostics || [];
      item.declaredOutputs = checkDeclaredOutputs(projectDir, parsed.ir);
      item.missingOutputs = item.declaredOutputs.filter((output) => !output.exists || output.size === 0);
    } catch (error) {
      item.diagnostics = [{ severity: "error", message: error.message }];
    }
    const compile = runAapsSelf(projectDir, ["compile", workflow, "--project", ".", "--mode", "check", "--json"]);
    item.compileExitCode = compile.exitCode;
    if (compile.stdout.trim()) {
      try {
        const report = JSON.parse(compile.stdout);
        item.compileOk = Boolean(report.ok);
        item.compileStatus = report.status || "";
        item.compileDir = report.compileDir || "";
        item.missingComponents = report.missingComponents || [];
      } catch (_error) {
        item.compileOk = false;
      }
    }
    if (compile.stderr.trim()) item.compileStderr = compile.stderr.trim().slice(0, 4000);
    audit.workflows.push(item);
  }
  audit.ok = audit.workflows.length > 0 && audit.workflows.every((item) => item.parseOk && item.compileOk && item.declaredOutputs.length > 0 && item.missingOutputs.length === 0);
  audit.status = audit.ok ? "verified" : "unverified";
  return audit;
}

function buildPromptHandoff(projectDir, goal, options) {
  const promptDir = path.join(projectDir, ".aaps-work", "prompts");
  fs.mkdirSync(promptDir, { recursive: true });
  const promptPath = path.join(promptDir, `${timestampSlug()}-aginti-backend.md`);
  const aapsCli = path.join(__dirname, "aaps.js");
  const dockerSafeAapsCli = `npx -y @lazyingart/aaps@${packageVersion()}`;
  const projectRelativePromptPath = toProjectPath(path.relative(projectDir, promptPath));
  const text = [
    "# AAPS Backend Agent Task",
    "",
    "You are the backend implementation agent for an AAPS project.",
    "",
    "## User Goal",
    "",
    goal,
    "",
    "## Project",
    "",
    `- Project root: ${projectDir}`,
    options.prePromptSnapshot
      ? `- Pre-agent project snapshot: \`${options.prePromptSnapshot.projectManifestPath || options.prePromptSnapshot.projectSnapshotDir}\``
      : "- Pre-agent project snapshot: not created.",
    "- Preferred AAPS CLI: `aaps` when it is installed in the active shell or sandbox.",
    `- Docker-safe AAPS CLI fallback: \`${dockerSafeAapsCli}\` when package installs/network are approved.`,
    `- Host/source AAPS CLI fallback: \`node ${aapsCli}\` only if that host path exists inside the active sandbox.`,
    "- In AgInTi docker-workspace, host-global binaries and host source paths may not be visible. Verify the CLI before relying on it.",
    "",
    "## Operating Contract",
    "",
    "1. Inspect the current AAPS project before editing.",
    "2. If no AAPS project exists, create a small project-local AAPS structure instead of writing unrelated files.",
    "3. Preserve the `.aaps` contract as the source of truth. Do not weaken requirements just to make readiness pass.",
    "4. Prefer editing `.aaps` workflows, blocks, scripts, tool registries, and agent registries before ad hoc prose.",
    "5. Run `aaps validate`, `aaps parse`, `aaps compile ... --mode check`, `aaps check`, and `aaps run ...` when the workflow is executable.",
    "6. Treat parser, compiler, readiness, and validation output as evidence. If `aaps check` reports a missing script/tool/GPU contract/dependency, repair the implementation that violates the contract and rerun the same check.",
    "7. For implementation repair or code generation, act as a manifest/compile agent: use deliberate reasoning, change the smallest project-local files needed, and verify by command and declared artifacts. Codex GPT-5.5 xhigh is appropriate for difficult manifestation/repair passes.",
    "8. If a step is prompt-only, record it as a handoff unless you actually execute it and verify declared outputs.",
    "9. Save durable reports under `reports/` and durable generated artifacts under project-local folders.",
    "10. Preserve AAPS provenance: before major rewrites, run `aaps snapshot --project . --label before-<change>` and record generated/modified files in logs.",
    "11. Do not use sudo or destructive host commands. Ask for a stronger mode when the task requires broader permission.",
    "12. Finish with exact paths to the workflow, compile/run logs, outputs, and any remaining failed readiness checks.",
    options.allowDestructive
      ? "13. This run was launched with explicit trusted-host/destructive approval. Use it only for the requested project work, avoid unrelated host changes, and keep secrets out of reports."
      : "13. If broad host commands are blocked, report the blocker and rerun command instead of looping on variants.",
    "",
    "## AAPS Syntax Contract",
    "",
    "- `.aaps` files are not YAML. Do not write `name:`, `stages:`, YAML arrays, or loose key/value workflow files.",
    "- Use the native AAPS language shape: `pipeline \"Name\" { ... agent ... task ... exec shell \"...\" output ... validate exists \"...\" }`.",
    "- Before claiming success, run `aaps validate <workflow> --project .`, `aaps parse <workflow> --project . --json`, and `aaps compile <workflow> --project . --mode check --json`.",
    "- `aaps manifest` is the user-facing alias for `aaps compile`. Use manifest language when explaining the phase to humans, and compile language when referencing old commands or JSON fields.",
    "- If parse/validate/compile fails, repair the `.aaps` file and rerun the checks. Do not continue with an invalid workflow.",
    "- If `aaps compile --mode apply` or `aaps check` creates a missing-component report, use the report as the repair target. Repair scripts/tools/registries beneath the contract, then rerun `aaps check`.",
    "- Hardware and environment requirements are part of the contract. For example, a `requires_gpu \"required\"` block must have an implementation that actually requests GPU execution or records an explicit verified fallback; do not silently switch it to CPU.",
    "",
    "## Default Block Design Guide",
    "",
    AAPS.blockDesignGuideMarkdown ? AAPS.blockDesignGuideMarkdown({ compact: true }) : "",
    "",
    "## Report Recap Paradigm",
    "",
    AAPS.reportParadigmMarkdown ? AAPS.reportParadigmMarkdown() : "",
    "",
    "## Prompt-Generation Contract",
    "",
    "- AAPS agents often need to write prompts for downstream agents inside the workflow. Treat those prompts as executable artifacts.",
    "- A downstream agent prompt must include task goal, source artifact paths, domain priors, observed QC findings, failure reason, method history, expected output schema, color/format constraints, safety constraints, and verifier checklist.",
    "- For image generation or mask refinement, include what must remain unchanged, what must be improved, instance/color conventions, allowed output files, and how the next verifier agent will judge success.",
    "- Save prompt templates or handoff packets under project-local artifacts even when the downstream agent is not called, and mark the status truthfully as prepared/template/not_needed/blocked.",
    "",
    "## Manifestation Strategy",
    "",
    "- Manifest broad workflows block by block: first make the `.aaps` contract parseable, then generate or repair scripts/tools/prompts for one block, run focused checks, and move to the next block.",
    "- Prefer a reused backend session for long multi-block manifestation when the caller supplied a Codex session (`--codex-session` or `--codex-resume-last`) or a persistent AgInTi session; otherwise keep the one-shot run self-contained.",
    "- Record each block manifestation decision in compile/run artifacts so the next block can reuse context without guessing.",
    "",
    "## Scientific Runtime Contract",
    "",
    "- For Python/data/image-analysis tasks, prefer a project-local `.venv` and project-local scripts over global host `pip install`.",
    "- Pin or constrain binary scientific dependencies when practical, especially `numpy`, `matplotlib`, `scipy`, `scikit-image`, `opencv-python-headless`, `pillow`, `pandas`, and `tifffile`.",
    "- Record environment setup in project-local files such as `requirements.txt`, `tools/*.yaml`, or `environments/*.yaml` so the workflow is reproducible.",
    "- Do not treat shell pipeline exit code as reliable when piping through `tee`. Use `set -o pipefail` where available, or separately verify the declared output files after the command.",
    "- Long-running jobs may use tmux, but do not finish while they are still running. Wait for completion, then verify declared outputs, logs, reports, and host-side file checks.",
    "- If the first `.aaps` or script attempt is incomplete, repair the correct `.aaps`, script, tool, or environment file and rerun parse/compile/run. Do not stop at partial progress.",
    "",
    "## Expected Output",
    "",
    "- A short AAPS-oriented implementation report.",
    "- Any generated `.aaps` files or executable artifacts needed for the goal.",
    "- Evidence from parse/validate/compile/run, or a precise blocker if a backend/tool is unavailable.",
    "",
  ].join("\n");
  fs.writeFileSync(promptPath, text, "utf8");
  return { promptPath, projectRelativePromptPath, prompt: text, aapsCli, dockerSafeAapsCli };
}

function codexPromptArgs(projectDir, outputPath, options = {}) {
  const model = String(options.model || options.codexModel || process.env.AAPS_CODEX_MODEL || "gpt-5.5");
  const reasoning = String(options.reasoning || options.codexReasoning || process.env.AAPS_CODEX_REASONING || "xhigh");
  const resumeSession = String(options.codexSession || process.env.AAPS_CODEX_SESSION || "").trim();
  const resumeLast = Boolean(options.codexResumeLast || process.env.AAPS_CODEX_RESUME_LAST === "1");
  const args = resumeSession || resumeLast
    ? [
        "exec",
        "resume",
        "--model",
        model,
        "-c",
        `model_reasoning_effort="${reasoning}"`,
        "--output-last-message",
        outputPath,
      ]
    : [
        "exec",
        "--ephemeral",
        "--model",
        model,
        "-c",
        `model_reasoning_effort="${reasoning}"`,
        "--cd",
        projectDir,
        "--output-last-message",
        outputPath,
      ];
  if (options.codexBypassSandbox || process.env.AAPS_CODEX_BYPASS_SANDBOX === "1") {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  }
  if (resumeLast) args.push("--last");
  else if (resumeSession) args.push(resumeSession);
  args.push("-");
  return args;
}

function commandPromptWithCodex(projectDir, handoff, payload, options) {
  const codexCommand = resolveCommand("codex", projectDir, "AAPS_CODEX_BIN");
  if (!codexCommand.ok) {
    payload.ok = false;
    payload.status = "missing_backend";
    payload.error = "Codex CLI (`codex`) was not found. Set AAPS_CODEX_BIN, install/configure Codex, or rerun with --backend aginti or --backend print.";
    payload.searched = codexCommand.searched;
    if (options.json) print(payload, true);
    else {
      console.error(payload.error);
      console.error(`Searched: ${codexCommand.searched.join(", ")}`);
      console.error(`Prepared prompt: ${handoff.projectRelativePromptPath}`);
    }
    process.exit(1);
  }
  const outputPath = path.join(projectDir, ".aaps-work", "prompts", `${timestampSlug()}-codex-output.md`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const args = codexPromptArgs(projectDir, outputPath, options);
  const codexResumeRequested = Boolean(
    options.codexSession ||
      options.codexResumeLast ||
      process.env.AAPS_CODEX_SESSION ||
      process.env.AAPS_CODEX_RESUME_LAST === "1"
  );
  payload.command = [codexCommand.command, ...args];
  payload.backendCommand = { name: "codex", command: codexCommand.command, source: codexCommand.source };
  payload.handoffMode = codexResumeRequested ? "codex_exec_resume_with_saved_handoff" : "stdin_with_saved_handoff";
  payload.outputPath = outputPath;
  payload.outputFile = toProjectPath(path.relative(projectDir, outputPath));
  const auditStartedAtMs = Date.now();
  const result = childProcess.spawnSync(codexCommand.command, args, {
    cwd: projectDir,
    input: handoff.prompt,
    encoding: "utf8",
    stdio: options.json ? ["pipe", "pipe", "pipe"] : ["pipe", "inherit", "inherit"],
    timeout: Number(options.codexTimeoutMs || process.env.AAPS_CODEX_TIMEOUT_MS || 15 * 60 * 1000),
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, PATH: codexCommand.pathEnv || process.env.PATH || "" },
  });
  payload.executed = true;
  payload.exitCode = result.status ?? 1;
  payload.signal = result.signal || "";
  payload.postRunAudit = auditAapsBackendResult(projectDir, options.auditFile || "", {
    scope: String(options.auditScope || "entry").toLowerCase() === "project" ? "project" : "entry",
    sinceMs: auditStartedAtMs,
  });
  payload.postPromptGitCheckpoint = Versioning.createGitCheckpoint(projectDir, {
    label: `after-${backendSlug(payload.backend || "codex")}-prompt`,
    reason: "post_codex_prompt",
    entryFile: options.auditFile || "",
    initGit: true,
  });
  if (payload.exitCode === 0 && payload.postRunAudit.ok) payload.status = "succeeded_verified";
  else if (payload.exitCode === 0) payload.status = "backend_returned_unverified";
  else payload.status = "failed";
  if (options.json) {
    payload.stdout = result.stdout || "";
    payload.stderr = result.stderr || result.error?.message || "";
    payload.ok = payload.exitCode === 0 && payload.postRunAudit.ok;
    print(payload, true);
  }
  process.exit(payload.ok ? 0 : payload.exitCode || 1);
}

function commandPrompt(goal, options) {
  const projectDir = path.resolve(options.project || ".");
  const text = String(goal || "").trim();
  if (!text) throw new Error("aaps prompt requires a goal string.");
  const backend = normalizePromptBackend(options.backend);
  let prePromptSnapshot = null;
  try {
    prePromptSnapshot = Versioning.createProjectSnapshot(projectDir, {
      label: `before-${backend}-prompt`,
      reason: "pre_agent_prompt",
      entryFile: options.auditFile || "",
    });
  } catch (error) {
    prePromptSnapshot = { ok: false, error: error.message };
  }
  const handoff = buildPromptHandoff(projectDir, text, { ...options, prePromptSnapshot });
  const payload = {
    ok: true,
    backend,
    project: projectDir,
    prePromptSnapshot,
    promptFile: handoff.projectRelativePromptPath,
    promptPath: handoff.promptPath,
    executed: false,
    command: [],
    status: "prompt_prepared",
  };
  const printOnly = options.printPrompt || options.dryRun || backend === "print";
  if (printOnly) {
    if (options.json) print(payload, true);
    else print(handoff.prompt, false);
    return;
  }
  if (backend === "codex") {
    commandPromptWithCodex(projectDir, handoff, payload, options);
    return;
  }
  if (backend !== "aginti") {
    throw new Error(`Unsupported AAPS prompt backend: ${backend}. Supported backends: codex, aginti, print.`);
  }
  const agintiCommand = resolveCommand("aginti", projectDir, "AAPS_AGINTI_BIN");
  if (!agintiCommand.ok) {
    payload.ok = false;
    payload.status = "missing_backend";
    payload.error = "AgInTiFlow CLI (`aginti`) was not found. Set AAPS_AGINTI_BIN, install @lazyingart/agintiflow, or rerun with --backend print.";
    payload.searched = agintiCommand.searched;
    if (options.json) print(payload, true);
    else {
      console.error(payload.error);
      console.error(`Searched: ${agintiCommand.searched.join(", ")}`);
      console.error(`Prepared prompt: ${handoff.projectRelativePromptPath}`);
    }
    process.exit(1);
  }
  const args = [
    "--profile",
    options.profile || "aaps",
    "--cwd",
    projectDir,
    "--sandbox-mode",
    options.sandboxMode || "docker-workspace",
    "--package-install-policy",
    options.packageInstallPolicy || "prompt",
    "--routing",
    options.routing || "complex",
    "--allow-shell",
    "--allow-file-tools",
  ];
  if (options.agintiSafety) args.push("-s", String(options.agintiSafety));
  if (options.packageInstallPolicy === "allow" || options.approvePackageInstalls) {
    args.push("--approve-package-installs");
  }
  if (options.allowDestructive) args.push("--allow-destructive");
  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  if (options.scoutCount) args.push("--scout-count", String(options.scoutCount));
  const handoffGoal = [
    `Read and execute the AAPS backend handoff file at ${handoff.projectRelativePromptPath}.`,
    "Treat that file as the authoritative task contract.",
    "Inspect it before editing, then parse/compile/run/verify declared outputs before finishing.",
  ].join(" ");
  args.push(handoffGoal);
  payload.command = [agintiCommand.command, ...args];
  payload.backendCommand = { name: "aginti", command: agintiCommand.command, source: agintiCommand.source };
  payload.handoffMode = "file";
  payload.handoffGoal = handoffGoal;
  const auditStartedAtMs = Date.now();
  const result = childProcess.spawnSync(agintiCommand.command, args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: options.json ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, PATH: agintiCommand.pathEnv || process.env.PATH || "" },
  });
  payload.executed = true;
  payload.exitCode = result.status ?? 1;
  payload.signal = result.signal || "";
  payload.postRunAudit = auditAapsBackendResult(projectDir, options.auditFile || "", {
    scope: String(options.auditScope || "entry").toLowerCase() === "project" ? "project" : "entry",
    sinceMs: auditStartedAtMs,
  });
  payload.postPromptGitCheckpoint = Versioning.createGitCheckpoint(projectDir, {
    label: "after-aginti-prompt",
    reason: "post_aginti_prompt",
    entryFile: options.auditFile || "",
    initGit: true,
  });
  if (payload.exitCode === 0 && payload.postRunAudit.ok) payload.status = "succeeded_verified";
  else if (payload.exitCode === 0) payload.status = "backend_returned_unverified";
  else payload.status = "failed";
  if (options.json) {
    payload.stdout = result.stdout || "";
    payload.stderr = result.stderr || result.error?.message || "";
    payload.ok = payload.exitCode === 0 && payload.postRunAudit.ok;
    print(payload, true);
  }
  process.exit(payload.ok ? 0 : payload.exitCode || 1);
}

function runRunner(command, file, options) {
  const projectDir = path.resolve(options.project || ".");
  const runnerFile = path.isAbsolute(file) ? toProjectPath(path.relative(projectDir, file)) : file;
  const args = [
    path.join(__dirname, "aaps-runner.js"),
    command,
    "--project",
    ".",
    "--file",
    runnerFile,
  ];
  if (options.block) args.push("--block", options.block);
  if (options.runRoot) args.push("--run-root", options.runRoot);
  if (options.runId) args.push("--run-id", options.runId);
  (Array.isArray(options.set) ? options.set : options.set ? [options.set] : []).forEach((item) => {
    args.push("--set", item);
  });
  if (options.dryRun) args.push("--dry-run");
  if (options.json) args.push("--json");
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.exit(result.status ?? 1);
}

function runCompiler(command, positional, options) {
  const projectDir = path.resolve(options.project || ".");
  const args = [path.join(__dirname, "aaps-compiler.js"), command];
  positional.forEach((item) => args.push(item));
  args.push("--project", ".");
  if (options.mode) args.push("--mode", options.mode);
  if (options.file && !positional.length) args.push("--file", options.file);
  if (options.compileId) args.push("--compile-id", options.compileId);
  if (options.json) args.push("--json");
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.exit(result.status ?? 1);
}

function commandParse(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const parsed = parseProjectAware(projectDir, fileArg);
  print(parsed.ir, true);
  process.exit(parsed.ir.diagnostics && parsed.ir.diagnostics.length ? 1 : 0);
}

function commandValidate(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  const fileMap = scanAapsFiles(projectDir);
  const files = Object.keys(fileMap).sort();
  const diagnostics = [];
  let ok = true;

  if (manifest) {
    const checked = AAPS.validateProjectManifest(manifest, files);
    diagnostics.push(...checked.diagnostics);
    ok = ok && checked.ok;
  }

  const targets = fileArg
    ? [resolveEntry(projectDir, manifest, fileArg)]
    : manifest
      ? AAPS.projectFileIndex(manifest).filter((file) => Object.prototype.hasOwnProperty.call(fileMap, file))
      : files;
  targets.forEach((file) => {
    const ir = manifest
      ? AAPS.parseAAPSProject(fileMap, file, manifest)
      : AAPS.parseAAPS(fileMap[file], { sourceFile: file });
    (ir.diagnostics || []).forEach((diagnostic) => {
      diagnostics.push({
        severity: "error",
        field: file,
        message: `line ${diagnostic.line || 1}: ${diagnostic.message}`,
      });
    });
  });
  ok = ok && !diagnostics.some((diagnostic) => diagnostic.severity === "error");

  const payload = {
    ok,
    project: manifest ? manifest.name : path.basename(projectDir),
    files: targets.length,
    diagnostics,
  };
  if (options.json) print(payload, true);
  else if (ok) print(`AAPS validation passed for ${targets.length} file${targets.length === 1 ? "" : "s"}.`, false);
  else print(JSON.stringify(payload, null, 2), false);
  process.exit(ok ? 0 : 1);
}

function commandAudit(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const payload = auditAapsBackendResult(projectDir, fileArg || "");
  payload.project = projectDir;
  if (options.json) print(payload, true);
  else if (payload.ok) print(`AAPS audit verified ${payload.workflowCount} workflow${payload.workflowCount === 1 ? "" : "s"}.`, false);
  else print(JSON.stringify(payload, null, 2), false);
  process.exit(payload.ok ? 0 : 1);
}

function commandGuide(topic, options) {
  const subject = String(topic || "blocks").toLowerCase();
  if (["report", "reports", "reporting", "recap", "artifact-report"].includes(subject)) {
    const payload = {
      ok: true,
      topic: "report",
      principles: AAPS.REPORT_RECAP_PRINCIPLES || [],
      prompt: AAPS.REPORT_RECAP_PROMPT || "",
      markdown: AAPS.reportParadigmMarkdown ? AAPS.reportParadigmMarkdown() : "",
    };
    if (options.json) print(payload, true);
    else print(payload.markdown, false);
    return;
  }
  if (!["block", "blocks", "block-design", "design"].includes(subject)) {
    throw new Error(`Unknown AAPS guide topic: ${topic}. Supported topics: blocks, report.`);
  }
  const payload = {
    ok: true,
    topic: "blocks",
    principles: AAPS.BLOCK_DESIGN_PRINCIPLES || [],
    archetypes: AAPS.BLOCK_ARCHETYPES || [],
    markdown: AAPS.blockDesignGuideMarkdown ? AAPS.blockDesignGuideMarkdown() : "",
  };
  if (options.json) print(payload, true);
  else print(payload.markdown, false);
}

function snapshotSummary(snapshot) {
  return [
    `snapshot: ${snapshot.id}`,
    `files: ${snapshot.fileCount}`,
    `path: ${snapshot.projectSnapshotDir}`,
    snapshot.skippedCount ? `skipped: ${snapshot.skippedCount}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function commandSnapshot(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const snapshot = Versioning.createProjectSnapshot(projectDir, {
    label: options.label || fileArg || "manual",
    reason: options.reason || "cli_snapshot",
    entryFile: fileArg || "",
  });
  if (options.json) print(snapshot, true);
  else print(snapshotSummary(snapshot), false);
  process.exit(0);
}

function commandVersions(options) {
  const projectDir = path.resolve(options.project || ".");
  const payload = Versioning.listProjectSnapshots(projectDir, { limit: Number(options.limit || 120) });
  if (options.json) print(payload, true);
  else if (!payload.items.length) print("No AAPS project snapshots found.", false);
  else {
    print(
      payload.items
        .map((item) => `${item.time || ""} ${item.id || ""} ${item.label || item.reason || ""} ${item.snapshotDir || ""}`.trim())
        .join("\n"),
      false
    );
  }
  process.exit(0);
}

function commandCheckpoint(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const payload = Versioning.createGitCheckpoint(projectDir, {
    label: options.label || fileArg || "manual",
    reason: options.reason || "cli_checkpoint",
    entryFile: fileArg || "",
    initGit: Boolean(options.initGit),
  });
  if (options.json) print(payload, true);
  else if (payload.committed) print(`AAPS git checkpoint ${payload.commit}: ${payload.message}`, false);
  else if (payload.ok) print(`AAPS git checkpoint skipped: ${payload.status}`, false);
  else print(`AAPS git checkpoint failed: ${payload.error || payload.status}`, false);
  process.exit(payload.ok ? 0 : 1);
}

function commandStudio(options) {
  const root = path.resolve(__dirname, "..");
  const projectDir = path.resolve(options.project || ".");
  const host = String(options.host || "127.0.0.1");
  const ui = normalizeStudioUi(options.ui);
  const port = String(options.port || (ui === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT));
  const env = { ...process.env };
  if (options.mockCodex) env.AAPS_MOCK_CODEX = "1";
  env.AAPS_STUDIO_PROJECT = projectDir;
  env.AAPS_STUDIO_UI = ui;
  const args = [
    path.join(root, "backend", "aaps_codex_server.py"),
    "--host",
    host,
    "--port",
    port,
    "--ui",
    ui,
  ];
  const python = resolvePythonLauncher({ env, cwd: projectDir });
  if (!python.ok) {
    console.error(python.error);
    process.exit(1);
  }
  const result = childProcess.spawnSync(python.command, [...python.prefixArgs, ...args], {
    cwd: projectDir,
    env,
    stdio: "inherit",
  });
  process.exit(result.status || 0);
}

const WEBAPP_ACTIONS = new Set(["start", "stop", "restart", "reuse", "enable", "disable", "status"]);
const WEBAPP_UIS = new Set(["classic", "simple"]);

function parseWebappAction(values = [], defaultPort = "", defaultUi = "classic") {
  let action = "start";
  let ui = normalizeStudioUi(defaultUi);
  let port = defaultPort || (ui === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT);
  let explicitPort = Boolean(defaultPort);
  const tokens = values.map((value) => String(value || "").trim()).filter(Boolean);
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (WEBAPP_ACTIONS.has(lower)) action = lower;
    else if (WEBAPP_UIS.has(lower)) ui = lower;
    else if (/^\d+$/.test(token)) {
      port = token;
      explicitPort = true;
    }
    else return { action: lower, port, valid: false };
  }
  if (!explicitPort) port = ui === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT;
  return { action, port, ui, valid: true };
}

async function commandWebapp(options, { manual = true, action = "start" } = {}) {
  const projectDir = path.resolve(options.project || ".");
  const host = String(options.host || "127.0.0.1");
  const ui = normalizeStudioUi(options.ui);
  const preferredPort = options.port || (ui === "simple" ? DEFAULT_SIMPLE_PORT : DEFAULT_PORT);
  const packageDir = path.resolve(__dirname, "..");
  const normalizedAction = WEBAPP_ACTIONS.has(String(action).toLowerCase()) ? String(action).toLowerCase() : "start";
  if (normalizedAction === "enable" || normalizedAction === "disable" || normalizedAction === "status") {
    const preference =
      normalizedAction === "status"
        ? readWebAppPreference()
        : writeWebAppPreference({ autoStart: normalizedAction === "enable" });
    const payload = {
      ok: true,
      action: normalizedAction,
      autoStart: Boolean(preference.autoStart),
      preferencePath: preference.path || "",
      url: "",
      host,
      port: Number(preferredPort),
      ui,
      started: false,
      reused: false,
      restarted: false,
      stopped: false,
      alreadyStopped: false,
      disabled: preference.autoStart === false,
      error: "",
    };
    if (options.silent) return payload;
    if (options.json) print(payload, true);
    else {
      const state = payload.autoStart ? "enabled" : "disabled";
      console.log(`AAPS Studio auto-start ${state}.`);
      if (!payload.autoStart) console.log("Use `aaps webapp stop` or `/webapp stop` to stop a currently running Studio.");
    }
    return payload;
  }
  const webOptions = {
    packageDir,
    cwd: projectDir,
    host,
    preferredPort,
    ui,
  };
  const result =
    normalizedAction === "stop"
      ? await stopAapsWebApp(webOptions)
      : await ensureAapsWebApp({
          ...webOptions,
          mockCodex: Boolean(options.mockCodex),
          restart: normalizedAction === "restart",
          respectAutoStartDisable: !manual,
        });
  const payload = {
    ok: Boolean(result.ok),
    url: result.url || "",
    host: result.host || host,
    port: result.port || 0,
    ui,
    started: Boolean(result.started),
    reused: Boolean(result.reused),
    restarted: Boolean(result.restarted),
    stopped: normalizedAction === "stop" && Boolean(result.stopped),
    alreadyStopped: Boolean(result.alreadyStopped),
    disabled: Boolean(result.disabled),
    error: result.error || "",
    python: result.python || null,
    logPath: result.logPath || "",
  };
  if (options.silent) return payload;
  if (options.json) print(payload, true);
  else if (payload.ok) {
    const state = payload.stopped
      ? "stopped"
      : payload.alreadyStopped
        ? "already stopped"
        : payload.restarted
          ? "restarted"
          : payload.reused
            ? "reused"
            : "started";
    console.log(`AAPS Studio ${ui === "simple" ? "simple " : ""}${state}: ${payload.url}`);
  } else if (payload.disabled) {
    console.log("AAPS Studio auto-start disabled. Run `aaps webapp` or `/webapp` from `aaps chat`.");
  } else {
    console.error(`AAPS Studio unavailable: ${payload.error || "unknown error"}`);
  }
  return payload;
}

async function commandDoctor(options) {
  const projectDir = path.resolve(options.project || ".");
  const host = String(options.host || "127.0.0.1");
  const port = Number(options.port || DEFAULT_PORT);
  const aapsPaths = allExecutableCommandPaths("aaps", projectDir);
  const firstAaps = aapsPaths[0] || "";
  const runningScript = path.resolve(__filename);
  const firstAapsReal = firstAaps ? fs.realpathSync(firstAaps) : "";
  const runningScriptReal = fs.realpathSync(runningScript);
  const python = resolvePythonLauncher({ env: process.env, cwd: projectDir });
  const webPreference = readWebAppPreference();
  const health = await fetchHealthDetails(host, port, 600);
  const nodeMajor = Number(String(process.versions.node || "0").split(".")[0]);
  const problems = [];
  const warnings = [];
  if (nodeMajor < 18) problems.push("Node.js 18+ is required for AAPS. Install a current LTS with nvm/fnm/NodeSource/Homebrew and reinstall AAPS.");
  if (!python.ok) problems.push("Python 3 is not available for AAPS Studio. `aaps webapp` and `aaps studio` need Python 3.");
  if (aapsPaths.length > 1) warnings.push("Multiple `aaps` executables are visible on PATH. If an old install runs first, remove the stale npm-global shim or put the desired Node manager bin first.");
  if (firstAaps && firstAapsReal !== runningScriptReal && !runningScript.includes("node_modules")) {
    warnings.push(`The first PATH match is ${firstAaps}; this running script is ${runningScript}. Check PATH order if versions look inconsistent.`);
  }
  const payload = {
    ok: problems.length === 0,
    packageVersion: packageVersion(),
    platform: `${process.platform} ${process.arch}`,
    project: projectDir,
    node: {
      ok: nodeMajor >= 18,
      version: process.version,
      execPath: process.execPath,
    },
    aaps: {
      script: runningScript,
      paths: aapsPaths.slice(0, 12),
      hiddenPathCount: Math.max(0, aapsPaths.length - 12),
    },
    python,
    webapp: {
      url: `http://${host}:${port}`,
      autoStart: webPreference.autoStart !== false,
      preferencePath: webPreference.path || "",
      health,
    },
    problems,
    warnings,
    recovery: {
      node: "Use nvm/fnm/Volta/Homebrew/NodeSource for Node 18+; remove stale ~/.npm-global AAPS shims when switching Node managers.",
      python: "Install Python 3 and set AAPS_PYTHON_BIN if it is not on PATH.",
      webapp: "Use `aaps webapp restart`, `aaps webapp stop`, `aaps webapp disable`, or `aaps webapp enable` to control Studio auto-start.",
    },
  };
  if (options.json) print(payload, true);
  else {
    console.log(`AAPS doctor v${payload.packageVersion}`);
    console.log(`platform: ${payload.platform}`);
    console.log(`project: ${payload.project}`);
    console.log(`node: ${payload.node.ok ? "ok" : "problem"} ${payload.node.version} at ${payload.node.execPath}`);
    console.log(`python: ${python.ok ? `ok ${python.version} via ${python.label}` : "missing"}`);
    console.log(`webapp: ${payload.webapp.health.ok ? "running" : "not running"} ${payload.webapp.url} autoStart=${payload.webapp.autoStart}`);
    if (aapsPaths.length) {
      console.log("aaps paths:");
      payload.aaps.paths.forEach((item, index) => console.log(`  ${index + 1}. ${item}`));
      if (payload.aaps.hiddenPathCount) console.log(`  ... ${payload.aaps.hiddenPathCount} more`);
    }
    if (problems.length) {
      console.log("problems:");
      problems.forEach((problem) => console.log(`  - ${problem}`));
    }
    if (warnings.length) {
      console.log("warnings:");
      warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
  }
  return payload;
}

function chatHelp() {
  return [
    "AAPS chat commands:",
    "  /webapp [simple|port|start|stop|restart|reuse|enable|disable|status]  Control AAPS Studio and auto-start.",
    "  /session [id]           Show or switch the shared web/terminal chat session.",
    "  /sessions               List sessions stored in .aaps-work/aaps-sessions.sqlite.",
    "  /history                Print the synced session history from Studio.",
    "  /status                 Show project manifest, active file, and backend.",
    "  /files                  List project .aaps files.",
    "  /validate [file]        Validate the project or selected file.",
    "  /parse <file>           Parse a .aaps file.",
    "  /manifest <file> [mode] Manifest/check/apply a .aaps file.",
    "  /compile <file> [mode]  Alias for /manifest.",
    "  /check <file>           Compile check shortcut.",
    "  /run <file>             Run a .aaps file.",
    "  /backend <name>         Set prompt backend: codex, aginti, or print.",
    "  /codex                  Use Codex for plain-message backend work.",
    "  /aginti                 Use AgInTiFlow for plain-message backend work.",
    "  /print                  Save/print backend handoff without executing it.",
    "  /update                 Check npm for a newer global AAPS release.",
    "  /exit                   Exit the CLI.",
    "",
    "Editing: Ctrl-J inserts a newline; Enter submits; Left/Right, Home/End, Ctrl-A/E/U/K, Delete, and Backspace work in TTY mode.",
    "History: Up/Down recalls previous messages from an empty prompt or moves within a multi-line prompt.",
    "Plain messages use the running Studio backend when available, so web and terminal share the same session history.",
  ].join("\n");
}

function projectStatusText(projectDir, backend = "codex") {
  const manifest = readManifest(projectDir);
  const lines = [];
  if (!manifest) {
    lines.push(`project: ${projectDir}`);
    lines.push("manifest: missing aaps.project.json");
    lines.push(`backend: ${backend}`);
    return lines.join("\n");
  }
  const files = Object.keys(scanAapsFiles(projectDir)).sort();
  lines.push(`project: ${projectDir}`);
  lines.push(`name: ${manifest.name || path.basename(projectDir)}`);
  lines.push(`backend: ${backend}`);
  lines.push(`activeFile: ${manifest.activeFile || "(none)"}`);
  lines.push(`defaultMain: ${manifest.defaultMain || "(none)"}`);
  lines.push(`aapsFiles: ${files.length}`);
  return lines.join("\n");
}

function printProjectStatus(projectDir, backend = "codex") {
  printStateMessage(projectStatusText(projectDir, backend));
}

function projectFilesText(projectDir) {
  const files = Object.keys(scanAapsFiles(projectDir)).sort();
  if (!files.length) return "No .aaps files found in this project.";
  return files.map((file, index) => `${String(index + 1).padStart(2, " ")}. ${file}`).join("\n");
}

function runCliAndPrint(projectDir, args) {
  const result = runCliInProject(projectDir, args, { capture: true });
  const stdout = String(result.stdout || "").trimEnd();
  const stderr = String(result.stderr || result.error?.message || "").trimEnd();
  if (stdout) printAapsMessage(stdout);
  if (stderr) printErrorMessage(stderr);
  if ((result.status ?? 0) !== 0 && !stderr) printErrorMessage(`command failed with exit code ${result.status}`);
  return result;
}

function normalizeSessionId(value = "default") {
  const raw = String(value || "default").trim();
  return raw.replace(/[^0-9A-Za-z_.-]+/g, "_").slice(0, 80) || "default";
}

function httpJsonRequest(url, payload = null, timeoutMs = 15 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const parsed = new URL(url);
    const request = http.request(
      {
        method: payload ? "POST" : "GET",
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: timeoutMs,
        headers: payload
          ? {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(body),
            }
          : {},
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          let json = {};
          try {
            json = JSON.parse(responseBody || "{}");
          } catch (error) {
            reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
            return;
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(json.error || `${url} returned ${response.statusCode}`));
            return;
          }
          resolve(json);
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error(`Timed out calling ${url}`)));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function responseTextFromWebChat(payload = {}) {
  const result = payload.result && typeof payload.result === "object" ? payload.result : payload;
  if (typeof result.message === "string") return result.message;
  if (typeof result.summary === "string") return result.summary;
  return JSON.stringify(result, null, 2);
}

function historyMessagesFromEvents(events = []) {
  const rows = [];
  events.forEach((event) => {
    if (event.message) rows.push({ role: "You", text: event.message });
    const response = event.response || {};
    const text = typeof response === "string" ? response : response.message || response.summary || "";
    if (text) rows.push({ role: "AAPS", text });
  });
  return rows;
}

function formatSessionsTable(sessions = [], activeSessionId = "default") {
  if (!sessions.length) return "No AAPS sessions have been registered yet.";
  return sessions
    .map((session) => {
      const marker = session.sessionId === activeSessionId ? "*" : " ";
      const name = session.name && session.name !== session.sessionId ? ` ${session.name}` : "";
      const cwd = session.commandCwd || session.projectRoot || "";
      const count = Number(session.historyCount || 0);
      return `${marker} ${session.sessionId}${name} | messages=${count} | cwd=${cwd}`;
    })
    .join("\n");
}

class ComposerHistory {
  constructor(entries = []) {
    this.entries = [];
    this.cursor = null;
    this.draft = "";
    this.lastRecalledText = null;
    entries.forEach((entry) => this.record(entry));
  }

  record(value) {
    const text = String(value || "");
    if (text.trim() && this.entries[this.entries.length - 1] !== text) this.entries.push(text);
    this.resetBrowsing();
  }

  resetBrowsing() {
    this.cursor = null;
    this.draft = "";
    this.lastRecalledText = null;
  }

  shouldNavigate(buffer = "", direction = -1) {
    if (!this.entries.length) return false;
    const text = String(buffer || "");
    if (!text) return direction < 0;
    return this.cursor !== null && text === this.lastRecalledText;
  }

  navigate(buffer, direction) {
    if (!this.shouldNavigate(buffer, direction)) return null;
    if (this.cursor === null) {
      this.cursor = this.entries.length;
      this.draft = String(buffer || "");
    }
    if (direction < 0) {
      this.cursor = Math.max(this.cursor - 1, 0);
    } else if (this.cursor >= this.entries.length - 1) {
      const draft = this.draft;
      this.resetBrowsing();
      return { buffer: draft, cursor: draft.length, browsing: false };
    } else {
      this.cursor += 1;
    }
    const recalled = this.entries[this.cursor] || "";
    this.lastRecalledText = recalled;
    return { buffer: recalled, cursor: recalled.length, browsing: true };
  }
}

const SLASH_COMMANDS = [
  "/help",
  "/webapp",
  "/session",
  "/sessions",
  "/history",
  "/status",
  "/files",
  "/validate",
  "/parse",
  "/manifest",
  "/compile",
  "/check",
  "/run",
  "/backend",
  "/codex",
  "/aginti",
  "/print",
  "/update",
  "/exit",
];

function autocompleteSlashCommand(buffer) {
  const text = String(buffer || "");
  if (!text.startsWith("/") || /\s/.test(text)) return text;
  const matches = SLASH_COMMANDS.filter((command) => command.startsWith(text));
  return matches.length === 1 ? matches[0] : text;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function insertAt(buffer, cursor, text) {
  const safeCursor = clamp(cursor, 0, buffer.length);
  const next = `${buffer.slice(0, safeCursor)}${text}${buffer.slice(safeCursor)}`;
  return { buffer: next, cursor: safeCursor + String(text).length };
}

function removeBefore(buffer, cursor) {
  const safeCursor = clamp(cursor, 0, buffer.length);
  if (safeCursor === 0) return { buffer, cursor: safeCursor };
  return { buffer: `${buffer.slice(0, safeCursor - 1)}${buffer.slice(safeCursor)}`, cursor: safeCursor - 1 };
}

function removeAt(buffer, cursor) {
  const safeCursor = clamp(cursor, 0, buffer.length);
  if (safeCursor >= buffer.length) return { buffer, cursor: safeCursor };
  return { buffer: `${buffer.slice(0, safeCursor)}${buffer.slice(safeCursor + 1)}`, cursor: safeCursor };
}

function lineBounds(buffer, cursor) {
  const safeCursor = clamp(cursor, 0, buffer.length);
  const start = buffer.lastIndexOf("\n", safeCursor - 1) + 1;
  const nextBreak = buffer.indexOf("\n", safeCursor);
  return { start, end: nextBreak === -1 ? buffer.length : nextBreak };
}

function promptRows(buffer) {
  const rows = String(buffer || "").split("\n");
  return rows.length ? rows : [""];
}

function cursorLocation(buffer, cursor) {
  const before = String(buffer || "").slice(0, clamp(cursor, 0, String(buffer || "").length));
  const rows = before.split("\n");
  return { row: rows.length - 1, column: rows[rows.length - 1].length };
}

function clearRenderedPrompt(renderedLines) {
  if (!renderedLines) return;
  process.stdout.write("\r");
  if (renderedLines > 1) process.stdout.write(`\x1b[${renderedLines - 1}A`);
  process.stdout.write("\x1b[J");
}

function renderPromptBuffer(buffer, cursor, renderedLines) {
  clearRenderedPrompt(renderedLines);
  const rows = promptRows(buffer);
  rows.forEach((row, index) => {
    const prompt = index === 0 ? label("user>", ansi.userBg) : label("", ansi.userBg);
    if (index > 0) process.stdout.write("\n");
    process.stdout.write(`${prompt} ${row}`);
  });
  const location = cursorLocation(buffer, cursor);
  const up = rows.length - 1 - location.row;
  if (up > 0) process.stdout.write(`\x1b[${up}A`);
  process.stdout.write("\r");
  const promptColumn = PROMPT_LABEL_WIDTH + 3 + location.column;
  if (promptColumn > 0) process.stdout.write(`\x1b[${promptColumn}C`);
  return rows.length;
}

async function readComposerLine(history) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    return null;
  }
  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  let buffer = "";
  let cursor = 0;
  let renderedLines = 0;
  let closed = false;
  let keypressHandler = null;
  let preferredColumn = null;

  function render() {
    renderedLines = renderPromptBuffer(buffer, cursor, renderedLines);
  }

  function closeRaw() {
    if (closed) return;
    closed = true;
    if (keypressHandler) process.stdin.off("keypress", keypressHandler);
    process.stdin.setRawMode(Boolean(wasRaw));
    if (!wasRaw) process.stdin.pause();
    process.stdout.write(ansi.cursorShow);
  }

  return await new Promise((resolve) => {
    function finish(value) {
      clearRenderedPrompt(renderedLines);
      closeRaw();
      if (String(value || "").trim()) printStripe("user>", value, ansi.userBg);
      resolve(value);
    }

    function insertText(value) {
      history.resetBrowsing();
      ({ buffer, cursor } = insertAt(buffer, cursor, String(value || "").replace(/\r/g, "")));
      preferredColumn = null;
      render();
    }

    function moveVertical(direction) {
      const historyNext = history.navigate(buffer, direction);
      if (historyNext) {
        buffer = historyNext.buffer;
        cursor = historyNext.cursor;
        preferredColumn = null;
        render();
        return;
      }
      const rows = promptRows(buffer);
      const location = cursorLocation(buffer, cursor);
      const targetRow = location.row + direction;
      if (targetRow < 0 || targetRow >= rows.length) return;
      const wantedColumn = preferredColumn ?? location.column;
      let nextCursor = 0;
      for (let index = 0; index < targetRow; index += 1) nextCursor += rows[index].length + 1;
      nextCursor += Math.min(wantedColumn, rows[targetRow].length);
      cursor = clamp(nextCursor, 0, buffer.length);
      preferredColumn = wantedColumn;
      history.resetBrowsing();
      render();
    }

    keypressHandler = function onKeypress(str, key = {}) {
      if (key.ctrl && key.name === "c") {
        closeRaw();
        process.stdout.write("\n");
        process.exit(130);
      }
      if (key.ctrl && key.name === "d" && !buffer) {
        finish(null);
        return;
      }
      if ((key.ctrl && key.name === "j") || key.sequence === "\n" || str === "\n") {
        if (!buffer) {
          render();
          return;
        }
        insertText("\n");
        return;
      }
      if (str === "\r" || key.sequence === "\r" || key.name === "return" || key.name === "enter") {
        finish(buffer);
        return;
      }
      if (key.name === "escape") {
        buffer = "";
        cursor = 0;
        preferredColumn = null;
        history.resetBrowsing();
        render();
        return;
      }
      if (key.name === "up") {
        moveVertical(-1);
        return;
      }
      if (key.name === "down") {
        moveVertical(1);
        return;
      }
      if (key.name === "left") {
        history.resetBrowsing();
        cursor = Math.max(cursor - 1, 0);
        preferredColumn = null;
        render();
        return;
      }
      if (key.name === "right") {
        history.resetBrowsing();
        cursor = Math.min(cursor + 1, buffer.length);
        preferredColumn = null;
        render();
        return;
      }
      if ((key.ctrl && key.name === "a") || key.name === "home") {
        history.resetBrowsing();
        cursor = lineBounds(buffer, cursor).start;
        preferredColumn = null;
        render();
        return;
      }
      if ((key.ctrl && key.name === "e") || key.name === "end") {
        history.resetBrowsing();
        cursor = lineBounds(buffer, cursor).end;
        preferredColumn = null;
        render();
        return;
      }
      if (key.name === "backspace") {
        history.resetBrowsing();
        ({ buffer, cursor } = removeBefore(buffer, cursor));
        preferredColumn = null;
        render();
        return;
      }
      if (key.name === "delete") {
        history.resetBrowsing();
        ({ buffer, cursor } = removeAt(buffer, cursor));
        preferredColumn = null;
        render();
        return;
      }
      if (key.ctrl && key.name === "u") {
        history.resetBrowsing();
        const bounds = lineBounds(buffer, cursor);
        buffer = `${buffer.slice(0, bounds.start)}${buffer.slice(cursor)}`;
        cursor = bounds.start;
        preferredColumn = null;
        render();
        return;
      }
      if (key.ctrl && key.name === "k") {
        history.resetBrowsing();
        const bounds = lineBounds(buffer, cursor);
        buffer = `${buffer.slice(0, cursor)}${buffer.slice(bounds.end)}`;
        preferredColumn = null;
        render();
        return;
      }
      if (key.name === "tab") {
        buffer = autocompleteSlashCommand(buffer);
        cursor = buffer.length;
        preferredColumn = null;
        history.resetBrowsing();
        render();
        return;
      }
      if (str && !key.ctrl && !key.meta && !String(key.sequence || "").startsWith("\x1b")) insertText(str);
    };

    process.stdout.write(ansi.cursorShow);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    render();
    process.stdin.on("keypress", keypressHandler);
  });
}

async function startChat(options) {
  const projectDir = path.resolve(options.project || ".");
  let backend = normalizePromptBackend(options.backend);
  let sessionId = normalizeSessionId(options.session || process.env.AAPS_SESSION_ID || "default");
  let webResult = { ok: false, url: "", error: "", disabled: Boolean(options.noWebapp) };
  if (!options.noWebapp) {
    webResult = await commandWebapp({ ...options, project: projectDir, silent: true }, { manual: false });
  }
  const notice = webResult.disabled
    ? "webapp auto-start disabled - use /webapp to start manually"
    : webResult.ok
      ? ""
      : `webapp unavailable - use /webapp to retry; error: ${compactLine(webResult.error || "unknown", 84)}`;
  printChatHeader({ webAppUrl: webResult.ok ? webResult.url : "", webAppNotice: notice, backend });
  printProjectStatus(projectDir, backend);
  printStateMessage(`session=${sessionId}${webResult.ok ? ` synced=${webResult.url}?session=${encodeURIComponent(sessionId)}` : ""}`);
  printAapsMessage(chatHelp());

  const history = new ComposerHistory();
  let activeWebPort = webResult.ok && webResult.port ? webResult.port : options.port || DEFAULT_PORT;
  let activeWebUrl = webResult.ok ? webResult.url : "";

  function activeProjectFile() {
    const manifest = readManifest(projectDir);
    return (manifest && (manifest.activeFile || manifest.defaultMain)) || "";
  }

  function activeProjectSource() {
    const file = activeProjectFile();
    if (!file) return "";
    try {
      return fs.readFileSync(safeRelative(projectDir, file, "active AAPS file"), "utf8");
    } catch (_error) {
      return "";
    }
  }

  async function touchWebSession(name = "") {
    if (!activeWebUrl) return null;
    try {
      const payload = await httpJsonRequest(
        `${activeWebUrl}/api/aaps/sessions`,
        {
          path: ".",
          sessionId,
          name: name || options.sessionName || sessionId,
          commandCwd: projectDir,
          activeFile: activeProjectFile(),
          backend,
          source: "terminal",
        },
        5000
      );
      return payload.session || null;
    } catch (error) {
      printStateMessage(`session registry sync failed: ${compactLine(error.message, 100)}`);
      return null;
    }
  }

  async function printSessions() {
    if (!activeWebUrl) {
      printAapsMessage("No running Studio backend is available for session listing. Start it with /webapp simple.");
      return false;
    }
    try {
      const query = new URLSearchParams({ path: "." });
      const payload = await httpJsonRequest(`${activeWebUrl}/api/aaps/sessions?${query.toString()}`, null, 5000);
      printStateMessage(`sessionDb=${payload.dbPath || ".aaps-work/aaps-sessions.sqlite"}`);
      printAapsMessage(formatSessionsTable(payload.sessions || [], sessionId));
      return true;
    } catch (error) {
      printErrorMessage(`Session listing failed: ${error.message}`);
      return false;
    }
  }

  async function setWebBackendIfAvailable() {
    if (!activeWebUrl || backend === "print") return;
    try {
      await httpJsonRequest(`${activeWebUrl}/api/aaps/settings`, { agentProvider: backend }, 5000);
    } catch (error) {
      printStateMessage(`web settings sync failed: ${compactLine(error.message, 100)}`);
    }
  }

  async function printSyncedHistory() {
    if (!activeWebUrl) {
      printAapsMessage("No running Studio backend is available for synced history. Start it with /webapp simple.");
      return false;
    }
    try {
      const query = new URLSearchParams({ path: ".", scope: "session", id: sessionId });
      const payload = await httpJsonRequest(`${activeWebUrl}/api/aaps/history?${query.toString()}`, null, 5000);
      const rows = historyMessagesFromEvents(payload.events || []);
      if (!rows.length) printAapsMessage(`No messages in synced session "${sessionId}" yet.`);
      else rows.forEach((row) => (row.role === "You" ? printStripe("user>", row.text, ansi.userBg) : printAapsMessage(row.text)));
      return true;
    } catch (error) {
      printErrorMessage(`History sync failed: ${error.message}`);
      return false;
    }
  }

  async function sendSyncedChat(message) {
    if (!activeWebUrl || backend === "print") return false;
    await touchWebSession();
    await setWebBackendIfAvailable();
    const activeFile = activeProjectFile();
    const payload = await httpJsonRequest(
      `${activeWebUrl}/api/aaps/chat`,
      {
        path: ".",
        file: activeFile,
        sessionId,
        source: activeProjectSource(),
        message,
        forceRealBackend: true,
        context: {
          tab: "terminal",
          projectPath: ".",
          activeFile,
          workingFile: activeFile,
          sessionId,
          sessionName: options.sessionName || sessionId,
          commandCwd: projectDir,
          cwd: projectDir,
          focus: { type: "terminal", id: sessionId, label: `terminal session ${sessionId}` },
        },
      },
      Number(options.chatTimeoutMs || 15 * 60 * 1000)
    );
    printAapsMessage(responseTextFromWebChat(payload));
    return true;
  }

  if (activeWebUrl) await touchWebSession();

  async function handleLine(rawLine) {
    const line = String(rawLine || "").trim();
    if (!line) {
      return false;
    }
    history.record(line);
    if (line === "/exit" || line === "/quit" || line === "exit" || line === "quit") return true;
    if (line === "/help" || line === "help") {
      printAapsMessage(chatHelp());
      return false;
    }
    if (line.startsWith("/webapp") || line.startsWith("/web ")) {
      const words = splitCliWords(line);
      const parsedWebapp = parseWebappAction(words.slice(1), activeWebPort);
      if (!parsedWebapp.valid) {
        printAapsMessage("Usage: /webapp [simple|port|start|stop|restart|reuse|enable|disable|status]");
        return false;
      }
      const payload = await commandWebapp({ ...options, project: projectDir, port: parsedWebapp.port, ui: parsedWebapp.ui, json: false }, { manual: true, action: parsedWebapp.action });
      if (payload.port) activeWebPort = payload.port;
      activeWebUrl = payload.ok && payload.url && !payload.stopped && !payload.alreadyStopped ? payload.url : "";
      if (activeWebUrl) await touchWebSession();
      return false;
    }
    if (line === "/sessions") {
      await printSessions();
      return false;
    }
    if (line.startsWith("/session")) {
      const words = splitCliWords(line);
      if (words[1]) {
        sessionId = normalizeSessionId(words[1]);
        if (activeWebUrl) await touchWebSession(words.slice(2).join(" ") || sessionId);
        printStateMessage(`session=${sessionId}${activeWebUrl ? ` synced=${activeWebUrl}?session=${encodeURIComponent(sessionId)}` : ""}`);
      } else {
        printStateMessage(`session=${sessionId}${activeWebUrl ? ` synced=${activeWebUrl}?session=${encodeURIComponent(sessionId)}` : ""}`);
      }
      return false;
    }
    if (line === "/history") {
      await printSyncedHistory();
      return false;
    }
    if (line === "/codex" || line === "/aginti" || line === "/print" || line.startsWith("/backend")) {
      const words = splitCliWords(line);
      backend = normalizePromptBackend(line === "/codex" ? "codex" : line === "/aginti" ? "aginti" : line === "/print" ? "print" : words[1] || backend);
      printStateMessage(`backend=${backend}`);
      return false;
    }
    if (line === "/status") {
      printProjectStatus(projectDir, backend);
      return false;
    }
    if (line === "/files") {
      printAapsMessage(projectFilesText(projectDir));
      return false;
    }
    if (line.startsWith("/validate")) {
      const words = splitCliWords(line);
      runCliAndPrint(projectDir, ["validate", ...(words[1] ? [words[1]] : []), "--project", "."]);
      return false;
    }
    if (line.startsWith("/parse")) {
      const words = splitCliWords(line);
      if (!words[1]) printAapsMessage("Usage: /parse <file>");
      else runCliAndPrint(projectDir, ["parse", words[1], "--project", "."]);
      return false;
    }
    if (line.startsWith("/manifest") || line.startsWith("/compile") || line.startsWith("/check")) {
      const words = splitCliWords(line);
      if (!words[1]) printAapsMessage("Usage: /manifest <file> [check|suggest|apply|force]");
      else runCliAndPrint(projectDir, ["compile", words[1], "--project", ".", "--mode", line.startsWith("/check") ? "check" : words[2] || "check"]);
      return false;
    }
    if (line.startsWith("/run")) {
      const words = splitCliWords(line);
      if (!words[1]) printAapsMessage("Usage: /run <file>");
      else runCliAndPrint(projectDir, ["run", words[1], "--project", "."]);
      return false;
    }
    if (line === "/update") {
      await maybeAutoUpdate({
        argv: ["update"],
        manual: true,
        force: true,
        packageDir: path.resolve(__dirname, ".."),
        packageVersion: packageVersion(),
      });
      return false;
    }
    try {
      if (await sendSyncedChat(line)) return false;
    } catch (error) {
      printErrorMessage(`Synced Studio chat failed: ${error.message}`);
      printStateMessage("falling back to local prompt backend; this fallback is not synced to the web session");
    }
    runCliAndPrint(projectDir, ["prompt", line, "--project", ".", "--backend", backend]);
    return false;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    });
    rl.setPrompt("aaps> ");
    rl.prompt();
    for await (const rawLine of rl) {
      const done = await handleLine(rawLine);
      if (done) break;
      rl.prompt();
    }
    rl.close();
    return;
  }

  while (true) {
    const rawLine = await readComposerLine(history);
    if (rawLine === null) break;
    const done = await handleLine(rawLine);
    if (done) break;
  }
}

async function main() {
  const { command, positional, options } = parseArgs(process.argv);
  const file = positional[0];
  const knownCommands = new Set([
    "help",
    "--help",
    "-h",
    "version",
    "--version",
    "-v",
    "parse",
    "validate",
    "studio",
    "webapp",
    "web",
    "doctor",
    "chat",
    "interactive",
    "update",
    "upgrade",
    "compile",
    "manifest",
    "compile-project",
    "manifest-project",
    "missing",
    "generate-block",
    "generate-script",
    "prepare-setup",
    "plan",
    "check",
    "audit",
    "snapshot",
    "checkpoint",
    "versions",
    "guide",
    "run",
    "check-block",
    "run-block",
    "prompt",
  ]);
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(packageVersion());
    return;
  }
  if (command === "update" || command === "upgrade") {
    await maybeAutoUpdate({
      argv: ["update"],
      manual: true,
      force: true,
      packageDir: path.resolve(__dirname, ".."),
      packageVersion: packageVersion(),
    });
    return;
  }
  const autoUpdateResult = await maybeAutoUpdate({
    argv: process.argv.slice(2),
    force: Boolean(options.autoUpdate),
    packageDir: path.resolve(__dirname, ".."),
    packageVersion: packageVersion(),
    restart: true,
  });
  if (autoUpdateResult.restarted) process.exit(autoUpdateResult.exitCode ?? 0);
  if (command === "prompt") {
    commandPrompt(positional.join(" "), options);
    return;
  }
  if (command === "parse") {
    commandParse(file, options);
    return;
  }
  if (command === "validate") {
    commandValidate(file, options);
    return;
  }
  if (command === "audit") {
    commandAudit(file, options);
    return;
  }
  if (command === "snapshot") {
    commandSnapshot(file, options);
    return;
  }
  if (command === "checkpoint") {
    commandCheckpoint(file, options);
    return;
  }
  if (command === "versions") {
    commandVersions(options);
    return;
  }
  if (command === "guide") {
    commandGuide(file || "blocks", options);
    return;
  }
  if (command === "studio") {
    commandStudio(options);
    return;
  }
  if (command === "webapp" || command === "web") {
    const parsedWebapp = parseWebappAction(positional, options.port || "", options.ui);
    if (!parsedWebapp.valid) {
      console.error("Usage: aaps webapp [simple|start|stop|restart|reuse|enable|disable|status] [--port 8797] [--ui classic|simple] [--host 127.0.0.1]");
      process.exit(1);
    }
    const payload = await commandWebapp({ ...options, port: parsedWebapp.port, ui: parsedWebapp.ui }, { manual: true, action: parsedWebapp.action });
    process.exit(payload.ok ? 0 : 1);
  }
  if (command === "doctor") {
    const payload = await commandDoctor(options);
    process.exit(payload.ok ? 0 : 1);
  }
  if (command === "chat" || command === "interactive") {
    await startChat(options);
    return;
  }
  if (["compile", "manifest", "compile-project", "manifest-project", "missing", "generate-block", "generate-script", "prepare-setup"].includes(command)) {
    runCompiler(command === "manifest" ? "compile" : command === "manifest-project" ? "compile-project" : command, positional, options);
    return;
  }
  if (command === "plan" || command === "check" || command === "run") {
    if (!file) throw new Error(`aaps ${command} requires a .aaps file.`);
    runRunner(command, file, options);
    return;
  }
  if (command === "check-block") {
    if (!file) throw new Error("aaps check-block requires a .aaps file.");
    if (!options.block) throw new Error("aaps check-block requires --block <id>.");
    runRunner("check", file, options);
    return;
  }
  if (command === "run-block") {
    if (!file) throw new Error("aaps run-block requires a .aaps file.");
    if (!options.block) throw new Error("aaps run-block requires --block <id>.");
    runRunner("run", file, options);
    return;
  }
  if (!knownCommands.has(command)) {
    commandPrompt([command, ...positional].join(" "), options);
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

try {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
