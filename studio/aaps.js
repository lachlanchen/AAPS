(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AAPS = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

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

  function parseKeyValue(line) {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    if (!match) return null;
    return { key: match[1], value: unquote(match[2]) };
  }

  function parseList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function stripComment(line) {
    let quoted = false;
    let quote = "";
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];
      if ((char === '"' || char === "'") && line[index - 1] !== "\\") {
        if (!quoted) {
          quoted = true;
          quote = char;
        } else if (quote === char) {
          quoted = false;
          quote = "";
        }
      }
      if (!quoted && char === "#") return line.slice(0, index);
      if (!quoted && char === "/" && next === "/") return line.slice(0, index);
    }
    return line;
  }

  function parseAAPS(source) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const ir = {
      version: "aaps_ir/0.1",
      pipeline: {
        name: "Untitled Pipeline",
        subtitle: "Prompt Is All You Need",
        goal: "",
        inputs: {},
        agents: [],
        tasks: [],
      },
      diagnostics: [],
    };

    const stack = [];
    let blockPrompt = null;

    function current(kind) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (!kind || stack[index].kind === kind) return stack[index].node;
      }
      return null;
    }

    function addDiagnostic(line, message) {
      ir.diagnostics.push({ line, message });
    }

    lines.forEach((rawLine, index) => {
      const lineNumber = index + 1;
      if (blockPrompt) {
        const end = rawLine.indexOf('"""');
        if (end >= 0) {
          blockPrompt.target.prompt = blockPrompt.parts
            .concat(rawLine.slice(0, end))
            .join("\n")
            .trim();
          blockPrompt = null;
        } else {
          blockPrompt.parts.push(rawLine);
        }
        return;
      }

      const line = stripComment(rawLine).trim();
      if (!line) return;

      if (line === "}") {
        if (!stack.length) addDiagnostic(lineNumber, "Unmatched closing brace.");
        else stack.pop();
        return;
      }

      let match = line.match(/^pipeline\s+(.+?)\s*\{$/i);
      if (match) {
        ir.pipeline.name = unquote(match[1]);
        stack.push({ kind: "pipeline", node: ir.pipeline });
        return;
      }

      match = line.match(/^agent\s+([A-Za-z_][\w.-]*)\s*\{$/i);
      if (match) {
        const agent = { id: match[1], role: "", model: "", tools: [] };
        ir.pipeline.agents.push(agent);
        stack.push({ kind: "agent", node: agent });
        return;
      }

      match = line.match(/^task\s+([A-Za-z_][\w.-]*)(?:\s+after\s+(.+?))?\s*\{$/i);
      if (match) {
        const task = {
          id: match[1],
          after: match[2] ? parseList(match[2]) : [],
          agent: "",
          prompt: "",
          run: [],
          verify: [],
          outputs: [],
          retries: 0,
          timeout: "",
        };
        ir.pipeline.tasks.push(task);
        stack.push({ kind: "task", node: task });
        return;
      }

      const scope = stack[stack.length - 1];
      const task = current("task");
      const agent = current("agent");

      match = line.match(/^prompt\s+"""(.*)$/i);
      if (match) {
        const target = task || agent || ir.pipeline;
        const end = match[1].indexOf('"""');
        if (end >= 0) {
          target.prompt = match[1].slice(0, end).trim();
        } else {
          blockPrompt = { target, parts: [match[1]] };
        }
        return;
      }

      match = line.match(/^prompt\s+(.+)$/i);
      if (match) {
        (task || agent || ir.pipeline).prompt = unquote(match[1]);
        return;
      }

      match = line.match(/^goal\s+(.+)$/i);
      if (match) {
        ir.pipeline.goal = unquote(match[1]);
        return;
      }

      match = line.match(/^subtitle\s+(.+)$/i);
      if (match) {
        ir.pipeline.subtitle = unquote(match[1]);
        return;
      }

      match = line.match(/^input\s+(.+)$/i);
      if (match) {
        const kv = parseKeyValue(match[1]);
        if (kv) ir.pipeline.inputs[kv.key] = kv.value;
        else addDiagnostic(lineNumber, "Input must use input name = value.");
        return;
      }

      if (agent) {
        match = line.match(/^role\s+(.+)$/i);
        if (match) {
          agent.role = unquote(match[1]);
          return;
        }
        match = line.match(/^model\s+(.+)$/i);
        if (match) {
          agent.model = unquote(match[1]);
          return;
        }
        match = line.match(/^tools\s+(.+)$/i);
        if (match) {
          agent.tools = parseList(unquote(match[1]));
          return;
        }
      }

      if (task) {
        match = line.match(/^uses\s+([A-Za-z_][\w.-]*)$/i);
        if (match) {
          task.agent = match[1];
          return;
        }
        match = line.match(/^run\s+(.+)$/i);
        if (match) {
          task.run.push(unquote(match[1]));
          return;
        }
        match = line.match(/^verify\s+(.+)$/i);
        if (match) {
          task.verify.push(unquote(match[1]));
          return;
        }
        match = line.match(/^output\s+(.+)$/i);
        if (match) {
          task.outputs.push(unquote(match[1]));
          return;
        }
        match = line.match(/^retry\s+(\d+)$/i);
        if (match) {
          task.retries = Number(match[1]);
          return;
        }
        match = line.match(/^timeout\s+(.+)$/i);
        if (match) {
          task.timeout = unquote(match[1]);
          return;
        }
      }

      addDiagnostic(
        lineNumber,
        scope ? `Unknown statement in ${scope.kind}: ${line}` : `Unknown statement: ${line}`
      );
    });

    if (blockPrompt) {
      addDiagnostic(lines.length, "Unclosed triple-quoted prompt block.");
    }
    if (stack.length) {
      addDiagnostic(lines.length, `Unclosed block: ${stack[stack.length - 1].kind}.`);
    }
    return ir;
  }

  function toMarkdown(ir) {
    const pipeline = ir.pipeline || {};
    const lines = [
      `# ${pipeline.name || "Untitled Pipeline"}`,
      "",
      `_${pipeline.subtitle || "Prompt Is All You Need"}_`,
      "",
    ];
    if (pipeline.goal) {
      lines.push(`## Goal`, "", pipeline.goal, "");
    }
    if (pipeline.agents && pipeline.agents.length) {
      lines.push("## Agents", "");
      pipeline.agents.forEach((agent) => {
        lines.push(`- **${agent.id}**: ${agent.role || "general agent"}`);
        if (agent.model) lines.push(`  - Model: \`${agent.model}\``);
        if (agent.tools && agent.tools.length) lines.push(`  - Tools: ${agent.tools.join(", ")}`);
      });
      lines.push("");
    }
    lines.push("## Tasks", "");
    (pipeline.tasks || []).forEach((task, index) => {
      lines.push(`${index + 1}. **${task.id}**`);
      if (task.after && task.after.length) lines.push(`   - After: ${task.after.join(", ")}`);
      if (task.agent) lines.push(`   - Agent: ${task.agent}`);
      if (task.prompt) lines.push(`   - Prompt: ${task.prompt.replace(/\n/g, " ")}`);
      (task.run || []).forEach((command) => lines.push(`   - Run: \`${command}\``));
      (task.verify || []).forEach((check) => lines.push(`   - Verify: ${check}`));
    });
    return lines.join("\n");
  }

  function serializeAAPS(ir) {
    const pipeline = ir.pipeline || {};
    const lines = [`pipeline "${pipeline.name || "Untitled Pipeline"}" {`];
    if (pipeline.subtitle) lines.push(`  subtitle "${pipeline.subtitle}"`);
    if (pipeline.goal) lines.push(`  goal "${pipeline.goal}"`);
    Object.entries(pipeline.inputs || {}).forEach(([key, value]) => {
      lines.push(`  input ${key} = "${value}"`);
    });
    (pipeline.agents || []).forEach((agent) => {
      lines.push("", `  agent ${agent.id} {`);
      if (agent.role) lines.push(`    role "${agent.role}"`);
      if (agent.model) lines.push(`    model "${agent.model}"`);
      if (agent.tools && agent.tools.length) lines.push(`    tools "${agent.tools.join(", ")}"`);
      lines.push("  }");
    });
    (pipeline.tasks || []).forEach((task) => {
      const after = task.after && task.after.length ? ` after ${task.after.join(", ")}` : "";
      lines.push("", `  task ${task.id}${after} {`);
      if (task.agent) lines.push(`    uses ${task.agent}`);
      if (task.prompt) {
        lines.push('    prompt """');
        lines.push(
          ...String(task.prompt)
            .split("\n")
            .map((part) => `    ${part}`)
        );
        lines.push('    """');
      }
      (task.run || []).forEach((command) => lines.push(`    run "${command}"`));
      (task.verify || []).forEach((check) => lines.push(`    verify "${check}"`));
      (task.outputs || []).forEach((output) => lines.push(`    output "${output}"`));
      if (task.retries) lines.push(`    retry ${task.retries}`);
      if (task.timeout) lines.push(`    timeout "${task.timeout}"`);
      lines.push("  }");
    });
    lines.push("}");
    return lines.join("\n");
  }

  const sample = `pipeline "Ship AAPS Studio" {
  subtitle "Prompt Is All You Need"
  goal "Design, build, verify, and publish a clean web app for an autonomous agent project."
  input repo = "./"

  agent builder {
    role "Senior product engineer who turns prompts into durable implementation steps."
    model "gpt-5"
    tools "shell, git, browser"
  }

  task discover {
    uses builder
    prompt """
Read the repository, identify constraints, and produce a concise implementation plan.
"""
    output "docs/plan.md"
  }

  task implement after discover {
    uses builder
    prompt "Create the product surface, language examples, and tests."
    run "npm test"
    verify "All tests pass and the website renders."
    retry 1
  }

  task publish after implement {
    uses builder
    prompt "Commit, push, and deploy the website."
    run "git status --short"
    verify "GitHub Pages is configured for aaps.lazying.art."
  }
}`;

  return { parseAAPS, serializeAAPS, toMarkdown, sample };
});

