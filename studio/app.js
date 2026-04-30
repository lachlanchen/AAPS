const sourceEl = document.getElementById("source");
const treeEl = document.getElementById("tree");
const irEl = document.getElementById("ir");
const diagnosticsEl = document.getElementById("diagnostics");
const irSummaryEl = document.getElementById("ir-summary");
const blockCountEl = document.getElementById("block-count");
const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");
const chatContextEl = document.getElementById("chat-context");
const chatStatusEl = document.getElementById("chat-status");
const chatCountEl = document.getElementById("chat-count");
const chatHistoryToggleEl = document.getElementById("chat-history-toggle");
const chatHistoryCloseEl = document.getElementById("chat-history-close");
const chatHistoryPanelEl = document.getElementById("chat-history-panel");
const chatHistoryOverlayEl = document.getElementById("chat-history-overlay");
const selectedLabelEl = document.getElementById("selected-label");
const inspectorFormEl = document.getElementById("inspector-form");
const projectManifestEl = document.getElementById("project-manifest");
const projectSummaryEl = document.getElementById("project-summary");
const projectFilesEl = document.getElementById("project-files");
const projectStructureEl = document.getElementById("project-structure");
const projectStatusEl = document.getElementById("project-status");
const projectFileCountEl = document.getElementById("project-file-count");
const projectPathEl = document.getElementById("project-path");
const runStatusEl = document.getElementById("run-status");
const runSummaryEl = document.getElementById("run-summary");
const runLogEl = document.getElementById("run-log");
const blockChatInputEl = document.getElementById("block-chat-input");
const blockLogEl = document.getElementById("block-log");
const blockReadinessEl = document.getElementById("block-readiness");
const projectFileTargetEl = document.getElementById("project-file-target");

const fields = {
  kind: document.getElementById("field-kind"),
  id: document.getElementById("field-id"),
  title: document.getElementById("field-title"),
  prompt: document.getElementById("field-prompt"),
  inputs: document.getElementById("field-inputs"),
  outputs: document.getElementById("field-outputs"),
  artifacts: document.getElementById("field-artifacts"),
  exec: document.getElementById("field-exec"),
  args: document.getElementById("field-args"),
  requirements: document.getElementById("field-requirements"),
  environment: document.getElementById("field-environment"),
  compileAgent: document.getElementById("field-compile-agent"),
  compilePrompt: document.getElementById("field-compile-prompt"),
  code: document.getElementById("field-code"),
  run: document.getElementById("field-run"),
  validations: document.getElementById("field-validations"),
  verify: document.getElementById("field-verify"),
  recovery: document.getElementById("field-recovery"),
  repair: document.getElementById("field-repair"),
  fallback: document.getElementById("field-fallback"),
  reviews: document.getElementById("field-reviews"),
};

let selectedRef = "";
let nodeRefs = new Map();
let openTextFile = "";
let currentProjectPayload = {
  manifest: AAPS.sampleProject,
  project_path: ".",
  files: AAPS.projectFileIndex(AAPS.sampleProject),
  manifest_exists: false,
};
let activeRunId = "";
let chatMessageCount = 0;
let activeTab = "lab";
let lastRuntimeResult = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getProjectManifest() {
  try {
    return AAPS.normalizeProjectManifest(JSON.parse(projectManifestEl.value || "{}"));
  } catch (error) {
    return { error: error.message };
  }
}

function renderProject(payload = currentProjectPayload) {
  currentProjectPayload = payload;
  const manifest = AAPS.normalizeProjectManifest(payload.manifest || AAPS.sampleProject);
  const files = payload.files && payload.files.length ? payload.files : AAPS.projectFileIndex(manifest);
  const scriptFiles = payload.script_files || [];
  const environmentFiles = payload.environment_files || [];
  const toolFiles = payload.tool_files || [];
  const agentFiles = payload.agent_files || [];
  const validation = AAPS.validateProjectManifest(manifest, files);
  const diagnostics = validation.diagnostics;
  const errorCount = diagnostics.filter((item) => item.severity === "error").length;
  const warningCount = diagnostics.filter((item) => item.severity === "warning").length;

  projectManifestEl.value = JSON.stringify(manifest, null, 2);
  projectPathEl.value = payload.project_path || projectPathEl.value || ".";
  projectStatusEl.textContent = errorCount
    ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
    : warningCount
      ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
      : "valid";
  projectFileCountEl.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
  projectStructureEl.textContent = AAPS.projectStructureText(manifest);

  projectSummaryEl.innerHTML = `
    <div><strong>${escapeHtml(manifest.name)}</strong> · ${escapeHtml(manifest.domain)} · ${escapeHtml(manifest.defaultMain)}</div>
    <div>${escapeHtml(manifest.description || "No project description.")}</div>
    <div class="project-kpis">
      <div class="project-kpi"><strong>${AAPS.projectFileIndex(manifest).length}</strong>manifest files</div>
      <div class="project-kpi"><strong>${scriptFiles.length}</strong>scripts</div>
      <div class="project-kpi"><strong>${manifest.tools.length}</strong>tools</div>
      <div class="project-kpi"><strong>${manifest.agents.length}</strong>agents</div>
      <div class="project-kpi"><strong>${environmentFiles.length}</strong>env files</div>
    </div>
    ${
      diagnostics.length
        ? `<div>${diagnostics
            .map((item) => `${escapeHtml(item.severity)}: ${escapeHtml(item.message)}`)
            .join("<br>")}</div>`
        : "<div>No project manifest diagnostics.</div>"
    }
  `;

  const aapsSections = AAPS.PROJECT_FILE_CATEGORIES.map((category) => {
    const categoryFiles = manifest.files[category] || [];
    if (!categoryFiles.length) return "";
    return `
      <section class="project-category">
        <h3>${escapeHtml(category)}</h3>
        ${categoryFiles
          .map(
            (file) => `
              <button class="project-file${file === manifest.activeFile ? " is-active" : ""}" type="button" data-project-file="${escapeHtml(file)}">
                <span>${escapeHtml(file)}</span>
                <span>${files.includes(file) ? "found" : "listed"}</span>
              </button>
            `
          )
          .join("")}
      </section>
    `;
  }).join("");
  const scriptSection = scriptFiles.length
    ? `
      <section class="project-category">
        <h3>scripts</h3>
        ${scriptFiles
          .map(
            (file) => `
              <button class="project-file${file === openTextFile ? " is-active" : ""}" type="button" data-project-text-file="${escapeHtml(file)}">
                <span>${escapeHtml(file)}</span>
                <span>script</span>
              </button>
            `
          )
          .join("")}
      </section>
    `
    : "";
  const textSection = [
    ["environments", environmentFiles, "env"],
    ["tools", toolFiles, "tool"],
    ["agents", agentFiles, "agent"],
  ]
    .map(([title, categoryFiles, label]) =>
      categoryFiles.length
        ? `
      <section class="project-category">
        <h3>${escapeHtml(title)}</h3>
        ${categoryFiles
          .map(
            (file) => `
              <button class="project-file${file === openTextFile ? " is-active" : ""}" type="button" data-project-text-file="${escapeHtml(file)}">
                <span>${escapeHtml(file)}</span>
                <span>${label}</span>
              </button>
            `
          )
          .join("")}
      </section>
    `
        : ""
    )
    .join("");
  projectFilesEl.innerHTML = aapsSections || scriptSection || textSection ? `${aapsSections}${scriptSection}${textSection}` : '<div class="message">No project files found.</div>';
}

