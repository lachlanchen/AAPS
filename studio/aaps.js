(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AAPS = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "aaps_ir/0.2";
  const PROJECT_VERSION = "aaps_project/0.1";
  const CHILD_KINDS = new Set(["stage", "method", "action", "guard", "handoff", "choose"]);
  const PROJECT_FILE_CATEGORIES = [
    "blocks",
    "skills",
    "modules",
    "subworkflows",
    "workflows",
    "drafts",
    "archives",
    "references",
  ];

  function unquote(value) {
    const text = String(value || "").trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))
    ) {
      return text.slice(1, -1);
    }
    return text;
  }

  function quote(value) {
    return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function slug(text, fallback = "block") {
    return (
      String(text || fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48) || fallback
    );
  }

  function parseList(value) {
    return String(value || "")
      .split(",")
      .map((item) => unquote(item).trim())
      .filter(Boolean);
  }

  function uniqueList(items) {
    return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function relativeProjectPath(value) {
    const text = String(value || "").trim();
    if (!text || text === ".") return true;
    if (text.startsWith("/") || text.startsWith("~") || /^[A-Za-z]:[\\/]/.test(text)) return false;
    return !text.split(/[\\/]+/).some((part) => part === "..");
  }

  function parseKeyValue(line) {
    const match = String(line || "").match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    if (!match) return null;
    return { key: match[1], value: unquote(match[2]) };
  }

  function stripComment(line) {
    let quoted = false;
    let quoteChar = "";
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
        if (!quoted) {
          quoted = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          quoted = false;
          quoteChar = "";
        }
      }
      if (!quoted && char === "#") return line.slice(0, index);
      if (!quoted && char === "/" && next === "/") return line.slice(0, index);
    }
    return line;
  }

  function createPipeline() {
    return {
      name: "Untitled Pipeline",
      subtitle: "Prompt Is All You Need",
      workflowVersion: "",
      author: "",
      created: "",
      updated: "",
      domain: "general",
      tags: [],
      goal: "",
      prompt: "",
      artifactDir: "",
      databasePath: "",
      logPath: "",
      requiredTools: [],
      requiredModels: [],
      includes: [],
      inputs: {},
      inputPorts: [],
      outputPorts: [],
      agents: [],
      skills: [],
      tasks: [],
      policies: {},
      params: {},
      validations: [],
      recovery: [],
      reviews: [],
      artifacts: [],
      notes: [],
    };
  }

  function createNode(kind, id, extra) {
    return {
      kind,
      id: id || kind,
      title: "",
      after: [],
      agent: "",
      model: "",
      role: "",
      tools: [],
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
      ...(extra || {}),
    };
  }

  function parsePort(text) {
    const body = String(text || "").trim();
    const typed = body.match(/^([A-Za-z_][\w.-]*)(?:\s*:\s*([A-Za-z_][\w.-]*))?(?:\s+(required|optional))?(?:\s*(?:=|from|to)\s*(.+?))?(?:\s+validate\s+(.+))?$/i);
    if (!typed) return null;
    return {
      name: typed[1],
      type: typed[2] || "artifact",
      required: typed[3] ? typed[3].toLowerCase() === "required" : false,
      value: typed[4] ? unquote(typed[4]) : "",
      validation: typed[5] ? unquote(typed[5]) : "",
    };
  }

  function addPort(target, direction, port) {
    if (!port) return;
    if (target.inputPorts || target.outputPorts) {
      if (direction === "input") {
        target.inputPorts.push(port);
        target.inputs[port.name] = port.value;
      } else {
        target.outputPorts.push(port);
      }
      return;
    }
    const key = direction === "input" ? "inputs" : "outputs";
    target[key].push(port);
  }

  function addNodeToParent(ir, stack, node) {
    const parentFrame = stack[stack.length - 1];
    const parent = parentFrame ? parentFrame.node : ir.pipeline;
    if (!parentFrame || parentFrame.kind === "pipeline") {
      if (node.kind === "agent") ir.pipeline.agents.push(node);
      else if (node.kind === "skill") ir.pipeline.skills.push(node);
      else if (node.kind === "task") ir.pipeline.tasks.push(node);
      else ir.pipeline.tasks.push(node);
      return;
    }
    parent.children.push(node);
  }

  function nearest(stack, predicate) {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (predicate(stack[index])) return stack[index].node;
    }
    return null;
  }

  function parseAAPS(source) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const ir = { version: VERSION, pipeline: createPipeline(), diagnostics: [] };
    const stack = [];
    let blockText = null;
    let sawPipeline = false;

    function currentTarget() {
      return nearest(stack, (frame) => frame.kind !== "pipeline") || ir.pipeline;
    }

    function diagnostic(line, message) {
      ir.diagnostics.push({ line, message });
    }

    lines.forEach((rawLine, index) => {
      const lineNumber = index + 1;
      if (blockText) {
        const end = rawLine.indexOf('"""');
        if (end >= 0) {
          blockText.target[blockText.key] = blockText.parts
            .concat(rawLine.slice(0, end))
            .join("\n")
            .trim();
          blockText = null;
        } else {
          blockText.parts.push(rawLine);
        }
        return;
      }

      const line = stripComment(rawLine).trim();
      if (!line) return;

      if (line === "}") {
        if (!stack.length) diagnostic(lineNumber, "Unmatched closing brace.");
        else stack.pop();
        return;
      }

      let match = line.match(/^pipeline\s+(.+?)\s*\{$/i);
      if (match) {
        sawPipeline = true;
        ir.pipeline.name = unquote(match[1]);
        stack.push({ kind: "pipeline", node: ir.pipeline });
        return;
      }

      match = line.match(/^task\s+([A-Za-z_][\w.-]*)(?:\s+after\s+(.+?))?\s*\{$/i);
      if (match) {
        const node = createNode("task", match[1], {
          after: match[2] ? parseList(match[2]) : [],
        });
        addNodeToParent(ir, stack, node);
        stack.push({ kind: "task", node });
        return;
      }

      match = line.match(/^for_each\s+([A-Za-z_][\w.-]*)\s+in\s+(.+?)\s*\{$/i);
      if (match) {
        const node = createNode("for_each", `for_each_${slug(match[1])}`, {
          iterator: { item: match[1], source: unquote(match[2]) },
        });
        addNodeToParent(ir, stack, node);
        stack.push({ kind: "for_each", node });
        return;
      }

      match = line.match(/^if\s+(.+?)\s*\{$/i);
      if (match) {
        const node = createNode("if", `if_${stack.length + 1}`, {
          condition: unquote(match[1]),
        });
        addNodeToParent(ir, stack, node);
        stack.push({ kind: "if", node });
        return;
      }

      match = line.match(/^else\s*\{$/i);
      if (match) {
        const node = createNode("else", `else_${stack.length + 1}`);
        addNodeToParent(ir, stack, node);
        stack.push({ kind: "else", node });
        return;
      }

      match = line.match(/^(agent|skill|stage|method|action|guard|handoff|choose)\s+([A-Za-z_][\w.-]*)(?:\s+(.+?))?\s*\{$/i);
      if (match) {
        const node = createNode(match[1].toLowerCase(), match[2], {
          title: match[3] ? unquote(match[3]) : "",
        });
        addNodeToParent(ir, stack, node);
        stack.push({ kind: node.kind, node });
        return;
      }

      const target = currentTarget();
      const scope = stack[stack.length - 1];

      match = line.match(/^(prompt|description|note)\s+"""(.*)$/i);
      if (match) {
        const key = match[1].toLowerCase() === "description" ? "prompt" : match[1].toLowerCase();
        const end = match[2].indexOf('"""');
        if (end >= 0) target[key] = match[2].slice(0, end).trim();
        else blockText = { target, key, parts: [match[2]] };
        return;
      }

      match = line.match(/^(prompt|description)\s+(.+)$/i);
      if (match) {
        target.prompt = unquote(match[2]);
        return;
      }

      match = line.match(/^note\s+(.+)$/i);
      if (match) {
        target.notes.push(unquote(match[1]));
        return;
      }

      match = line.match(/^(subtitle|goal|domain)\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        ir.pipeline[match[1].toLowerCase()] = unquote(match[2]);
        return;
      }

      match = line.match(/^(version|author|created|updated|artifact_dir|database|log_path)\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        const keyMap = {
          version: "workflowVersion",
          author: "author",
          created: "created",
          updated: "updated",
          artifact_dir: "artifactDir",
          database: "databasePath",
          log_path: "logPath",
        };
        ir.pipeline[keyMap[match[1].toLowerCase()]] = unquote(match[2]);
        return;
      }

      match = line.match(/^tags\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        ir.pipeline.tags = parseList(unquote(match[1]));
        return;
      }

      match = line.match(/^include\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        const includePath = unquote(match[1]);
        ir.pipeline.includes.push(includePath);
        if (!relativeProjectPath(includePath)) {
          diagnostic(lineNumber, `include path must be project-relative: ${includePath}`);
        }
        return;
      }

      match = line.match(/^(requires_tools|requires_models)\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        const key = match[1].toLowerCase() === "requires_tools" ? "requiredTools" : "requiredModels";
        ir.pipeline[key] = parseList(unquote(match[2]));
        return;
      }

      match = line.match(/^(input|output)\s+(.+)$/i);
      if (match) {
        const port = parsePort(match[2]);
        if (port) addPort(target, match[1].toLowerCase(), port);
        else diagnostic(lineNumber, `${match[1]} must look like "name: type = value".`);
        return;
      }

      match = line.match(/^(param|metric|policy)\s+(.+)$/i);
      if (match) {
        const kv = parseKeyValue(match[2]);
        if (!kv) {
          diagnostic(lineNumber, `${match[1]} must use name = value.`);
          return;
        }
        const word = match[1].toLowerCase();
        const bucket = word === "policy" ? "policies" : `${word}s`;
        target[bucket][kv.key] = kv.value;
        return;
      }

      match = line.match(/^(validate|validation|verify_rule)\s+(.+)$/i);
      if (match) {
        target.validations.push(unquote(match[2]));
        return;
      }

      match = line.match(/^(recover|recovery|on_error)\s+(.+)$/i);
      if (match) {
        target.recovery.push(unquote(match[2]));
        return;
      }

      match = line.match(/^(review|human_review)\s+(.+)$/i);
      if (match) {
        target.reviews.push(unquote(match[2]));
        return;
      }

      match = line.match(/^artifact\s+(.+)$/i);
      if (match) {
        const artifact = parsePort(match[1]);
        if (artifact) target.artifacts.push(artifact);
        else diagnostic(lineNumber, 'artifact must look like "name: type = path".');
        return;
      }

      match = line.match(/^title\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.title = unquote(match[1]);
        return;
      }

      match = line.match(/^role\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.role = unquote(match[1]);
        return;
      }

      match = line.match(/^model\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.model = unquote(match[1]);
        return;
      }

      match = line.match(/^tools\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.tools = parseList(unquote(match[1]));
        return;
      }

      match = line.match(/^uses\s+([A-Za-z_][\w.-]*)$/i);
      if (match && target !== ir.pipeline) {
        target.agent = match[1];
        return;
      }

      match = line.match(/^(call|calls)\s+([A-Za-z_][\w.-]*)(?:\s+as\s+([A-Za-z_][\w.-]*))?$/i);
      if (match && target !== ir.pipeline) {
        target.calls.push({ skill: match[2], as: match[3] || "" });
        return;
      }

      match = line.match(/^tool\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.tools.push(...parseList(unquote(match[1])));
        return;
      }

      match = line.match(/^run\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.run.push(unquote(match[1]));
        return;
      }

      match = line.match(/^verify\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.verify.push(unquote(match[1]));
        return;
      }

      match = line.match(/^retry\s+(\d+)$/i);
      if (match && target !== ir.pipeline) {
        target.params.retry = Number(match[1]);
        return;
      }

      match = line.match(/^timeout\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.params.timeout = unquote(match[1]);
        return;
      }

      match = line.match(/^when\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.condition = unquote(match[1]);
        return;
      }

      diagnostic(
        lineNumber,
        scope ? `Unknown statement in ${scope.kind}: ${line}` : `Unknown statement: ${line}`
      );
    });

    if (!sawPipeline) {
      diagnostic(1, "Missing pipeline declaration.");
    }
    if (blockText) diagnostic(lines.length, `Unclosed triple-quoted ${blockText.key} block.`);
    if (stack.length) diagnostic(lines.length, `Unclosed block: ${stack[stack.length - 1].kind}.`);
    return ir;
  }

  function serializePorts(node, indent) {
    const lines = [];
    const inputPorts = node.inputPorts || node.inputs || [];
    const outputPorts = node.outputPorts || node.outputs || [];
    if (Array.isArray(inputPorts)) {
      inputPorts.forEach((port) => {
        lines.push(`${indent}input ${port.name}: ${port.type || "artifact"}${port.required ? " required" : ""}${port.value ? ` = ${quote(port.value)}` : ""}${port.validation ? ` validate ${quote(port.validation)}` : ""}`);
      });
    } else {
      Object.entries(inputPorts).forEach(([key, value]) => {
        lines.push(`${indent}input ${key} = ${quote(value)}`);
      });
    }
    if (Array.isArray(outputPorts)) {
      outputPorts.forEach((port) => {
        lines.push(`${indent}output ${port.name}: ${port.type || "artifact"}${port.required ? " required" : ""}${port.value ? ` = ${quote(port.value)}` : ""}${port.validation ? ` validate ${quote(port.validation)}` : ""}`);
      });
    }
    return lines;
  }

  function blockHeader(node, indent) {
    if (node.kind === "task") {
      const after = node.after && node.after.length ? ` after ${node.after.join(", ")}` : "";
      return `${indent}task ${node.id}${after} {`;
    }
    if (node.kind === "for_each") {
      const iterator = node.iterator || { item: "item", source: "items" };
      return `${indent}for_each ${iterator.item} in ${quote(iterator.source)} {`;
    }
    if (node.kind === "if") return `${indent}if ${quote(node.condition || "condition")} {`;
    if (node.kind === "else") return `${indent}else {`;
    if (CHILD_KINDS.has(node.kind) || node.kind === "agent" || node.kind === "skill") {
      return `${indent}${node.kind} ${node.id}${node.title ? ` ${quote(node.title)}` : ""} {`;
    }
    return `${indent}${node.kind} ${node.id} {`;
  }

  function serializeNode(node, depth) {
    const indent = "  ".repeat(depth);
    const childIndent = "  ".repeat(depth + 1);
    const lines = [blockHeader(node, indent)];
    if (node.title && node.kind === "task") lines.push(`${childIndent}title ${quote(node.title)}`);
    if (node.role) lines.push(`${childIndent}role ${quote(node.role)}`);
    if (node.model) lines.push(`${childIndent}model ${quote(node.model)}`);
    if (node.tools && node.tools.length) lines.push(`${childIndent}tools ${quote(node.tools.join(", "))}`);
    if (node.agent) lines.push(`${childIndent}uses ${node.agent}`);
    lines.push(...serializePorts(node, childIndent));
    (node.artifacts || []).forEach((artifact) => lines.push(`${childIndent}artifact ${artifact.name}: ${artifact.type || "artifact"}${artifact.value ? ` = ${quote(artifact.value)}` : ""}${artifact.validation ? ` validate ${quote(artifact.validation)}` : ""}`));
    Object.entries(node.params || {}).forEach(([key, value]) => lines.push(`${childIndent}param ${key} = ${quote(value)}`));
    Object.entries(node.metrics || {}).forEach(([key, value]) => lines.push(`${childIndent}metric ${key} = ${quote(value)}`));
    Object.entries(node.policies || {}).forEach(([key, value]) => lines.push(`${childIndent}policy ${key} = ${quote(value)}`));
    (node.calls || []).forEach((call) => lines.push(`${childIndent}call ${call.skill}${call.as ? ` as ${call.as}` : ""}`));
    if (node.prompt) {
      lines.push(`${childIndent}prompt """`);
      lines.push(...String(node.prompt).split("\n").map((part) => `${childIndent}${part}`));
      lines.push(`${childIndent}"""`);
    }
    (node.run || []).forEach((command) => lines.push(`${childIndent}run ${quote(command)}`));
    (node.validations || []).forEach((check) => lines.push(`${childIndent}validate ${quote(check)}`));
    (node.verify || []).forEach((check) => lines.push(`${childIndent}verify ${quote(check)}`));
    (node.recovery || []).forEach((step) => lines.push(`${childIndent}recover ${quote(step)}`));
    (node.reviews || []).forEach((review) => lines.push(`${childIndent}review ${quote(review)}`));
    (node.notes || []).forEach((note) => lines.push(`${childIndent}note ${quote(note)}`));
    (node.children || []).forEach((child) => {
      lines.push("");
      lines.push(...serializeNode(child, depth + 1));
    });
    lines.push(`${indent}}`);
    return lines;
  }

  function serializeAAPS(ir) {
    const pipeline = ir.pipeline || createPipeline();
    const lines = [`pipeline ${quote(pipeline.name || "Untitled Pipeline")} {`];
    if (pipeline.subtitle) lines.push(`  subtitle ${quote(pipeline.subtitle)}`);
    if (pipeline.workflowVersion) lines.push(`  version ${quote(pipeline.workflowVersion)}`);
    if (pipeline.author) lines.push(`  author ${quote(pipeline.author)}`);
    if (pipeline.created) lines.push(`  created ${quote(pipeline.created)}`);
    if (pipeline.updated) lines.push(`  updated ${quote(pipeline.updated)}`);
    if (pipeline.domain) lines.push(`  domain ${quote(pipeline.domain)}`);
    if (pipeline.tags && pipeline.tags.length) lines.push(`  tags ${quote(pipeline.tags.join(", "))}`);
    (pipeline.includes || []).forEach((includePath) => lines.push(`  include ${quote(includePath)}`));
    if (pipeline.requiredTools && pipeline.requiredTools.length) lines.push(`  requires_tools ${quote(pipeline.requiredTools.join(", "))}`);
    if (pipeline.requiredModels && pipeline.requiredModels.length) lines.push(`  requires_models ${quote(pipeline.requiredModels.join(", "))}`);
    if (pipeline.artifactDir) lines.push(`  artifact_dir ${quote(pipeline.artifactDir)}`);
    if (pipeline.databasePath) lines.push(`  database ${quote(pipeline.databasePath)}`);
    if (pipeline.logPath) lines.push(`  log_path ${quote(pipeline.logPath)}`);
    if (pipeline.goal) lines.push(`  goal ${quote(pipeline.goal)}`);
    if (pipeline.prompt) {
      lines.push('  prompt """');
      lines.push(...String(pipeline.prompt).split("\n").map((part) => `  ${part}`));
      lines.push('  """');
    }
    lines.push(...serializePorts(pipeline, "  "));
    (pipeline.artifacts || []).forEach((artifact) => lines.push(`  artifact ${artifact.name}: ${artifact.type || "artifact"}${artifact.value ? ` = ${quote(artifact.value)}` : ""}${artifact.validation ? ` validate ${quote(artifact.validation)}` : ""}`));
    Object.entries(pipeline.params || {}).forEach(([key, value]) => lines.push(`  param ${key} = ${quote(value)}`));
    Object.entries(pipeline.policies || {}).forEach(([key, value]) => lines.push(`  policy ${key} = ${quote(value)}`));
    (pipeline.validations || []).forEach((check) => lines.push(`  validate ${quote(check)}`));
    (pipeline.recovery || []).forEach((step) => lines.push(`  recover ${quote(step)}`));
    (pipeline.reviews || []).forEach((review) => lines.push(`  review ${quote(review)}`));
    [...(pipeline.agents || []), ...(pipeline.skills || []), ...(pipeline.tasks || [])].forEach((node) => {
      lines.push("");
      lines.push(...serializeNode(node, 1));
    });
    lines.push("}");
    return lines.join("\n");
  }

  function nodeSummary(node, depth, lines) {
    const prefix = "  ".repeat(depth);
    const title = node.title ? ` - ${node.title}` : "";
    lines.push(`${prefix}- **${node.kind} ${node.id}**${title}`);
    if (node.iterator) lines.push(`${prefix}  - For each ${node.iterator.item} in ${node.iterator.source}`);
    if (node.condition) lines.push(`${prefix}  - Condition: ${node.condition}`);
    if (node.agent) lines.push(`${prefix}  - Agent: ${node.agent}`);
    if (node.prompt) lines.push(`${prefix}  - Prompt: ${node.prompt.replace(/\s+/g, " ").slice(0, 160)}`);
    if (node.inputs && node.inputs.length) lines.push(`${prefix}  - Inputs: ${node.inputs.map((port) => `${port.name}:${port.type}`).join(", ")}`);
    if (node.outputs && node.outputs.length) lines.push(`${prefix}  - Outputs: ${node.outputs.map((port) => `${port.name}:${port.type}`).join(", ")}`);
    if (node.artifacts && node.artifacts.length) lines.push(`${prefix}  - Artifacts: ${node.artifacts.map((artifact) => artifact.name).join(", ")}`);
    (node.calls || []).forEach((call) => lines.push(`${prefix}  - Calls: ${call.skill}${call.as ? ` as ${call.as}` : ""}`));
    (node.run || []).forEach((command) => lines.push(`${prefix}  - Run: \`${command}\``));
    (node.validations || []).forEach((check) => lines.push(`${prefix}  - Validate: ${check}`));
    (node.verify || []).forEach((check) => lines.push(`${prefix}  - Verify: ${check}`));
    (node.recovery || []).forEach((step) => lines.push(`${prefix}  - Recovery: ${step}`));
    (node.reviews || []).forEach((review) => lines.push(`${prefix}  - Human review: ${review}`));
    (node.children || []).forEach((child) => nodeSummary(child, depth + 1, lines));
  }

  function toMarkdown(ir) {
    const pipeline = ir.pipeline || {};
    const lines = [
      `# ${pipeline.name || "Untitled Pipeline"}`,
      "",
      `_${pipeline.subtitle || "Prompt Is All You Need"}_`,
      "",
      `Domain: ${pipeline.domain || "general"}`,
      "",
    ];
    if (pipeline.workflowVersion || pipeline.author || pipeline.artifactDir || pipeline.databasePath || pipeline.logPath) {
      lines.push("## Metadata", "");
      if (pipeline.workflowVersion) lines.push(`- Version: ${pipeline.workflowVersion}`);
      if (pipeline.author) lines.push(`- Author: ${pipeline.author}`);
      if (pipeline.includes && pipeline.includes.length) lines.push(`- Includes: ${pipeline.includes.join(", ")}`);
      if (pipeline.artifactDir) lines.push(`- Artifact dir: ${pipeline.artifactDir}`);
      if (pipeline.databasePath) lines.push(`- Database: ${pipeline.databasePath}`);
      if (pipeline.logPath) lines.push(`- Log path: ${pipeline.logPath}`);
      lines.push("");
    }
    if (pipeline.goal) lines.push("## Goal", "", pipeline.goal, "");
    if (pipeline.inputPorts && pipeline.inputPorts.length) {
      lines.push("## Inputs", "");
      pipeline.inputPorts.forEach((port) => lines.push(`- ${port.name}: ${port.type}${port.value ? ` = ${port.value}` : ""}`));
      lines.push("");
    }
    if (pipeline.agents && pipeline.agents.length) {
      lines.push("## Agents", "");
      pipeline.agents.forEach((agent) => nodeSummary(agent, 0, lines));
      lines.push("");
    }
    if (pipeline.skills && pipeline.skills.length) {
      lines.push("## Skills", "");
      pipeline.skills.forEach((skill) => nodeSummary(skill, 0, lines));
      lines.push("");
    }
    lines.push("## Program", "");
    (pipeline.tasks || []).forEach((task) => nodeSummary(task, 0, lines));
    return lines.join("\n");
  }

  const samples = {
    general: `pipeline "Ship AAPS Studio" {
  subtitle "Prompt Is All You Need"
  version "0.2"
  author "AAPS"
  domain "software"
  tags "appdev, codex, release"
  requires_tools "shell, git, browser, codex"
  artifact_dir "runtime/artifacts"
  database "runtime/aaps-runs.jsonl"
  log_path "runtime/logs/studio.log"
  goal "Design, build, verify, and publish a clean web app for an autonomous agent project."
  input repo: path required = "./"
  output release_notes: markdown = "docs/release-notes.md"

  agent builder {
    role "Senior product engineer who turns prompts into durable implementation steps."
    model "gpt-5"
    tools "shell, git, browser"
  }

  skill bounded_change {
    input task: text
    output diff: patch
    stage plan {
      prompt "Read the repository, identify constraints, and write a short implementation plan."
    }
    stage implement {
      prompt "Make the smallest coherent change that satisfies the task."
    }
    stage verify {
      run "npm test"
      validate "Test command exits successfully."
      verify "All tests pass."
      recover "If tests fail, inspect the failing output and make the smallest corrective patch."
    }
  }

  task discover {
    uses builder
    call bounded_change as planning_loop
    prompt "Read the repository and prepare the next safe change."
    output plan: markdown = "docs/plan.md"
  }

  task publish after discover {
    uses builder
    prompt "Commit, push, and report deployment status after checks pass."
    run "git status --short"
    verify "Remote branch contains the latest commit."
  }
}`,
    biology: `pipeline "Organoid Segmentation QC" {
  subtitle "Prompt Is All You Need"
  version "0.2"
  author "AAPS"
  domain "biology"
  tags "segmentation, qc, quantification, organoid"
  requires_tools "image_viewer, cellpose, thresholding, vision_mask, python"
  requires_models "gpt-5, cellpose"
  artifact_dir "runtime/artifacts/segmentation"
  database "runtime/aaps-runs.jsonl"
  log_path "runtime/logs/segmentation.log"
  goal "Choose a segmentation method for microscopy images, generate masks, run QC, and quantify organoid metrics."
  input image: image required = "examples/input/organoid.png"
  output mask: image = "runtime/masks/organoid-mask.png"
  output metrics: table = "runtime/metrics/organoid-metrics.csv"

  agent vision_qc {
    role "Inspect microscopy images, choose analysis methods, and reject unsafe masks."
    model "gpt-5"
    tools "image_viewer, shell, cellpose, thresholding, vision_mask"
  }

  skill segment_image {
    input image: image
    output mask: image
    output qc_report: markdown
    stage inspect {
      prompt "View the image and describe modality, objects, contrast, artifacts, and likely segmentation risks."
      output image_context: json
    }
    choose method_router {
      prompt "Choose cellpose, thresholding, or vision_mask based on contrast, morphology, and expected object boundaries."
      output selected_method: json
    }
    if "selected_method == 'cellpose'" {
      method cellpose {
        tool "cellpose"
        param diameter = "auto"
        run "python tools/run_cellpose.py --image {{image}} --out {{mask}}"
        verify "Mask objects align with visible organoid boundaries."
      }
    }
    else {
      method threshold_or_vision {
        tool "thresholding, vision_mask"
        prompt "Use adaptive thresholding first; escalate to a vision mask model if boundary confidence is low."
        verify "Mask has plausible area, connected components, and boundary overlap."
      }
    }
    stage qc {
      metric min_object_area = "domain_defined"
      metric boundary_overlap = "required"
      prompt "Check failure modes: merged objects, missing dim objects, debris, and partial fields."
      output qc_report: markdown
      validate "Mask is non-empty and object count is plausible for the field."
      recover "Fallback to threshold_or_vision and request human review when confidence remains low."
      review "Human approves overlay if QC confidence is below threshold."
    }
  }

  task analyze_image {
    uses vision_qc
    call segment_image as segmentation
    for_each image in "input.image_batch" {
      action segment {
        prompt "Run the selected segmentation method and save a mask."
      }
      action quantify {
        run "python tools/quantify_mask.py --image {{image}} --mask {{mask}} --out {{metrics}}"
        verify "Metrics include count, area, circularity, intensity, and QC flags."
      }
    }
  }
}`,
    writing: `pipeline "Book Writing Loop" {
  subtitle "Prompt Is All You Need"
  version "0.2"
  domain "writing"
  tags "novel, book, outline, draft, revise"
  artifact_dir "runtime/artifacts/writing"
  goal "Turn research notes into a chapter plan, draft, critique, revision, and publishable manuscript artifact."
  input notes: markdown = "materials/notes.md"
  output manuscript: markdown = "drafts/chapter.md"

  agent editor {
    role "Book-writing agent that separates chat memory from controlled manuscript edits."
    model "gpt-5"
    tools "filesystem, markdown, critique"
  }

  skill chapter_cycle {
    input notes: markdown
    output draft: markdown
    stage outline {
      prompt "Create a chapter outline with argument, scene, evidence, and reader promise."
    }
    stage draft {
      prompt "Write the chapter from the outline while preserving source constraints."
    }
    stage critique {
      prompt "Identify unclear claims, pacing issues, missing evidence, and continuity problems."
    }
    stage revise {
      prompt "Revise only the selected chapter artifact; do not mutate unrelated manuscripts."
    }
  }

  task write_chapter {
    uses editor
    call chapter_cycle
    verify "The manuscript has an outline, draft, critique notes, and revision summary."
  }
}`,
  };

  function createProjectManifest(overrides = {}) {
    const now = new Date().toISOString();
    const base = {
      schema: PROJECT_VERSION,
      name: "Untitled AAPS Project",
      path: ".",
      description: "A multi-file AAPS project.",
      domain: "general",
      tags: [],
      defaultMain: "workflows/main.aaps",
      activeFile: "workflows/main.aaps",
      created: now,
      updated: now,
      paths: {
        blocks: "blocks",
        skills: "skills",
        modules: "modules",
        subworkflows: "subworkflows",
        workflows: "workflows",
        drafts: "drafts",
        archives: "archive",
        data: "data",
        artifacts: "artifacts",
        runs: "runs",
        reports: "reports",
        notes: "notes",
      },
      dataFolders: ["data"],
      artifactRoot: "artifacts",
      runDatabase: "runs/aaps-runs.jsonl",
      variables: {},
      tools: [],
      models: [],
      notes: [],
      files: {
        blocks: [],
        skills: [],
        modules: [],
        subworkflows: [],
        workflows: ["workflows/main.aaps"],
        drafts: [],
        archives: [],
        references: [],
      },
    };
    return normalizeProjectManifest({
      ...base,
      ...overrides,
      paths: { ...base.paths, ...(overrides.paths || {}) },
      files: { ...base.files, ...(overrides.files || {}) },
    });
  }

  function normalizeProjectManifest(manifest = {}) {
    const normalized = {
      schema: manifest.schema || PROJECT_VERSION,
      name: manifest.name || "Untitled AAPS Project",
      path: manifest.path || ".",
      description: manifest.description || "",
      domain: manifest.domain || "general",
      tags: uniqueList(manifest.tags || []),
      defaultMain: manifest.defaultMain || manifest.default_main || "workflows/main.aaps",
      activeFile: manifest.activeFile || manifest.active_file || manifest.defaultMain || "workflows/main.aaps",
      created: manifest.created || "",
      updated: manifest.updated || "",
      paths: { ...(manifest.paths || {}) },
      dataFolders: uniqueList(manifest.dataFolders || manifest.data_folders || []),
      artifactRoot: manifest.artifactRoot || manifest.artifact_root || "artifacts",
      runDatabase: manifest.runDatabase || manifest.run_database || "runs/aaps-runs.jsonl",
      variables: { ...(manifest.variables || {}) },
      tools: uniqueList(manifest.tools || []),
      models: uniqueList(manifest.models || []),
      notes: Array.isArray(manifest.notes) ? manifest.notes.map(String) : [],
      files: {},
    };
    PROJECT_FILE_CATEGORIES.forEach((category) => {
      normalized.files[category] = uniqueList((manifest.files && manifest.files[category]) || []);
    });
    if (!normalized.files.workflows.includes(normalized.defaultMain)) {
      normalized.files.workflows.unshift(normalized.defaultMain);
    }
    if (
      normalized.activeFile &&
      normalized.activeFile.endsWith(".aaps") &&
      !projectFileIndex(normalized).includes(normalized.activeFile)
    ) {
      normalized.files.drafts.push(normalized.activeFile);
      normalized.files.drafts = uniqueList(normalized.files.drafts);
    }
    return normalized;
  }

  function projectFileIndex(manifest = {}) {
    const project = manifest.files ? manifest : normalizeProjectManifest(manifest);
    return uniqueList(PROJECT_FILE_CATEGORIES.flatMap((category) => project.files[category] || []));
  }

  function validateProjectManifest(manifest = {}, knownFiles = []) {
    const project = normalizeProjectManifest(manifest);
    const diagnostics = [];
    const known = new Set(knownFiles || []);
    const indexed = new Set(projectFileIndex(project));

    function issue(severity, field, message) {
      diagnostics.push({ severity, field, message });
    }

    ["name", "domain", "defaultMain", "activeFile", "artifactRoot", "runDatabase"].forEach((field) => {
      if (!String(project[field] || "").trim()) issue("error", field, `${field} is required.`);
    });
    if (project.schema !== PROJECT_VERSION) {
      issue("error", "schema", `schema must be ${PROJECT_VERSION}.`);
    }

    ["path", "defaultMain", "activeFile", "artifactRoot", "runDatabase", ...project.dataFolders].forEach((value) => {
      if (!relativeProjectPath(value)) issue("error", "path", `Path must be project-relative: ${value}`);
    });

    Object.entries(project.paths || {}).forEach(([key, value]) => {
      if (!relativeProjectPath(value)) issue("error", `paths.${key}`, `Path must be project-relative: ${value}`);
    });

    projectFileIndex(project).forEach((file) => {
      if (!relativeProjectPath(file)) issue("error", "files", `AAPS file path must be project-relative: ${file}`);
      if (!file.endsWith(".aaps")) issue("error", "files", `Project source file must end with .aaps: ${file}`);
      if (known.size && !known.has(file)) issue("warning", "files", `Manifest lists a file that was not found: ${file}`);
    });

    [project.defaultMain, project.activeFile].forEach((file) => {
      if (file && !file.endsWith(".aaps")) issue("error", "main", `Main project file must end with .aaps: ${file}`);
      if (file && !indexed.has(file)) issue("warning", "main", `Main file is not listed in files: ${file}`);
      if (known.size && file && !known.has(file)) issue("warning", "main", `Main file was not found on disk: ${file}`);
    });

    return {
      ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
      project,
      diagnostics,
      files: projectFileIndex(project),
    };
  }

  function projectStructureText(manifest = {}) {
    const project = normalizeProjectManifest(manifest);
    const paths = project.paths || {};
    return [
      `${project.name}/`,
      "  aaps.project.json",
      `  ${paths.blocks || "blocks"}/`,
      `  ${paths.skills || "skills"}/`,
      `  ${paths.modules || "modules"}/`,
      `  ${paths.workflows || "workflows"}/`,
      `  ${paths.data || "data"}/`,
      `  ${project.artifactRoot || "artifacts"}/`,
      `  ${paths.runs || "runs"}/`,
      `  ${paths.reports || "reports"}/`,
      `  ${paths.notes || "notes"}/`,
    ].join("\n");
  }

  const sampleProject = createProjectManifest({
    name: "Organoid Analysis Project",
    description: "Reusable AAPS blocks and workflows for microscopy QC, organoid segmentation, quantification, and report generation.",
    domain: "biology",
    tags: ["organoid", "microscopy", "segmentation", "qc"],
    defaultMain: "workflows/main.aaps",
    activeFile: "workflows/main.aaps",
    dataFolders: ["data/raw", "data/processed"],
    artifactRoot: "artifacts",
    runDatabase: "runs/organoid-aaps-runs.jsonl",
    variables: {
      image_glob: "data/raw/**/*.tif",
      qc_threshold: "domain_defined",
      review_mode: "required_when_low_confidence",
    },
    tools: ["python", "cellpose", "scikit-image", "opencv", "codex"],
    models: ["gpt-5", "cellpose", "vision-mask"],
    notes: [
      "Keep blocks small, typed, and reusable.",
      "Main workflows include project-root relative block files.",
    ],
    files: {
      blocks: [
        "blocks/qc_image.aaps",
        "blocks/segment_organoid.aaps",
        "blocks/quantify_growth.aaps",
        "blocks/generate_report.aaps",
      ],
      skills: ["skills/microscopy_qc.aaps", "skills/report_generation.aaps"],
      modules: [],
      subworkflows: ["workflows/test_segmentation_methods.aaps"],
      workflows: ["workflows/main.aaps", "workflows/batch_analysis.aaps"],
      drafts: [],
      archives: [],
      references: [],
    },
  });

  return {
    VERSION,
    PROJECT_VERSION,
    PROJECT_FILE_CATEGORIES,
    parseAAPS,
    serializeAAPS,
    toMarkdown,
    createProjectManifest,
    normalizeProjectManifest,
    validateProjectManifest,
    projectFileIndex,
    projectStructureText,
    sample: samples.general,
    samples,
    sampleProject,
    slug,
  };
});
