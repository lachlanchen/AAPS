#!/usr/bin/env node
"use strict";

const path = require("path");
const { ensureAapsWebApp } = require("../src/web-autostart");

const packageDir = path.resolve(__dirname, "..");
const cwd = process.env.INIT_CWD || process.cwd();

if (process.env.CI === "true" || process.env.AAPS_SKIP_POSTINSTALL_WEBAPP === "1") {
  process.exit(0);
}

ensureAapsWebApp({
  packageDir,
  cwd,
  host: process.env.AAPS_WEB_HOST || process.env.AAPS_HOST || "127.0.0.1",
  preferredPort: process.env.AAPS_WEB_PORT || process.env.AAPS_PORT || 8797,
}).catch(() => {
  // AAPS must remain installable even when Python, ports, or local policy block the optional Studio autostart.
});
