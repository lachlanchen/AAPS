"use strict";

const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([".git", ".aaps-work", "node_modules", "vendor", "runtime", "__pycache__"]);
const INCLUDE_ROOT_FILES = new Set([
  "aaps.project.json",
  "README.md",
  "AGENTS.md",
  "package.json",
  "requirements.txt",
]);
const INCLUDE_DIRS = new Set([
  "workflows",
  "blocks",
  "skills",
  "scripts",
  "tools",
  "agents",
  "environments",
  "schemas",
  "docs",
  "notes",
  "reports",
  "publications",
]);
const INCLUDE_EXTENSIONS = new Set([
  ".aaps",
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".sh",
  ".bash",
  ".json",
  ".jsonl",
  ".md",
  ".txt",
  ".tex",
  ".bib",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".csv",
]);
const SECRET_FILE_RE = /(^|\/)(\.env|\.npmrc|npmrc|.*token.*|.*secret.*|.*credential.*)$/i;

function nowStamp(date = new Date()) {
  return date.toISOString().replace(/T/, "_").replace(/[:.]/g, "-").replace(/Z$/, "");
}

function nowIso() {
  return new Date().toISOString();
}

function slug(value, fallback = "snapshot") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function toProjectPath(file) {
  return String(file || "").split(path.sep).join("/");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonl(file, value) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

function hashFile(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function safeProjectPath(projectDir, value, label = "path") {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  const normalized = path.normalize(text);
  if (path.isAbsolute(normalized) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`${label} must be project-relative: ${value}`);
  }
  const resolved = path.resolve(projectDir, normalized);
  const relative = path.relative(projectDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} escapes project root: ${value}`);
  return resolved;
}

function versionRoot(projectDir) {
  return path.join(projectDir, ".aaps-work", "versions");
}

function indexPath(projectDir) {
  return path.join(versionRoot(projectDir), "snapshot-index.jsonl");
}

function includeFile(projectDir, file) {
  const rel = toProjectPath(path.relative(projectDir, file));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  if (SECRET_FILE_RE.test(rel)) return false;
  const parts = rel.split("/");
  if (parts.some((part) => SKIP_DIRS.has(part))) return false;
  if (parts.length === 1 && INCLUDE_ROOT_FILES.has(parts[0])) return true;
  if (INCLUDE_DIRS.has(parts[0]) && INCLUDE_EXTENSIONS.has(path.extname(rel).toLowerCase())) return true;
  if (path.extname(rel).toLowerCase() === ".aaps") return true;
  return false;
}

function collectVersionedFiles(projectDir, options = {}) {
  const maxFileBytes = Number(options.maxFileBytes || 5 * 1024 * 1024);
  const files = [];
  const skipped = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = toProjectPath(path.relative(projectDir, full));
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!includeFile(projectDir, full)) continue;
      const stat = fs.statSync(full);
      if (stat.size > maxFileBytes) {
        skipped.push({ file: rel, reason: `larger_than_${maxFileBytes}_bytes`, size: stat.size });
        continue;
      }
      files.push({ file: rel, full, size: stat.size, mtimeMs: Math.round(stat.mtimeMs) });
    }
  }
  walk(projectDir);
  return { files: files.sort((a, b) => a.file.localeCompare(b.file)), skipped };
}

function createProjectSnapshot(projectDir, options = {}) {
  const root = path.resolve(projectDir || ".");
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Project directory not found: ${projectDir}`);
  const id = `${nowStamp()}_${slug(options.label || options.reason || "manual")}`;
  const snapshotDir = path.join(versionRoot(root), "snapshots", id);
  const fileRoot = path.join(snapshotDir, "files");
  const collected = collectVersionedFiles(root, options);
  const records = [];
  ensureDir(fileRoot);
  for (const item of collected.files) {
    const target = path.join(fileRoot, item.file);
    ensureDir(path.dirname(target));
    fs.copyFileSync(item.full, target);
    records.push({
      file: item.file,
      size: item.size,
      mtimeMs: item.mtimeMs,
      sha256: hashFile(item.full),
      snapshotFile: toProjectPath(path.relative(root, target)),
    });
  }
  const manifest = {
    schema: "aaps_project_snapshot/0.1",
    ok: true,
    id,
    createdAt: nowIso(),
    project: root,
    label: String(options.label || ""),
    reason: String(options.reason || ""),
    entryFile: String(options.entryFile || ""),
    fileCount: records.length,
    skippedCount: collected.skipped.length,
    files: records,
    skipped: collected.skipped,
  };
  writeJson(path.join(snapshotDir, "snapshot.json"), manifest);
  const indexRecord = {
    id,
    time: manifest.createdAt,
    label: manifest.label,
    reason: manifest.reason,
    entryFile: manifest.entryFile,
    fileCount: manifest.fileCount,
    skippedCount: manifest.skippedCount,
    snapshotDir: toProjectPath(path.relative(root, snapshotDir)),
    manifest: toProjectPath(path.relative(root, path.join(snapshotDir, "snapshot.json"))),
  };
  appendJsonl(indexPath(root), indexRecord);
  return { ...manifest, snapshotDir, projectSnapshotDir: indexRecord.snapshotDir, manifestPath: path.join(snapshotDir, "snapshot.json"), projectManifestPath: indexRecord.manifest };
}