function renderRuntime(record) {
  if (!record) {
    lastRuntimeResult = null;
    runStatusEl.textContent = "idle";
    runSummaryEl.innerHTML = '<div>No run has started.</div>';
    runLogEl.textContent = "";
    renderSelectedReadiness(null);
    return;
  }
  const result = record.result || record;
  lastRuntimeResult = result;
  runStatusEl.textContent = record.status || result.status || "unknown";
  const plan = result.plan || {};
  const failed = (result.results || []).filter((item) => item.status === "failed").length;
  const readiness = result.readiness || {};
  const readyBlocks = (readiness.blocks || []).filter((item) => item.ready).length;
  const compileRequests = result.compilePlan?.requests?.length || 0;
  runSummaryEl.innerHTML = `
    <div><strong>${escapeHtml(result.runId || record.id || "")}</strong> · ${escapeHtml(result.file || record.file || "")}</div>
    <div class="project-kpis">
      <div class="project-kpi"><strong>${plan.steps || 0}</strong>steps</div>
      <div class="project-kpi"><strong>${plan.executableSteps || 0}</strong>exec</div>
      <div class="project-kpi"><strong>${failed}</strong>failed</div>
      <div class="project-kpi"><strong>${readyBlocks}/${(readiness.blocks || []).length || 0}</strong>ready</div>
      <div class="project-kpi"><strong>${compileRequests}</strong>compile prompts</div>
    </div>
    <div>${escapeHtml(result.runDir || "")}</div>
  `;
  runLogEl.textContent = JSON.stringify(result, null, 2);
  renderSelectedReadiness(result);
}

function getIr() {
  return AAPS.parseAAPS(sourceEl.value);
}

function setIr(ir) {
  sourceEl.value = AAPS.serializeAAPS(ir);
  render();
}

function allNodes(ir) {
  const nodes = [];
  function walk(node) {
    nodes.push(node);
    (node.children || []).forEach(walk);
  }
  [...(ir.pipeline.agents || []), ...(ir.pipeline.blocks || []), ...(ir.pipeline.skills || []), ...(ir.pipeline.tasks || [])].forEach(walk);
  return nodes;
}

function findNodeById(ir, id) {
  return allNodes(ir).find((node) => node.id === id);
}

function parseLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePorts(text) {
  return parseLines(text).map((line) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)(?:\s*:\s*([A-Za-z_][\w.-]*))?(?:\s*=\s*(.+))?$/);
    if (!match) return { name: AAPS.slug(line), type: "artifact", value: line };
    return { name: match[1], type: match[2] || "artifact", value: match[3] || "" };
  });
}

function parseKeyValues(text) {
  const values = {};
  parseLines(text).forEach((line) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    if (match) values[match[1]] = match[2];
  });
  return values;
}

function parseCommaValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRequirements(text) {
  const requirements = {
    tools: [],
    models: [],
    agents: [],
    commands: [],
    files: [],
    pythonPackages: [],
    nodePackages: [],
  };
  parseLines(text).forEach((line) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*(?:=|:)\s*(.+)$/);
    if (!match) return;
    const key = match[1].toLowerCase().replace(/[-.]/g, "_");
    const values = parseCommaValues(match[2]);
    if (["tool", "tools"].includes(key)) requirements.tools.push(...values);
    else if (["model", "models"].includes(key)) requirements.models.push(...values);
    else if (["agent", "agents"].includes(key)) requirements.agents.push(...values);
    else if (["command", "commands", "system_command"].includes(key)) requirements.commands.push(...values);
    else if (["file", "files"].includes(key)) requirements.files.push(...values);
    else if (["python", "python_package", "python_packages"].includes(key)) requirements.pythonPackages.push(...values);
    else if (["node", "node_package", "node_packages"].includes(key)) requirements.nodePackages.push(...values);
  });
  Object.keys(requirements).forEach((key) => {
    requirements[key] = [...new Set(requirements[key])];
  });
  return requirements;
}

function parseEnvironment(text) {
  const environment = {
    python: "",
    requirements: [],
    commands: [],
    nodePackages: [],
    files: [],
    env: {},
    setup: [],
  };
  parseLines(text).forEach((line) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*(?:=|:)\s*(.+)$/);
    if (!match) return;
    const key = match[1].toLowerCase().replace(/-/g, "_");
    const value = match[2].trim();
    if (key === "python") environment.python = value;
    else if (["requirement", "requirements", "python_package"].includes(key)) environment.requirements.push(...parseCommaValues(value));
    else if (["command", "commands"].includes(key)) environment.commands.push(...parseCommaValues(value));
    else if (["node", "node_package", "node_packages"].includes(key)) environment.nodePackages.push(...parseCommaValues(value));
    else if (["file", "files"].includes(key)) environment.files.push(...parseCommaValues(value));
    else if (["setup", "setup_command"].includes(key)) environment.setup.push(value);
    else if (key.startsWith("env.")) environment.env[key.slice(4)] = value;
  });
  return environment;
}

function parseExecActions(text) {
  return parseLines(text).map((line, index) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    const type = match ? match[1].toLowerCase() : "shell";
    const value = match ? match[2] : line;
    return {
      id: `exec_${index + 1}`,
      type,
      command: ["shell", "sh", "bash"].includes(type) ? value : "",
      entry: ["shell", "sh", "bash"].includes(type) ? "" : value,
      args: {},
      source: "exec",
    };
  });
}

function portLines(ports) {
  return (ports || [])
    .map((port) => `${port.name}: ${port.type || "artifact"}${port.value ? ` = ${port.value}` : ""}`)
    .join("\n");
}

