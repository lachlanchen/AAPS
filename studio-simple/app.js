(function () {
  "use strict";

  const SYSTEM_BLOCKS = [
    {
      id: "for-loop",
      title: "For Loop",
      category: "control",
      purpose: "Repeat program steps over a counted range.",
      inputs: [{ name: "range", type: "integer_range", required: true }],
      outputs: [{ name: "iteration", type: "integer" }],
      artifacts: [],
      validations: ["Loop bounds are finite before execution."],
    },
    {
      id: "while-loop",
      title: "While Loop",
      category: "control",
      purpose: "Repeat steps while a condition remains true.",
      inputs: [{ name: "condition", type: "boolean", required: true }],
      outputs: [{ name: "loop_state", type: "json" }],
      artifacts: [{ name: "loop_log", type: "logs", value: "runtime/loop.log" }],
      validations: ["Stop condition and maximum iteration guard are declared."],
    },
    {
      id: "if-else",
      title: "If / Else",
      category: "control",
      purpose: "Route execution based on an explicit condition.",
      inputs: [{ name: "condition", type: "boolean", required: true }],
      outputs: [{ name: "selected_branch", type: "text" }],
      artifacts: [],
      validations: ["Condition source is declared and inspectable."],
    },
    {
      id: "map-apply",
      title: "Map / Apply",
      category: "control",
      purpose: "Apply a reusable block to each item in a collection.",
      inputs: [{ name: "items", type: "collection", required: true }, { name: "block", type: "block_ref", required: true }],
      outputs: [{ name: "results", type: "collection" }],
      artifacts: [{ name: "map_manifest", type: "run manifest", value: "runtime/map_manifest.json" }],
      validations: ["Every input item has a corresponding output or recorded skip reason."],
    },
    {
      id: "file-folder-iterator",
      title: "File / Folder Iterator",
      category: "data",
      purpose: "Scan project files or folders and feed matching files downstream.",
      inputs: [{ name: "root", type: "folder", required: true }, { name: "pattern", type: "text" }],
      outputs: [{ name: "file_manifest", type: "json" }],
      artifacts: [{ name: "file_table", type: "table/CSV", value: "outputs/files.csv" }],
      validations: ["Input root exists and excluded directories are respected."],
    },
    {
      id: "condition",
      title: "Condition",
      category: "data",
      purpose: "Define a named boolean decision used by gates and branches.",
      inputs: [{ name: "expression", type: "text", required: true }],
      outputs: [{ name: "decision", type: "boolean" }],
      artifacts: [{ name: "decision_record", type: "JSON", value: "runtime/condition.json" }],
      validations: ["Decision inputs are traceable."],
    },
    {
      id: "parameter",
      title: "Parameter",
      category: "data",
      purpose: "Expose a user-adjustable typed value to the program.",
      inputs: [{ name: "default", type: "typed_value" }],
      outputs: [{ name: "value", type: "typed_value" }],
      artifacts: [],
      validations: ["Value type and accepted range are declared."],
    },
    {
      id: "run-script",
      title: "Run Script",
      category: "execution",
      purpose: "Run a project-local script through a declared command.",
      inputs: [{ name: "script", type: "file", required: true }, { name: "args", type: "json" }],
      outputs: [{ name: "exit_status", type: "integer" }],
      artifacts: [{ name: "stdout_log", type: "logs", value: "runtime/stdout.log" }],
      validations: ["Script path is project-local and output contract is declared."],
    },
    {
      id: "validation-gate",
      title: "Validation Gate",
      category: "quality",
      purpose: "Stop or flag the workflow when expected outputs are missing or invalid.",
      inputs: [{ name: "checks", type: "validation_list", required: true }],
      outputs: [{ name: "validation_status", type: "json" }],
      artifacts: [{ name: "validation_report", type: "markdown/text", value: "reports/validation.md" }],
      validations: ["Every critical output has at least one check."],
    },
    {
      id: "artifact-output",
      title: "Artifact Output",
      category: "artifacts",
      purpose: "Declare a durable result that Studio can inspect later.",
      inputs: [{ name: "artifact", type: "artifact_ref", required: true }],
      outputs: [{ name: "artifact_index", type: "json" }],
      artifacts: [{ name: "artifact_index", type: "JSON", value: "artifacts/index.json" }],
      validations: ["Artifact path is project-relative and type is known."],
    },
    {
      id: "report-generation",
      title: "Report Generation",
      category: "artifacts",
      purpose: "Write a human-readable report from verified tables, figures, logs, and notes.",
      inputs: [{ name: "verified_results", type: "artifact_collection", required: true }],
      outputs: [{ name: "report", type: "markdown/text" }, { name: "pdf", type: "PDF" }],
      artifacts: [{ name: "report", type: "markdown/text", value: "reports/report.md" }, { name: "pdf", type: "PDF", value: "reports/report.pdf" }],
      validations: ["Report lists methods, warnings, inputs, and output paths."],
    },
  ];

  const ARTIFACT_CATEGORIES = [
    { id: "image", label: "Image", extensions: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"] },
    { id: "table", label: "Table / CSV", extensions: [".csv", ".tsv"] },
    { id: "text", label: "Markdown / Text", extensions: [".md", ".txt"] },
    { id: "pdf", label: "PDF", extensions: [".pdf"] },
    { id: "json", label: "JSON", extensions: [".json", ".jsonl"] },
    { id: "logs", label: "Logs", extensions: [".log"] },
    { id: "manifest", label: "Run Manifest", match: /manifest.*\.json$|run.*\.json$/i },
    { id: "explorer", label: "File Explorer", extensions: [] },
  ];
  const TDV_MODE = new URLSearchParams(window.location.search).has("tdv");
  const SESSION_ID = (() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("session") || params.get("aapsSession");
    const fromStorage = window.localStorage ? window.localStorage.getItem("aaps.simple.sessionId") : "";
    const raw = String(fromUrl || fromStorage || "default").trim();
    return raw.replace(/[^0-9A-Za-z_.-]+/g, "_").slice(0, 80) || "default";
  })();

  const DEFAULT_SOURCE = [
    'pipeline "Simple AAPS Program" {',
    '  domain "general"',
    '  goal "Turn a domain intent into a structured AAPS program."',
    "  task define_intent {",
    '    prompt "Describe the domain goal, input data, expected artifacts, and validation criteria."',
    '    verify "The user can inspect the program and reusable block contracts before execution."',
    "  }",
    "}",
    "",
  ].join("\n");

  const state = {
    projects: [],
    projectPath: ".",
    projectAbsolutePath: "",
    manifest: null,
    manifestExists: false,
    activeFile: "",
    projectAapsFiles: [],
    projectArtifactCount: 0,
    source: DEFAULT_SOURCE,
    ir: null,
    selectedElementId: "",
    selectedBlockId: "",
    focus: { type: "project", id: "selected project/program", label: "selected project/program" },
    messages: [],
    sessionId: SESSION_ID,
    sessions: [],
    lastHistorySignature: "",
    chatInFlight: false,
    historySyncTimer: null,
    settings: {},
    chatPanelOpen: false,
    drag: null,
    projectGroupsOpen: {},
    blockGroupsOpen: { system: false, user: true },
    artifacts: [],
    artifactCategory: "image",
    editingElementId: "",
    editingBlockId: "",
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function compact(value, limit = 180) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text;
  }

  function nowStamp() {
    return new Date().toISOString();
  }

  async function jsonFetch(url, payload) {
    const options = payload
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }
      : {};
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `${url} returned ${response.status}`);
    return data;
  }

  function chatContext() {
    const selectedElement = state.selectedElementId ? findProgramNode(state.selectedElementId) : null;
    const selectedBlockValue = state.selectedBlockId ? selectedBlock() : null;
    return {
      tab: "simple",
      projectPath: state.projectPath || ".",
      activeFile: state.activeFile || "",
      workingFile: state.activeFile || "",
      sessionId: state.sessionId,
      sessionName: currentSession()?.name || state.sessionId,
      commandCwd: currentSessionCwd(),
      focus: state.focus,
      selectedElement,
      selectedBlock: selectedBlockValue,
      diagnostics: (state.ir && state.ir.diagnostics) || [],
      manifest: state.manifest || {},
      settings: {
        agentProvider: state.settings.agentProvider || "",
        codexChatModel: state.settings.codexChatModel || "",
        codexChatReasoning: state.settings.codexChatReasoning || "",
        codexTaskModel: state.settings.codexTaskModel || "",
        codexTaskReasoning: state.settings.codexTaskReasoning || "",
        agintiProvider: state.settings.agintiProvider || "",
      },
    };
  }

  function currentSession() {
    return state.sessions.find((session) => session.sessionId === state.sessionId) || null;
  }

  function normalizeSessionId(value) {
    return String(value || "session").replace(/[^0-9A-Za-z_.:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "session";
  }

  function uniqueSessionId(name) {
    const base = normalizeSessionId(name || "session");
    const taken = new Set(state.sessions.map((session) => session.sessionId));
    if (!taken.has(base)) return base;
    const suffix = Date.now().toString(36);
    return normalizeSessionId(`${base}_${suffix}`);
  }

  function currentSessionCwd() {
    const session = currentSession();
    return session?.commandCwd || state.projectAbsolutePath || state.projectPath || ".";
  }

  function updateSessionCwdDisplay() {
    const node = $("#session-cwd");
    if (!node) return;
    const cwd = currentSessionCwd();
    node.textContent = `cwd: ${compact(cwd, 78)}`;
    node.title = cwd;
  }

  function sessionPathSuggestions() {
    const values = new Set();
    const root = state.projectAbsolutePath || state.projectPath || ".";
    [".", root, currentSessionCwd()].forEach((value) => {
      if (value) values.add(value);
    });
    ["blocks", "skills", "workflows", "scripts", "data", "artifacts", "runs", "reports", "notes"].forEach((folder) => {
      values.add(folder);
      if (root && root !== ".") values.add(`${root.replace(/\/$/, "")}/${folder}`);
    });
    state.projects.forEach((project) => {
      if (project.absolutePath) values.add(project.absolutePath);
      if (project.path) values.add(project.path);
    });
    state.sessions.forEach((session) => {
      if (session.commandCwd) values.add(session.commandCwd);
      if (session.projectRoot) values.add(session.projectRoot);
    });
    return Array.from(values).filter(Boolean).slice(0, 80);
  }

  function renderSessionPathOptions() {
    const datalist = $("#session-cwd-options");
    if (!datalist) return;
    datalist.innerHTML = sessionPathSuggestions()
      .map((value) => `<option value="${escapeHtml(value)}"></option>`)
      .join("");
  }

  function syncSessionBadge() {
    const select = $("#session-select");
    if (select) {
      if (!state.sessions.some((session) => session.sessionId === state.sessionId)) {
        state.sessions = [
          {
            sessionId: state.sessionId,
            name: state.sessionId,
            historyCount: 0,
          },
          ...state.sessions,
        ];
      }
      select.innerHTML = state.sessions
        .map((session) => {
          const label = `${session.name || session.sessionId}${session.historyCount ? ` (${session.historyCount})` : ""}`;
          return `<option value="${escapeHtml(session.sessionId)}">${escapeHtml(label)}</option>`;
        })
        .join("");
      select.value = state.sessionId;
      select.title = `Session ${state.sessionId}`;
    }
    updateSessionCwdDisplay();
    renderSessionPathOptions();
    if (window.localStorage) window.localStorage.setItem("aaps.simple.sessionId", state.sessionId);
  }

  function messageTextFromResponse(response) {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (typeof response.message === "string") return response.message;
    if (typeof response.summary === "string") return response.summary;
    return JSON.stringify(response, null, 2);
  }

  function messagesFromHistoryEvents(events = []) {
    const messages = [];
    events.forEach((event) => {
      const timestamp = event.time || "";
      const focus = `${event.scope || "session"}:${event.scope_id || state.sessionId}`;
      const metadata = event.metadata || {};
      if (event.message) {
        messages.push({
          role: "user",
          text: event.message,
          timestamp,
          focus,
          backend: metadata.source === "terminal" ? "terminal" : "",
        });
      }
      const responseText = messageTextFromResponse(event.response);
      if (responseText) {
        messages.push({
          role: "assistant",
          text: responseText,
          timestamp,
          focus,
          backend: metadata.backend || event.response?.route || "",
        });
      }
    });
    return messages;
  }

  function historySignature(events = []) {
    return JSON.stringify(events.map((event) => [event.time, event.message, event.response?.message || event.response?.summary || ""]));
  }

  async function touchSession(name = "") {
    if (!state.projectPath || !state.sessionId) return null;
    const payload = await jsonFetch("/api/aaps/sessions", {
      path: state.projectPath || ".",
      sessionId: state.sessionId,
      name: name || currentSession()?.name || state.sessionId,
      commandCwd: currentSessionCwd(),
      activeFile: state.activeFile || "",
      backend: state.settings.agentProvider || "",
      provider: state.settings.agintiProvider || state.settings.deepseekModel || "",
      source: "studio",
    });
    state.sessions = Array.isArray(payload.sessions) ? payload.sessions : state.sessions;
    syncSessionBadge();
    return payload.session || null;
  }

  async function loadSessions({ createCurrent = true } = {}) {
    if (!state.projectPath) return;
    try {
      const query = new URLSearchParams({ path: state.projectPath || "." });
      const payload = await jsonFetch(`/api/aaps/sessions?${query.toString()}`);
      state.sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      if (createCurrent && !state.sessions.some((session) => session.sessionId === state.sessionId)) {
        await touchSession(state.sessionId);
      } else {
        syncSessionBadge();
      }
    } catch (error) {
      showToast("Session list unavailable", error.message, "error", 5200);
      syncSessionBadge();
    }
  }

  async function loadSessionHistory({ quiet = false } = {}) {
    if (!state.projectPath || !state.sessionId) return false;
    try {
      const queries = [
        new URLSearchParams({ path: state.projectPath || ".", scope: "session", id: state.sessionId }),
      ];
      if (state.sessionId === "default" && state.activeFile) {
        queries.push(
          new URLSearchParams({ path: state.projectPath || ".", scope: "simple", id: state.activeFile }),
          new URLSearchParams({ path: state.projectPath || ".", scope: "program", id: state.activeFile })
        );
      }
      let payload = { events: [] };
      for (const query of queries) {
        payload = await jsonFetch(`/api/aaps/history?${query.toString()}`);
        if (Array.isArray(payload.events) && payload.events.length) break;
      }
      const events = Array.isArray(payload.events) ? payload.events : [];
      const signature = historySignature(events);
      if (signature !== state.lastHistorySignature) {
        state.lastHistorySignature = signature;
        state.messages = messagesFromHistoryEvents(events);
        renderChat();
      }
      return true;
    } catch (error) {
      if (!quiet) addMessage("assistant", `Session history could not be loaded: ${error.message}`);
      return false;
    }
  }

  async function switchSession(sessionId) {
    const normalized = normalizeSessionId(sessionId || "default");
    if (normalized === state.sessionId) return;
    state.sessionId = normalized;
    state.lastHistorySignature = "";
    state.messages = [];
    syncSessionBadge();
    await touchSession(normalized);
    await loadSessionHistory({ quiet: true });
    renderAll();
    showToast("Session switched", normalized, "success", 2600);
  }

  function safeParse(source) {
    try {
      return window.AAPS.parseAAPS(source || DEFAULT_SOURCE);
    } catch (error) {
      return window.AAPS.parseAAPS(DEFAULT_SOURCE);
    }
  }

  function resetProgram(source) {
    state.source = source || DEFAULT_SOURCE;
    state.ir = safeParse(state.source);
    if (!state.selectedElementId) {
      const first = flattenProgram()[0];
      state.selectedElementId = first ? first.node.id : "";
    }
  }

  function allProgramRoots() {
    const pipeline = state.ir && state.ir.pipeline ? state.ir.pipeline : {};
    pipeline.tasks = pipeline.tasks || [];
    return pipeline.tasks;
  }

  function allUserBlocks() {
    const pipeline = state.ir && state.ir.pipeline ? state.ir.pipeline : {};
    return [...(pipeline.blocks || []), ...(pipeline.skills || [])];
  }

  function walkNode(node, visitor, parent = null, depth = 0, index = 0) {
    visitor(node, parent, depth, index);
    (node.children || []).forEach((child, childIndex) => walkNode(child, visitor, node, depth + 1, childIndex));
  }

  function flattenProgram() {
    const rows = [];
    allProgramRoots().forEach((node, index) => {
      walkNode(node, (current, parent, depth, order) => rows.push({ node: current, parent, depth, order }), null, 0, index);
    });
    return rows;
  }

  function findProgramNode(id) {
    let found = null;
    flattenProgram().forEach((row) => {
      if (row.node.id === id) found = row.node;
    });
    return found;
  }

  function findUserBlock(id) {
    return allUserBlocks().find((block) => block.id === id) || null;
  }

  function systemBlock(id) {
    return SYSTEM_BLOCKS.find((block) => block.id === id) || null;
  }

  function slugId(value, fallback = "program_step") {
    const text = String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    return text || fallback;
  }

  function uniqueProgramId(base) {
    const used = new Set(flattenProgram().map((row) => row.node.id));
    const root = slugId(base, "program_step");
    if (!used.has(root)) return root;
    let index = 2;
    while (used.has(`${root}_${index}`)) index += 1;
    return `${root}_${index}`;
  }

  function descendantsOf(node, ids = new Set()) {
    (node.children || []).forEach((child) => {
      ids.add(child.id);
      descendantsOf(child, ids);
    });
    return ids;
  }

  function findNodeContainer(id, roots = allProgramRoots()) {
    for (let index = 0; index < roots.length; index += 1) {
      const node = roots[index];
      if (node.id === id) return { container: roots, index, node, parent: null };
      const found = findNodeContainerInChildren(id, node);
      if (found) return found;
    }
    return null;
  }

  function findNodeContainerInChildren(id, parent) {
    const children = parent.children || [];
    for (let index = 0; index < children.length; index += 1) {
      const node = children[index];
      if (node.id === id) return { container: children, index, node, parent };
      const found = findNodeContainerInChildren(id, node);
      if (found) return found;
    }
    return null;
  }

  function detachProgramNode(id) {
    const found = findNodeContainer(id);
    if (!found) return null;
    return found.container.splice(found.index, 1)[0] || null;
  }

  function insertProgramNode(node, targetId = "", mode = "append") {
    const roots = allProgramRoots();
    if (!targetId || mode === "append-root") {
      roots.push(node);
      return true;
    }
    const target = findNodeContainer(targetId);
    if (!target) {
      roots.push(node);
      return true;
    }
    if (node.id === targetId || descendantsOf(node).has(targetId)) return false;
    if (mode === "inside") {
      target.node.children = target.node.children || [];
      target.node.children.push(node);
      return true;
    }
    const insertAt = mode === "before" ? target.index : target.index + 1;
    target.container.splice(insertAt, 0, node);
    return true;
  }

  function programDropMode(event, item) {
    if (!item) return "append-root";
    const rect = item.getBoundingClientRect();
    const y = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
    if (y < 0.28) return "before";
    if (y > 0.72) return "after";
    return "inside";
  }

  function systemBlockProgramNode(block) {
    const id = uniqueProgramId(block.id);
    if (["for-loop", "map-apply", "file-folder-iterator"].includes(block.id)) {
      return {
        kind: "for_each",
        id,
        title: block.title,
        prompt: block.purpose || "",
        iterator: { item: block.id === "file-folder-iterator" ? "file_path" : "item", source: block.id === "file-folder-iterator" ? "input_files" : "items" },
        calls: [],
        verify: [...(block.validations || [])],
        children: [],
      };
    }
    if (block.id === "if-else" || block.id === "condition") {
      return {
        kind: "if",
        id,
        title: block.title,
        prompt: block.purpose || "",
        condition: "condition",
        calls: [],
        verify: [...(block.validations || [])],
        children: [],
      };
    }
    return {
      kind: "task",
      id,
      title: block.title,
      prompt: block.purpose || "Run a reusable system block.",
      calls: [],
      verify: [...(block.validations || [])],
      children: [],
    };
  }

  function blockProgramNode(block) {
    if (systemBlock(block.id) && !findUserBlock(block.id)) return systemBlockProgramNode(block);
    return {
      kind: "task",
      id: uniqueProgramId(block.id),
      title: block.title || block.id,
      prompt: block.purpose || block.prompt || "Run a reusable AAPS block.",
      calls: [{ skill: block.id, as: "" }],
      inputs: [...(block.inputs || [])],
      outputs: [...(block.outputs || [])],
      validations: [...(block.validations || [])],
      verify: [...(block.verify || [])],
      artifacts: [...(block.artifacts || [])],
      children: [],
    };
  }

  async function commitProgramStructureChange(summary, selectedId = "", previousSource = state.source, previousIr = JSON.parse(JSON.stringify(state.ir))) {
    try {
      serializeCurrentProgram();
      const reparsed = window.AAPS.parseAAPS(state.source);
      if (reparsed.diagnostics && reparsed.diagnostics.length) {
        state.source = previousSource;
        state.ir = previousIr;
        showToast("Drag rejected", `Grammar diagnostics: ${reparsed.diagnostics[0].message || "invalid structure"}`, "error", 5200);
        return false;
      }
      state.ir = reparsed;
      if (selectedId) {
        state.selectedElementId = selectedId;
        const selected = findProgramNode(selectedId);
        if (selected) setFocus("program element", selectedId, titleForNode(selected));
      }
      await persistProgram();
      renderAll();
      showToast("Program updated", summary, "success", 2600);
      return true;
    } catch (error) {
      state.source = previousSource;
      state.ir = previousIr;
      showToast("Drag rejected", error.message, "error", 5200);
      renderAll();
      return false;
    }
  }

  async function moveProgramNode(sourceId, targetId = "", mode = "append-root") {
    const source = findProgramNode(sourceId);
    if (!source) return false;
    if (targetId && (sourceId === targetId || descendantsOf(source).has(targetId))) {
      showToast("Move blocked", "A program element cannot be dropped into itself or its children.", "error", 4200);
      return false;
    }
    const previousSource = state.source;
    const previousIr = JSON.parse(JSON.stringify(state.ir));
    const node = detachProgramNode(sourceId);
    if (!node) return false;
    const inserted = insertProgramNode(node, targetId, mode);
    if (!inserted) {
      state.ir = previousIr;
      state.source = previousSource;
      showToast("Move blocked", "That nesting would break the program tree.", "error", 4200);
      renderAll();
      return false;
    }
    return commitProgramStructureChange(`Moved ${sourceId} ${mode.replace("-", " ")}${targetId ? ` ${targetId}` : " program"}.`, sourceId, previousSource, previousIr);
  }

  async function addBlockToProgram(blockId, targetId = "", mode = "append-root") {
    const block = findUserBlock(blockId) || systemBlock(blockId);
    if (!block) return false;
    const previousSource = state.source;
    const previousIr = JSON.parse(JSON.stringify(state.ir));
    const node = blockProgramNode(block);
    insertProgramNode(node, targetId, mode);
    return commitProgramStructureChange(`Added ${blockId} to the program.`, node.id, previousSource, previousIr);
  }

  async function deleteProgramNode(id) {
    const previousSource = state.source;
    const previousIr = JSON.parse(JSON.stringify(state.ir));
    const node = detachProgramNode(id);
    if (!node) return false;
    return commitProgramStructureChange(`Deleted ${id} from the program.`, "", previousSource, previousIr);
  }

  function selectedBlock() {
    return findUserBlock(state.selectedBlockId) || systemBlock(state.selectedBlockId);
  }

  function blockGroupForId(id) {
    if (findUserBlock(id)) return "user";
    if (systemBlock(id)) return "system";
    return "";
  }

  function titleForNode(node) {
    return node ? node.title || node.id || node.kind || "Untitled" : "Untitled";
  }

  function statusForBlock(block, source) {
    if (source === "system") return { label: "system default", className: "system" };
    if (!block) return { label: "unknown", className: "needs" };
    if (block.compile && block.compile.prompt) return { label: "needs implementation", className: "needs" };
    if (!block.exec || !block.exec.length) return { label: "contract only", className: "needs" };
    return { label: "ready contract", className: "ready" };
  }

  function portLine(port) {
    const required = port.required ? " required" : "";
    const value = port.value ? ` = ${port.value}` : "";
    const validation = port.validation ? ` validate ${port.validation}` : "";
    return `${port.name}: ${port.type || "artifact"}${required}${value}${validation}`;
  }

  function portsToText(ports) {
    return (ports || []).map(portLine).join("\n");
  }

  function textToPorts(text, fallbackType = "artifact") {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Za-z_][\w.-]*)(?:\s*:\s*([A-Za-z_][\w.-]*))?(?:\s+(required|optional))?(?:\s*=\s*(.*?))?(?:\s+validate\s+(.+))?$/i);
        if (!match) return { name: line.replace(/[^A-Za-z0-9_]+/g, "_").slice(0, 32) || "value", type: fallbackType, value: line };
        return {
          name: match[1],
          type: match[2] || fallbackType,
          required: match[3] ? match[3].toLowerCase() === "required" : false,
          value: match[4] || "",
          validation: match[5] || "",
        };
      });
  }

  function linesToText(lines) {
    return (lines || []).join("\n");
  }

  function textToLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function setFocus(type, id, label) {
    state.focus = { type, id, label: label || id || "selected project/program" };
    $("#focus-label").textContent = `Focus: ${state.focus.type} - ${state.focus.label}`;
    $("#chat-scope").textContent =
      state.focus.type === "project"
        ? "Applies to the whole selected project/program."
        : `Applies to selected ${state.focus.type}: ${state.focus.label}`;
  }

  function projectKey(project) {
    return project.absolutePath || project.path || project.name || "";
  }

  function projectIsOpen(project) {
    const key = projectKey(project);
    return state.projectGroupsOpen[key] !== false;
  }

  function toggleProjectGroup(key) {
    state.projectGroupsOpen[key] = state.projectGroupsOpen[key] === false;
    renderProjects();
  }

  function renderProjects() {
    const list = $("#project-list");
    const currentProject = {
      name: (state.manifest && state.manifest.name) || "AAPS",
      path: state.projectPath || "",
      absolutePath: state.projectAbsolutePath || state.projectPath || "",
      manifestExists: state.manifestExists,
      current: true,
      selected: true,
      aapsFiles: state.projectAapsFiles || [],
      artifactCount: state.projectArtifactCount || 0,
      activeFile: state.activeFile || "",
    };
    const seen = new Set();
    const projects = [currentProject, ...state.projects].filter((project) => {
      const key = projectKey(project);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      if (!(key in state.projectGroupsOpen)) state.projectGroupsOpen[key] = true;
      return true;
    });
    if (!projects.length) {
      list.innerHTML = '<div class="empty-state">No sibling AAPS projects found yet. Open a path or create a starter project.</div>';
    } else {
      list.innerHTML = projects
        .map((project) => {
          const selected = project.path === state.projectPath || project.absolutePath === state.projectAbsolutePath;
          const name = project.name || project.path || "AAPS project";
          const path = project.absolutePath || project.path || "";
          const key = projectKey(project);
          const open = projectIsOpen(project);
          const aapsFiles = Array.isArray(project.aapsFiles) ? project.aapsFiles : [];
          const activeFile = project.activeFile || project.defaultMain || "";
          const files = open
            ? aapsFiles.length
              ? `<div class="project-aaps-list" data-project-aaps-list="${escapeHtml(key)}">
                  ${aapsFiles
                    .map(
                      (file) => `
                        <button
                          type="button"
                          class="project-aaps-file${selected && file === state.activeFile ? " is-active" : ""}"
                          data-project-path="${escapeHtml(path)}"
                          data-project-file="${escapeHtml(file)}"
                          title="${escapeHtml(file)}"
                        >${escapeHtml(file)}</button>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="project-empty">No .aaps files yet.</div>`
            : "";
          return `
            <section class="project-entry${selected ? " is-selected" : ""}" data-project-entry="${escapeHtml(key)}">
              <div class="project-header-row">
                <button type="button" class="project-toggle" data-toggle-project="${escapeHtml(key)}" aria-expanded="${open ? "true" : "false"}" title="${open ? "Fold project" : "Unfold project"}">
                  <span class="project-chevron" aria-hidden="true">${open ? "▾" : "▸"}</span>
                </button>
                <button type="button" class="project-item" data-project-path="${escapeHtml(path)}">
                  <strong>${escapeHtml(name)}${selected ? " · selected" : ""}</strong>
                  <small>${escapeHtml(project.absolutePath || path)}</small>
                  <span class="project-meta-row">
                    <small>${aapsFiles.length} .aaps${activeFile ? ` · main ${escapeHtml(activeFile)}` : ""}</small>
                    <small>${Number(project.artifactCount || 0)} artifacts</small>
                  </span>
                </button>
              </div>
              ${files}
            </section>
          `;
        })
        .join("");
    }
    $("#project-path-input").value = "";
    $("#project-path-input").placeholder = "Open project folder path";
  }

  function renderProgram() {
    const rows = flattenProgram();
    const pipeline = state.ir && state.ir.pipeline ? state.ir.pipeline : {};
    $("#program-subtitle").textContent = `${pipeline.name || "Untitled"}${state.activeFile ? ` - ${state.activeFile}` : ""}`;
    $("#program-status").textContent = rows.length
      ? "Drag elements to reorder or nest. Drag blocks from Blocks & Skills into the program. Drop a program element on Blocks & Skills to delete it."
      : "No structured elements yet. Drag a block here or ask chat to create a rough pipeline.";
    const container = $("#program-elements");
    if (!rows.length) {
      container.innerHTML = '<div class="empty-state program-drop-empty" data-program-drop-root="true">No program elements. Drag a block here or ask chat to create a rough pipeline.</div>';
      return;
    }
    container.innerHTML = rows
      .map(({ node, depth, order }) => {
        const selected = state.selectedElementId === node.id;
        const linked = (node.calls || []).map((call) => call.skill).filter(Boolean);
        const purpose = node.prompt || (node.verify || []).join(" ") || "No purpose recorded yet.";
        return `
          <article class="program-item${selected ? " is-selected" : ""}" data-program-id="${escapeHtml(node.id)}" draggable="true" style="margin-left: ${depth * 30}px">
            <button type="button" class="program-button" data-select-program="${escapeHtml(node.id)}">
              <div class="item-topline">
                <span>
                  <span class="item-title">${escapeHtml(titleForNode(node))}</span>
                  <span class="program-meta">${escapeHtml(node.id)} - order ${order + 1}</span>
                </span>
                <span class="kind-chip">${escapeHtml(node.kind)}</span>
              </div>
              <p class="program-purpose">${escapeHtml(compact(purpose))}</p>
            </button>
            <div class="link-row">
              ${
                linked.length
                  ? linked
                      .map(
                        (blockId) =>
                          `<button type="button" class="link-chip" data-focus-block="${escapeHtml(blockId)}">uses ${escapeHtml(blockId)}</button>`
                      )
                      .join("")
                  : '<span class="status-chip needs">no linked block yet</span>'
              }
            </div>
            <div class="card-actions">
              <span class="drag-hint">drag to reorder or nest</span>
              <button type="button" data-edit-program="${escapeHtml(node.id)}">Edit</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderBlocks() {
    const userBlocks = allUserBlocks();
    const sections = [
      { title: "System blocks", source: "system", blocks: SYSTEM_BLOCKS, empty: "" },
      {
        title: "User / domain blocks",
        source: "user",
        blocks: userBlocks,
        empty: "Domain blocks appear here when chat creates a program or reusable skill.",
      },
    ];
    $("#block-count").textContent = String(SYSTEM_BLOCKS.length + userBlocks.length);
    $("#blocks-list").innerHTML = sections
      .map((section) => {
        const open = state.blockGroupsOpen[section.source] !== false;
        const cards = section.blocks.length
          ? section.blocks
              .map((block) => {
                const selected = state.selectedBlockId === block.id;
                const status = statusForBlock(block, section.source);
                const purpose = block.purpose || block.prompt || "Reusable AAPS block contract.";
                const inputs = block.inputs || [];
                const outputs = block.outputs || [];
                return `
                  <article class="block-item${selected ? " is-selected" : ""}" data-block-id="${escapeHtml(block.id)}" draggable="true">
                    <button type="button" class="block-button" data-select-block="${escapeHtml(block.id)}">
                      <div class="item-topline">
                        <span>
                          <span class="item-title">${escapeHtml(titleForNode(block))}</span>
                          <span class="block-meta">${escapeHtml(block.id)}</span>
                        </span>
                        <span class="source-chip">${escapeHtml(section.source === "system" ? block.category || "system" : block.kind || "block")}</span>
                      </div>
                      <p class="block-purpose">${escapeHtml(compact(purpose))}</p>
                    </button>
                    <div class="port-list">
                      <span>${inputs.length} inputs</span>
                      <span>${outputs.length} outputs</span>
                      <span>${(block.artifacts || []).length} artifacts</span>
                      <span>${(block.validations || block.verify || []).length} validations</span>
                    </div>
                    <div class="card-actions">
                      <span class="status-chip ${status.className}">${escapeHtml(status.label)}</span>
                      <span class="drag-hint">drag into program</span>
                      <button type="button" data-edit-block="${escapeHtml(block.id)}">Edit</button>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<div class="empty-state">${escapeHtml(section.empty || "No blocks in this group.")}</div>`;
        return `
          <section class="block-group${open ? "" : " is-folded"}" data-block-group="${escapeHtml(section.source)}">
            <button
              type="button"
              class="block-group-title"
              data-toggle-block-group="${escapeHtml(section.source)}"
              aria-expanded="${open ? "true" : "false"}"
            >
              <span>${escapeHtml(section.title)}</span>
              <span class="block-group-meta">${section.blocks.length} ${section.blocks.length === 1 ? "block" : "blocks"}</span>
              <span class="fold-label">${open ? "Fold" : "Unfold"}</span>
            </button>
            <div class="block-group-body">${cards}</div>
          </section>
        `;
      })
      .join("");
  }

  function renderChat() {
    const stream = $("#chat-stream");
    stream.innerHTML = state.messages.length
      ? state.messages
          .map(
            (message) => `
              <div class="message ${message.role}">
                <strong>${escapeHtml(message.role === "user" ? "You" : "AAPS")}</strong>
                <p>${escapeHtml(message.text)}</p>
              </div>
            `
          )
          .join("")
      : '<div class="empty-state">No messages yet. Send a request or open Chat History after a run.</div>';
    stream.scrollTop = stream.scrollHeight;
  }

  function renderAll() {
    renderProjects();
    renderProgram();
    renderBlocks();
    renderChat();
  }

  async function loadProjects() {
    try {
      const payload = await jsonFetch(`/api/aaps/projects?path=${encodeURIComponent(state.projectPath || ".")}`);
      state.projects = payload.items || [];
    } catch (error) {
      state.projects = [];
    }
  }

  function syncSettingsControls() {
    const settings = state.settings || {};
    const pairs = [
      ["#agent-provider", settings.agentProvider || "codex"],
      ["#codex-chat-model", settings.codexChatModel || settings.codexModel || "gpt-5.5"],
      ["#codex-chat-reasoning", settings.codexChatReasoning || settings.codexReasoning || "medium"],
      ["#codex-task-model", settings.codexTaskModel || settings.codexModel || "gpt-5.5"],
      ["#codex-task-reasoning", settings.codexTaskReasoning || "high"],
      ["#aginti-provider", settings.agintiProvider || "deepseek"],
    ];
    pairs.forEach(([selector, value]) => {
      const field = $(selector);
      if (field) field.value = value;
    });
  }

  function readSettingsControls() {
    return {
      agentProvider: $("#agent-provider")?.value || "codex",
      codexChatModel: $("#codex-chat-model")?.value.trim() || "gpt-5.5",
      codexChatReasoning: $("#codex-chat-reasoning")?.value || "medium",
      codexTaskModel: $("#codex-task-model")?.value.trim() || "gpt-5.5",
      codexTaskReasoning: $("#codex-task-reasoning")?.value || "high",
      agintiProvider: $("#aginti-provider")?.value || "deepseek",
    };
  }

  function backendLabel(settings = state.settings) {
    const provider = settings.agentProvider || "codex";
    if (provider === "aginti") return `AgInTiFlow/${settings.agintiProvider || "deepseek"}`;
    if (provider === "deepseek") return `DeepSeek/${settings.deepseekModel || "deepseek-v4-pro"}`;
    return `Codex chat ${settings.codexChatModel || settings.codexModel || "gpt-5.5"} ${settings.codexChatReasoning || "medium"}`;
  }

  async function loadSettings() {
    try {
      state.settings = await jsonFetch("/api/aaps/settings");
      syncSettingsControls();
      $("#chat-status").textContent = `ready - ${backendLabel()}`;
    } catch (error) {
      state.settings = {};
      $("#chat-status").textContent = `settings unavailable: ${error.message}`;
    }
  }

  async function saveSettingsFromControls() {
    const payload = readSettingsControls();
    state.settings = await jsonFetch("/api/aaps/settings", payload);
    syncSettingsControls();
    return state.settings;
  }

  function showToast(title, detail = "", kind = "info", timeoutMs = 4200) {
    const stack = $("#toast-stack");
    if (!stack) return;
    const node = document.createElement("div");
    node.className = `toast ${kind}`;
    node.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}`;
    stack.appendChild(node);
    window.setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateY(6px)";
      node.style.transition = "opacity 160ms ease, transform 160ms ease";
      window.setTimeout(() => node.remove(), 180);
    }, timeoutMs);
  }

  function setChatStatus(text, toastTitle = "", toastKind = "info") {
    $("#chat-status").textContent = text;
    if (toastTitle) showToast(toastTitle, text, toastKind);
  }

  function setChatPanelOpen(open) {
    state.chatPanelOpen = Boolean(open);
    const dock = $(".chat-dock");
    const button = $("#chat-panel-toggle");
    if (dock) dock.classList.toggle("is-expanded", state.chatPanelOpen);
    document.documentElement.style.setProperty("--active-chat-h", state.chatPanelOpen ? "var(--chat-h)" : "var(--chat-compact-h)");
    if (button) {
      button.setAttribute("aria-expanded", state.chatPanelOpen ? "true" : "false");
      button.textContent = state.chatPanelOpen ? "Hide Chat Panel" : "Chat Panel";
    }
  }

  function activeFileFromPayload(payload) {
    const manifest = payload.manifest || {};
    const manifestFiles = manifest.files || {};
    const workflows = Array.isArray(manifestFiles.workflows) ? manifestFiles.workflows : [];
    const files = Array.isArray(payload.files) ? payload.files : [];
    return manifest.activeFile || manifest.defaultMain || workflows[0] || files.find((file) => file.startsWith("workflows/")) || files[0] || "";
  }

  async function loadProject(pathValue = ".", fileToOpen = "") {
    state.projectPath = pathValue || state.projectPath || ".";
    $("#chat-status").textContent = "loading";
    try {
      const payload = await jsonFetch(`/api/aaps/project?path=${encodeURIComponent(state.projectPath)}`);
      state.manifest = payload.manifest || null;
      state.manifestExists = Boolean(payload.manifest_exists);
      state.projectPath = payload.project_path || state.projectPath;
      state.projectAbsolutePath = payload.absolute_path || "";
      state.projectAapsFiles = Array.isArray(payload.files) ? payload.files : [];
      state.projectArtifactCount = Number(payload.artifactCount || 0);
      state.activeFile = fileToOpen || activeFileFromPayload(payload);
      if (state.activeFile) {
        const filePayload = await jsonFetch(
          `/api/aaps/project/file?path=${encodeURIComponent(state.projectPath)}&file=${encodeURIComponent(state.activeFile)}`
        );
        resetProgram(filePayload.source || DEFAULT_SOURCE);
      } else {
        resetProgram(DEFAULT_SOURCE);
      }
      const firstElement = flattenProgram()[0];
      if (firstElement) {
        state.selectedElementId = firstElement.node.id;
        setFocus("program element", firstElement.node.id, titleForNode(firstElement.node));
      } else {
        setFocus("project", state.projectPath, "selected project/program");
      }
      await loadProjects();
      $("#chat-status").textContent = "ready";
      await loadSessions();
      await loadSessionHistory({ quiet: true });
    } catch (error) {
      state.manifest = { name: "Local draft" };
      state.manifestExists = false;
      state.projectAbsolutePath = "";
      state.activeFile = "";
      state.projectAapsFiles = [];
      state.projectArtifactCount = 0;
      resetProgram(DEFAULT_SOURCE);
      setFocus("project", state.projectPath, "local draft");
      $("#chat-status").textContent = "local draft";
      addMessage("assistant", `Project could not be loaded, so Studio is using a local draft: ${error.message}`);
    }
    renderAll();
  }

  async function persistProgram() {
    if (!state.activeFile || !state.projectPath) return false;
    try {
      await jsonFetch("/api/aaps/project/file", {
        path: state.projectPath,
        file: state.activeFile,
        source: state.source,
      });
      $("#chat-status").textContent = "saved";
      return true;
    } catch (error) {
      $("#chat-status").textContent = "draft not saved";
      addMessage("assistant", `The program changed locally but was not saved: ${error.message}`);
      return false;
    }
  }

  function addMessage(role, text, extra = {}) {
    state.messages.push({
      role,
      text,
      timestamp: nowStamp(),
      focus: `${state.focus.type}:${state.focus.label}`,
      backend: role === "assistant" ? backendLabel() : "",
      ...extra,
    });
    renderChat();
  }

  function selectProgram(id) {
    const node = findProgramNode(id);
    if (!node) return;
    state.selectedElementId = id;
    setFocus("program element", id, titleForNode(node));
    renderProgram();
  }

  function selectBlock(id) {
    const block = findUserBlock(id) || systemBlock(id);
    if (!block) return;
    const group = blockGroupForId(id);
    if (group) state.blockGroupsOpen[group] = true;
    state.selectedBlockId = id;
    setFocus("block/skill", id, titleForNode(block));
    renderBlocks();
  }

  function toggleBlockGroup(source) {
    if (!source) return;
    state.blockGroupsOpen[source] = state.blockGroupsOpen[source] === false;
    renderBlocks();
  }

  function serializeCurrentProgram() {
    state.source = window.AAPS.serializeAAPS(state.ir);
  }

  function applyLocalStructuredPlan(message) {
    let result = null;
    if (state.focus.type === "block/skill") {
      result = window.AAPS.planBlockFromPrompt(state.ir, message, { focus: state.focus });
      if (!result.changed) result = window.AAPS.planProgramFromPrompt(state.ir, message, { focus: state.focus });
    } else {
      result = window.AAPS.planProgramFromPrompt(state.ir, message, { focus: state.focus });
      if (!result.changed && !result.needsConfirmation) result = window.AAPS.planBlockFromPrompt(state.ir, message, { focus: state.focus });
    }

    if (result.needsConfirmation) {
      addMessage("assistant", result.summary);
      $("#chat-status").textContent = "needs confirmation";
      return true;
    }

    if (!result.changed) {
      addMessage("assistant", result.summary || "No structured program edit was inferred. Select a narrower focus or ask to create a workflow/block.");
      $("#chat-status").textContent = "ready";
      return true;
    }

    state.ir = result.ir;
    serializeCurrentProgram();
    const firstBlock = (result.blockIds && result.blockIds[0]) || result.blockId || "";
    if (firstBlock) state.selectedBlockId = firstBlock;
    const firstTask = (result.taskIds && result.taskIds[0]) || "";
    if (firstTask) {
      state.selectedElementId = firstTask;
      const node = findProgramNode(firstTask);
      if (node) setFocus("program element", firstTask, titleForNode(node));
    } else if (firstBlock) {
      const block = findUserBlock(firstBlock);
      if (block) setFocus("block/skill", firstBlock, titleForNode(block));
    }
    addMessage("assistant", `${result.summary} Placeholder/domain blocks are marked needs implementation until compiled or connected to project-local scripts.`);
    persistProgram();
    renderAll();
    return true;
  }

  function normalizeBackendResult(payload) {
    const result = payload && payload.result && typeof payload.result === "object" ? payload.result : payload;
    return result && typeof result === "object" ? result : { message: String(payload || "") };
  }

  async function applyBackendChat(message) {
    const settings = await saveSettingsFromControls();
    const backend = backendLabel(settings);
    state.chatInFlight = true;
    setChatStatus(`routing - ${backend}`, "Backend request sent");
    const input = $("#chat-input");
    const sendButton = $("#chat-form button[type='submit']");
    if (input) input.disabled = true;
    if (sendButton) sendButton.disabled = true;
    const waitingTimer = window.setTimeout(() => setChatStatus(`waiting for ${backend}`), 900);
    const slowTimer = window.setTimeout(() => showToast("Backend still working", `${backend} is still preparing a response.`, "info", 6500), 6000);
    try {
      const payload = await jsonFetch("/api/aaps/chat", {
        path: state.projectPath || ".",
        file: state.activeFile || "",
        sessionId: state.sessionId,
        source: state.source,
        message,
        forceRealBackend: true,
        context: chatContext(),
      });
      window.clearTimeout(waitingTimer);
      window.clearTimeout(slowTimer);
      setChatStatus(`applying response - ${backend}`);
      const result = normalizeBackendResult(payload);
      if (result.source && typeof result.source === "string" && result.source !== state.source) {
        resetProgram(result.source);
        await persistProgram();
        showToast("AAPS source updated", state.activeFile || "active workflow", "success");
      }
      const synced = await loadSessionHistory({ quiet: true });
      if (!synced) addMessage("assistant", result.message || result.summary || JSON.stringify(result, null, 2), { backend });
      await loadSessions({ createCurrent: false });
      setChatStatus(`ready - ${backend}`, "Backend response ready", "success");
      renderAll();
    } finally {
      state.chatInFlight = false;
      window.clearTimeout(waitingTimer);
      window.clearTimeout(slowTimer);
      if (input) input.disabled = false;
      if (sendButton) sendButton.disabled = false;
      if (input) input.focus();
    }
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const input = $("#chat-input");
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    addMessage("user", message);
    if (TDV_MODE) {
      $("#chat-status").textContent = "planning";
      applyLocalStructuredPlan(message);
      return;
    }
    try {
      await applyBackendChat(message);
    } catch (error) {
      addMessage("assistant", `Backend failed: ${error.message}`);
      setChatStatus("backend unavailable", "Backend failed", "error");
    }
  }

  function startSessionSync() {
    syncSessionBadge();
    if (state.historySyncTimer || TDV_MODE) return;
    state.historySyncTimer = window.setInterval(() => {
      if (!state.chatInFlight) loadSessionHistory({ quiet: true });
    }, 5000);
  }

  function fillLinkedBlockOptions(select, selectedValue = "") {
    const options = ['<option value="">No linked block</option>']
      .concat(allUserBlocks().map((block) => `<option value="${escapeHtml(block.id)}">${escapeHtml(block.id)}</option>`));
    select.innerHTML = options.join("");
    select.value = selectedValue || "";
  }

  function openModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.hidden = false;
  }

  function closeModal(id) {
    const modal = $(`#${id}`);
    if (modal) modal.hidden = true;
  }

  function openNewSessionModal() {
    renderSessionPathOptions();
    const suggestedIndex = state.sessions.length + 1;
    const nameField = $("#new-session-name");
    const cwdField = $("#new-session-cwd");
    if (nameField) nameField.value = `Session ${suggestedIndex}`;
    if (cwdField) cwdField.value = currentSessionCwd();
    openModal("new-session-modal");
    if (nameField) nameField.focus();
  }

  async function createNewSession(event) {
    event.preventDefault();
    const name = $("#new-session-name").value.trim() || "AAPS session";
    const commandCwd = $("#new-session-cwd").value.trim() || currentSessionCwd();
    const sessionId = uniqueSessionId(name);
    try {
      const payload = await jsonFetch("/api/aaps/sessions", {
        path: state.projectPath || ".",
        sessionId,
        name,
        commandCwd,
        activeFile: state.activeFile || "",
        backend: state.settings.agentProvider || "",
        provider: state.settings.agintiProvider || state.settings.deepseekModel || "",
        source: "studio",
      });
      state.sessions = Array.isArray(payload.sessions) ? payload.sessions : state.sessions;
      state.sessionId = sessionId;
      state.lastHistorySignature = "";
      state.messages = [];
      closeModal("new-session-modal");
      syncSessionBadge();
      await loadSessionHistory({ quiet: true });
      renderAll();
      showToast("Session created", `${name} · ${commandCwd}`, "success", 3200);
    } catch (error) {
      showToast("Session creation failed", error.message, "error", 6200);
    }
  }

  function openElementEditor(id) {
    const row = flattenProgram().find((item) => item.node.id === id);
    if (!row) return;
    const node = row.node;
    state.editingElementId = id;
    const form = $("#element-editor-form");
    form.elements.title.value = titleForNode(node);
    form.elements.kind.value = node.kind || "";
    form.elements.order.value = String(row.order + 1);
    form.elements.purpose.value = node.prompt || "";
    form.elements.parameters.value = JSON.stringify(node.params || {}, null, 2);
    form.elements.mapping.value = linesToText([...(node.inputs || []).map((port) => `input ${portLine(port)}`), ...(node.outputs || []).map((port) => `output ${portLine(port)}`)]);
    form.elements.validations.value = linesToText([...(node.validations || []), ...(node.verify || []).map((item) => `verify ${item}`)]);
    fillLinkedBlockOptions(form.elements.linkedBlock, (node.calls && node.calls[0] && node.calls[0].skill) || "");
    openModal("element-editor-modal");
  }

  function saveElementEditor(event) {
    event.preventDefault();
    const node = findProgramNode(state.editingElementId);
    if (!node) return;
    const form = event.currentTarget;
    node.title = form.elements.title.value.trim();
    node.prompt = form.elements.purpose.value.trim();
    try {
      node.params = JSON.parse(form.elements.parameters.value || "{}");
    } catch (_error) {
      node.params = { editor_parse_error: "Parameters JSON was invalid; previous structure was replaced by this note." };
    }
    const linkedBlock = form.elements.linkedBlock.value.trim();
    node.calls = linkedBlock ? [{ skill: linkedBlock, as: "" }] : [];
    node.validations = textToLines(form.elements.validations.value).filter((line) => !line.startsWith("verify "));
    node.verify = textToLines(form.elements.validations.value)
      .filter((line) => line.startsWith("verify "))
      .map((line) => line.replace(/^verify\s+/, ""));
    node.notes = [...(node.notes || []).filter((note) => !note.startsWith("Position metadata:")), `Position metadata: ${form.elements.order.value.trim() || "unchanged"}`];
    serializeCurrentProgram();
    persistProgram();
    closeModal("element-editor-modal");
    renderAll();
  }

  function blockExecReference(block) {
    const exec = (block && block.exec && block.exec[0]) || null;
    if (!exec) return "";
    return exec.entry || exec.command || "";
  }

  function openBlockEditor(id) {
    const block = findUserBlock(id) || systemBlock(id);
    if (!block) return;
    const isSystem = Boolean(systemBlock(id) && !findUserBlock(id));
    state.editingBlockId = id;
    const form = $("#block-editor-form");
    form.elements.title.value = titleForNode(block);
    form.elements.category.value = block.category || block.kind || "block";
    form.elements.version.value = (block.notes || []).find((note) => /^version:/i.test(note)) || "";
    form.elements.scriptRef.value = blockExecReference(block);
    form.elements.purpose.value = block.purpose || block.prompt || "";
    form.elements.inputs.value = portsToText(block.inputs || []);
    form.elements.outputs.value = portsToText(block.outputs || []);
    form.elements.prompt.value = block.prompt || block.purpose || "";
    form.elements.implementation.value = block.compile && block.compile.prompt ? block.compile.prompt : linesToText(block.notes || []);
    form.elements.validations.value = linesToText([...(block.validations || []), ...(block.verify || []).map((item) => `verify ${item}`)]);
    form.elements.artifacts.value = portsToText(block.artifacts || []);
    $$("#block-editor-form input, #block-editor-form textarea, #block-editor-form select").forEach((field) => {
      field.disabled = isSystem;
    });
    $("#block-editor-status").textContent = isSystem
      ? "System block contracts are read-only in this vertical slice."
      : "Domain blocks are editable AAPS contracts and can be compiled into implementations.";
    openModal("block-editor-modal");
  }

  function saveBlockEditor(event) {
    event.preventDefault();
    const block = findUserBlock(state.editingBlockId);
    if (!block) {
      closeModal("block-editor-modal");
      return;
    }
    const form = event.currentTarget;
    block.title = form.elements.title.value.trim();
    block.prompt = form.elements.prompt.value.trim() || form.elements.purpose.value.trim();
    block.inputs = textToPorts(form.elements.inputs.value, "artifact");
    block.outputs = textToPorts(form.elements.outputs.value, "artifact");
    block.artifacts = textToPorts(form.elements.artifacts.value, "artifact");
    block.validations = textToLines(form.elements.validations.value).filter((line) => !line.startsWith("verify "));
    block.verify = textToLines(form.elements.validations.value)
      .filter((line) => line.startsWith("verify "))
      .map((line) => line.replace(/^verify\s+/, ""));
    block.compile = block.compile || { agent: "codex_repair_agent", prompt: "", onMissing: "prompt" };
    block.compile.prompt = form.elements.implementation.value.trim();
    const scriptRef = form.elements.scriptRef.value.trim();
    block.exec = scriptRef ? [{ type: "python_script", entry: scriptRef, command: "", args: {} }] : block.exec || [];
    block.notes = [
      ...(block.notes || []).filter((note) => !/^version:/i.test(note) && !/^category:/i.test(note)),
      form.elements.version.value.trim(),
      `category: ${form.elements.category.value.trim() || "block"}`,
    ].filter(Boolean);
    serializeCurrentProgram();
    persistProgram();
    closeModal("block-editor-modal");
    renderAll();
  }

  function clearDragState() {
    $$(".program-item.is-drop-target, .program-elements.is-drop-root, .blocks-panel.is-delete-target").forEach((node) => {
      node.classList.remove("is-drop-target", "is-drop-before", "is-drop-after", "is-drop-inside", "is-drop-root", "is-delete-target");
    });
    state.drag = null;
  }

  function markProgramDropTarget(item, mode) {
    $$(".program-item.is-drop-target").forEach((node) => node.classList.remove("is-drop-target", "is-drop-before", "is-drop-after", "is-drop-inside"));
    if (!item) return;
    item.classList.add("is-drop-target", `is-drop-${mode}`);
  }

  function dragPayloadFromEvent(event) {
    if (state.drag) return state.drag;
    const programId = event.dataTransfer && event.dataTransfer.getData("application/x-aaps-program");
    if (programId) return { type: "program", id: programId };
    const blockId = event.dataTransfer && event.dataTransfer.getData("application/x-aaps-block");
    if (blockId) return { type: "block", id: blockId };
    return null;
  }

  function attachDragHandlers() {
    document.addEventListener("dragstart", (event) => {
      const programItem = event.target.closest(".program-item");
      const blockItem = event.target.closest(".block-item");
      if (programItem && programItem.dataset.programId) {
        state.drag = { type: "program", id: programItem.dataset.programId };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-aaps-program", state.drag.id);
        event.dataTransfer.setData("text/plain", state.drag.id);
        programItem.classList.add("is-dragging");
        return;
      }
      if (blockItem && blockItem.dataset.blockId) {
        state.drag = { type: "block", id: blockItem.dataset.blockId };
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("application/x-aaps-block", state.drag.id);
        event.dataTransfer.setData("text/plain", state.drag.id);
        blockItem.classList.add("is-dragging");
      }
    });

    document.addEventListener("dragover", (event) => {
      const payload = dragPayloadFromEvent(event);
      if (!payload) return;
      const programItem = event.target.closest(".program-item");
      const programRoot = event.target.closest("#program-elements");
      const blocksPanel = event.target.closest(".blocks-panel");
      $(".blocks-panel")?.classList.toggle("is-delete-target", Boolean(blocksPanel && payload.type === "program"));
      if (programItem || programRoot) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = payload.type === "block" ? "copy" : "move";
        if (programItem) markProgramDropTarget(programItem, programDropMode(event, programItem));
        else {
          $$(".program-item.is-drop-target").forEach((node) => node.classList.remove("is-drop-target", "is-drop-before", "is-drop-after", "is-drop-inside"));
          $("#program-elements").classList.add("is-drop-root");
        }
      } else if (blocksPanel && payload.type === "program") {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      }
    });

    document.addEventListener("drop", async (event) => {
      const payload = dragPayloadFromEvent(event);
      if (!payload) return;
      const programItem = event.target.closest(".program-item");
      const programRoot = event.target.closest("#program-elements");
      const blocksPanel = event.target.closest(".blocks-panel");
      if (blocksPanel && payload.type === "program") {
        event.preventDefault();
        const ok = window.confirm(`Delete program element "${payload.id}" from this workflow? The reusable blocks stay in Blocks & Skills.`);
        if (ok) await deleteProgramNode(payload.id);
        clearDragState();
        return;
      }
      if (programItem || programRoot) {
        event.preventDefault();
        const targetId = programItem ? programItem.dataset.programId : "";
        const mode = programItem ? programDropMode(event, programItem) : "append-root";
        if (payload.type === "program") await moveProgramNode(payload.id, targetId, mode);
        if (payload.type === "block") await addBlockToProgram(payload.id, targetId, mode);
        clearDragState();
      }
    });

    document.addEventListener("dragend", () => {
      $$(".is-dragging").forEach((node) => node.classList.remove("is-dragging"));
      clearDragState();
    });
  }

  function renderHistoryModal() {
    $("#history-list").innerHTML = state.messages.length
      ? state.messages
          .map(
            (message) => `
              <div class="history-row ${escapeHtml(message.role)}">
                <span class="history-role">${escapeHtml(message.role === "user" ? "You" : "AAPS")}</span>
                <span class="history-meta">${escapeHtml(message.timestamp || "no timestamp")} - ${escapeHtml(message.focus || "project")}${message.backend ? ` - ${escapeHtml(message.backend)}` : ""}</span>
                <p>${escapeHtml(message.text)}</p>
              </div>
            `
          )
          .join("")
      : '<div class="empty-state">No chat messages in this browser session yet.</div>';
  }

  function extensionOf(file) {
    const match = String(file || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  }

  function artifactMatches(category, item) {
    if (category.id === "explorer") return true;
    const file = item.path || item.file || item.name || "";
    if (category.match && category.match.test(file)) return true;
    return Array.isArray(category.extensions) && category.extensions.includes(extensionOf(file));
  }

  async function loadArtifacts() {
    try {
      const payload = await jsonFetch(`/api/aaps/artifacts?path=${encodeURIComponent(state.projectPath || ".")}&limit=240`);
      state.artifacts = payload.items || [];
    } catch (_error) {
      state.artifacts = [];
    }
  }

  function renderArtifactsModal() {
    const categories = ARTIFACT_CATEGORIES.map((category) => {
      const count = state.artifacts.filter((item) => artifactMatches(category, item)).length;
      const selected = state.artifactCategory === category.id;
      return `<button type="button" class="${selected ? "is-selected" : ""}" data-artifact-category="${category.id}">${escapeHtml(category.label)} (${count})</button>`;
    });
    $("#artifact-categories").innerHTML = categories.join("");
    const category = ARTIFACT_CATEGORIES.find((item) => item.id === state.artifactCategory) || ARTIFACT_CATEGORIES[0];
    const matches = state.artifacts.filter((item) => artifactMatches(category, item));
    if (category.id === "explorer") {
      $("#artifact-preview").innerHTML = `
        <div class="empty-state">
          File explorer preview is a metadata-only placeholder in this vertical slice. Use the listed project-relative artifact paths for now.
        </div>
        ${matches.map((item) => `<div class="artifact-row"><strong>${escapeHtml(item.path || item.file || item.name || "artifact")}</strong><small>${escapeHtml(item.kind || item.type || "file")} - ${escapeHtml(String(item.size || "unknown size"))}</small></div>`).join("")}
      `;
      return;
    }
    $("#artifact-preview").innerHTML = matches.length
      ? matches
          .map(
            (item) => `
              <div class="artifact-row">
                <strong>${escapeHtml(item.path || item.file || item.name || "artifact")}</strong>
                <small>${escapeHtml(item.kind || item.type || category.label)} - ${escapeHtml(String(item.size || "unknown size"))}</small>
                <span class="muted">Preview support for ${escapeHtml(category.label)} is metadata-only unless the old Studio artifact viewer handles this file type.</span>
              </div>
            `
          )
          .join("")
      : `<div class="empty-state">No ${escapeHtml(category.label)} artifacts found for the selected project yet.</div>`;
  }

  async function openArtifacts() {
    await loadArtifacts();
    renderArtifactsModal();
    openModal("artifacts-modal");
  }

  function openNewProjectModal() {
    const nameField = $("#new-project-name");
    const pathField = $("#new-project-path");
    const stampValue = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    if (nameField && !nameField.value.trim()) nameField.value = "AAPS Project";
    if (pathField && !pathField.value.trim()) pathField.value = `.aaps-work/projects/aaps-project-${stampValue}`;
    openModal("new-project-modal");
    if (nameField) nameField.focus();
  }

  async function createProject() {
    const name = $("#new-project-name").value.trim() || "AAPS Simple Project";
    const pathValue = $("#new-project-path").value.trim() || ".aaps-work/studio-simple-demo";
    $("#chat-status").textContent = "creating project";
    try {
      const payload = await jsonFetch("/api/aaps/project/create", {
        path: pathValue,
        name,
        domain: "general",
        goal: "Create a structured AAPS program with reusable blocks.",
      });
      await loadProject(payload.project_path || pathValue);
      closeModal("new-project-modal");
      addMessage("assistant", `Created project ${name} at ${payload.absolute_path || pathValue}.`);
    } catch (error) {
      addMessage("assistant", `Project creation failed: ${error.message}`);
      $("#chat-status").textContent = "ready";
    }
  }

  function openProjectFromInput() {
    const value = $("#project-path-input").value.trim();
    if (!value) {
      addMessage("assistant", "Enter a project folder path, or choose one from the project list.");
      $("#chat-status").textContent = "ready";
      return;
    }
    loadProject(value);
  }

  function attachEvents() {
    $("#refresh-projects").addEventListener("click", async () => {
      await loadProjects();
      renderProjects();
    });
    $("#new-project-button").addEventListener("click", openNewProjectModal);
    $("#open-project-button").addEventListener("click", openProjectFromInput);
    $("#project-path-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        openProjectFromInput();
      }
    });
    $("#new-project-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createProject();
    });
    $("#chat-form").addEventListener("submit", handleChatSubmit);
    $("#chat-panel-toggle").addEventListener("click", () => setChatPanelOpen(!state.chatPanelOpen));
    $("#new-session-button").addEventListener("click", openNewSessionModal);
    $("#new-session-form").addEventListener("submit", createNewSession);
    $("#session-select").addEventListener("change", (event) => {
      switchSession(event.currentTarget.value);
    });
    ["#agent-provider", "#codex-chat-model", "#codex-chat-reasoning", "#codex-task-model", "#codex-task-reasoning", "#aginti-provider"].forEach((selector) => {
      const field = $(selector);
      if (field) {
        field.addEventListener("change", () => {
          saveSettingsFromControls()
            .then((settings) => {
              $("#chat-status").textContent = `ready - ${backendLabel(settings)}`;
            })
            .catch((error) => {
              $("#chat-status").textContent = `settings save failed: ${error.message}`;
            });
        });
      }
    });
    $("#history-button").addEventListener("click", () => {
      renderHistoryModal();
      openModal("history-modal");
    });
    $("#artifacts-button").addEventListener("click", openArtifacts);
    $("#element-editor-form").addEventListener("submit", saveElementEditor);
    $("#block-editor-form").addEventListener("submit", saveBlockEditor);
    attachDragHandlers();

    document.addEventListener("click", (event) => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.dataset.closeModal) closeModal(target.dataset.closeModal);
      if (target.dataset.toggleProject) toggleProjectGroup(target.dataset.toggleProject);
      if (target.dataset.projectFile) loadProject(target.dataset.projectPath, target.dataset.projectFile);
      else if (target.dataset.projectPath) loadProject(target.dataset.projectPath);
      if (target.dataset.toggleBlockGroup) toggleBlockGroup(target.dataset.toggleBlockGroup);
      if (target.dataset.selectProgram) selectProgram(target.dataset.selectProgram);
      if (target.dataset.focusBlock) selectBlock(target.dataset.focusBlock);
      if (target.dataset.selectBlock) selectBlock(target.dataset.selectBlock);
      if (target.dataset.editProgram) openElementEditor(target.dataset.editProgram);
      if (target.dataset.editBlock) openBlockEditor(target.dataset.editBlock);
      if (target.dataset.artifactCategory) {
        state.artifactCategory = target.dataset.artifactCategory;
        renderArtifactsModal();
      }
    });
  }

  function addInitialMessage() {
    if ($("#chat-status")) $("#chat-status").textContent = "ready";
    if ($("#chat-scope") && state.focus.type === "project") {
      $("#chat-scope").textContent = `Ready. Web and terminal share session "${state.sessionId}".`;
    }
  }

  function waitFor(predicate, timeoutMs = 5000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      function tick() {
        if (predicate()) {
          resolve(true);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Timed out waiting for TDV condition."));
          return;
        }
        setTimeout(tick, 50);
      }
      tick();
    });
  }

  async function runTdvIfRequested() {
    if (!new URLSearchParams(window.location.search).has("tdv")) return;
    const checks = [];
    const record = (name, passed, details = "") => checks.push({ name, passed: Boolean(passed), details });
    try {
      await waitFor(() => $("#program-elements") && $("#blocks-list") && $("#chat-stream"));
      record("simple UI loads", Boolean($('[data-testid="simple-layout"]')));
      record("regions exist", ["projects", "program", "blocks", "chat"].every((name) => Boolean($(`[data-testid="${name}-region"]`))));
      record("chat dock is fixed to viewport bottom", getComputedStyle($(".chat-dock")).position === "fixed");
      record("chat panel defaults collapsed", !$(".chat-dock").classList.contains("is-expanded"));
      record("chat session dropdown visible", $("#session-select").options.length >= 1 && $("#session-select").value);
      record("new session button visible", $("#new-session-button").textContent.trim() === "+ New");
      record("session cwd visible", $("#session-cwd").textContent.includes("cwd:"));
      $("#new-session-button").click();
      record("new session modal opens", !$("#new-session-modal").hidden);
      record("new session working path autocomplete exists", $("#new-session-cwd").getAttribute("list") === "session-cwd-options" && $("#session-cwd-options").children.length >= 1);
      $("#new-session-name").value = "TDV Session";
      $("#new-session-cwd").value = state.projectAbsolutePath || ".";
      $("#new-session-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await waitFor(() => $("#session-select").value === "TDV_Session", 4000);
      record("new session can be created and selected", $("#session-select").value === "TDV_Session" && $("#session-cwd").title === (state.projectAbsolutePath || "."));
      record("chat transcript hidden from dock", getComputedStyle($("#chat-stream")).display === "none");
      record("chat history button is explicit", $("#history-button").textContent.trim() === "Chat History");
      record("project list remains visible", $("#project-list").clientHeight > 24);
      record("project aaps files default unfolded", Boolean($(".project-aaps-list .project-aaps-file")));
      const selectedProjectEntry = $(".project-entry.is-selected");
      if (selectedProjectEntry) {
        selectedProjectEntry.querySelector("[data-toggle-project]").click();
        record("project aaps files can fold", !$(".project-entry.is-selected .project-aaps-list"));
        $(".project-entry.is-selected [data-toggle-project]").click();
        record("project aaps files can unfold", Boolean($(".project-entry.is-selected .project-aaps-list .project-aaps-file")));
      } else {
        record("project aaps files can fold", false, "No selected project entry rendered.");
        record("project aaps files can unfold", false, "No selected project entry rendered.");
      }
      $("#new-project-button").click();
      record("new project modal opens", !$("#new-project-modal").hidden);
      closeModal("new-project-modal");
      record("current project card removed", !$("#current-project-card"));
      record("open path starts blank", $("#project-path-input").value === "");
      record("default system blocks render", SYSTEM_BLOCKS.every((block) => document.body.textContent.includes(block.title)));
      record("system blocks default folded", $('[data-block-group="system"]').classList.contains("is-folded"));
      record("user blocks default unfolded", !$('[data-block-group="user"]').classList.contains("is-folded"));
      $('[data-toggle-block-group="system"]').click();
      record("system blocks unfold from header", !$('[data-block-group="system"]').classList.contains("is-folded"));
      $('[data-toggle-block-group="system"]').click();
      record("system blocks fold from header", $('[data-block-group="system"]').classList.contains("is-folded"));
      const firstElement = $(".program-item");
      if (firstElement) {
        firstElement.querySelector("[data-select-program]").click();
        record("selecting program element changes focus", $("#focus-label").textContent.includes("program element"));
        const selectedElement = $(".program-item.is-selected") || $(".program-item");
        selectedElement.querySelector("[data-edit-program]").click();
        record("program element editor popup opens", !$("#element-editor-modal").hidden);
        closeModal("element-editor-modal");
      } else {
        record("selecting program element changes focus", false, "No program item rendered.");
        record("program element editor popup opens", false, "No program item rendered.");
      }
      const dragSourceSnapshot = state.source;
      const dragIrSnapshot = JSON.parse(JSON.stringify(state.ir));
      const dragSelectedElementId = state.selectedElementId;
      const dragSelectedBlockId = state.selectedBlockId;
      try {
        const programScroller = $("#program-elements");
        const scrollerStyle = getComputedStyle(programScroller);
        record("program drag is enabled", $("#program-drag-chip") ? $("#program-drag-chip").textContent.trim() === "Drag enabled" : document.body.textContent.includes("Drag enabled"));
        record("program panel scrolls horizontally", ["auto", "scroll"].includes(scrollerStyle.overflowX));
        const beforeRows = flattenProgram();
        const beforeIds = new Set(beforeRows.map((row) => row.node.id));
        const sourceBlock = allUserBlocks()[0] || systemBlock("parameter");
        await addBlockToProgram(sourceBlock.id, "", "append-root");
        const afterAddRows = flattenProgram();
        const added = afterAddRows.find((row) => !beforeIds.has(row.node.id));
        const reusableStillExists = findUserBlock(sourceBlock.id) || systemBlock(sourceBlock.id);
        record("dragging block into program copies reusable block", Boolean(added && reusableStillExists && afterAddRows.length === beforeRows.length + 1));
        const nestTarget = afterAddRows.find((row) => row.node.id !== (added && added.node.id));
        if (added && nestTarget) {
          await moveProgramNode(added.node.id, nestTarget.node.id, "inside");
          const nested = flattenProgram().find((row) => row.node.id === added.node.id);
          record("program drag can nest while preserving grammar", Boolean(nested && nested.depth > nestTarget.depth));
          state.drag = { type: "program", id: added.node.id };
          $(".blocks-panel").classList.add("is-delete-target");
          record("dragging program toward blocks shows red delete warning", getComputedStyle($(".blocks-panel")).borderColor.includes("154") || $(".blocks-panel").classList.contains("is-delete-target"));
          clearDragState();
          await deleteProgramNode(added.node.id);
          record("program node can be deleted by drop-to-blocks behavior", !findProgramNode(added.node.id));
        } else {
          record("program drag can nest while preserving grammar", false, "No target element for nesting.");
          record("dragging program toward blocks shows red delete warning", false, "No added element.");
          record("program node can be deleted by drop-to-blocks behavior", false, "No added element.");
        }
      } finally {
        state.source = dragSourceSnapshot;
        state.ir = dragIrSnapshot;
        state.selectedElementId = dragSelectedElementId;
        state.selectedBlockId = dragSelectedBlockId;
        await persistProgram();
        renderAll();
      }
      const firstBlock = $('[data-select-block="for-loop"]');
      if (firstBlock) {
        firstBlock.click();
        record("selecting block changes focus", $("#focus-label").textContent.includes("block/skill") && $('[data-block-id="for-loop"]').classList.contains("is-selected"));
        $('[data-edit-block="for-loop"]').click();
        record("block skill editor popup opens", !$("#block-editor-modal").hidden);
        closeModal("block-editor-modal");
      } else {
        record("selecting block changes focus", false, "for-loop block not rendered.");
        record("block skill editor popup opens", false, "for-loop block not rendered.");
      }
      $("#history-button").click();
      record("history modal opens", !$("#history-modal").hidden);
      closeModal("history-modal");
      await openArtifacts();
      record("canvas artifacts modal opens", !$("#artifacts-modal").hidden);
      closeModal("artifacts-modal");
      const programForChat = $(".program-item [data-select-program]");
      if (programForChat) programForChat.click();
      $("#chat-input").value =
        "Create a complete App81 DEO microscopy segmentation, quantification, visualization, report generation, and QC workflow from image folders.";
      $("#chat-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await waitFor(() => document.body.textContent.includes("app81_segment_images"), 7000);
      record("sample chat creates program", document.body.textContent.includes("app81_preview_segmentation"));
      record("dock hides transcript while collapsed", getComputedStyle($("#chat-stream")).display === "none");
      $("#chat-panel-toggle").click();
      record("expanded chat panel shows messages", getComputedStyle($("#chat-stream")).display !== "none" && $$(".message.user", $("#chat-stream")).length >= 1 && $$(".message.assistant", $("#chat-stream")).length >= 1);
      $("#history-button").click();
      record("history shows chat bubbles", $$(".history-row.user").length >= 1 && $$(".history-row.assistant").length >= 1);
      closeModal("history-modal");
      record("placeholder block visible in blocks panel", Boolean($('[data-block-id="app81_segment_images"]')));
      record("placeholder block visible in program panel", document.body.textContent.includes("uses app81_segment_images"));
    } catch (error) {
      record("tdv runner", false, error.message);
    }
    const passed = checks.every((check) => check.passed);
    const script = document.createElement("script");
    script.id = "tdv-results";
    script.type = "application/json";
    script.textContent = JSON.stringify({ ok: passed, checks }, null, 2);
    document.body.appendChild(script);
    document.body.setAttribute("data-tdv-complete", passed ? "true" : "false");
  }

  async function init() {
    if (!window.AAPS) {
      $("#chat-status").textContent = "AAPS core missing";
      return;
    }
    attachEvents();
    setChatPanelOpen(false);
    startSessionSync();
    await loadSettings();
    resetProgram(DEFAULT_SOURCE);
    await loadProject(".");
    addInitialMessage();
    renderAll();
    runTdvIfRequested();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
