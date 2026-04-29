const sourceEl = document.getElementById("source");
const canvasEl = document.getElementById("canvas");
const irEl = document.getElementById("ir");
const diagnosticsEl = document.getElementById("diagnostics");
const taskCountEl = document.getElementById("task-count");
const chatLogEl = document.getElementById("chat-log");
const chatFormEl = document.getElementById("chat-form");
const chatInputEl = document.getElementById("chat-input");

const palette = {
  agent: {
    type: "agent",
    id: "operator",
    role: "General autonomous agent for prompt-driven pipeline work.",
    model: "gpt-5",
    tools: ["shell", "git", "browser"],
  },
  discover: {
    id: "discover",
    prompt: "Read the context and produce a concise implementation plan.",
    outputs: ["docs/plan.md"],
  },
  build: {
    id: "implement",
    after: ["discover"],
    prompt: "Implement the requested change with focused edits.",
    run: ["npm test"],
    verify: ["Tests pass."],
  },
  verify: {
    id: "verify",
    after: ["implement"],
    prompt: "Inspect the result and identify defects, regressions, or missing checks.",
    verify: ["The acceptance criteria are satisfied."],
  },
  publish: {
    id: "publish",
    after: ["verify"],
    prompt: "Commit, push, and report deployment status.",
    run: ["git status --short"],
    verify: ["Remote branch contains the latest commit."],
  },
  custom: {
    id: "task",
    prompt: "Describe the work this autonomous step should complete.",
  },
};

function slug(text) {
  return String(text || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36) || "task";
}