function keyValueLines(values) {
  return Object.entries(values || {})
    .map(([key, value]) => `${key} = ${value}`)
    .join("\n");
}

function execLines(steps) {
  return (steps || [])
    .map((step) => `${step.type || "shell"} = ${step.command || step.entry || ""}`)
    .join("\n");
}

function requirementsLines(requirements) {
  const lines = [];
  const mapping = [
    ["tool", requirements?.tools],
    ["model", requirements?.models],
    ["agent", requirements?.agents],
    ["command", requirements?.commands],
    ["file", requirements?.files],
    ["python_package", requirements?.pythonPackages],
    ["node_package", requirements?.nodePackages],
  ];
  mapping.forEach(([key, values]) => (values || []).forEach((value) => lines.push(`${key} = ${value}`)));
  return lines.join("\n");
}

function environmentLines(environment) {
  const lines = [];
  if (environment?.python) lines.push(`python = ${environment.python}`);
  (environment?.requirements || []).forEach((value) => lines.push(`requirement = ${value}`));
  (environment?.commands || []).forEach((value) => lines.push(`command = ${value}`));
  (environment?.nodePackages || []).forEach((value) => lines.push(`node_package = ${value}`));
  (environment?.files || []).forEach((value) => lines.push(`file = ${value}`));
  Object.entries(environment?.env || {}).forEach(([key, value]) => lines.push(`env.${key} = ${value}`));
  (environment?.setup || []).forEach((value) => lines.push(`setup = ${value}`));
  return lines.join("\n");
}

function tabLabel(tab) {
  return {
    lab: "Block Lab",
    program: "Program",
    project: "Project",
  }[tab] || "Studio";
}

function setChatStatus(text) {
  chatStatusEl.textContent = text;
}

function updateChatContext() {
  const selected = nodeRefs.get(selectedRef);
  const suffix = selected ? ` · ${selected.kind} ${selected.id}` : "";
  chatContextEl.textContent = `${tabLabel(activeTab)}${suffix}`;
}

function setHistoryOpen(open) {
  chatHistoryPanelEl.classList.toggle("is-open", open);
  chatHistoryPanelEl.setAttribute("aria-hidden", open ? "false" : "true");
  chatHistoryOverlayEl.hidden = !open;
}

function addMessage(role, text) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  const who = role === "user" ? "You" : "AAPS";
  node.innerHTML = `<strong>${who}</strong><span>${escapeHtml(text)}</span>`;
  chatLogEl.appendChild(node);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
  chatMessageCount += 1;
  chatCountEl.textContent = String(chatMessageCount);
}

function nodeColor(kind) {
  return {
    agent: "#7c3aed",
    block: "#ff4f8b",
    skill: "#00bcd4",
    task: "#ff9f1c",
    stage: "#ff4f8b",
    action: "#0f766e",
    method: "#28c76f",
    guard: "#111827",
    choose: "#8b5cf6",
    if: "#111827",
    else: "#665f75",
    for_each: "#ffe66d",
    handoff: "#06b6d4",
  }[kind] || "#ff4f8b";
}

function renderNode(node, ref, depth = 0) {
  nodeRefs.set(ref, node);
  const selectedClass = ref === selectedRef ? " is-selected" : "";
  const meta = [];
  if (node.after && node.after.length) meta.push(`after ${node.after.join(", ")}`);
  if (node.agent) meta.push(`uses ${node.agent}`);
  if (node.iterator) meta.push(`for ${node.iterator.item} in ${node.iterator.source}`);
  if (node.condition) meta.push(`if ${node.condition}`);
  if (node.calls && node.calls.length) meta.push(`calls ${node.calls.map((call) => call.skill).join(", ")}`);
  if (node.validations && node.validations.length) meta.push(`${node.validations.length} validation`);
  if (node.recovery && node.recovery.length) meta.push(`${node.recovery.length} recovery`);
  if (node.reviews && node.reviews.length) meta.push(`${node.reviews.length} review`);
  if (node.exec && node.exec.length) meta.push(`exec ${node.exec.map((action) => action.type).join(", ")}`);
  if (node.requirements && node.requirements.commands && node.requirements.commands.length) meta.push(`cmd ${node.requirements.commands.join(", ")}`);
  if (node.requirements && node.requirements.tools && node.requirements.tools.length) meta.push(`tool ${node.requirements.tools.join(", ")}`);
  const children = (node.children || [])
    .map((child, index) => renderNode(child, `${ref}/children:${index}`, depth + 1))
    .join("");
  return `
    <article class="node-card${selectedClass}" data-ref="${escapeHtml(ref)}" style="border-left-color:${nodeColor(node.kind)}">
      <div class="node-top">
        <div>
          <div class="node-kind">${escapeHtml(node.kind)}</div>
          <div class="node-id">${escapeHtml(node.id)}</div>
        </div>
        <div class="node-kind">${(node.inputs || []).length} in / ${(node.outputs || []).length} out / ${(node.artifacts || []).length} art</div>
      </div>
      ${meta.length ? `<div class="node-meta">${escapeHtml(meta.join(" · "))}</div>` : ""}
      ${node.prompt ? `<div class="node-prompt">${escapeHtml(node.prompt.replace(/\s+/g, " ").slice(0, 180))}</div>` : ""}
      ${children ? `<div class="node-children">${children}</div>` : ""}
    </article>
  `;
}

function renderSection(title, nodes, prefix) {
  if (!nodes.length) return "";
  return `
    <section class="tree-section">
      <h3>${title}</h3>
      ${nodes.map((node, index) => renderNode(node, `${prefix}:${index}`)).join("")}
    </section>
  `;
}