function listProjectSnapshots(projectDir, options = {}) {
  const root = path.resolve(projectDir || ".");
  const limit = Math.max(1, Number(options.limit || 120));
  const records = [];
  const file = indexPath(root);
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        const manifest = safeProjectPath(root, record.manifest || "", "snapshot manifest");
        if (fs.existsSync(manifest)) records.push(record);
      } catch (_error) {
        // Ignore malformed historical index rows.
      }
    }
  }
  records.sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  return {
    ok: true,
    project: root,
    indexPath: file,
    count: Math.min(records.length, limit),
    total: records.length,
    items: records.slice(0, limit),
  };
}

function runGit(projectDir, args, options = {}) {
  const result = childProcess.spawnSync("git", args, {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: Number(options.maxBuffer || 20 * 1024 * 1024),
    env: { ...process.env, ...(options.env || {}) },
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command: ["git", ...args],
  };
}

function commandAvailable(command) {
  const result = childProcess.spawnSync("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function gitRoot(projectDir) {
  const result = runGit(projectDir, ["rev-parse", "--show-toplevel"]);
  if (!result.ok) return "";
  return result.stdout.trim();
}

function ensureGitIgnore(projectDir) {
  const file = path.join(projectDir, ".gitignore");
  const additions = [
    ".env",
    ".npmrc",
    ".aaps-work/",
    "runtime/",
    "runs/",
    "artifacts/",
    "data/",
    "__pycache__/",
    "*.pyc",
    ".DS_Store",
  ];
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = new Set(existing.split(/\r?\n/).map((line) => line.trim()));
  const missing = additions.filter((line) => !lines.has(line));
  if (!missing.length) return { changed: false, file };
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(file, `${existing}${prefix}${missing.join("\n")}\n`, "utf8");
  return { changed: true, file };
}

function ensureGitRepo(projectDir, options = {}) {
  if (!commandAvailable("git")) {
    return { ok: false, status: "missing_git", error: "git command was not found", root: "", initialized: false };
  }
  if (options.initGit && !fs.existsSync(path.join(projectDir, ".git"))) {
    const init = runGit(projectDir, ["init"]);
    if (!init.ok) {
      return { ok: false, status: "git_init_failed", error: init.stderr || init.stdout, root: "", initialized: false };
    }
    ensureGitIgnore(projectDir);
    const root = gitRoot(projectDir) || projectDir;
    return { ok: true, status: "initialized_repo", root, initialized: true };
  }
  let root = gitRoot(projectDir);
  if (root) return { ok: true, status: "existing_repo", root, initialized: false };
  if (!options.initGit) {
    return { ok: false, status: "not_a_git_repo", error: "project is not a git repository", root: "", initialized: false };
  }
  const init = runGit(projectDir, ["init"]);
  if (!init.ok) {
    return { ok: false, status: "git_init_failed", error: init.stderr || init.stdout, root: "", initialized: false };
  }
  ensureGitIgnore(projectDir);
  root = gitRoot(projectDir) || projectDir;
  return { ok: true, status: "initialized_repo", root, initialized: true };
}

function checkpointPathspecs(projectDir) {
  const base = [
    ".gitignore",
    "aaps.project.json",
    "README.md",
    "AGENTS.md",
    "package.json",
    "requirements.txt",
    "workflows",
    "blocks",
    "skills",
    "scripts",
    "tools",
    "agents",
    "environments",
    "schemas",
    "docs",
    "notes",
    "reports",
    "publications",
    "references",
  ];
  return base.filter((item) => fs.existsSync(path.join(projectDir, item)));
}

function parsePorcelainStatus(stdout = "") {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2), file: line.slice(3) }));
}

