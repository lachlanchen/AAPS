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
  function quoteAaps(value) {
    return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  const BLOCK_DESIGN_PRINCIPLES = [
    "Respect AAPS grammar first: use pipeline, agent, block, skill, task, stage, method, action, guard, choose, if, else, for_each, typed input/output, exec, validate, retry, fallback, repair, recover, review, and artifact declarations.",
    "Treat every reusable block as a contract: purpose, typed inputs, typed outputs, parameters, environment, tools, agents, scripts, executable actions, validations, recovery policy, artifacts, and review expectations.",
    "Keep prompt context redundant on purpose: include domain assumptions, data shape, quality criteria, method choices, expected files, failure modes, and what evidence proves success.",
    "Make blocks small enough to test independently, but not so small that the workflow becomes unreadable.",
    "Prefer deterministic scripts/tools for repeatable work and explicit agent blocks for interpretation, repair, method choice, or irregular data.",
    "Represent routing in AAPS structure, not prose: use choose, if/else, for_each, fallback, recover, and review nodes where the decision matters.",
    "When agents hand work to other agents or image generators, pass a structured handoff packet with source images/artifacts, QC findings, upstream conclusions, failure reason, high-quality prompt, expected output schema, verification criteria, and an integration manifest for returned artifacts.",
    "When parser or manifest diagnostics exist, feed the exact line/message evidence back into the agent and keep repairing until the same parser validates the final `.aaps` file or a precise blocker is recorded.",
    "Compile missing implementation beneath the block contract. Do not weaken required inputs, outputs, GPU/tool/agent requirements, or validations just to pass readiness.",
    "Every block that writes artifacts should also declare how those artifacts are validated and where a human or agent can inspect them.",
  ];
  const AGENT_HANDOFF_PRINCIPLES = [
    "Adjacent agent blocks must exchange durable artifacts, not only chat memory: write a handoff packet before invoking the next agent.",
    "Image-aware handoff packets should include source image paths, crops or previews, upstream visual observations, candidate masks/overlays, QC defects, and the exact downstream prompt.",
    "The downstream agent or image generator must return declared artifacts plus an integration manifest that maps generated files back into the main AAPS outputs.",
    "A verifier agent should consume the source evidence, downstream artifacts, and integration manifest before the workflow accepts regenerated or refined results.",
    "If the verifier rejects the generated result, feed its concrete visual defects and artifact checks back into the downstream prompt and regenerate until accepted, retried to the declared limit, or blocked.",
    "If the downstream agent is unavailable, record a truthful prompt-only or blocked handoff status instead of claiming a regenerated output.",
    "Parser feedback is part of the agent loop: unresolved syntax or manifest errors must be copied into the next agent instruction and cleared before the task is marked complete.",
  ];
  const AGENT_HANDOFF_PACKET_SCHEMA = {
    version: "aaps_agent_handoff/0.1",
    upstreamAgent: "agent name or block id",
    downstreamAgent: "agent name or block id",
    taskGoal: "human-readable goal",
    sourceArtifacts: ["project-relative file or folder paths"],
    sourceImages: ["project-relative image paths, crops, overlays, previews"],
    upstreamConclusion: {
      summary: "what the upstream agent observed",
      qualityDecision: "accepted | needs_refinement | blocked | not_needed",
      failureReason: "why handoff is needed, if any",
    },
    downstreamPromptPath: "artifacts/agent_handoffs/prompt.md",
    expectedOutputSchema: {
      generatedArtifacts: ["paths or path templates"],
      integrationManifest: "json path",
      verifierReport: "json path",
    },
    verificationRubric: ["criteria the verifier must check"],
    integrationPolicy: "how accepted generated artifacts replace or augment pipeline outputs",
    retryPolicy: {
      maxAttempts: 2,
      feedbackSource: "verifier report path",
      stopCondition: "accepted | blocked | max_attempts_reached",
    },
  };
  const REPORT_RECAP_PRINCIPLES = [
    "A report block is an execution recap, not a loose conclusion: it should reconstruct the task from input goal through intermediate decisions to final artifacts.",
    "Report inputs should include source artifacts, method comparison outputs, QC/agent decisions, run manifests, logs, validation summaries, handoff packets, and final artifact indexes.",
    "Report prompts should require evidence-backed statements: cite paths, run IDs, checkpoint IDs, selected methods, rejected methods, fallbacks, and remaining limitations.",
    "For agentic workflows, the report should document the agent chain: who inspected, what evidence they used, what they handed off, what schema was expected, who verified, and what was accepted.",
    "If an external agent or image generator was not actually called, record a prepared handoff/template truthfully instead of claiming generated results.",
    "Publication-oriented reports should write durable TeX/PDF or Markdown/HTML plus an artifact index that Studio can open and future runs can compare.",
  ];
  const REPORT_RECAP_PROMPT = [
    "Write a complete AAPS execution recap from evidence, not memory.",
    "Include the original user goal, input files, project/workflow identity, parse/manifest/check/run status, method candidates, QC metrics, agent decisions, handoff packets, final outputs, validation results, logs, checkpoints, and limitations.",
    "Compare deterministic methods, model/agent methods, and fallbacks with figure/table references.",
    "For each agent handoff, record source artifacts, observed defects, failure reason, high-quality downstream prompt, expected output schema, verification rubric, and final verifier decision.",
    "Do not claim an agent generated an artifact unless a run log and declared output prove it.",
  ].join(" ");
  const BLOCK_ARCHETYPES = [
    {
      id: "intent_context",
      title: "Intent and Context Block",
      purpose: "Turn a user goal, experiment design, manuscript intent, or app objective into an auditable brief.",
      useWhen: "Start a project or convert natural language into a structured AAPS plan.",
      contract: ["input user_goal:text", "output brief:markdown", "output context_pack:json", "review human approval before large compile"],
      snippet: [
        "block define_goal {",
        "  input user_goal: text required",
        "  output brief: markdown = \"reports/brief.md\"",
        "  output context_pack: json = \"reports/context_pack.json\"",
        "  prompt \"Clarify scope, assumptions, outputs, tools, agents, risks, and acceptance criteria.\"",
        "  validate nonempty \"${output.brief}\"",
        "  validate json \"${output.context_pack}\"",
        "  review \"Human approves the brief before compile/apply.\"",
        "}",
      ].join("\n"),
    },
    {
      id: "input_discovery",
      title: "Input Discovery and Data Curation Block",
      purpose: "Find files, infer metadata, normalize paths, and write a manifest before analysis.",
      useWhen: "A workflow depends on folders, irregular metadata, images, documents, source files, chapters, or app pages.",
      contract: ["input data_root:folder", "output manifest:json", "output table:csv", "validate manifest and row count"],
      snippet: [
        "block discover_inputs {",
        "  input data_root: folder required = \"data\"",
        "  output manifest: json = \"artifacts/input_manifest.json\"",
        "  output file_table: csv = \"artifacts/input_table.csv\"",
        "  exec python_script \"scripts/discover_inputs.py\"",
        "  arg data_root = \"${input.data_root}\"",
        "  arg output_manifest = \"${output.manifest}\"",
        "  validate json \"${output.manifest}\"",
        "  validate nonempty \"${output.file_table}\"",
        "}",
      ].join("\n"),
    },
    {
      id: "qc_guard",
      title: "Quality Control Guard Block",
      purpose: "Measure whether text, image, code, data, or document input is usable before expensive work.",
      useWhen: "Inputs can be blurry, corrupt, incomplete, inconsistent, too large, unsafe, or low confidence.",
      contract: ["input artifact", "output qc_report:json", "output preview:image|markdown", "if/else route on QC metrics"],
      snippet: [
        "block qc_input {",
        "  input item_path: file required",
        "  output qc_report: json = \"artifacts/qc/report.json\"",
        "  output preview: image = \"artifacts/qc/preview.png\"",
        "  exec python_script \"scripts/qc_input.py\"",
        "  validate json \"${output.qc_report}\"",
        "  if \"qc_report.usable == false\" {",
        "    review \"Human or agent decides whether to repair, skip, or reroute.\"",
        "  }",
        "}",
      ].join("\n"),
    },
    {
      id: "method_router",
      title: "Method, Tool, and Agent Router Block",
      purpose: "Choose between deterministic methods, external tools, models, and agents with inspectable criteria.",
      useWhen: "A task may use Cellpose vs thresholding, static tests vs browser tests, outline vs rewrite, or Codex vs AgInTi.",
      contract: ["input qc_report", "output chosen_method:json", "requires_tools/agents", "fallback and recover policy"],
      snippet: [
        "block choose_method {",
        "  input qc_report: json required",
        "  output route: json = \"artifacts/route.json\"",
        "  choose segmentation_method {",
        "    method cellpose { tool \"cellpose\" }",
        "    method threshold { tool \"scikit_image\" }",
        "    method aginti_refine { agent \"aginti_image_agent\" }",
        "  }",
        "  fallback \"threshold\"",
        "  validate json \"${output.route}\"",
        "}",
      ].join("\n"),
    },
    {
      id: "loop_batch",
      title: "Loop or Batch Block",
      purpose: "Make iteration explicit over images, files, samples, app pages, chapters, dates, or stages.",
      useWhen: "A workflow must process many similar items and preserve per-item artifacts/logs.",
      contract: ["input manifest:json", "for_each item", "per-item outputs", "summary output"],
      snippet: [
        "task process_batch {",
        "  input manifest: json required = \"artifacts/input_manifest.json\"",
        "  for_each item in \"${input.manifest}\" {",
        "    call qc_input",
        "    call choose_method",
        "    call run_method",
        "  }",
        "  output summary: json = \"artifacts/batch_summary.json\"",
        "}",
      ].join("\n"),
    },
    {
      id: "code_action",
      title: "Code or Script Action Block",
      purpose: "Run project-local Python, shell, Node, or inline code with explicit arguments and outputs.",
      useWhen: "A deterministic implementation can create or transform artifacts.",
      contract: ["environment", "requires_commands/files/packages", "exec type", "args", "logs", "validations"],
      snippet: [
        "block run_script {",
        "  input source: file required",
        "  output result: json = \"artifacts/result.json\"",
        "  environment python = \".venv/bin/python\"",
        "  requires_commands \"python3\"",
        "  requires_files \"scripts/run_script.py\"",
        "  exec python_script \"scripts/run_script.py\"",
        "  arg source = \"${input.source}\"",
        "  arg output = \"${output.result}\"",
        "  validate json \"${output.result}\"",
        "}",
      ].join("\n"),
    },
    {
      id: "agent_action",
      title: "Agent Action Block",
      purpose: "Call or prepare a backend agent for interpretation, code repair, mask refinement, writing, or irregular metadata.",
      useWhen: "The task needs judgment, generation, repair, or multimodal reasoning beyond deterministic scripts.",
      contract: ["agent declaration", "prompt contract", "input evidence", "output decision/report", "truthful handoff if unavailable"],
      snippet: [
        "agent codex_repair_agent {",
        "  role \"Repair generated project-local code under the AAPS contract.\"",
        "  model \"gpt-5.5\"",
        "}",
        "block agent_review {",
        "  uses codex_repair_agent",
        "  input evidence: folder required = \"artifacts\"",
        "  output decision: json = \"artifacts/agent_decision.json\"",
        "  prompt \"Inspect evidence, name failures, and propose the smallest safe repair.\"",
        "  validate json \"${output.decision}\"",
        "}",
      ].join("\n"),
    },
    {
      id: "agent_handoff_chain",
      title: "Agent Handoff Chain Block",
      purpose: "Transfer a difficult task between agents without losing evidence, prompts, decisions, or expected output structure.",
      useWhen: "A QC agent should escalate to Codex, AgInTiFlow, an image-generation agent, a vision model, or a verifier agent.",
      contract: ["input source_images", "input evidence folder", "input qc decision json", "input upstream conclusion", "output handoff_packet:json", "output downstream_prompt:markdown", "output generated_artifacts:folder", "output integration_manifest:json", "output verifier_report:json"],
      snippet: [
        "agent qc_agent {",
        "  role \"Inspect artifacts and images, then decide whether deterministic output is good enough.\"",
        "  model \"gpt-5.5\"",
        "}",
        "agent refinement_agent {",
        "  role \"Generate or refine output from a structured image-aware handoff packet.\"",
        "  model \"aginti-image\"",
        "}",
        "agent verifier_agent {",
        "  role \"Verify downstream generated artifacts against source images and the handoff rubric before integration.\"",
        "  model \"gpt-5.5\"",
        "}",
        "block agent_handoff_chain {",
        "  uses qc_agent",
        "  input source_images: folder required = \"artifacts/source_images\"",
        "  input evidence_dir: folder required = \"artifacts\"",
        "  input qc_decision: json required = \"artifacts/qc_decision.json\"",
        "  input upstream_conclusion: json = \"artifacts/upstream_conclusion.json\"",
        "  output handoff_packet: json = \"artifacts/agent_handoff.json\"",
        "  output downstream_prompt: markdown = \"artifacts/agent_prompt.md\"",
        "  output generated_artifacts: folder = \"artifacts/generated_refinement\"",
        "  output integration_manifest: json = \"artifacts/integration_manifest.json\"",
        "  output verifier_report: json = \"artifacts/verifier_report.json\"",
        "  prompt \"Build a complete image-aware handoff packet: task goal, source image paths or crops, upstream visual conclusions, observed defects, method history, exact image-generation/refinement prompt, expected artifact schema, integration policy, safety constraints, and verification rubric.\"",
        "  retry 2",
        "  recover \"If verifier rejects the generated artifact, append verifier defects to the next downstream prompt and regenerate until accepted or retry limit is reached.\"",
        "  validate json \"${output.handoff_packet}\"",
        "  validate nonempty \"${output.downstream_prompt}\"",
        "  validate json \"${output.integration_manifest}\"",
        "  validate json \"${output.verifier_report}\"",
        "  if \"refinement_agent_unavailable\" {",
        "    output handoff_status: json = \"artifacts/refinement_handoff_status.json\"",
        "    recover \"Record prompt-only handoff truthfully and ask for agent availability.\"",
        "  }",
        "}",
      ].join("\n"),
    },
    {
      id: "validation_recovery",
      title: "Validation and Recovery Block",
      purpose: "Prove outputs exist and are meaningful, then retry, fallback, repair, skip, or ask for review.",
      useWhen: "A workflow can fail partially or produce plausible but bad artifacts.",
      contract: ["validate exists/nonempty/json", "retry", "fallback", "repair true", "recover message", "review checkpoint"],
      snippet: [
        "block validate_outputs {",
        "  input artifact_dir: folder required = \"artifacts\"",
        "  validate exists \"${input.artifact_dir}\"",
        "  validate nonempty \"artifacts/report.md\"",
        "  retry 1",
        "  fallback \"simpler_method\"",
        "  repair true",
        "  recover \"Prepare a Codex xhigh repair prompt with logs, inputs, outputs, and validations.\"",
        "}",
      ].join("\n"),
    },
    {
      id: "report_artifact",
      title: "Report Recap and Artifact Block",
      purpose: "Reconstruct the whole run from inputs, intermediate decisions, logs, agent handoffs, validations, and final outputs.",
      useWhen: "A user needs a PDF/TeX/Markdown/HTML report, artifact index, publication-ready summary, or debug recap.",
      contract: ["input source artifacts", "input method comparisons", "input agent decisions", "input run logs", "output report", "output artifact_index:json", "validate nonempty"],
      snippet: [
        "block build_report {",
        "  input artifact_root: folder required = \"artifacts\"",
        "  input run_log: file = \"runs/latest/run.json\"",
        "  input agent_decisions: json = \"artifacts/agent_decisions.json\"",
        "  input handoff_packets: folder = \"artifacts/agent_handoffs\"",
        "  output report_tex: tex = \"publications/report.tex\"",
        "  output report_pdf: pdf = \"publications/report.pdf\"",
        "  output artifact_index: json = \"publications/artifacts.json\"",
        "  compile_agent \"codex_report_agent\"",
        `  compile_prompt ${quoteAaps(REPORT_RECAP_PROMPT)}`,
        "  exec python_script \"scripts/build_report.py\"",
        "  arg artifact_root = \"${input.artifact_root}\"",
        "  arg run_log = \"${input.run_log}\"",
        "  arg agent_decisions = \"${input.agent_decisions}\"",
        "  arg handoff_packets = \"${input.handoff_packets}\"",
        "  validate nonempty \"${output.report_tex}\"",
        "  validate nonempty \"${output.report_pdf}\"",
        "  validate json \"${output.artifact_index}\"",
        "}",
      ].join("\n"),
    },
  ];

  function blockDesignGuideMarkdown(options = {}) {
    const compact = Boolean(options.compact);
    const lines = [
      "# AAPS Block Design Guide",
      "",
      "AAPS blocks are reusable contracts around prompts, tools, code, agents, validation, recovery, and artifacts. They are not free-form prompt notes.",
      "",
      "## Design Principles",
      ...BLOCK_DESIGN_PRINCIPLES.map((item, index) => `${index + 1}. ${item}`),
      "",
      "## Default Block Archetypes",
    ];
    BLOCK_ARCHETYPES.forEach((item) => {
      lines.push("", `### ${item.title}`, `- id: ${item.id}`, `- purpose: ${item.purpose}`, `- use when: ${item.useWhen}`, `- contract: ${item.contract.join("; ")}`);
      if (!compact) lines.push("", "```aaps", item.snippet, "```");
    });
    lines.push("", "Custom blocks are allowed, but they should still state their contract, evidence, and recovery behavior.");
    return lines.join("\n");
  }

  function reportParadigmMarkdown() {
    return [
      "# AAPS Report Recap Paradigm",
      "",
      "AAPS reports should be generated from the project evidence stream: source inputs, parsed workflow, manifest/compile reports, execution logs, QC decisions, agent handoffs, validation summaries, and final artifacts.",
      "",
      "## Principles",
      ...REPORT_RECAP_PRINCIPLES.map((item, index) => `${index + 1}. ${item}`),
      "",
      "## Default Agent Prompt",
      "",
      REPORT_RECAP_PROMPT,
      "",
      "## Minimal Contract",
      "",
      "A serious report block should declare inputs for source data, run logs, method comparisons, agent decisions, and handoff packets; outputs for TeX/PDF or Markdown/HTML; an artifact index; and validations for every durable report output.",
    ].join("\n");
  }

  function parserFeedbackMarkdown(diagnostics = [], options = {}) {
    const file = options.file || options.sourceFile || "";
    const prefix = file ? ` for ${file}` : "";
    if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
      return `# AAPS Parser Feedback${prefix}\n\nNo parser diagnostics were reported.`;
    }
    const lines = [
      `# AAPS Parser Feedback${prefix}`,
      "",
      "The agent must repair the `.aaps` source and rerun the same parser before claiming completion.",
      "",
      "## Diagnostics",
    ];
    diagnostics.forEach((item, index) => {
      const line = item && item.line ? `line ${item.line}` : "line unknown";
      const column = item && item.column ? `, column ${item.column}` : "";
      const message = item && item.message ? item.message : String(item || "unknown parser diagnostic");
      lines.push(`${index + 1}. ${line}${column}: ${message}`);
    });
    lines.push("", "## Required Agent Loop", "", "1. Quote the failing diagnostic in the next repair step.", "2. Edit the smallest `.aaps` region that fixes the grammar or manifest issue.", "3. Rerun `aaps parse`, `aaps validate`, and `aaps manifest --mode check` for the same file.", "4. Finish only when diagnostics are empty, or record the precise blocker and affected file.");
    return lines.join("\n");
  }

  function agentHandoffGuideMarkdown() {
    return [
      "# AAPS Agent Handoff Guide",
      "",
      "AAPS treats adjacent agent blocks as typed workflow edges. Codex, AgInTiFlow, image-generation agents, and verifier agents should exchange project artifacts through a durable packet so conclusions, prompts, generated files, and integration decisions survive beyond chat memory.",
      "",
      "## Principles",
      ...AGENT_HANDOFF_PRINCIPLES.map((item, index) => `${index + 1}. ${item}`),
      "",
      "## Packet Schema",
      "",
      "```json",
      JSON.stringify(AGENT_HANDOFF_PACKET_SCHEMA, null, 2),
      "```",
      "",
      "## Parse Feedback Gate",
      "",
      "A backend agent may generate or edit `.aaps`, but completion is gated by the deterministic parser. Feed parser diagnostics back into the repair prompt and rerun the parser until the final source is parse-clean.",
    ].join("\n");
  }

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
    return `"${String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/"/g, '\\"')}"`;
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
      requiredGpu: [],
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
        gpu: [],
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
      gpu: "requiredGpu",
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

      match = line.match(/^execution_mode\s+(.+)$/i);
      if (match && target !== ir.pipeline) {
        target.executionMode = unquote(match[1]);
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

      match = line.match(/^(requires_tools|requires_models|requires_agents|requires_commands|requires_files|requires_python_packages|requires_node_packages|requires_gpu)\s+(.+)$/i);
      if (match) {
        const map = {
          requires_tools: "tools",
          requires_models: "models",
          requires_agents: "agents",
          requires_commands: "commands",
          requires_files: "files",
          requires_python_packages: "pythonPackages",
          requires_node_packages: "nodePackages",
          requires_gpu: "gpu",
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
    if (requirements.gpu && requirements.gpu.length) lines.push(`${childIndent}requires_gpu ${quote(requirements.gpu.join(", "))}`);
    const environment = node.environment || {};
    if (environment.python) lines.push(`${childIndent}environment python = ${quote(environment.python)}`);
    if (environment.requirements && environment.requirements.length) lines.push(`${childIndent}environment requirements = ${quote(environment.requirements.join(", "))}`);
    if (environment.commands && environment.commands.length) lines.push(`${childIndent}environment commands = ${quote(environment.commands.join(", "))}`);
    if (environment.nodePackages && environment.nodePackages.length) lines.push(`${childIndent}environment node_packages = ${quote(environment.nodePackages.join(", "))}`);
    if (environment.files && environment.files.length) lines.push(`${childIndent}environment files = ${quote(environment.files.join(", "))}`);
    (environment.setup || []).forEach((command) => lines.push(`${childIndent}environment setup = ${quote(command)}`));
    Object.entries(environment.env || {}).forEach(([key, value]) => lines.push(`${childIndent}env ${key} = ${quote(value)}`));
    if (node.executionMode) lines.push(`${childIndent}execution_mode ${quote(node.executionMode)}`);
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
    if (pipeline.requiredGpu && pipeline.requiredGpu.length) lines.push(`  requires_gpu ${quote(pipeline.requiredGpu.join(", "))}`);
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
    (pipeline.notes || []).forEach((note) => lines.push(`  note ${quote(note)}`));
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
      gpu: uniqueList([...(local.gpu || [])]),
      pipelineTools: uniqueList(pipeline.requiredTools || []),
      pipelineModels: uniqueList(pipeline.requiredModels || []),
      pipelineAgents: uniqueList(pipeline.requiredAgents || []),
      pipelineGpu: uniqueList(pipeline.requiredGpu || []),
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
        parameters: node.params || {},
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
        gpu: pipeline.requiredGpu || [],
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
        gpu: [],
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

    PROJECT_FILE_CATEGORIES.forEach((category) => {
      const files = project.files[category] || [];
      files.forEach((file) => {
        if (!relativeProjectPath(file)) issue("error", `files.${category}`, `Project file path must be project-relative: ${file}`);
        if (category !== "references" && !file.endsWith(".aaps")) {
          issue("error", `files.${category}`, `Project source file must end with .aaps: ${file}`);
        }
        if (known.size && category !== "references" && !known.has(file)) {
          issue("warning", `files.${category}`, `Manifest lists a file that was not found: ${file}`);
        }
      });
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

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function allPipelineNodes(pipeline) {
    const nodes = [];
    function walk(node) {
      nodes.push(node);
      (node.children || []).forEach(walk);
    }
    [...(pipeline.agents || []), ...(pipeline.blocks || []), ...(pipeline.skills || []), ...(pipeline.tasks || [])].forEach(walk);
    return nodes;
  }

  function programPlanningIntent(message) {
    const text = String(message || "").toLowerCase();
    if (!text.trim()) return false;
    if (/^(explain|summarize|summarise|show|what is|what are|list)\b/.test(text) && !/\b(create|add|edit|update|optimi[sz]e|build|implement|finish|analy[sz]e|pipeline|workflow|program)\b/.test(text)) {
      return false;
    }
    return /\b(program|pipeline|workflow|experiment|analysis|analy[sz]e|create|build|design|implement|finish|complete|update|edit|optimi[sz]e|refine|loop|batch|segmentation|segment|quantification|quantify|visuali[sz]e|report|app80|app65|app81|deo|microscopy|biology|write|writing|novel|book|story|chapter|manuscript|outline|character|scene|draft|revise|revision|latex|paper)\b/.test(text);
  }

  function promptStudy(message) {
    const text = String(message || "").toLowerCase();
    if (/\bapp80\b/.test(text) || /y[- ]?27632|fusion/.test(text)) return "app80";
    if (/\bapp65\b/.test(text) || /alginate/.test(text)) return "app65";
    if (/\bapp81\b/.test(text) || /density/.test(text)) return "app81";
    return "";
  }

  function promptDomain(message, pipeline) {
    const text = String(message || "").toLowerCase();
    if (promptStudy(text) || /\b(deo|microscopy|image|segmentation|segment|mask|quantification|quantify|cell|organoid|biology)\b/.test(text)) return "biology";
    if (/\b(article|paper|latex|novel|book|story|manuscript|writing)\b/.test(text)) return "writing";
    return pipeline.domain || "general";
  }

  function dataRootForStudy(study) {
    if (study === "app80") return "data/App80 DEO";
    if (study === "app65") return "data/App65 DEO+Alginate";
    if (study === "app81") return "data/DEO App81 P8";
    return "data";
  }

  function confirmationIntent(message) {
    return /\b(new\s+(aaps|workflow|program|project|pipeline)|override|replace|switch\s+domain|convert\s+this|start\s+over)\b/i.test(String(message || ""));
  }

  function existingDomain(pipeline) {
    const domain = String(pipeline.domain || "").trim().toLowerCase();
    if (domain && !["general", "software", "appdev"].includes(domain)) return domain;
    const text = [
      pipeline.goal || "",
      (pipeline.tags || []).join(" "),
      ...(pipeline.blocks || []).map((node) => `${node.id} ${node.title || ""} ${node.prompt || ""}`),
      ...(pipeline.tasks || []).map((node) => `${node.id} ${node.title || ""} ${node.prompt || ""}`),
    ].join(" ").toLowerCase();
    if (/\b(app80|app65|app81|deo|microscopy|segmentation|quantification|cell|organoid|biology)\b/.test(text)) return "biology";
    if (/\b(novel|book|story|chapter|manuscript|outline|character|scene|draft|revision|writing)\b/.test(text)) return "writing";
    return "";
  }

  function ensureRootNode(collection, node) {
    const statusNote = "Status: needs implementation before production execution.";
    if (node.kind === "block" && node.compile && node.compile.prompt) {
      node.notes = uniqueList([...(node.notes || []), statusNote]);
    }
    const existing = collection.find((item) => item.id === node.id && item.kind === node.kind);
    if (existing) {
      existing.title = existing.title || node.title;
      existing.prompt = existing.prompt || node.prompt;
      existing.compile = existing.compile && (existing.compile.agent || existing.compile.prompt) ? existing.compile : node.compile;
      existing.requirements = existing.requirements || node.requirements;
      existing.environment = existing.environment || node.environment;
      existing.inputs = existing.inputs && existing.inputs.length ? existing.inputs : node.inputs;
      existing.outputs = existing.outputs && existing.outputs.length ? existing.outputs : node.outputs;
      existing.artifacts = existing.artifacts && existing.artifacts.length ? existing.artifacts : node.artifacts;
      existing.validations = existing.validations && existing.validations.length ? existing.validations : node.validations;
      existing.verify = existing.verify && existing.verify.length ? existing.verify : node.verify;
      existing.recovery = existing.recovery && existing.recovery.length ? existing.recovery : node.recovery;
      existing.reviews = existing.reviews && existing.reviews.length ? existing.reviews : node.reviews;
      if (existing.kind === "block" && existing.compile && existing.compile.prompt) {
        existing.notes = uniqueList([...(existing.notes || []), statusNote]);
      }
      return existing;
    }
    collection.push(node);
    return node;
  }

  function programBlock(kind, prefix, study, dataRoot, message) {
    const commonRequirements = {
      tools: ["python"],
      models: [],
      agents: ["codex_repair_agent"],
      commands: ["python3"],
      files: [],
      pythonPackages: [],
      nodePackages: [],
      gpu: [],
    };
    const commonEnvironment = {
      python: "python3",
      requirements: [],
      commands: ["python3"],
      nodePackages: [],
      files: [],
      env: {},
      setup: ["python3 -m venv .venv", ".venv/bin/python -m pip install -r environments/requirements.txt"],
    };
    const studyLabel = study ? study.toUpperCase() : "project";
    if (kind === "discover") {
      return createNode("block", `${prefix}_discover_data`, {
        title: "Discover input data and experimental groups",
        requirements: commonRequirements,
        environment: commonEnvironment,
        compile: {
          agent: "codex_repair_agent",
          prompt: `Implement a deterministic project-local data discovery script for ${studyLabel}. It must scan ${dataRoot}, infer dates/conditions/replicates when present, write a preview manifest JSON and a CSV table, and fail truthfully when no images are found.`,
          onMissing: "prompt",
        },
        inputs: [{ name: "data_root", type: "folder", required: true, value: dataRoot, validation: "exists" }],
        outputs: [
          { name: "image_manifest", type: "json", value: `outputs/${prefix}/manifest/images.json`, validation: "json" },
          { name: "image_table", type: "csv", value: `outputs/${prefix}/manifest/images.csv`, validation: "nonempty" },
        ],
        artifacts: [
          { name: "image_manifest", type: "json", value: `outputs/${prefix}/manifest/images.json`, validation: "json" },
          { name: "image_table", type: "table", value: `outputs/${prefix}/manifest/images.csv`, validation: "nonempty" },
        ],
        exec: [{ type: "python_script", entry: `scripts/${prefix}_discover_data.py`, args: { data_root: dataRoot, output_dir: `outputs/${prefix}/manifest` } }],
        validations: [`validate exists outputs/${prefix}/manifest/images.json`, `validate nonempty outputs/${prefix}/manifest/images.csv`],
        verify: ["At least one real input image is listed unless a QC blocker is recorded."],
        recovery: ["If no images are found, ask the user to confirm the data root and file extensions before changing analysis logic."],
        prompt: `Analyze the user request and project files to discover the real ${studyLabel} data layout. Preserve biological labels, conditions, dates, replicates, and channel naming in a machine-readable manifest. User request: ${message}`,
      });
    }
    if (kind === "segment") {
      commonRequirements.pythonPackages = ["numpy", "tifffile", "pandas", "matplotlib", "pillow", "scikit-image"];
      return createNode("block", `${prefix}_segment_images`, {
        title: "Segment microscopy images with QC overlays",
        requirements: commonRequirements,
        environment: commonEnvironment,
        compile: {
          agent: "codex_repair_agent",
          prompt: `Implement ${studyLabel} segmentation with method routing. Prefer Cellpose if installed; otherwise use deterministic threshold/morphology fallback. The script must self-debug on a small preview and write masks, overlays, per-image metrics CSV/JSON, summary JSON/CSV, figures, logs, report.md, and run_manifest.json.`,
          onMissing: "prompt",
        },
        inputs: [
          { name: "image_manifest", type: "json", required: true, value: `outputs/${prefix}/manifest/images.json`, validation: "json" },
          { name: "preview_limit", type: "integer", value: "8" },
        ],
        outputs: [
          { name: "masks", type: "folder", value: `outputs/${prefix}/segmentation/masks`, validation: "nonempty" },
          { name: "overlays", type: "folder", value: `outputs/${prefix}/segmentation/overlays`, validation: "nonempty" },
          { name: "per_image_metrics", type: "csv", value: `outputs/${prefix}/segmentation/per_image_metrics.csv`, validation: "nonempty" },
          { name: "run_manifest", type: "json", value: `outputs/${prefix}/segmentation/run_manifest.json`, validation: "json" },
        ],
        artifacts: [
          { name: "masks", type: "image_directory", value: `outputs/${prefix}/segmentation/masks`, validation: "nonempty" },
          { name: "overlays", type: "image_directory", value: `outputs/${prefix}/segmentation/overlays`, validation: "nonempty" },
          { name: "per_image_metrics", type: "table", value: `outputs/${prefix}/segmentation/per_image_metrics.csv`, validation: "nonempty" },
          { name: "segmentation_report", type: "markdown", value: `outputs/${prefix}/segmentation/report.md`, validation: "nonempty" },
        ],
        exec: [{ type: "python_script", entry: `scripts/${prefix}_segment_images.py`, args: { manifest: `outputs/${prefix}/manifest/images.json`, output_dir: `outputs/${prefix}/segmentation`, preview_limit: "8" } }],
        validations: [
          `validate exists outputs/${prefix}/segmentation/run_manifest.json`,
          `validate nonempty outputs/${prefix}/segmentation/per_image_metrics.csv`,
          `validate nonempty outputs/${prefix}/segmentation/overlays`,
        ],
        verify: [
          "Metrics rows match processed image count.",
          "Masks and overlays are non-empty for valid preview images unless a QC blocker is recorded.",
          "Report states method, fallback reason, counts, warnings, and output paths.",
        ],
        recovery: ["If masks are empty or foreground is implausible, tune threshold/morphology parameters and rerun the preview before full batch."],
        reviews: ["Human QC must inspect representative overlays before accepting full-run segmentation."],
        prompt: `Create a reusable, testable segmentation block for ${studyLabel}. It must run on real data, expose preview parameters, and produce visible Studio artifacts.`,
      });
    }
    if (kind === "quantify") {
      return createNode("block", `${prefix}_quantify_metrics`, {
        title: "Quantify masks and group-level metrics",
        requirements: commonRequirements,
        environment: commonEnvironment,
        compile: {
          agent: "codex_repair_agent",
          prompt: `Implement quantification for ${studyLabel}. Read segmentation masks and per-image metrics, infer condition/date/replicate groups, write per-object/per-image/group summaries as CSV/JSON, and validate row counts against segmentation outputs.`,
          onMissing: "prompt",
        },
        inputs: [
          { name: "per_image_metrics", type: "csv", required: true, value: `outputs/${prefix}/segmentation/per_image_metrics.csv`, validation: "nonempty" },
          { name: "masks", type: "folder", required: true, value: `outputs/${prefix}/segmentation/masks`, validation: "nonempty" },
        ],
        outputs: [
          { name: "group_summary_csv", type: "csv", value: `outputs/${prefix}/quantification/group_summary.csv`, validation: "nonempty" },
          { name: "group_summary_json", type: "json", value: `outputs/${prefix}/quantification/group_summary.json`, validation: "json" },
        ],
        artifacts: [
          { name: "group_summary", type: "table", value: `outputs/${prefix}/quantification/group_summary.csv`, validation: "nonempty" },
          { name: "quantification_json", type: "json", value: `outputs/${prefix}/quantification/group_summary.json`, validation: "json" },
        ],
        exec: [{ type: "python_script", entry: `scripts/${prefix}_quantify_metrics.py`, args: { segmentation_dir: `outputs/${prefix}/segmentation`, output_dir: `outputs/${prefix}/quantification` } }],
        validations: [`validate nonempty outputs/${prefix}/quantification/group_summary.csv`, `validate json outputs/${prefix}/quantification/group_summary.json`],
        verify: ["Required metric columns are present.", "Group counts and per-image row counts match the processed image manifest."],
        prompt: `Quantify segmentation outputs for downstream biological interpretation. Preserve condition/date/replicate metadata and make summaries easy to inspect in Studio.`,
      });
    }
    return createNode("block", `${prefix}_visualize_report`, {
      title: "Visualize results and write report",
      requirements: commonRequirements,
      environment: commonEnvironment,
      compile: {
        agent: "codex_repair_agent",
        prompt: `Implement final visualization/report generation for ${studyLabel}. Produce figures, captions, report.md, and a JSON artifact index that Studio can preview.`,
        onMissing: "prompt",
      },
      inputs: [
        { name: "group_summary_csv", type: "csv", required: true, value: `outputs/${prefix}/quantification/group_summary.csv`, validation: "nonempty" },
        { name: "segmentation_report", type: "markdown", value: `outputs/${prefix}/segmentation/report.md`, validation: "nonempty" },
      ],
      outputs: [
        { name: "summary_figure", type: "image", value: `outputs/${prefix}/report/summary.png`, validation: "nonempty" },
        { name: "report", type: "markdown", value: `outputs/${prefix}/report/report.md`, validation: "nonempty" },
        { name: "artifact_index", type: "json", value: `outputs/${prefix}/report/artifacts.json`, validation: "json" },
      ],
      artifacts: [
        { name: "summary_figure", type: "image", value: `outputs/${prefix}/report/summary.png`, validation: "nonempty" },
        { name: "report", type: "markdown", value: `outputs/${prefix}/report/report.md`, validation: "nonempty" },
        { name: "artifact_index", type: "json", value: `outputs/${prefix}/report/artifacts.json`, validation: "json" },
      ],
      exec: [{ type: "python_script", entry: `scripts/${prefix}_visualize_report.py`, args: { metrics: `outputs/${prefix}/quantification/group_summary.csv`, output_dir: `outputs/${prefix}/report` } }],
      validations: [`validate nonempty outputs/${prefix}/report/report.md`, `validate json outputs/${prefix}/report/artifacts.json`],
      verify: ["Figures have captions and nonzero file size.", "Report includes methods, warnings, counts, and output paths."],
      prompt: `Create user-facing figures and a concise scientific report from the verified ${studyLabel} outputs.`,
    });
  }

  function writingProgramBlock(kind, prefix, message) {
    const writerAgent = "dedicated_writing_agent";
    const requirements = {
      tools: ["llm_writer", "markdown"],
      models: [],
      agents: [writerAgent],
      commands: [],
      files: [],
      pythonPackages: [],
      nodePackages: [],
      gpu: [],
    };
    const environment = { python: "", requirements: [], commands: [], nodePackages: [], files: [], env: {}, setup: [] };
    const common = {
      requirements,
      environment,
      compile: {
        agent: writerAgent,
        prompt: "Use only the story/writing context and the block contract. Do not include unrelated agent, build, or system-management context. Produce polished manuscript artifacts plus concise revision notes.",
        onMissing: "prompt",
      },
      repair: true,
    };
    if (kind === "brief") {
      return createNode("block", `${prefix}_story_brief`, {
        ...common,
        title: "Story brief and source context",
        inputs: [{ name: "user_intent", type: "text", value: message }],
        outputs: [
          { name: "story_brief", type: "markdown", value: `drafts/${prefix}/story_brief.md`, validation: "nonempty" },
          { name: "context_pack", type: "json", value: `drafts/${prefix}/context_pack.json`, validation: "json" },
        ],
        artifacts: [
          { name: "story_brief", type: "markdown", value: `drafts/${prefix}/story_brief.md`, validation: "nonempty" },
          { name: "context_pack", type: "json", value: `drafts/${prefix}/context_pack.json`, validation: "json" },
        ],
        prompt: "Clarify premise, target reader, genre, POV, tone, constraints, known facts, and open questions. Preserve user-provided story clues without inventing irreversible canon unless marked as a proposal.",
        verify: ["The brief separates confirmed canon, proposed ideas, open questions, and style constraints."],
        reviews: ["Human author approves or edits the story brief before drafting."],
      });
    }
    if (kind === "outline") {
      return createNode("block", `${prefix}_outline_arc`, {
        ...common,
        title: "Outline plot, arcs, chapters, and scenes",
        inputs: [{ name: "story_brief", type: "markdown", value: `drafts/${prefix}/story_brief.md`, validation: "nonempty" }],
        outputs: [
          { name: "outline", type: "markdown", value: `drafts/${prefix}/outline.md`, validation: "nonempty" },
          { name: "scene_table", type: "csv", value: `drafts/${prefix}/scene_table.csv`, validation: "nonempty" },
        ],
        artifacts: [
          { name: "outline", type: "markdown", value: `drafts/${prefix}/outline.md`, validation: "nonempty" },
          { name: "scene_table", type: "table", value: `drafts/${prefix}/scene_table.csv`, validation: "nonempty" },
        ],
        prompt: "Create a stepwise novel outline: premise, act structure, chapter list, scene beats, emotional turns, mysteries/questions, and reader promises.",
        verify: ["Every chapter has purpose, conflict, progression, and dependency on previous events."],
      });
    }
    if (kind === "bible") {
      return createNode("block", `${prefix}_character_bible`, {
        ...common,
        title: "Character bible and world rules",
        inputs: [{ name: "story_brief", type: "markdown", value: `drafts/${prefix}/story_brief.md`, validation: "nonempty" }],
        outputs: [
          { name: "character_bible", type: "markdown", value: `drafts/${prefix}/character_bible.md`, validation: "nonempty" },
          { name: "world_rules", type: "markdown", value: `drafts/${prefix}/world_rules.md`, validation: "nonempty" },
        ],
        artifacts: [
          { name: "character_bible", type: "markdown", value: `drafts/${prefix}/character_bible.md`, validation: "nonempty" },
          { name: "world_rules", type: "markdown", value: `drafts/${prefix}/world_rules.md`, validation: "nonempty" },
        ],
        prompt: "Build reusable continuity context: character goals, wounds, voices, relationships, secrets, timelines, locations, and world rules.",
        verify: ["Character motivation, voice, and continuity constraints are explicit enough for downstream chapter drafting."],
      });
    }
    if (kind === "draft") {
      return createNode("block", `${prefix}_draft_chapter`, {
        ...common,
        title: "Draft selected chapter or scene",
        inputs: [
          { name: "outline", type: "markdown", value: `drafts/${prefix}/outline.md`, validation: "nonempty" },
          { name: "character_bible", type: "markdown", value: `drafts/${prefix}/character_bible.md`, validation: "nonempty" },
          { name: "chapter_request", type: "text", value: "selected chapter or scene" },
        ],
        outputs: [
          { name: "chapter_draft", type: "markdown", value: `drafts/${prefix}/chapters/chapter_001.md`, validation: "nonempty" },
          { name: "draft_notes", type: "markdown", value: `drafts/${prefix}/chapters/chapter_001_notes.md`, validation: "nonempty" },
        ],
        artifacts: [
          { name: "chapter_draft", type: "markdown", value: `drafts/${prefix}/chapters/chapter_001.md`, validation: "nonempty" },
          { name: "draft_notes", type: "markdown", value: `drafts/${prefix}/chapters/chapter_001_notes.md`, validation: "nonempty" },
        ],
        prompt: "Write only the selected chapter/scene using the approved story context. Optimize prose, pacing, voice, image, and emotional movement. Do not re-outline the entire novel unless requested.",
        verify: ["Draft follows the selected scene goal and preserves established canon."],
        reviews: ["Human author can request targeted rewrite before continuity review."],
      });
    }
    if (kind === "continuity") {
      return createNode("block", `${prefix}_continuity_review`, {
        ...common,
        title: "Continuity, style, and pacing review",
        inputs: [
          { name: "chapter_draft", type: "markdown", value: `drafts/${prefix}/chapters/chapter_001.md`, validation: "nonempty" },
          { name: "character_bible", type: "markdown", value: `drafts/${prefix}/character_bible.md`, validation: "nonempty" },
        ],
        outputs: [
          { name: "review_notes", type: "markdown", value: `drafts/${prefix}/reviews/chapter_001_review.md`, validation: "nonempty" },
          { name: "revision_plan", type: "markdown", value: `drafts/${prefix}/reviews/chapter_001_revision_plan.md`, validation: "nonempty" },
        ],
        artifacts: [
          { name: "review_notes", type: "markdown", value: `drafts/${prefix}/reviews/chapter_001_review.md`, validation: "nonempty" },
          { name: "revision_plan", type: "markdown", value: `drafts/${prefix}/reviews/chapter_001_revision_plan.md`, validation: "nonempty" },
        ],
        prompt: "Review the selected draft for continuity, character voice, causality, pacing, sensory texture, scene objective, and line-level prose. Return actionable notes, not a full rewrite unless requested.",
        verify: ["Every critique points to a concrete passage, risk, or revision action."],
      });
    }
    return createNode("block", `${prefix}_export_manuscript`, {
      ...common,
      title: "Assemble and export manuscript",
      inputs: [{ name: "chapter_drafts", type: "folder", value: `drafts/${prefix}/chapters`, validation: "nonempty" }],
      outputs: [
        { name: "manuscript_md", type: "markdown", value: `manuscripts/${prefix}/manuscript.md`, validation: "nonempty" },
        { name: "manuscript_report", type: "markdown", value: `manuscripts/${prefix}/report.md`, validation: "nonempty" },
      ],
      artifacts: [
        { name: "manuscript_md", type: "markdown", value: `manuscripts/${prefix}/manuscript.md`, validation: "nonempty" },
        { name: "manuscript_report", type: "markdown", value: `manuscripts/${prefix}/report.md`, validation: "nonempty" },
      ],
      prompt: "Assemble approved chapters into a manuscript artifact, preserve front matter placeholders, and report missing chapters or unresolved continuity blockers.",
      verify: ["Export report lists included chapters, missing chapters, warnings, and next revision targets."],
    });
  }

  function writingProgramTask(kind, prefix, blockIds, message) {
    if (kind === "brief") {
      return createNode("task", `${prefix}_capture_story_brief`, {
        title: "Capture and approve story brief",
        calls: [{ skill: blockIds.brief }],
        prompt: `Convert the user's writing request into an approved, reusable story context. User request: ${message}`,
        verify: ["Story brief records confirmed canon, proposals, open questions, and target style."],
      });
    }
    if (kind === "outline") {
      return createNode("task", `${prefix}_outline_novel`, {
        title: "Outline the novel before drafting",
        after: [`${prefix}_capture_story_brief`],
        calls: [{ skill: blockIds.outline }, { skill: blockIds.bible }],
        prompt: "Create plot outline, character bible, and world rules as editable reusable artifacts.",
        verify: ["Outline and character bible are approved or marked with open questions before chapter drafting."],
      });
    }
    if (kind === "draft") {
      return createNode("task", `${prefix}_draft_selected_chapter`, {
        title: "Draft one selected chapter at a time",
        after: [`${prefix}_outline_novel`],
        calls: [{ skill: blockIds.draft }],
        prompt: "Draft the next selected chapter or scene. Keep the change bounded so later chat refinements are incremental.",
        verify: ["Only the selected chapter artifact changes unless the user asks for a broader rewrite."],
      });
    }
    if (kind === "review") {
      return createNode("task", `${prefix}_review_and_refine`, {
        title: "Review continuity and refine draft",
        after: [`${prefix}_draft_selected_chapter`],
        calls: [{ skill: blockIds.continuity }],
        prompt: "Review the selected draft and produce a revision plan before rewriting.",
        verify: ["Review notes are specific, actionable, and traceable to the selected draft."],
      });
    }
    return createNode("task", `${prefix}_assemble_manuscript`, {
      title: "Assemble manuscript when chapters are accepted",
      after: [`${prefix}_review_and_refine`],
      calls: [{ skill: blockIds.export }],
      prompt: "Export only accepted chapters and report missing or unresolved sections.",
      verify: ["Manuscript export and report are visible as Studio artifacts."],
    });
  }

  function programTask(kind, prefix, blockIds, message) {
    if (kind === "inspect") {
      return createNode("task", `${prefix}_inspect_data`, {
        title: "Inspect project data",
        calls: [{ skill: blockIds.discover }],
        prompt: `Inspect the dataset and experimental structure before changing analysis code. User request: ${message}`,
        verify: ["The image manifest exists and records real project files."],
      });
    }
    if (kind === "preview") {
      return createNode("task", `${prefix}_preview_segmentation`, {
        title: "Run representative segmentation preview",
        after: [`${prefix}_inspect_data`],
        calls: [{ skill: blockIds.segment }],
        children: [
          createNode("for_each", "preview_image", {
            iterator: { item: "image", source: "representative_preview_images" },
            prompt: "Run the selected segmentation method on a bounded preview image set and collect QC overlays.",
            children: [
              createNode("action", "inspect_overlay_quality", {
                prompt: "Inspect overlay, mask foreground fraction, object count, and warning flags before accepting the method.",
                verify: ["Overlay is visible in Studio artifacts.", "QC blocker is recorded if segmentation is not meaningful."],
              }),
            ],
          }),
        ],
        verify: ["Preview outputs include masks, overlays, metrics, manifest, logs, and report."],
      });
    }
    if (kind === "quantify") {
      return createNode("task", `${prefix}_quantify_outputs`, {
        title: "Quantify accepted segmentation outputs",
        after: [`${prefix}_preview_segmentation`],
        calls: [{ skill: blockIds.quantify }],
        prompt: "Compute per-image and grouped biological metrics only after preview segmentation passes QC.",
        verify: ["Quantification row counts match segmentation outputs.", "Group summary includes expected condition/date/replicate columns."],
      });
    }
    if (kind === "report") {
      return createNode("task", `${prefix}_visualize_and_report`, {
        title: "Visualize and report verified outputs",
        after: [`${prefix}_quantify_outputs`],
        calls: [{ skill: blockIds.visualize }],
        prompt: "Generate figures, tables, method notes, warnings, and final artifact index for Studio.",
        verify: ["Report, figure, summary CSV/JSON, and artifact index are visible from Studio."],
      });
    }
    return createNode("task", `${prefix}_human_qc_gate`, {
      title: "Human QC and refinement gate",
      after: [`${prefix}_visualize_and_report`],
      prompt: "A domain expert reviews masks, overlays, figures, metrics, warnings, and the report. If QC fails, refine the selected block parameters and rerun the preview.",
      verify: ["Human accept/reject decision and refinement notes are recorded before full-scale use."],
    });
  }

  function planProgramFromPrompt(ir, message, options = {}) {
    const sourceIr = ir && ir.pipeline ? ir : parseAAPS("");
    if (!programPlanningIntent(message)) {
      return { changed: false, ir: cloneJson(sourceIr), summary: "No program-planning edit was inferred." };
    }
    const next = cloneJson(sourceIr);
    const pipeline = next.pipeline || createPipeline();
    next.pipeline = pipeline;
    const study = promptStudy(message);
    const domain = promptDomain(message, pipeline);
    const currentDomain = existingDomain(pipeline);
    if (currentDomain && domain && currentDomain !== domain && !confirmationIntent(message)) {
      return {
        changed: false,
        needsConfirmation: true,
        ir: next,
        summary: `This request looks like a ${domain} workflow, but the current AAPS looks like ${currentDomain}. Ask to create a new AAPS/workflow or explicitly say override/switch before I rewrite the program.`,
      };
    }
    const seed = study || slug(pipeline.name || message, "program").split("_").slice(0, 3).join("_") || "program";
    const prefix = slug(seed, "program");
    const dataRoot = dataRootForStudy(study);
    pipeline.domain = domain;
    if (!pipeline.goal) pipeline.goal = String(message || "Create a complete AAPS program.").trim();
    if (domain === "biology") {
      pipeline.requiredAgents = uniqueList([...(pipeline.requiredAgents || []), "codex_repair_agent"]);
      pipeline.requiredTools = uniqueList([...(pipeline.requiredTools || []), "python"]);
      pipeline.requiredCommands = uniqueList([...(pipeline.requiredCommands || []), "python3"]);
      pipeline.requiredPythonPackages = uniqueList([...(pipeline.requiredPythonPackages || []), "numpy", "pandas", "matplotlib", "tifffile", "pillow", "scikit-image"]);
      pipeline.tags = uniqueList([...(pipeline.tags || []), study || "biology", "segmentation", "quantification", "artifacts"]);
    }
    if (domain === "writing") {
      pipeline.requiredAgents = uniqueList([...(pipeline.requiredAgents || []), "dedicated_writing_agent"]);
      pipeline.requiredTools = uniqueList([...(pipeline.requiredTools || []), "llm_writer", "markdown"]);
      pipeline.requiredCommands = uniqueList(pipeline.requiredCommands || []);
      pipeline.tags = uniqueList([...(pipeline.tags || []), "writing", "novel", "outline", "draft", "revision"]);
    }

    pipeline.blocks = pipeline.blocks || [];
    pipeline.tasks = pipeline.tasks || [];
    let blockIds;
    let taskKinds;
    if (domain === "writing") {
      blockIds = {
        brief: `${prefix}_story_brief`,
        outline: `${prefix}_outline_arc`,
        bible: `${prefix}_character_bible`,
        draft: `${prefix}_draft_chapter`,
        continuity: `${prefix}_continuity_review`,
        export: `${prefix}_export_manuscript`,
      };
      ["brief", "outline", "bible", "draft", "continuity", "export"].forEach((kind) => {
        ensureRootNode(pipeline.blocks, writingProgramBlock(kind, prefix, message));
      });
      taskKinds = ["brief", "outline", "draft", "review", "export"];
      taskKinds.forEach((kind) => {
        ensureRootNode(pipeline.tasks, writingProgramTask(kind, prefix, blockIds, message));
      });
    } else {
      blockIds = {
        discover: `${prefix}_discover_data`,
        segment: `${prefix}_segment_images`,
        quantify: `${prefix}_quantify_metrics`,
        visualize: `${prefix}_visualize_report`,
      };
      ["discover", "segment", "quantify", "visualize"].forEach((kind) => {
        ensureRootNode(pipeline.blocks, programBlock(kind, prefix, study, dataRoot, message));
      });
      taskKinds = ["inspect", "preview", "quantify", "report", "qc"];
      taskKinds.forEach((kind) => {
        ensureRootNode(pipeline.tasks, programTask(kind, prefix, blockIds, message));
      });
    }

    pipeline.notes = uniqueList([
      ...(pipeline.notes || []),
      "Program chat generated a structured workflow plan instead of a single generic block.",
      "Reusable blocks must remain editable from Blocks and compile-ready before full-scale runs.",
      `Latest program refinement request: ${String(message || "").trim()}`,
    ]);
    return {
      changed: true,
      ir: next,
      summary: `Incrementally created/updated a structured ${study ? study.toUpperCase() : domain} program plan with ${Object.keys(blockIds).length} reusable block contracts and ${taskKinds.length} orchestration tasks.`,
      blockIds: Object.values(blockIds),
      taskIds: pipeline.tasks.filter((task) => task.id.startsWith(prefix)).map((task) => task.id),
    };
  }

  function blockPlanningIntent(message) {
    const text = String(message || "").toLowerCase();
    return /\b(create|build|design|write|make|add|implement|draft|segment|quantify|visuali[sz]e|report|novel|chapter|story|block|skill)\b/.test(text);
  }

  function planBlockFromPrompt(ir, message, options = {}) {
    const sourceIr = ir && ir.pipeline ? ir : parseAAPS("");
    if (!blockPlanningIntent(message)) {
      return { changed: false, ir: cloneJson(sourceIr), summary: "No block-planning edit was inferred." };
    }
    const next = cloneJson(sourceIr);
    const pipeline = next.pipeline || createPipeline();
    next.pipeline = pipeline;
    const domain = promptDomain(message, pipeline);
    const study = promptStudy(message);
    const seed = study || slug(message, "block").split("_").slice(0, 3).join("_") || "block";
    const prefix = slug(seed, "block");
    pipeline.domain = pipeline.domain || domain;
    pipeline.blocks = pipeline.blocks || [];
    let block;
    if (domain === "biology" && /\b(segment|segmentation|mask|image|microscopy|app80|app65|app81|deo)\b/i.test(message)) {
      block = programBlock("segment", prefix, study, dataRootForStudy(study), message);
    } else if (domain === "biology" && /\b(quantify|quantification|metric|measure)\b/i.test(message)) {
      block = programBlock("quantify", prefix, study, dataRootForStudy(study), message);
    } else if (domain === "writing") {
      const kind = /\b(outline|plot|arc)\b/i.test(message)
        ? "outline"
        : /\b(character|bible|world)\b/i.test(message)
          ? "bible"
          : /\b(review|revise|continuity|critique)\b/i.test(message)
            ? "continuity"
            : "draft";
      block = writingProgramBlock(kind, prefix, message);
    } else {
      block = createNode("block", `${prefix}_task_block`, {
        title: "Reusable task block",
        inputs: [{ name: "request", type: "text", value: message }],
        outputs: [{ name: "result", type: "artifact", value: `artifacts/${prefix}/result.md`, validation: "nonempty" }],
        artifacts: [{ name: "result", type: "markdown", value: `artifacts/${prefix}/result.md`, validation: "nonempty" }],
        compile: {
          agent: "codex_repair_agent",
          prompt: `Create the smallest safe implementation for this reusable block. User request: ${message}`,
          onMissing: "prompt",
        },
        prompt: `Reusable block generated from chat. It must declare inputs, outputs, validation, recovery, and artifact paths before being used in a program. User request: ${message}`,
        verify: ["Declared output exists and is meaningful for the user's task."],
        recovery: ["If implementation is missing, run compile/apply and verify the generated artifact before program use."],
      });
    }
    const inserted = ensureRootNode(pipeline.blocks, block);
    pipeline.notes = uniqueList([...(pipeline.notes || []), `Latest block design request: ${String(message || "").trim()}`]);
    return {
      changed: true,
      ir: next,
      summary: `Created/updated reusable ${domain} block ${inserted.id} with typed outputs, artifacts, validation, recovery, and compile instructions.`,
      blockId: inserted.id,
    };
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
    BLOCK_DESIGN_PRINCIPLES,
    AGENT_HANDOFF_PRINCIPLES,
    AGENT_HANDOFF_PACKET_SCHEMA,
    REPORT_RECAP_PRINCIPLES,
    REPORT_RECAP_PROMPT,
    BLOCK_ARCHETYPES,
    blockDesignGuideMarkdown,
    agentHandoffGuideMarkdown,
    parserFeedbackMarkdown,
    reportParadigmMarkdown,
    parseAAPS,
    parseAAPSProject,
    serializeAAPS,
    toMarkdown,
    buildExecutionPlan,
    buildAgentCompilePlan,
    planProgramFromPrompt,
    planBlockFromPrompt,
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
