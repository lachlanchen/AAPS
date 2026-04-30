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
      return text
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
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
      requiredAgents: [],
      requiredCommands: [],
      requiredFiles: [],
      requiredPythonPackages: [],
      requiredNodePackages: [],
      environment: {
        python: "",
        requirements: [],
        commands: [],
        nodePackages: [],
        files: [],
        env: {},
        setup: [],
      },
      executionMode: "",
      safety: {},
      includes: [],
      imports: [],
      sourceFile: "",
      inputs: {},
      inputPorts: [],
      outputPorts: [],
      agents: [],
      blocks: [],
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
      requirements: {
        tools: [],
        models: [],
        agents: [],
        commands: [],
        files: [],
        pythonPackages: [],
        nodePackages: [],
      },
      environment: {
        python: "",
        requirements: [],
        commands: [],
        nodePackages: [],
        files: [],
        env: {},
        setup: [],
      },
      compile: {
        agent: "",
        prompt: "",
        onMissing: "prompt",
      },
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
      code: "",
      sourceFile: "",
      calls: [],
      run: [],
      verify: [],
      tests: [],
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
      else if (node.kind === "block") ir.pipeline.blocks.push(node);
      else if (node.kind === "skill") ir.pipeline.skills.push(node);
      else if (node.kind === "task") ir.pipeline.tasks.push(node);
      else ir.pipeline.tasks.push(node);
      return;
    }
    parent.children.push(node);
  }

  function addRequirement(target, key, values) {
    const list = Array.isArray(values) ? values : parseList(values);
    if (!list.length) return;
    const pipelineMap = {
      tools: "requiredTools",
      models: "requiredModels",
      agents: "requiredAgents",
      commands: "requiredCommands",
      files: "requiredFiles",
      pythonPackages: "requiredPythonPackages",
      nodePackages: "requiredNodePackages",
    };
    if (target.inputPorts || target.outputPorts) {
      const field = pipelineMap[key];
      target[field] = uniqueList([...(target[field] || []), ...list]);
      return;
    }
    target.requirements = target.requirements || {};
    target.requirements[key] = uniqueList([...(target.requirements[key] || []), ...list]);
  }

  function addEnvironmentValue(target, key, value) {
    target.environment = target.environment || {
      python: "",
      requirements: [],
      commands: [],
      nodePackages: [],
      files: [],
      env: {},
      setup: [],
    };
    const normalized = String(key || "").trim();
    const text = unquote(value);
    if (normalized === "python" || normalized === "python_path" || normalized === "interpreter") {
      target.environment.python = text;
    } else if (["requirement", "requirements", "python_package", "python_packages"].includes(normalized)) {
      target.environment.requirements = uniqueList([...(target.environment.requirements || []), ...parseList(text)]);
    } else if (["command", "commands", "system_command", "system_commands"].includes(normalized)) {
      target.environment.commands = uniqueList([...(target.environment.commands || []), ...parseList(text)]);
    } else if (["node_package", "node_packages"].includes(normalized)) {
      target.environment.nodePackages = uniqueList([...(target.environment.nodePackages || []), ...parseList(text)]);
    } else if (["file", "files"].includes(normalized)) {
      target.environment.files = uniqueList([...(target.environment.files || []), ...parseList(text)]);
    } else if (normalized === "setup" || normalized === "setup_command") {
      target.environment.setup = uniqueList([...(target.environment.setup || []), text]);
    } else {
      target.environment.env = { ...(target.environment.env || {}), [normalized]: text };
    }
  }

  function nearest(stack, predicate) {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (predicate(stack[index])) return stack[index].node;
    }
    return null;
  }

  function parseAAPS(source, options = {}) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const ir = { version: VERSION, pipeline: createPipeline(), diagnostics: [] };
    ir.sourceFile = options.sourceFile || "";
    ir.pipeline.sourceFile = options.sourceFile || "";
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

      match = line.match(/^(agent|block|skill|stage|method|action|guard|handoff|choose)\s+([A-Za-z_][\w.-]*)(?:\s+(.+?))?\s*\{$/i);
      if (match) {
        const node = createNode(match[1].toLowerCase(), match[2], {
          title: match[3] ? unquote(match[3]) : "",
          sourceFile: options.sourceFile || "",
        });
        addNodeToParent(ir, stack, node);
        stack.push({ kind: node.kind, node });
        return;
      }

      const target = currentTarget();
      const scope = stack[stack.length - 1];

      match = line.match(/^(prompt|description|note|code)\s+"""(.*)$/i);
      if (match) {
        const key = match[1].toLowerCase() === "description" ? "prompt" : match[1].toLowerCase();
        const end = match[2].indexOf('"""');
        if (end >= 0) target[key] = match[2].slice(0, end).trim();
        else blockText = { target, key, parts: [match[2]] };
        return;
      }

      match = line.match(/^(prompt|description|purpose)\s+(.+)$/i);
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

      match = line.match(/^(version|author|created|updated|artifact_dir|database|log_path|execution_mode)\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        const keyMap = {
          version: "workflowVersion",
          author: "author",
          created: "created",
          updated: "updated",
          artifact_dir: "artifactDir",
          database: "databasePath",
          log_path: "logPath",
          execution_mode: "executionMode",
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
        ir.pipeline.imports.push({ kind: "include", path: includePath, as: slug(includePath), sourceFile: options.sourceFile || "" });
        if (!relativeProjectPath(includePath)) {
          diagnostic(lineNumber, `include path must be project-relative: ${includePath}`);
        }
        return;
      }

      match = line.match(/^import\s+(block|skill|workflow|module)\s+(.+?)(?:\s+as\s+([A-Za-z_][\w.-]*))?$/i);
      if (match && target === ir.pipeline) {
        const importPath = unquote(match[2]);
        const alias = match[3] || slug(importPath);
        ir.pipeline.imports.push({
          kind: match[1].toLowerCase(),
          path: importPath,
          as: alias,
          sourceFile: options.sourceFile || "",
        });
        if (!relativeProjectPath(importPath)) {
          diagnostic(lineNumber, `import path must be project-relative: ${importPath}`);
        }
        return;
      }

      match = line.match(/^(requires_tools|requires_models|requires_agents|requires_commands|requires_files|requires_python_packages|requires_node_packages)\s+(.+)$/i);
      if (match) {
        const map = {
          requires_tools: "tools",
          requires_models: "models",
          requires_agents: "agents",
          requires_commands: "commands",
          requires_files: "files",
          requires_python_packages: "pythonPackages",
          requires_node_packages: "nodePackages",
        };
        addRequirement(target, map[match[1].toLowerCase()], unquote(match[2]));
        return;
      }

      match = line.match(/^(python_package|node_package|system_command|required_file|required_tool|required_agent)\s+(.+)$/i);
      if (match) {
        const map = {
          python_package: "pythonPackages",
          node_package: "nodePackages",
          system_command: "commands",
          required_file: "files",
          required_tool: "tools",
          required_agent: "agents",
        };
        addRequirement(target, map[match[1].toLowerCase()], unquote(match[2]));
        return;
      }

      match = line.match(/^(environment|env)\s+(.+)$/i);
      if (match) {
        const kv = parseKeyValue(match[2]);
        if (!kv) {
          diagnostic(lineNumber, `${match[1]} must use name = value.`);
          return;
        }
        addEnvironmentValue(target, kv.key, kv.value);
        return;
      }

      match = line.match(/^safety\s+(.+)$/i);
      if (match && target === ir.pipeline) {
        const kv = parseKeyValue(match[1]);
        if (!kv) {
          diagnostic(lineNumber, "safety must use name = value.");
          return;
        }
        ir.pipeline.safety[kv.key] = kv.value;
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

      match = line.match(/^arg\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        const kv = parseKeyValue(match[1]);
        if (!kv) {
          diagnostic(lineNumber, "arg must use name = value.");
          return;
        }
        target.args[kv.key] = kv.value;
        if (target.exec && target.exec.length) {
          target.exec[target.exec.length - 1].args[kv.key] = kv.value;
        }
        return;
      }

      match = line.match(/^(exec|execute)\s+([A-Za-z_][\w.-]*)(?:\s+(.+))?$/i);
      if (match && target !== ir.pipeline) {
        const type = match[2].toLowerCase();
        const value = unquote(match[3] || "");
        const commandTypes = new Set(["shell", "sh", "bash", "node_script", "npm_script", "manual", "noop", "internal", "agent"]);
        target.exec.push({
          type,
          command: commandTypes.has(type) ? value : "",
          entry: commandTypes.has(type) ? "" : value,
          args: {},
        });
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

      match = line.match(/^repair\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.repair = /^(true|yes|on|1)$/i.test(unquote(match[1]));
        return;
      }

      match = line.match(/^fallback\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.fallback = unquote(match[1]);
        return;
      }

      match = line.match(/^compile_agent\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.compile = target.compile || {};
        target.compile.agent = unquote(match[1]);
        addRequirement(target, "agents", target.compile.agent);
        return;
      }

      match = line.match(/^compile_prompt\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.compile = target.compile || {};
        target.compile.prompt = unquote(match[1]);
        return;
      }

      match = line.match(/^compile_on_missing\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.compile = target.compile || {};
        target.compile.onMissing = unquote(match[1]);
        return;
      }

      match = line.match(/^test\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        const kv = parseKeyValue(match[1]);
        if (kv) target.tests.push({ key: kv.key, value: kv.value });
        else target.tests.push({ key: "note", value: unquote(match[1]) });
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
    if (CHILD_KINDS.has(node.kind) || node.kind === "agent" || node.kind === "block" || node.kind === "skill") {
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
    const requirements = node.requirements || {};
    if (requirements.tools && requirements.tools.length) lines.push(`${childIndent}requires_tools ${quote(requirements.tools.join(", "))}`);
    if (requirements.models && requirements.models.length) lines.push(`${childIndent}requires_models ${quote(requirements.models.join(", "))}`);
    if (requirements.agents && requirements.agents.length) lines.push(`${childIndent}requires_agents ${quote(requirements.agents.join(", "))}`);
    if (requirements.commands && requirements.commands.length) lines.push(`${childIndent}requires_commands ${quote(requirements.commands.join(", "))}`);
    if (requirements.files && requirements.files.length) lines.push(`${childIndent}requires_files ${quote(requirements.files.join(", "))}`);
    if (requirements.pythonPackages && requirements.pythonPackages.length) lines.push(`${childIndent}requires_python_packages ${quote(requirements.pythonPackages.join(", "))}`);
    if (requirements.nodePackages && requirements.nodePackages.length) lines.push(`${childIndent}requires_node_packages ${quote(requirements.nodePackages.join(", "))}`);
    const environment = node.environment || {};
    if (environment.python) lines.push(`${childIndent}environment python = ${quote(environment.python)}`);
    if (environment.requirements && environment.requirements.length) lines.push(`${childIndent}environment requirements = ${quote(environment.requirements.join(", "))}`);
    if (environment.commands && environment.commands.length) lines.push(`${childIndent}environment commands = ${quote(environment.commands.join(", "))}`);
    if (environment.nodePackages && environment.nodePackages.length) lines.push(`${childIndent}environment node_packages = ${quote(environment.nodePackages.join(", "))}`);
    if (environment.files && environment.files.length) lines.push(`${childIndent}environment files = ${quote(environment.files.join(", "))}`);
    (environment.setup || []).forEach((command) => lines.push(`${childIndent}environment setup = ${quote(command)}`));
    Object.entries(environment.env || {}).forEach(([key, value]) => lines.push(`${childIndent}env ${key} = ${quote(value)}`));
    if (node.compile && node.compile.agent) lines.push(`${childIndent}compile_agent ${quote(node.compile.agent)}`);
    if (node.compile && node.compile.prompt) lines.push(`${childIndent}compile_prompt ${quote(node.compile.prompt)}`);
    if (node.compile && node.compile.onMissing && node.compile.onMissing !== "prompt") lines.push(`${childIndent}compile_on_missing ${quote(node.compile.onMissing)}`);
    lines.push(...serializePorts(node, childIndent));
    (node.artifacts || []).forEach((artifact) => lines.push(`${childIndent}artifact ${artifact.name}: ${artifact.type || "artifact"}${artifact.value ? ` = ${quote(artifact.value)}` : ""}${artifact.validation ? ` validate ${quote(artifact.validation)}` : ""}`));
    (node.exec || []).forEach((step) => {
      const executable = step.command || step.entry || "";
      lines.push(`${childIndent}exec ${step.type || "shell"} ${quote(executable)}`);
      Object.entries(step.args || {}).forEach(([key, value]) => {
        lines.push(`${childIndent}arg ${key} = ${quote(value)}`);
      });
    });
    Object.entries(node.params || {}).forEach(([key, value]) => lines.push(`${childIndent}param ${key} = ${quote(value)}`));
    Object.entries(node.metrics || {}).forEach(([key, value]) => lines.push(`${childIndent}metric ${key} = ${quote(value)}`));
    Object.entries(node.policies || {}).forEach(([key, value]) => lines.push(`${childIndent}policy ${key} = ${quote(value)}`));
    (node.calls || []).forEach((call) => lines.push(`${childIndent}call ${call.skill}${call.as ? ` as ${call.as}` : ""}`));
    if (node.prompt) {
      lines.push(`${childIndent}prompt """`);
      lines.push(...String(node.prompt).split("\n").map((part) => `${childIndent}${part}`));
      lines.push(`${childIndent}"""`);
    }
    if (node.code) {
      lines.push(`${childIndent}code """`);
      lines.push(...String(node.code).split("\n").map((part) => `${childIndent}${part}`));
      lines.push(`${childIndent}"""`);
    }
    (node.run || []).forEach((command) => lines.push(`${childIndent}run ${quote(command)}`));
    (node.validations || []).forEach((check) => lines.push(`${childIndent}validate ${quote(check)}`));
    (node.verify || []).forEach((check) => lines.push(`${childIndent}verify ${quote(check)}`));
    (node.recovery || []).forEach((step) => lines.push(`${childIndent}recover ${quote(step)}`));
    if (node.repair) lines.push(`${childIndent}repair true`);
    if (node.fallback) lines.push(`${childIndent}fallback ${quote(node.fallback)}`);
    (node.reviews || []).forEach((review) => lines.push(`${childIndent}review ${quote(review)}`));
    (node.tests || []).forEach((test) => lines.push(`${childIndent}test ${test.key} = ${quote(test.value)}`));
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
    (pipeline.imports || [])
      .filter((item) => item.kind !== "include" && !pipeline.includes.includes(item.path))
      .forEach((item) => lines.push(`  import ${item.kind || "block"} ${quote(item.path)}${item.as ? ` as ${item.as}` : ""}`));
    if (pipeline.requiredTools && pipeline.requiredTools.length) lines.push(`  requires_tools ${quote(pipeline.requiredTools.join(", "))}`);
    if (pipeline.requiredModels && pipeline.requiredModels.length) lines.push(`  requires_models ${quote(pipeline.requiredModels.join(", "))}`);
    if (pipeline.requiredAgents && pipeline.requiredAgents.length) lines.push(`  requires_agents ${quote(pipeline.requiredAgents.join(", "))}`);
    if (pipeline.requiredCommands && pipeline.requiredCommands.length) lines.push(`  requires_commands ${quote(pipeline.requiredCommands.join(", "))}`);
    if (pipeline.requiredFiles && pipeline.requiredFiles.length) lines.push(`  requires_files ${quote(pipeline.requiredFiles.join(", "))}`);
    if (pipeline.requiredPythonPackages && pipeline.requiredPythonPackages.length) lines.push(`  requires_python_packages ${quote(pipeline.requiredPythonPackages.join(", "))}`);
    if (pipeline.requiredNodePackages && pipeline.requiredNodePackages.length) lines.push(`  requires_node_packages ${quote(pipeline.requiredNodePackages.join(", "))}`);
    const pipelineEnvironment = pipeline.environment || {};
    if (pipelineEnvironment.python) lines.push(`  environment python = ${quote(pipelineEnvironment.python)}`);
    if (pipelineEnvironment.requirements && pipelineEnvironment.requirements.length) lines.push(`  environment requirements = ${quote(pipelineEnvironment.requirements.join(", "))}`);
    if (pipelineEnvironment.commands && pipelineEnvironment.commands.length) lines.push(`  environment commands = ${quote(pipelineEnvironment.commands.join(", "))}`);
    if (pipelineEnvironment.nodePackages && pipelineEnvironment.nodePackages.length) lines.push(`  environment node_packages = ${quote(pipelineEnvironment.nodePackages.join(", "))}`);
    if (pipelineEnvironment.files && pipelineEnvironment.files.length) lines.push(`  environment files = ${quote(pipelineEnvironment.files.join(", "))}`);
    (pipelineEnvironment.setup || []).forEach((command) => lines.push(`  environment setup = ${quote(command)}`));
    Object.entries(pipelineEnvironment.env || {}).forEach(([key, value]) => lines.push(`  env ${key} = ${quote(value)}`));
    if (pipeline.artifactDir) lines.push(`  artifact_dir ${quote(pipeline.artifactDir)}`);
    if (pipeline.databasePath) lines.push(`  database ${quote(pipeline.databasePath)}`);
    if (pipeline.logPath) lines.push(`  log_path ${quote(pipeline.logPath)}`);
    if (pipeline.executionMode) lines.push(`  execution_mode ${quote(pipeline.executionMode)}`);
    Object.entries(pipeline.safety || {}).forEach(([key, value]) => lines.push(`  safety ${key} = ${quote(value)}`));
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
    [...(pipeline.agents || []), ...(pipeline.blocks || []), ...(pipeline.skills || []), ...(pipeline.tasks || [])].forEach((node) => {
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
    if (node.environment && node.environment.python) lines.push(`${prefix}  - Python: ${node.environment.python}`);
    if (node.requirements && node.requirements.commands && node.requirements.commands.length) lines.push(`${prefix}  - Commands: ${node.requirements.commands.join(", ")}`);
    if (node.requirements && node.requirements.tools && node.requirements.tools.length) lines.push(`${prefix}  - Tools: ${node.requirements.tools.join(", ")}`);
    if (node.requirements && node.requirements.agents && node.requirements.agents.length) lines.push(`${prefix}  - Agents: ${node.requirements.agents.join(", ")}`);
    if (node.compile && node.compile.agent) lines.push(`${prefix}  - Compile agent: ${node.compile.agent}`);
    (node.calls || []).forEach((call) => lines.push(`${prefix}  - Calls: ${call.skill}${call.as ? ` as ${call.as}` : ""}`));
    (node.exec || []).forEach((step) => lines.push(`${prefix}  - Exec: ${step.type} ${step.command || step.entry}`));
    (node.run || []).forEach((command) => lines.push(`${prefix}  - Run: \`${command}\``));
    (node.validations || []).forEach((check) => lines.push(`${prefix}  - Validate: ${check}`));
    (node.verify || []).forEach((check) => lines.push(`${prefix}  - Verify: ${check}`));
    (node.recovery || []).forEach((step) => lines.push(`${prefix}  - Recovery: ${step}`));
    if (node.repair) lines.push(`${prefix}  - Repair: enabled`);
    if (node.fallback) lines.push(`${prefix}  - Fallback: ${node.fallback}`);
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
    if (pipeline.blocks && pipeline.blocks.length) {
      lines.push("## Blocks", "");
      pipeline.blocks.forEach((block) => nodeSummary(block, 0, lines));
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

  function nodeActions(node) {
    const actions = [];
    (node.run || []).forEach((command, index) => {
      actions.push({
        id: `${node.id || node.kind}_run_${index + 1}`,
        type: "shell",
        command,
        entry: "",
        args: {},
        source: "run",
      });
    });
    (node.exec || []).forEach((step, index) => {
      actions.push({
        id: `${node.id || node.kind}_exec_${index + 1}`,
        type: step.type || "shell",
        command: step.command || "",
        entry: step.entry || "",
        code: step.code || node.code || "",
        args: { ...(node.args || {}), ...(step.args || {}) },
        source: "exec",
      });
    });
    return actions;
  }

  function nodeArtifacts(node) {
    const ports = [...(node.outputs || []), ...(node.artifacts || [])];
    return ports
      .filter((port) => port && port.value)
      .map((port) => ({
        name: port.name,
        type: port.type || "artifact",
        path: port.value,
        validation: port.validation || "",
      }));
  }

  function nodeRequirements(node, pipeline) {
    const local = node.requirements || {};
    const environment = node.environment || {};
    return {
      tools: uniqueList([...(node.tools || []), ...(local.tools || [])]),
      models: uniqueList([...(local.models || [])]),
      agents: uniqueList([...(node.agent ? [node.agent] : []), ...(local.agents || []), ...(node.compile && node.compile.agent ? [node.compile.agent] : [])]),
      commands: uniqueList([...(local.commands || []), ...(environment.commands || [])]),
      files: uniqueList([...(local.files || []), ...(environment.files || [])]),
      pythonPackages: uniqueList([...(local.pythonPackages || []), ...(environment.requirements || [])]),
      nodePackages: uniqueList([...(local.nodePackages || []), ...(environment.nodePackages || [])]),
      pipelineTools: uniqueList(pipeline.requiredTools || []),
      pipelineModels: uniqueList(pipeline.requiredModels || []),
      pipelineAgents: uniqueList(pipeline.requiredAgents || []),
    };
  }

  function blockContract(node, pipeline) {
    return {
      inputs: node.inputs || [],
      outputs: node.outputs || [],
      parameters: node.params || {},
      environment: node.environment || {},
      requirements: nodeRequirements(node, pipeline),
      tools: uniqueList(node.tools || []),
      agent: node.agent || "",
      scripts: (node.exec || []).map((step) => step.entry).filter(Boolean),
      actions: nodeActions(node),
      validation: node.validations || [],
      recovery: node.recovery || [],
      tests: node.tests || [],
    };
  }

  function indexDefinitions(pipeline) {
    const definitions = new Map();
    function walk(node) {
      if (node && node.id && !definitions.has(node.id)) definitions.set(node.id, node);
      (node.children || []).forEach(walk);
    }
    [...(pipeline.agents || []), ...(pipeline.blocks || []), ...(pipeline.skills || []), ...(pipeline.tasks || [])].forEach(walk);
    return definitions;
  }

  function buildExecutionPlan(ir, options = {}) {
    const pipeline = ir.pipeline || createPipeline();
    const definitions = indexDefinitions(pipeline);
    const steps = [];
    const warnings = [];
    const roots =
      options.roots ||
      (pipeline.tasks && pipeline.tasks.length
        ? pipeline.tasks
        : pipeline.blocks && pipeline.blocks.length
          ? pipeline.blocks
          : pipeline.skills && pipeline.skills.length
            ? pipeline.skills
            : []);

    function addWarning(message, path) {
      warnings.push({ message, path: path.join("/") });
    }

    function walkNode(node, path, callStack) {
      const actions = nodeActions(node);
      const artifacts = nodeArtifacts(node);
      const step = {
        key: path.join("/"),
        id: node.id,
        kind: node.kind,
        title: node.title || "",
        path: path.join("/"),
        prompt: node.prompt || "",
        condition: node.condition || "",
        iterator: node.iterator || null,
        agent: node.agent || "",
        tools: uniqueList(node.tools || []),
        requirements: nodeRequirements(node, pipeline),
        environment: node.environment || {},
        compile: node.compile || {},
        contract: blockContract(node, pipeline),
        sourceFile: node.sourceFile || pipeline.sourceFile || "",
        actions,
        executable: actions.length > 0,
        promptOnly: Boolean(node.prompt && actions.length === 0),
        inputs: node.inputs || [],
        outputs: node.outputs || [],
        artifacts,
        validations: node.validations || [],
        verify: node.verify || [],
        recovery: node.recovery || [],
        reviews: node.reviews || [],
        retry: Number(node.params && node.params.retry ? node.params.retry : 0),
        timeout: node.params && node.params.timeout ? node.params.timeout : "",
        repair: Boolean(node.repair),
        fallback: node.fallback || "",
        calls: node.calls || [],
        tests: node.tests || [],
      };
      if (
        step.executable ||
        step.promptOnly ||
        step.validations.length ||
        step.verify.length ||
        step.recovery.length ||
        step.reviews.length ||
        step.artifacts.length ||
        ["task", "action", "method", "guard", "stage", "for_each", "if", "else"].includes(node.kind)
      ) {
        steps.push(step);
      }

      (node.calls || []).forEach((call) => {
        const target = definitions.get(call.skill);
        if (!target) {
          addWarning(`Call target not found: ${call.skill}`, path);
          return;
        }
        if (callStack.includes(call.skill)) {
          addWarning(`Recursive call skipped: ${call.skill}`, path);
          return;
        }
        walkNode(target, path.concat(`call:${call.skill}${call.as ? `:${call.as}` : ""}`), callStack.concat(call.skill));
      });
      (node.children || []).forEach((child, index) => {
        walkNode(child, path.concat(`${child.kind}:${child.id || index}`), callStack);
      });
    }

    roots.forEach((node) => walkNode(node, [`${node.kind}:${node.id}`], [node.id]));

    return {
      version: "aaps_plan/0.1",
      pipeline: pipeline.name || "Untitled Pipeline",
      domain: pipeline.domain || "general",
      artifactDir: pipeline.artifactDir || "",
      databasePath: pipeline.databasePath || "",
      logPath: pipeline.logPath || "",
      inputs: pipeline.inputPorts || [],
      outputs: pipeline.outputPorts || [],
      requirements: {
        tools: pipeline.requiredTools || [],
        models: pipeline.requiredModels || [],
        agents: pipeline.requiredAgents || [],
        commands: pipeline.requiredCommands || [],
        files: pipeline.requiredFiles || [],
        pythonPackages: pipeline.requiredPythonPackages || [],
        nodePackages: pipeline.requiredNodePackages || [],
      },
      environment: pipeline.environment || {},
      includes: pipeline.includes || [],
      imports: pipeline.imports || [],
      project: options.project || ir.project || null,
      importGraph: options.importGraph || ir.importGraph || {},
      unresolvedImports: options.unresolvedImports || ir.unresolvedImports || [],
      circularImports: options.circularImports || ir.circularImports || [],
      steps,
      warnings,
      executableSteps: steps.filter((step) => step.executable).length,
      promptOnlySteps: steps.filter((step) => step.promptOnly).length,
    };
  }

  function buildAgentCompilePlan(plan, readiness = {}) {
    const records = Array.isArray(readiness.blocks) ? readiness.blocks : [];
    const byPath = new Map(records.map((record) => [record.path, record]));
    const requests = [];
    (plan.steps || []).forEach((step) => {
      const record = byPath.get(step.path);
      const missing = record ? (record.checks || []).filter((check) => !check.ok) : [];
      const compileAgent = (step.compile && step.compile.agent) || step.agent || "codex_repair_agent";
      const relevant = missing.filter((check) =>
        ["script", "file", "tool", "agent", "python_package", "node_package", "command", "input"].includes(check.kind)
      );
      if (!relevant.length) return;
      requests.push({
        step: step.path,
        block: step.id,
        agent: compileAgent,
        status: "prompt_required",
        missing: relevant,
        prompt: [
          `You are ${compileAgent}. Prepare a safe compile/setup plan for AAPS block ${step.id}.`,
          "",
          `Block path: ${step.path}`,
          `Source file: ${step.sourceFile || ""}`,
          "",
          "Missing requirements:",
          ...relevant.map((item) => `- ${item.kind}: ${item.name || item.path || item.message}`),
          "",
          "Block contract:",
          JSON.stringify(step.contract || {}, null, 2),
          "",
          "Rules: prefer project-local files, do not delete user data, do not install globally, and ask the user before risky setup.",
          step.compile && step.compile.prompt ? `\nUser compile instruction: ${step.compile.prompt}` : "",
        ].join("\n"),
      });
    });
    return { version: "aaps_compile_plan/0.1", requests };
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
        environments: "environments",
        tools: "tools",
        agents: "agents",
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
      agents: [],
      environment: {
        python: "",
        requirements: [],
        commands: [],
        nodePackages: [],
        env: {},
        setup: [],
      },
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
      agents: uniqueList(manifest.agents || []),
      environment: {
        python: (manifest.environment && manifest.environment.python) || "",
        requirements: uniqueList((manifest.environment && manifest.environment.requirements) || []),
        commands: uniqueList((manifest.environment && manifest.environment.commands) || []),
        nodePackages: uniqueList((manifest.environment && manifest.environment.nodePackages) || []),
        env: { ...((manifest.environment && manifest.environment.env) || {}) },
        setup: Array.isArray(manifest.environment && manifest.environment.setup) ? manifest.environment.setup.map(String) : [],
      },
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
      `  ${paths.environments || "environments"}/`,
      `  ${paths.tools || "tools"}/`,
      `  ${paths.agents || "agents"}/`,
      `  ${paths.data || "data"}/`,
      `  ${project.artifactRoot || "artifacts"}/`,
      `  ${paths.runs || "runs"}/`,
      `  ${paths.reports || "reports"}/`,
      `  ${paths.notes || "notes"}/`,
    ].join("\n");
  }

  function normalizeProjectFile(file) {
    return String(file || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\/+/g, "/");
  }

  function parseAAPSProject(fileMap = {}, entryFile = "", manifest = {}) {
    const project = normalizeProjectManifest(manifest || {});
    const normalizedMap = {};
    Object.entries(fileMap || {}).forEach(([file, source]) => {
      normalizedMap[normalizeProjectFile(file)] = String(source || "");
    });
    const activeFile = normalizeProjectFile(entryFile || project.activeFile || project.defaultMain);
    const parsedFiles = {};
    const importGraph = {};
    const unresolvedImports = [];
    const circularImports = [];

    function dependencyFiles(ir) {
      const deps = [];
      (ir.pipeline.includes || []).forEach((file) => {
        deps.push({ kind: "include", path: normalizeProjectFile(file), as: slug(file) });
      });
      (ir.pipeline.imports || []).forEach((item) => {
        deps.push({ ...item, path: normalizeProjectFile(item.path), as: item.as || slug(item.path) });
      });
      return deps.filter((item, index, all) => all.findIndex((other) => other.path === item.path && other.as === item.as) === index);
    }

    function parseFile(file, stack = []) {
      const normalized = normalizeProjectFile(file);
      if (stack.includes(normalized)) {
        circularImports.push({ path: normalized, chain: stack.concat(normalized) });
        return null;
      }
      if (parsedFiles[normalized]) return parsedFiles[normalized];
      if (!Object.prototype.hasOwnProperty.call(normalizedMap, normalized)) {
        unresolvedImports.push({ path: normalized, importedBy: stack[stack.length - 1] || "" });
        return null;
      }
      const ir = parseAAPS(normalizedMap[normalized], { sourceFile: normalized });
      parsedFiles[normalized] = ir;
      const deps = dependencyFiles(ir);
      importGraph[normalized] = deps.map((dep) => dep.path);
      deps.forEach((dep) => parseFile(dep.path, stack.concat(normalized)));
      return ir;
    }

    const entry = parseFile(activeFile, []);
    if (!entry) {
      return {
        version: "aaps_project_ir/0.1",
        project,
        activeFile,
        files: parsedFiles,
        entry: null,
        diagnostics: [{ line: 1, message: `Active AAPS file was not found: ${activeFile}` }],
        importGraph,
        unresolvedImports,
        circularImports,
      };
    }

    const merged = JSON.parse(JSON.stringify(entry));
    merged.project = project;
    merged.activeFile = activeFile;
    merged.files = parsedFiles;
    merged.importGraph = importGraph;
    merged.unresolvedImports = unresolvedImports;
    merged.circularImports = circularImports;
    merged.diagnostics = [...(merged.diagnostics || [])];
    unresolvedImports.forEach((item) => {
      merged.diagnostics.push({ line: 1, message: `Unresolved import ${item.path}${item.importedBy ? ` imported by ${item.importedBy}` : ""}.` });
    });
    circularImports.forEach((item) => {
      merged.diagnostics.push({ line: 1, message: `Circular import: ${item.chain.join(" -> ")}.` });
    });

    function appendImported(collection, nodes, sourceFile) {
      const existing = new Set(collection.map((node) => node.id));
      nodes.forEach((node) => {
        if (existing.has(node.id)) return;
        const copy = JSON.parse(JSON.stringify(node));
        copy.imported = true;
        copy.sourceFile = copy.sourceFile || sourceFile;
        collection.push(copy);
        existing.add(copy.id);
      });
    }

    Object.entries(parsedFiles).forEach(([file, ir]) => {
      if (file === activeFile) return;
      appendImported(merged.pipeline.blocks, ir.pipeline.blocks || [], file);
      appendImported(merged.pipeline.skills, ir.pipeline.skills || [], file);
      appendImported(merged.pipeline.tasks, ir.pipeline.tasks || [], file);
      appendImported(merged.pipeline.agents, ir.pipeline.agents || [], file);
    });

    return merged;
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
    parseAAPSProject,
    serializeAAPS,
    toMarkdown,
    buildExecutionPlan,
    buildAgentCompilePlan,
    createProjectManifest,
    normalizeProjectManifest,
    validateProjectManifest,
    projectFileIndex,
    projectStructureText,
    normalizeProjectFile,
    sample: samples.general,
    samples,
    sampleProject,
    slug,
  };
});
