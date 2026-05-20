import assert from "assert";
import childProcess from "child_process";
import fs from "fs";
import http from "http";
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const projectDir = path.join(repoRoot, ".aaps-work", "tests", "simple-browser-tdv");

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "google-chrome",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = childProcess.spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  throw new Error("No Chrome/Chromium executable found for browser TDV.");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 750 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on("error", reject);
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 10000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const health = await httpJson(`${baseUrl}/api/health`);
      if (health.ok && health.ui === "simple") return health;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error("Simple Studio did not become healthy.");
}

function prepareProject() {
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(projectDir, "workflows"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, "aaps.project.json"),
    JSON.stringify({ name: "Simple Browser TDV", activeFile: "workflows/main.aaps" }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "workflows", "main.aaps"),
    [
      'pipeline "Simple Browser TDV" {',
      '  domain "general"',
      "  task define_intent {",
      '    prompt "Prepare a structured AAPS workflow."',
      "  }",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
}

function extractTdvResults(dom) {
  const match = dom.match(/<script id="tdv-results" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`TDV results were not emitted. DOM tail:\n${dom.slice(-2000)}`);
  return JSON.parse(match[1]);
}

prepareProject();
const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
const server = childProcess.spawn(
  process.execPath,
  ["scripts/aaps.js", "studio", "--project", path.relative(repoRoot, projectDir), "--host", "127.0.0.1", "--port", String(port), "--ui", "simple", "--mock-codex"],
  { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] }
);

try {
  await waitForHealth(baseUrl);
  const chrome = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "aaps-simple-chrome-"));
  const result = childProcess.spawnSync(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      "--virtual-time-budget=10000",
      "--dump-dom",
      `${baseUrl}/?tdv=1`,
    ],
    { encoding: "utf8", timeout: 20000 }
  );
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const payload = extractTdvResults(result.stdout);
  assert.strictEqual(payload.ok, true, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
} finally {
  server.kill("SIGTERM");
  childProcess.spawnSync("pkill", ["-f", `aaps_codex_server.py --host 127.0.0.1 --port ${port}`]);
}