function renderSelectedReadiness(result = lastRuntimeResult) {
  const selected = nodeRefs.get(selectedRef);
  if (!blockReadinessEl) return;
  if (!selected) {
    blockReadinessEl.textContent = "Select a block, then check readiness.";
    return;
  }
  const records = result?.readiness?.blocks || [];
  const record = records.find((item) => item.id === selected.id || item.path === selected.path);
  if (!record) {
    blockReadinessEl.innerHTML = `<strong>Block Readiness</strong><span>No readiness record yet for ${escapeHtml(selected.id)}.</span>`;
    return;
  }
  const checks = (record.checks || [])
    .map(
      (check) =>
        `<li class="${check.ok ? "ok" : "bad"}">${escapeHtml(check.kind)} ${escapeHtml(check.name || check.path || "")}: ${escapeHtml(check.message || check.status || "")}</li>`
    )
    .join("");
  const suggestions = (record.suggestions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  blockReadinessEl.innerHTML = `
    <strong>Block Readiness: ${escapeHtml(record.status)}</strong>
    <ul>${checks || "<li>No checks were required.</li>"}</ul>
    ${suggestions ? `<strong>Suggested Fixes</strong><ul>${suggestions}</ul>` : ""}
  `;
}

function fillInspector(node) {
  if (!node) {
    selectedLabelEl.textContent = "none";
    Object.values(fields).forEach((field) => {
      field.value = "";
      field.disabled = field === fields.kind;
    });
    renderSelectedReadiness(lastRuntimeResult);
    return;
  }
  selectedLabelEl.textContent = `${node.kind} ${node.id}`;
  fields.kind.value = node.kind;
  fields.id.value = node.id;
  fields.title.value = node.title || "";
  fields.prompt.value = node.prompt || "";
  fields.inputs.value = portLines(node.inputs || []);
  fields.outputs.value = portLines(node.outputs || []);
  fields.artifacts.value = portLines(node.artifacts || []);
  fields.exec.value = execLines(node.exec || []);
  fields.args.value = keyValueLines(node.args || {});
  fields.requirements.value = requirementsLines(node.requirements || {});
  fields.environment.value = environmentLines(node.environment || {});
  fields.compileAgent.value = node.compile?.agent || "";
  fields.compilePrompt.value = node.compile?.prompt || "";
  fields.code.value = node.code || (node.exec && node.exec[0] && node.exec[0].code) || "";
  fields.run.value = (node.run || []).join("\n");
  fields.validations.value = (node.validations || []).join("\n");
  fields.verify.value = (node.verify || []).join("\n");
  fields.recovery.value = (node.recovery || []).join("\n");
  fields.repair.value = node.repair ? "true" : "false";
  fields.fallback.value = node.fallback || "";
  fields.reviews.value = (node.reviews || []).join("\n");
  renderSelectedReadiness(lastRuntimeResult);
}

function render() {
  const ir = getIr();
  nodeRefs = new Map();
  const totalNodes = allNodes(ir).length;
  treeEl.innerHTML = [
    renderSection("Agents", ir.pipeline.agents || [], "agent"),
    renderSection("Blocks", ir.pipeline.blocks || [], "block"),
    renderSection("Skills", ir.pipeline.skills || [], "skill"),
    renderSection("Tasks", ir.pipeline.tasks || [], "task"),
  ].join("");
  if (!totalNodes) {
    treeEl.innerHTML = '<div class="message">Add a block or ask chat to create one.</div>';
  }
  blockCountEl.textContent = `${totalNodes} block${totalNodes === 1 ? "" : "s"}`;
  irSummaryEl.textContent = `${totalNodes} node${totalNodes === 1 ? "" : "s"}`;
  diagnosticsEl.textContent = ir.diagnostics.length
    ? `${ir.diagnostics.length} diagnostic${ir.diagnostics.length === 1 ? "" : "s"}`
    : "Ready";
  irEl.textContent = JSON.stringify(ir, null, 2);
  fillInspector(nodeRefs.get(selectedRef));
  updateChatContext();
}

function templateNode(kind, ir) {
  if (kind === "agent") {
    return {
      kind: "agent",
      id: "operator",
      title: "",
      after: [],
      agent: "",
      model: "gpt-5",
      role: "General autonomous pipeline agent.",
      tools: ["shell", "git", "browser"],
      requirements: { tools: [], models: [], agents: [], commands: [], files: [], pythonPackages: [], nodePackages: [] },
      environment: { python: "", requirements: [], commands: [], nodePackages: [], files: [], env: {}, setup: [] },
      compile: { agent: "", prompt: "", onMissing: "prompt" },
      prompt: "",
      condition: "",
      iterator: null,
      inputs: [],
      outputs: [],
      params: {},
      metrics: {},
      policies: {},
      validations: [],
      recovery: [],
      reviews: [],
      artifacts: [],
      exec: [],
      args: {},
      repair: false,
      fallback: "",
      calls: [],
      run: [],
      verify: [],
      notes: [],
      children: [],
    };
  }
  if (kind === "skill_segment") return clone(AAPS.parseAAPS(AAPS.samples.biology).pipeline.skills[0]);
  if (kind === "skill_writing") return clone(AAPS.parseAAPS(AAPS.samples.writing).pipeline.skills[0]);
  if (kind === "skill_appdev") return clone(AAPS.parseAAPS(AAPS.samples.general).pipeline.skills[0]);
  if (kind === "block") {
    return {
      kind: "block",
      id: "new_block",
      title: "",
      after: [],
      agent: "",
      model: "",
      role: "",
      tools: [],
      requirements: { tools: [], models: [], agents: [], commands: [], files: [], pythonPackages: [], nodePackages: [] },
      environment: { python: "", requirements: [], commands: [], nodePackages: [], files: [], env: {}, setup: [] },
      compile: { agent: "codex_repair_agent", prompt: "", onMissing: "prompt" },
      prompt: "Reusable typed block.",
      condition: "",
      iterator: null,
      inputs: [],
      outputs: [],
      params: {},
      metrics: {},
      policies: {},
      validations: [],
      recovery: [],
      reviews: [],
      artifacts: [],
      exec: [],
      args: {},
      repair: false,
      fallback: "",
      code: "",
      calls: [],
      run: [],
      verify: [],
      notes: [],
      children: [],
    };
  }
  const base = {
    kind: kind === "for_each" || kind === "if" || kind === "action" ? kind : "task",
    id: kind === "task" ? "new_task" : kind,
    title: "",
    after: [],
    agent: (ir.pipeline.agents[0] && ir.pipeline.agents[0].id) || "",
    model: "",
    role: "",
    tools: [],
    requirements: { tools: [], models: [], agents: [], commands: [], files: [], pythonPackages: [], nodePackages: [] },
    environment: { python: "", requirements: [], commands: [], nodePackages: [], files: [], env: {}, setup: [] },
    compile: { agent: "", prompt: "", onMissing: "prompt" },
    prompt: "Describe what this block should do.",
    condition: kind === "if" ? "condition" : "",
    iterator: kind === "for_each" ? { item: "item", source: "items" } : null,
    inputs: [],
    outputs: [],
    params: {},
    metrics: {},
    policies: {},
    exec: [],
    args: {},
    repair: false,
    fallback: "",
    calls: [],
    run: [],
    verify: ["The block result is reviewed."],
    notes: [],
    children: [],
  };
  if (kind === "for_each") base.prompt = "";
  if (kind === "action") base.id = "new_action";
  return base;
}

function uniqueId(base, nodes) {
  const used = new Set(nodes.map((node) => node.id));
  let candidate = AAPS.slug(base);
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${AAPS.slug(base)}_${index}`;
    index += 1;
  }
  return candidate;
}

function addTemplate(kind) {
  const ir = getIr();
  const node = templateNode(kind, ir);
  node.id = uniqueId(node.id, allNodes(ir));
  const selectedSnapshot = nodeRefs.get(selectedRef);
  const selected = selectedSnapshot ? findNodeById(ir, selectedSnapshot.id) : null;
  if (selected && !["agent", "skill", "task"].includes(node.kind)) {
    selected.children.push(node);
  } else if (node.kind === "agent") {
    ir.pipeline.agents.push(node);
  } else if (node.kind === "block") {
    ir.pipeline.blocks.push(node);
  } else if (node.kind === "skill") {
    ir.pipeline.skills.push(node);
  } else {
    ir.pipeline.tasks.push(node);
  }
  setIr(ir);
  addMessage("assistant", `Added ${node.kind} ${node.id}.`);
}

function deleteSelected() {
  if (!selectedRef) return;
  const ir = getIr();
  const id = nodeRefs.get(selectedRef)?.id;
  if (!id) return;
  function remove(nodes) {
    return nodes
      .filter((node) => node.id !== id)
      .map((node) => ({ ...node, children: remove(node.children || []) }));
  }
  ir.pipeline.agents = remove(ir.pipeline.agents || []);
  ir.pipeline.blocks = remove(ir.pipeline.blocks || []);
  ir.pipeline.skills = remove(ir.pipeline.skills || []);
  ir.pipeline.tasks = remove(ir.pipeline.tasks || []);
  selectedRef = "";
  setIr(ir);
  addMessage("assistant", `Deleted ${id}.`);
}

function applyInspector() {
  const node = nodeRefs.get(selectedRef);
  if (!node) return;
  const editedId = node.id;
  const editedKind = node.kind;
  node.id = AAPS.slug(fields.id.value, node.id);
  node.title = fields.title.value.trim();
  node.prompt = fields.prompt.value.trim();
  node.inputs = parsePorts(fields.inputs.value);
  node.outputs = parsePorts(fields.outputs.value);
  node.artifacts = parsePorts(fields.artifacts.value);
  node.exec = parseExecActions(fields.exec.value);
  node.args = parseKeyValues(fields.args.value);
  node.requirements = parseRequirements(fields.requirements.value);
  node.environment = parseEnvironment(fields.environment.value);
  node.compile = {
    ...(node.compile || {}),
    agent: fields.compileAgent.value.trim(),
    prompt: fields.compilePrompt.value.trim(),
    onMissing: (node.compile && node.compile.onMissing) || "prompt",
  };
  if (node.exec.length) node.exec[node.exec.length - 1].args = { ...node.args };
  node.code = fields.code.value.trim();
  if (node.code && node.exec.length) node.exec[node.exec.length - 1].code = node.code;
  node.run = parseLines(fields.run.value);
  node.validations = parseLines(fields.validations.value);
  node.verify = parseLines(fields.verify.value);
  node.recovery = parseLines(fields.recovery.value);
  node.repair = /^(true|yes|on|1)$/i.test(fields.repair.value.trim());
  node.fallback = fields.fallback.value.trim();
  node.reviews = parseLines(fields.reviews.value);
  const ir = getIr();
  const replacement = clone(node);
  function replace(nodes) {
    return nodes.map((item) => {
      if (item.id === editedId && item.kind === editedKind) return replacement;
      return { ...item, children: replace(item.children || []) };
    });
  }
  ir.pipeline.agents = replace(ir.pipeline.agents || []);
  ir.pipeline.blocks = replace(ir.pipeline.blocks || []);
  ir.pipeline.skills = replace(ir.pipeline.skills || []);
  ir.pipeline.tasks = replace(ir.pipeline.tasks || []);
  setIr(ir);
  addMessage("assistant", `Saved ${replacement.kind} ${replacement.id}.`);
}

function localChatEdit(text) {
  const ir = getIr();
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  let match;
  if (!raw) return "No change.";
  if (lower.includes("biology template") || lower === "biology") {
    sourceEl.value = AAPS.samples.biology;
    render();
    return "Loaded the biology segmentation template.";
  }
  if (lower.includes("writing template") || lower.includes("book template") || lower === "writing") {
    sourceEl.value = AAPS.samples.writing;
    render();
    return "Loaded the writing template.";
  }
  if (lower.includes("appdev template") || lower === "general") {
    sourceEl.value = AAPS.samples.general;
    render();
    return "Loaded the general app-development template.";
  }
  match = raw.match(/^rename pipeline\s+(.+)$/i);
  if (match) {
    ir.pipeline.name = match[1].trim();
    setIr(ir);
    return `Renamed pipeline to ${ir.pipeline.name}.`;
  }
  match = raw.match(/^set goal\s+(.+)$/i);
  if (match) {
    ir.pipeline.goal = match[1].trim();
    setIr(ir);
    return "Updated the pipeline goal.";
  }
  match = raw.match(/^add skill\s+([A-Za-z_][\w.-]*)/i);
  if (match) {
    const skill = templateNode("skill_appdev", ir);
    skill.id = uniqueId(match[1], allNodes(ir));
    skill.prompt = `Reusable skill for ${match[1]}.`;
    ir.pipeline.skills.push(skill);
    setIr(ir);
    return `Added skill ${skill.id}.`;
  }
  match = raw.match(/^add block\s+([A-Za-z_][\w.-]*)/i);
  if (match) {
    const block = templateNode("block", ir);
    block.id = uniqueId(match[1], allNodes(ir));
    block.prompt = `Reusable block for ${match[1]}.`;
    ir.pipeline.blocks.push(block);
    setIr(ir);
    return `Added block ${block.id}.`;
  }
  match = raw.match(/^add task\s+([A-Za-z_][\w.-]*)(?:\s+after\s+([A-Za-z0-9_, .-]+))?/i);
  if (match) {
    const task = templateNode("task", ir);
    task.id = uniqueId(match[1], allNodes(ir));
    task.after = match[2] ? match[2].split(",").map((item) => AAPS.slug(item)) : [];
    task.prompt = `Complete ${task.id} using the current project context.`;
    ir.pipeline.tasks.push(task);
    setIr(ir);
    return `Added task ${task.id}.`;
  }
  match = raw.match(/^add if\s+(.+?)\s+to\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const target = findNodeById(ir, match[2]);
    if (!target) return `Block ${match[2]} was not found.`;
    target.children.push(templateNode("if", ir));
    target.children[target.children.length - 1].condition = match[1];
    setIr(ir);
    return `Added if condition to ${target.id}.`;
  }
  match = raw.match(/^add for each\s+([A-Za-z_][\w.-]*)\s+in\s+(.+?)\s+to\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const target = findNodeById(ir, match[3]);
    if (!target) return `Block ${match[3]} was not found.`;
    const loop = templateNode("for_each", ir);
    loop.iterator = { item: match[1], source: match[2] };
    target.children.push(loop);
    setIr(ir);
    return `Added loop to ${target.id}.`;
  }
  match = raw.match(/^prompt\s+([A-Za-z_][\w.-]*)\s*:\s*(.+)$/i);
  if (match) {
    const target = findNodeById(ir, match[1]);
    if (!target) return `Block ${match[1]} was not found.`;
    target.prompt = match[2].trim();
    setIr(ir);
    return `Updated prompt for ${target.id}.`;
  }
  const task = templateNode("task", ir);
  task.id = uniqueId(raw.split(/\s+/).slice(0, 4).join("_"), allNodes(ir));
  task.after = ir.pipeline.tasks.length ? [ir.pipeline.tasks[ir.pipeline.tasks.length - 1].id] : [];
  task.prompt = raw;
  ir.pipeline.tasks.push(task);
  setIr(ir);
  return `Created task ${task.id} from your prompt.`;
}

async function requestChatEdit(instruction) {
  const response = await fetch("/api/aaps/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: sourceEl.value,
      message: instruction,
      context: {
        tab: activeTab,
        projectPath: projectPathEl.value || ".",
        selectedBlock: nodeRefs.get(selectedRef) || null,
        activeRunId,
        diagnostics: getIr().diagnostics,
      },
    }),
  });
  if (!response.ok) throw new Error(`router returned ${response.status}`);
  const payload = await response.json();
  const result = payload.result || payload;
  if (result.source) {
    sourceEl.value = result.source;
    render();
  }
  return result.message || result.summary || "Applied routed edit.";
}

async function loadProject(path = projectPathEl.value || ".") {
  const response = await fetch(`/api/aaps/project?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`project API returned ${response.status}`);
  const payload = await response.json();
  renderProject(payload);
  return payload;
}

