#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { ensureAapsWebApp } = require("../src/web-autostart");

const packageDir = path.resolve(__dirname, "..");
const cwd = process.env.INIT_CWD || process.cwd();

if (process.env.CI === "true" || process.env.AAPS_SKIP_POSTINSTALL_WEBAPP === "1") {
  process.exit(0);
}

const reportPath = path.join(process.env.AAPS_HOME || path.join(os.homedir(), ".aaps"), "webapp-postinstall.json");

ensureAapsWebApp({
  packageDir,
  cwd,
  host: process.env.AAPS_WEB_HOST || process.env.AAPS_HOST || "127.0.0.1",
  preferredPort: process.env.AAPS_WEB_PORT || process.env.AAPS_PORT || 8797,
}).then((result) => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2)}\n`, "utf8");
  if (!result.ok && !result.disabled) {
    const reason = String(result.error || "unknown startup error").split(/\r?\n/)[0];
    console.warn(`AAPS Studio did not auto-start after install: ${reason}`);
    console.warn(`Run \`aaps doctor\` or \`aaps webapp restart\` after fixing the environment. Report: ${reportPath}`);
  }
}).catch((error) => {
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify({ ok: false, error: error.message, at: new Date().toISOString() }, null, 2)}\n`, "utf8");
  } catch (_writeError) {
    // AAPS must remain installable even when diagnostics cannot be written.
  }
  console.warn(`AAPS Studio postinstall check failed: ${error.message}`);
  console.warn(`Run \`aaps doctor\` or \`aaps webapp restart\` after fixing the environment.`);
});