function uniqueId(base, tasks) {
  const used = new Set(tasks.map((task) => task.id));
  let candidate = slug(base);
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${slug(base)}_${index}`;
    index += 1;
  }
  return candidate;
}

function getIr() {
  return AAPS.parseAAPS(sourceEl.value);
}

function setIr(ir) {
  sourceEl.value = AAPS.serializeAAPS(ir);
  render();
}

function addMessage(role, text) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  chatLogEl.appendChild(node);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

async function requestCodexEdit(instruction) {
  const response = await fetch("/api/aaps/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: sourceEl.value, instruction }),
  });
  if (!response.ok) {
    throw new Error(`Codex wrapper returned ${response.status}`);
  }
  const payload = await response.json();
  const result = payload.result || payload;
  if (!result.source) {
    throw new Error("Codex wrapper did not return updated source.");
  }
  sourceEl.value = result.source;
  render();
  return result.summary || "Applied Codex edit.";
}

function render() {
  const ir = getIr();
  const tasks = ir.pipeline.tasks || [];
  canvasEl.innerHTML = "";
  tasks.forEach((task, index) => {
    const card = document.createElement("article");
    card.className = "task-card";
    card.innerHTML = `
      <span class="task-color" style="background:${["#ff4f8b", "#00bcd4", "#28c76f", "#ff9f1c", "#7c3aed"][index % 5]}"></span>
      <div>
        <h3>${task.id}</h3>
        <p>${task.after.length ? `after ${task.after.join(", ")} · ` : ""}${task.prompt || "No prompt yet."}</p>
      </div>
      <button type="button" aria-label="Delete ${task.id}" data-delete="${task.id}">x</button>
    `;
    canvasEl.appendChild(card);
  });
  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.className = "message";
    empty.textContent = "Add a block or ask chat to create a task.";
    canvasEl.appendChild(empty);
  }
  taskCountEl.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
  diagnosticsEl.textContent = ir.diagnostics.length
    ? `${ir.diagnostics.length} diagnostic${ir.diagnostics.length === 1 ? "" : "s"}`
    : "Ready";
  irEl.textContent = JSON.stringify(ir, null, 2);
}

function addBlock(kind) {
  const ir = getIr();
  if (kind === "agent") {
    const agent = { ...palette.agent };
    delete agent.type;
    agent.id = uniqueId(agent.id, ir.pipeline.agents || []);
    ir.pipeline.agents.push(agent);
    setIr(ir);
    addMessage("assistant", `Added agent ${agent.id}.`);
    return;
  }
  const template = palette[kind] || palette.custom;
  const task = {
    id: uniqueId(template.id, ir.pipeline.tasks),
    after: template.after ? [...template.after] : [],
    agent: (ir.pipeline.agents[0] && ir.pipeline.agents[0].id) || "",
    prompt: template.prompt || "",
    run: template.run ? [...template.run] : [],
    verify: template.verify ? [...template.verify] : [],
    outputs: template.outputs ? [...template.outputs] : [],
    retries: 0,
    timeout: "",
  };
  ir.pipeline.tasks.push(task);
  setIr(ir);
  addMessage("assistant", `Added task ${task.id}.`);
}

function applyInstruction(text) {
  const ir = getIr();
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  let match;

  if (!raw) return "No change.";
  if (lower === "sample" || lower === "reset") {
    sourceEl.value = AAPS.sample;
    render();
    return "Loaded the sample AAPS pipeline.";
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

  match = raw.match(/^add agent\s+([A-Za-z_][\w.-]*)(?:\s+as\s+(.+))?$/i);
  if (match) {
    ir.pipeline.agents.push({
      id: match[1],
      role: match[2] || "General autonomous pipeline agent.",
      model: "gpt-5",
      tools: ["shell", "git"],
    });
    setIr(ir);
    return `Added agent ${match[1]}.`;
  }

  match = raw.match(/^add task\s+([A-Za-z_][\w.-]*)(?:\s+after\s+([A-Za-z0-9_, .-]+))?/i);
  if (match) {
    const id = uniqueId(match[1], ir.pipeline.tasks);
    ir.pipeline.tasks.push({
      id,
      after: match[2] ? match[2].split(",").map((item) => slug(item)) : [],
      agent: (ir.pipeline.agents[0] && ir.pipeline.agents[0].id) || "",
      prompt: `Complete ${id} using the current project context.`,
      run: [],
      verify: [`${id} is complete and reviewed.`],
      outputs: [],
      retries: 0,
      timeout: "",
    });
    setIr(ir);
    return `Added task ${id}.`;
  }

  match = raw.match(/^(?:add\s+)?run\s+(.+?)\s+(?:to|in)\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const task = ir.pipeline.tasks.find((item) => item.id === match[2]);
    if (!task) return `Task ${match[2]} was not found.`;
    task.run.push(match[1].trim());
    setIr(ir);
    return `Added run command to ${task.id}.`;
  }

  match = raw.match(/^(?:add\s+)?verify\s+(.+?)\s+(?:to|in)\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const task = ir.pipeline.tasks.find((item) => item.id === match[2]);
    if (!task) return `Task ${match[2]} was not found.`;
    task.verify.push(match[1].trim());
    setIr(ir);
    return `Added verification to ${task.id}.`;
  }

  match = raw.match(/^prompt\s+([A-Za-z_][\w.-]*)\s*:\s*(.+)$/i);
  if (match) {
    const task = ir.pipeline.tasks.find((item) => item.id === match[1]);
    if (!task) return `Task ${match[1]} was not found.`;
    task.prompt = match[2].trim();
    setIr(ir);
    return `Updated prompt for ${task.id}.`;
  }

  const id = uniqueId(raw.split(/\s+/).slice(0, 4).join("_"), ir.pipeline.tasks);
  ir.pipeline.tasks.push({
    id,
    after: ir.pipeline.tasks.length ? [ir.pipeline.tasks[ir.pipeline.tasks.length - 1].id] : [],
    agent: (ir.pipeline.agents[0] && ir.pipeline.agents[0].id) || "",
    prompt: raw,
    run: [],
    verify: ["The result matches the prompt."],
    outputs: [],
    retries: 0,
    timeout: "",
  });
  setIr(ir);
  return `Created task ${id} from your prompt.`;
}

document.querySelectorAll("[data-kind]").forEach((button) => {
  button.addEventListener("click", () => addBlock(button.dataset.kind));
  button.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", button.dataset.kind);
  });
});

canvasEl.addEventListener("dragover", (event) => event.preventDefault());
canvasEl.addEventListener("drop", (event) => {
  event.preventDefault();
  addBlock(event.dataTransfer.getData("text/plain"));
});

canvasEl.addEventListener("click", (event) => {
  const id = event.target.dataset.delete;
  if (!id) return;
  const ir = getIr();
  ir.pipeline.tasks = ir.pipeline.tasks.filter((task) => task.id !== id);
  ir.pipeline.tasks.forEach((task) => {
    task.after = task.after.filter((dep) => dep !== id);
  });
  setIr(ir);
  addMessage("assistant", `Deleted task ${id}.`);
});

sourceEl.addEventListener("input", render);

chatFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInputEl.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatInputEl.value = "";
  addMessage("assistant", "Editing...");
  requestCodexEdit(text)
    .then((message) => {
      chatLogEl.lastElementChild.textContent = message;
    })
    .catch(() => {
      chatLogEl.lastElementChild.textContent = applyInstruction(text);
    });
});

document.getElementById("sample-btn").addEventListener("click", () => {
  sourceEl.value = AAPS.sample;
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

sourceEl.value = AAPS.sample;
addMessage("assistant", "AAPS Studio is ready. Add blocks or ask chat to edit the script.");
render();

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