async function saveProject() {
  const manifest = getProjectManifest();
  if (manifest.error) {
    projectStatusEl.textContent = "invalid JSON";
    addMessage("assistant", `Project manifest JSON error: ${manifest.error}`);
    return;
  }
  const response = await fetch("/api/aaps/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: projectPathEl.value || ".", manifest }),
  });
  if (!response.ok) throw new Error(`project save returned ${response.status}`);
  const payload = await response.json();
  renderProject(payload);
  addMessage("assistant", `Saved project manifest for ${payload.manifest.name}.`);
}

async function loadProjectFile(file) {
  const response = await fetch(
    `/api/aaps/project/file?path=${encodeURIComponent(projectPathEl.value || ".")}&file=${encodeURIComponent(file)}`
  );
  if (!response.ok) throw new Error(`file API returned ${response.status}`);
  const payload = await response.json();
  sourceEl.value = payload.source;
  const manifest = getProjectManifest();
  if (!manifest.error) {
    manifest.activeFile = file;
    renderProject({ ...currentProjectPayload, manifest });
  }
  selectedRef = "";
  render();
  addMessage("assistant", `Loaded ${file}.`);
}

async function loadTextFile(file) {
  const response = await fetch(
    `/api/aaps/project/text-file?path=${encodeURIComponent(projectPathEl.value || ".")}&file=${encodeURIComponent(file)}`
  );
  if (!response.ok) throw new Error(`text file API returned ${response.status}`);
  const payload = await response.json();
  openTextFile = payload.file;
  fields.code.value = payload.source;
  blockLogEl.textContent = `Opened ${payload.file}`;
  renderProject(currentProjectPayload);
  addMessage("assistant", `Opened script ${payload.file} in the block code editor.`);
}