function gitIdentityCommitArgs(projectDir, message) {
  const name = runGit(projectDir, ["config", "--get", "user.name"]);
  const email = runGit(projectDir, ["config", "--get", "user.email"]);
  const args = [];
  if (!name.ok || !name.stdout.trim()) args.push("-c", "user.name=AAPS");
  if (!email.ok || !email.stdout.trim()) args.push("-c", "user.email=aaps@local");
  args.push("commit", "-m", message);
  return args;
}

function createGitCheckpoint(projectDir, options = {}) {
  const root = path.resolve(projectDir || ".");
  const repo = ensureGitRepo(root, { initGit: Boolean(options.initGit) });
  if (!repo.ok) {
    return {
      ok: false,
      status: repo.status,
      project: root,
      error: repo.error,
      initialized: false,
      committed: false,
      commit: "",
      changedFiles: [],
    };
  }
  if (repo.initialized) ensureGitIgnore(root);
  const pathspecs = checkpointPathspecs(root);
  if (!pathspecs.length) {
    return { ok: true, status: "no_versioned_paths", project: root, root: repo.root, initialized: repo.initialized, committed: false, commit: "", changedFiles: [] };
  }
  const before = runGit(root, ["status", "--porcelain", "--", ...pathspecs]);
  const changedFiles = parsePorcelainStatus(before.stdout);
  if (!changedFiles.length) {
    return { ok: true, status: "clean", project: root, root: repo.root, initialized: repo.initialized, committed: false, commit: "", changedFiles: [] };
  }
  const add = runGit(root, ["add", "--", ...pathspecs]);
  if (!add.ok) {
    return { ok: false, status: "git_add_failed", project: root, root: repo.root, initialized: repo.initialized, committed: false, commit: "", changedFiles, error: add.stderr || add.stdout };
  }
  const labelText = slug(options.label || options.reason || "project-change", "project-change");
  const message = `AAPS checkpoint: ${labelText}`;
  const body = [
    options.reason ? `Reason: ${options.reason}` : "",
    options.sessionId ? `Session: ${options.sessionId}` : "",
    options.entryFile ? `Entry: ${options.entryFile}` : "",
    `Files: ${changedFiles.length}`,
  ].filter(Boolean);
  const commit = runGit(root, [...gitIdentityCommitArgs(root, message), ...body.flatMap((line) => ["-m", line])]);
  if (!commit.ok) {
    return { ok: false, status: "git_commit_failed", project: root, root: repo.root, initialized: repo.initialized, committed: false, commit: "", changedFiles, error: commit.stderr || commit.stdout };
  }
  const rev = runGit(root, ["rev-parse", "--short", "HEAD"]);
  return {
    ok: true,
    status: "committed",
    project: root,
    root: repo.root,
    initialized: repo.initialized,
    committed: true,
    commit: rev.ok ? rev.stdout.trim() : "",
    changedFiles,
    message,
  };
}

module.exports = {
  collectVersionedFiles,
  createProjectSnapshot,
  createGitCheckpoint,
  listProjectSnapshots,
  versionRoot,
};
