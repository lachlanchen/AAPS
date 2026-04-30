const sourceEl = document.getElementById("source");
const treeEl = document.getElementById("tree");
const irEl = document.getElementById("ir");
const diagnosticsEl = document.getElementById("diagnostics");
const irSummaryEl = document.getElementById("ir-summary");
const blockCountEl = document.getElementById("block-count");
const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");
const selectedLabelEl = document.getElementById("selected-label");
const inspectorFormEl = document.getElementById("inspector-form");
const projectManifestEl = document.getElementById("project-manifest");
const projectSummaryEl = document.getElementById("project-summary");
const projectFilesEl = document.getElementById("project-files");
const projectStructureEl = document.getElementById("project-structure");
const projectStatusEl = document.getElementById("project-status");
const projectFileCountEl = document.getElementById("project-file-count");
const projectPathEl = document.getElementById("project-path");

const fields = {
  kind: document.getElementById("field-kind"),
  id: document.getElementById("field-id"),
  title: document.getElementById("field-title"),
  prompt: document.getElementById("field-prompt"),
  inputs: document.getElementById("field-inputs"),
  outputs: document.getElementById("field-outputs"),
  artifacts: document.getElementById("field-artifacts"),
  run: document.getElementById("field-run"),
  validations: document.getElementById("field-validations"),
  verify: document.getElementById("field-verify"),
  recovery: document.getElementById("field-recovery"),
  reviews: document.getElementById("field-reviews"),
};

let selectedRef = "";
let nodeRefs = new Map();
let currentProjectPayload = {
  manifest: AAPS.sampleProject,
  project_path: ".",
  files: AAPS.projectFileIndex(AAPS.sampleProject),
  manifest_exists: false,
};

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
      <div class="project-kpi"><strong>${manifest.tools.length}</strong>tools</div>
      <div class="project-kpi"><strong>${manifest.models.length}</strong>models</div>
    </div>
    ${
      diagnostics.length
        ? `<div>${diagnostics
            .map((item) => `${escapeHtml(item.severity)}: ${escapeHtml(item.message)}`)
            .join("<br>")}</div>`
        : "<div>No project manifest diagnostics.</div>"
    }
  `;

  projectFilesEl.innerHTML = AAPS.PROJECT_FILE_CATEGORIES.map((category) => {
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
  }).join("") || '<div class="message">No `.aaps` files listed in this project.</div>';
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
  [...(ir.pipeline.agents || []), ...(ir.pipeline.skills || []), ...(ir.pipeline.tasks || [])].forEach(walk);
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

function portLines(ports) {
  return (ports || [])
    .map((port) => `${port.name}: ${port.type || "artifact"}${port.value ? ` = ${port.value}` : ""}`)
    .join("\n");
}

function addMessage(role, text) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  chatLogEl.appendChild(node);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function nodeColor(kind) {
  return {
    agent: "#7c3aed",
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

function fillInspector(node) {
  if (!node) {
    selectedLabelEl.textContent = "none";
    Object.values(fields).forEach((field) => {
      field.value = "";
      field.disabled = field === fields.kind;
    });
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
  fields.run.value = (node.run || []).join("\n");
  fields.validations.value = (node.validations || []).join("\n");
  fields.verify.value = (node.verify || []).join("\n");
  fields.recovery.value = (node.recovery || []).join("\n");
  fields.reviews.value = (node.reviews || []).join("\n");
}

function render() {
  const ir = getIr();
  nodeRefs = new Map();
  const totalNodes = allNodes(ir).length;
  treeEl.innerHTML = [
    renderSection("Agents", ir.pipeline.agents || [], "agent"),
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
  const base = {
    kind: kind === "for_each" || kind === "if" || kind === "action" ? kind : "task",
    id: kind === "task" ? "new_task" : kind,
    title: "",
    after: [],
    agent: (ir.pipeline.agents[0] && ir.pipeline.agents[0].id) || "",
    model: "",
    role: "",
    tools: [],
    prompt: "Describe what this block should do.",
    condition: kind === "if" ? "condition" : "",
    iterator: kind === "for_each" ? { item: "item", source: "items" } : null,
    inputs: [],
    outputs: [],
    params: {},
    metrics: {},
    policies: {},
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
  node.run = parseLines(fields.run.value);
  node.validations = parseLines(fields.validations.value);
  node.verify = parseLines(fields.verify.value);
  node.recovery = parseLines(fields.recovery.value);
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
    body: JSON.stringify({ source: sourceEl.value, message: instruction }),
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

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll("[data-panel]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add("is-active");
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
  addMessage("assistant", "Routing...");
  requestChatEdit(text)
    .then((message) => {
      chatLogEl.lastElementChild.textContent = message;
    })
    .catch(() => {
      chatLogEl.lastElementChild.textContent = localChatEdit(text);
    });
});

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
  if (!button) return;
  loadProjectFile(button.dataset.projectFile).catch((error) => {
    addMessage("assistant", `Could not load project file: ${error.message}`);
  });
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

sourceEl.value = AAPS.samples.biology;
addMessage("assistant", "AAPS Studio is ready. Use chat to prepare skills or edit source directly.");
render();
renderProject(currentProjectPayload);
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