async function saveActiveProjectFile() {
  const manifest = getProjectManifest();
  if (manifest.error) {
    projectStatusEl.textContent = "invalid JSON";
    return;
  }
  const file = manifest.activeFile || manifest.defaultMain;
  const response = await fetch("/api/aaps/project/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: projectPathEl.value || ".", file, source: sourceEl.value }),
  });
  if (!response.ok) throw new Error(`file save returned ${response.status}`);
  const payload = await response.json();
  renderProject({ ...currentProjectPayload, files: payload.files, manifest });
  addMessage("assistant", `Saved ${file}.`);
}

async function saveOpenTextFile() {
  if (!openTextFile) {
    addMessage("assistant", "Open a script or text file first.");
    return;
  }
  const response = await fetch("/api/aaps/project/text-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: projectPathEl.value || ".", file: openTextFile, source: fields.code.value }),
  });
  if (!response.ok) throw new Error(`text file save returned ${response.status}`);
  const payload = await response.json();
  renderProject({ ...currentProjectPayload, ...payload });
  addMessage("assistant", `Saved ${openTextFile}.`);
}

async function projectFileAction(action) {
  const manifest = getProjectManifest();
  if (manifest.error) {
    addMessage("assistant", `Project manifest JSON error: ${manifest.error}`);
    return;
  }
  const active = manifest.activeFile || manifest.defaultMain || "";
  const target = projectFileTargetEl.value.trim();
  const file = action === "create" ? target : active;
  if (!file) {
    addMessage("assistant", "Set an active file or a file action target.");
    return;
  }
  const response = await fetch("/api/aaps/project/file-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: projectPathEl.value || ".",
      action,
      file,
      target,
      kind: target.includes("/blocks/") || target.startsWith("blocks/") ? "block" : "workflow",
    }),
  });
  if (!response.ok) throw new Error(`file action returned ${response.status}`);
  const payload = await response.json();
  renderProject(payload);
  addMessage("assistant", `${action} completed for ${file}.`);
}

async function pollRun(id) {
  const response = await fetch(`/api/aaps/run?id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`run status returned ${response.status}`);
  const record = await response.json();
  renderRuntime(record);
  if (record.status === "running") {
    window.setTimeout(() => {
      pollRun(id).catch((error) => {
        runStatusEl.textContent = "poll failed";
        runLogEl.textContent = error.message;
      });
    }, 1200);
  } else {
    addMessage("assistant", `AAPS run ${id} ${record.status}.`);
  }
}

async function startRuntimeRun(dryRun, blockId = "") {
  const manifest = getProjectManifest();
  if (manifest.error) {
    projectStatusEl.textContent = "invalid JSON";
    throw new Error(manifest.error);
  }
  const file = manifest.activeFile || manifest.defaultMain || "pipeline.aaps";
  runStatusEl.textContent = dryRun ? "dry run starting" : "run starting";
  runSummaryEl.innerHTML = '<div>Submitting AAPS runtime job...</div>';
  runLogEl.textContent = "";
  const response = await fetch("/api/aaps/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: projectPathEl.value || ".",
      file,
      source: sourceEl.value,
      dryRun,
      block: blockId,
    }),
  });
  if (!response.ok) throw new Error(`run API returned ${response.status}`);
  const record = await response.json();
  activeRunId = record.id;
  renderRuntime(record);
  pollRun(record.id).catch((error) => {
    runStatusEl.textContent = "poll failed";
    runLogEl.textContent = error.message;
  });
  return record;
}

async function checkSelectedBlockReadiness() {
  const id = selectedNodeId();
  if (!id) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  blockReadinessEl.textContent = `Checking readiness for ${id}...`;
  blockLogEl.textContent = "Building dry-run execution plan and block preflight.";
  await startRuntimeRun(true, id);
}

function selectedNodeId() {
  return nodeRefs.get(selectedRef)?.id || "";
}

function updateSelectedNode(mutator) {
  const snapshot = nodeRefs.get(selectedRef);
  if (!snapshot) return false;
  const ir = getIr();
  let changed = false;
  function replace(nodes) {
    return (nodes || []).map((node) => {
      if (node.id === snapshot.id && node.kind === snapshot.kind) {
        const copy = clone(node);
        mutator(copy);
        changed = true;
        return copy;
      }
      return { ...node, children: replace(node.children || []) };
    });
  }
  ir.pipeline.agents = replace(ir.pipeline.agents || []);
  ir.pipeline.blocks = replace(ir.pipeline.blocks || []);
  ir.pipeline.skills = replace(ir.pipeline.skills || []);
  ir.pipeline.tasks = replace(ir.pipeline.tasks || []);
  if (changed) setIr(ir);
  return changed;
}

async function applyBlockChat() {
  const node = nodeRefs.get(selectedRef);
  const message = blockChatInputEl.value.trim();
  if (!node) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  if (!message) return;
  blockLogEl.textContent = "Routing block chat...";
  const response = await fetch("/api/aaps/block/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: projectPathEl.value || ".",
      blockId: node.id,
      message,
      source: sourceEl.value,
    }),
  });
  if (!response.ok) throw new Error(`block chat returned ${response.status}`);
  const payload = await response.json();
  updateSelectedNode((target) => {
    const action = payload.action || {};
    if (action.type) {
      target.exec = target.exec || [];
      target.exec.push({
        id: `exec_${target.exec.length + 1}`,
        type: action.type,
        command: action.command || "",
        entry: action.entry || "",
        code: action.code || "",
        args: action.args || {},
        source: "block_chat",
      });
      target.args = { ...(target.args || {}), ...(action.args || {}) };
      if (action.code) target.code = action.code;
    }
    if (payload.requirements) {
      target.requirements = {
        ...(target.requirements || {}),
        ...payload.requirements,
      };
    }
    if (payload.environment) {
      target.environment = {
        ...(target.environment || {}),
        ...payload.environment,
      };
    }
    if (payload.compile) {
      target.compile = {
        ...(target.compile || {}),
        ...payload.compile,
      };
    }
    target.validations = [...new Set([...(target.validations || []), ...((payload.validations || []))])];
    target.repair = true;
  });
  blockChatInputEl.value = "";
  blockLogEl.textContent = JSON.stringify(payload, null, 2);
  addMessage("assistant", payload.summary || "Applied block chat action.");
  if (payload.script) {
    const latest = await loadProject(projectPathEl.value || ".");
    renderProject(latest);
  }
}

async function saveBlockCode() {
  const node = nodeRefs.get(selectedRef);
  if (!node) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  const firstExec = (node.exec || [])[0];
  if (firstExec && firstExec.entry) {
    const response = await fetch("/api/aaps/project/text-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: projectPathEl.value || ".", file: firstExec.entry, source: fields.code.value }),
    });
    if (!response.ok) throw new Error(`script save returned ${response.status}`);
    blockLogEl.textContent = `Saved ${firstExec.entry}`;
    addMessage("assistant", `Saved code to ${firstExec.entry}.`);
    return;
  }
  updateSelectedNode((target) => {
    target.code = fields.code.value;
    if (target.exec && target.exec.length) target.exec[0].code = fields.code.value;
  });
  blockLogEl.textContent = "Saved inline code into the selected block.";
}

async function externalizeBlockCode() {
  const node = nodeRefs.get(selectedRef);
  if (!node) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  const file = `scripts/${AAPS.slug(node.id)}.py`;
  const response = await fetch("/api/aaps/project/text-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: projectPathEl.value || ".", file, source: fields.code.value }),
  });
  if (!response.ok) throw new Error(`script save returned ${response.status}`);
  updateSelectedNode((target) => {
    target.exec = target.exec && target.exec.length ? target.exec : [{ id: "exec_1", type: "python_script", command: "", entry: "", args: {} }];
    target.exec[0].type = "python_script";
    target.exec[0].entry = file;
    target.exec[0].command = "";
    target.exec[0].code = "";
    target.code = "";
  });
  openTextFile = file;
  blockLogEl.textContent = `Saved inline code to ${file}`;
  const latest = await loadProject(projectPathEl.value || ".");
  renderProject(latest);
}

function prepareRepairPrompt() {
  const node = nodeRefs.get(selectedRef);
  if (!node) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  const prompt = [
    `# AAPS Block Repair: ${node.id}`,
    "",
    `Kind: ${node.kind}`,
    `Project: ${projectPathEl.value || "."}`,
    "",
    "## Purpose",
    node.prompt || "(no prompt)",
    "",
    "## Inputs",
    portLines(node.inputs || []) || "(none)",
    "",
    "## Outputs",
    portLines(node.outputs || []) || "(none)",
    "",
    "## Actions",
    execLines(node.exec || []) || "(none)",
    "",
    "## Requirements",
    requirementsLines(node.requirements || {}) || "(none)",
    "",
    "## Environment",
    environmentLines(node.environment || {}) || "(none)",
    "",
    "## Compile Agent",
    node.compile?.agent || "(none)",
    "",
    "## Validations",
    (node.validations || []).join("\n") || "(none)",
    "",
    "## Latest Runtime Record",
    runLogEl.textContent || "(no run yet)",
  ].join("\n");
  blockLogEl.textContent = prompt;
}

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll("[data-panel]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    activeTab = button.dataset.tab;
    document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add("is-active");
    updateChatContext();
  });
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => addTemplate(button.dataset.template));
});

treeEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  selectedRef = card.dataset.ref;
  render();
});

sourceEl.addEventListener("input", render);

chatFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInputEl.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatInputEl.value = "";
  setChatStatus("routing through Codex wrapper");
  requestChatEdit(text)
    .then((message) => {
      addMessage("assistant", message);
      setChatStatus("ready");
    })
    .catch(() => {
      const fallback = localChatEdit(text);
      addMessage("assistant", fallback);
      setChatStatus("local fallback");
    });
});

chatHistoryToggleEl.addEventListener("click", () => setHistoryOpen(true));
chatHistoryCloseEl.addEventListener("click", () => setHistoryOpen(false));
chatHistoryOverlayEl.addEventListener("click", () => setHistoryOpen(false));

inspectorFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  applyInspector();
});

document.getElementById("delete-block").addEventListener("click", deleteSelected);
document.getElementById("sample-general").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.general;
  selectedRef = "";
  render();
});
document.getElementById("sample-biology").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.biology;
  selectedRef = "";
  render();
});
document.getElementById("sample-writing").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.writing;
  selectedRef = "";
  render();
});
document.getElementById("format-btn").addEventListener("click", () => setIr(getIr()));
document.getElementById("markdown-btn").addEventListener("click", () => {
  const markdown = AAPS.toMarkdown(getIr());
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
});
document.getElementById("download-btn").addEventListener("click", () => {
  const blob = new Blob([sourceEl.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pipeline.aaps";
  link.click();
  URL.revokeObjectURL(url);
});

projectFilesEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-file]");
  const textButton = event.target.closest("[data-project-text-file]");
  if (button) {
    loadProjectFile(button.dataset.projectFile).catch((error) => {
      addMessage("assistant", `Could not load project file: ${error.message}`);
    });
    return;
  }
  if (textButton) {
    loadTextFile(textButton.dataset.projectTextFile).catch((error) => {
      addMessage("assistant", `Could not load script file: ${error.message}`);
    });
  }
});

document.getElementById("load-project-btn").addEventListener("click", () => {
  loadProject().catch((error) => {
    addMessage("assistant", `Could not load project: ${error.message}`);
  });
});

document.getElementById("sample-project-btn").addEventListener("click", () => {
  renderProject({
    manifest: AAPS.sampleProject,
    project_path: "examples/projects/organoid-analysis",
    files: AAPS.projectFileIndex(AAPS.sampleProject),
    manifest_exists: false,
  });
});

document.getElementById("validate-project-btn").addEventListener("click", () => {
  const manifest = getProjectManifest();
  if (manifest.error) {
    projectStatusEl.textContent = "invalid JSON";
    addMessage("assistant", `Project manifest JSON error: ${manifest.error}`);
    return;
  }
  renderProject({ ...currentProjectPayload, manifest });
  addMessage("assistant", "Validated project manifest.");
});

document.getElementById("save-project-btn").addEventListener("click", () => {
  saveProject().catch((error) => {
    addMessage("assistant", `Could not save project: ${error.message}`);
  });
});

document.getElementById("save-active-file-btn").addEventListener("click", () => {
  saveActiveProjectFile().catch((error) => {
    addMessage("assistant", `Could not save active file: ${error.message}`);
  });
});

document.getElementById("dry-run-active-file-btn").addEventListener("click", () => {
  startRuntimeRun(true).catch((error) => {
    addMessage("assistant", `Could not dry run active file: ${error.message}`);
  });
});

document.getElementById("run-active-file-btn").addEventListener("click", () => {
  startRuntimeRun(false).catch((error) => {
    addMessage("assistant", `Could not run active file: ${error.message}`);
  });
});

document.getElementById("new-workflow-btn").addEventListener("click", () => {
  if (!projectFileTargetEl.value.trim()) projectFileTargetEl.value = "workflows/new_workflow.aaps";
  projectFileAction("create").catch((error) => {
    addMessage("assistant", `Could not create file: ${error.message}`);
  });
});

document.getElementById("duplicate-active-file-btn").addEventListener("click", () => {
  if (!projectFileTargetEl.value.trim()) projectFileTargetEl.value = "workflows/copy.aaps";
  projectFileAction("duplicate").catch((error) => {
    addMessage("assistant", `Could not duplicate file: ${error.message}`);
  });
});

document.getElementById("archive-active-file-btn").addEventListener("click", () => {
  projectFileAction("archive").catch((error) => {
    addMessage("assistant", `Could not archive file: ${error.message}`);
  });
});

document.getElementById("save-open-text-file-btn").addEventListener("click", () => {
  saveOpenTextFile().catch((error) => {
    addMessage("assistant", `Could not save script: ${error.message}`);
  });
});

document.getElementById("block-chat-btn").addEventListener("click", () => {
  applyBlockChat().catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Block chat failed: ${error.message}`);
  });
});

document.getElementById("save-block-code-btn").addEventListener("click", () => {
  saveBlockCode().catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Could not save block code: ${error.message}`);
  });
});

document.getElementById("externalize-block-code-btn").addEventListener("click", () => {
  externalizeBlockCode().catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Could not save inline code as script: ${error.message}`);
  });
});

document.getElementById("check-block-btn").addEventListener("click", () => {
  checkSelectedBlockReadiness().catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Could not check block readiness: ${error.message}`);
  });
});

document.getElementById("dry-run-block-btn").addEventListener("click", () => {
  const id = selectedNodeId();
  if (!id) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  startRuntimeRun(true, id).catch((error) => {
    addMessage("assistant", `Could not dry run block: ${error.message}`);
  });
});

document.getElementById("run-block-btn").addEventListener("click", () => {
  const id = selectedNodeId();
  if (!id) {
    blockLogEl.textContent = "Select a block first.";
    return;
  }
  startRuntimeRun(false, id).catch((error) => {
    addMessage("assistant", `Could not run block: ${error.message}`);
  });
});

document.getElementById("repair-prompt-btn").addEventListener("click", prepareRepairPrompt);

sourceEl.value = AAPS.samples.biology;
addMessage("assistant", "AAPS Studio is ready. Use chat to prepare skills or edit source directly.");
render();
renderProject(currentProjectPayload);
renderRuntime(null);
setHistoryOpen(false);
loadProject().catch(() => {});

if ("serviceWorker" in navigator) {
  const localhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (localhost) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
  } else if (window.isSecureContext) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
