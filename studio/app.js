const sourceEl = document.getElementById("source");
const treeEl = document.getElementById("tree");
const irEl = document.getElementById("ir");
const diagnosticsEl = document.getElementById("diagnostics");
const irSummaryEl = document.getElementById("ir-summary");
const blockCountEl = document.getElementById("block-count");
const blockBrowserEl = document.getElementById("block-browser");
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
const runtimeResumeRunEl = document.getElementById("runtime-resume-run");
const runtimeResumeModeEl = document.getElementById("runtime-resume-mode");
const runtimeFromStepEl = document.getElementById("runtime-from-step");
const runtimePauseBeforeEl = document.getElementById("runtime-pause-before");
const runtimePauseAfterEl = document.getElementById("runtime-pause-after");
const runtimePauseHumanReviewEl = document.getElementById("runtime-pause-human-review");
const runtimeApproveHumanReviewEl = document.getElementById("runtime-approve-human-review");
const runtimeContinueBtnEl = document.getElementById("runtime-continue-btn");
const artifactSummaryEl = document.getElementById("artifact-summary");
const artifactListEl = document.getElementById("artifact-list");
const refreshArtifactsBtnEl = document.getElementById("refresh-artifacts-btn");
const openArtifactModalBtnEl = document.getElementById("open-artifact-modal-btn");
const artifactModalEl = document.getElementById("artifact-modal");
const artifactModalOverlayEl = document.getElementById("artifact-modal-overlay");
const closeArtifactModalBtnEl = document.getElementById("close-artifact-modal-btn");
const artifactPreviewEl = document.getElementById("artifact-preview");
const versionsSummaryEl = document.getElementById("versions-summary");
const versionsListEl = document.getElementById("versions-list");
const refreshVersionsBtnEl = document.getElementById("refresh-versions-btn");
const blockChatInputEl = document.getElementById("block-chat-input");
const blockLogEl = document.getElementById("block-log");
const blockReadinessEl = document.getElementById("block-readiness");
const blockCanvasEl = document.getElementById("block-canvas");
const projectFileTargetEl = document.getElementById("project-file-target");
const compileSummaryEl = document.getElementById("compile-summary");
const compileLogEl = document.getElementById("compile-log");
const tmuxCommandEl = document.getElementById("tmux-command");
const languageSelectEl = document.getElementById("language-select");
const agentProviderEl = document.getElementById("agent-provider");
const codexModelEl = document.getElementById("codex-model");
const codexReasoningEl = document.getElementById("codex-reasoning");
const deepseekModelEl = document.getElementById("deepseek-model");
const deepseekBaseUrlEl = document.getElementById("deepseek-base-url");
const agintiProviderEl = document.getElementById("aginti-provider");
const agintiSafetyEl = document.getElementById("aginti-safety");
const agintiSessionIdEl = document.getElementById("aginti-session-id");
const autoCompileAfterChatEl = document.getElementById("auto-compile-after-chat");
const agentContextPackEl = document.getElementById("agent-context-pack");
const autoSaveAgentEditsEl = document.getElementById("auto-save-agent-edits");
const saveSettingsBtnEl = document.getElementById("save-settings-btn");
const settingsStatusEl = document.getElementById("settings-status");
const settingsAvailabilityEl = document.getElementById("settings-availability");
const newProjectPathEl = document.getElementById("new-project-path");
const newProjectNameEl = document.getElementById("new-project-name");
const newProjectDomainEl = document.getElementById("new-project-domain");
const newProjectGoalEl = document.getElementById("new-project-goal");
const createProjectBtnEl = document.getElementById("create-project-btn");
const projectSelectorEl = document.getElementById("project-selector");
const refreshProjectsBtnEl = document.getElementById("refresh-projects-btn");
const openCreateProjectModalBtnEl = document.getElementById("open-create-project-modal");
const closeCreateProjectModalBtnEl = document.getElementById("close-create-project-modal");
const createProjectModalEl = document.getElementById("create-project-modal");
const createProjectOverlayEl = document.getElementById("create-project-overlay");
const skillEditModalEl = document.getElementById("skill-edit-modal");
const skillEditOverlayEl = document.getElementById("skill-edit-overlay");
const closeSkillEditModalBtnEl = document.getElementById("close-skill-edit-modal");
const saveSkillEditBtnEl = document.getElementById("save-skill-edit-btn");
const chatSkillEditBtnEl = document.getElementById("chat-skill-edit-btn");
const selectSkillEditBtnEl = document.getElementById("select-skill-edit-btn");
const skillEditTitleEl = document.getElementById("skill-edit-title");
const skillEditSubtitleEl = document.getElementById("skill-edit-subtitle");
const skillEditStatusEl = document.getElementById("skill-edit-status");
const skillEditFields = {
  id: document.getElementById("skill-edit-id"),
  title: document.getElementById("skill-edit-name"),
  prompt: document.getElementById("skill-edit-prompt"),
  inputs: document.getElementById("skill-edit-inputs"),
  outputs: document.getElementById("skill-edit-outputs"),
  requirements: document.getElementById("skill-edit-requirements"),
  compilePrompt: document.getElementById("skill-edit-compile-prompt"),
  chat: document.getElementById("skill-edit-chat"),
};
const nodeDetailModalEl = document.getElementById("node-detail-modal");
const nodeDetailOverlayEl = document.getElementById("node-detail-overlay");
const closeNodeDetailModalBtnEl = document.getElementById("close-node-detail-modal");
const nodeDetailEditTabEl = document.getElementById("node-detail-edit-tab");
const nodeDetailInspectTabEl = document.getElementById("node-detail-inspect-tab");
const nodeDetailEditFormEl = document.getElementById("node-detail-edit-form");
const nodeDetailInspectorEl = document.getElementById("node-detail-inspector");
const nodeDetailTitleEl = document.getElementById("node-detail-title");
const nodeDetailSubtitleEl = document.getElementById("node-detail-subtitle");
const selectNodeDetailBtnEl = document.getElementById("select-node-detail-btn");
const nodeDetailFields = {
  kind: document.getElementById("node-detail-kind"),
  id: document.getElementById("node-detail-id"),
  title: document.getElementById("node-detail-name"),
  prompt: document.getElementById("node-detail-prompt"),
  inputs: document.getElementById("node-detail-inputs"),
  outputs: document.getElementById("node-detail-outputs"),
  artifacts: document.getElementById("node-detail-artifacts"),
  exec: document.getElementById("node-detail-exec"),
  args: document.getElementById("node-detail-args"),
  requirements: document.getElementById("node-detail-requirements"),
  environment: document.getElementById("node-detail-environment"),
  compilePrompt: document.getElementById("node-detail-compile-prompt"),
  code: document.getElementById("node-detail-code"),
  run: document.getElementById("node-detail-run"),
  validations: document.getElementById("node-detail-validations"),
  verify: document.getElementById("node-detail-verify"),
  recovery: document.getElementById("node-detail-recovery"),
  repair: document.getElementById("node-detail-repair"),
  fallback: document.getElementById("node-detail-fallback"),
  reviews: document.getElementById("node-detail-reviews"),
};
const nodeKindSelectEl = document.getElementById("node-kind-select");
const structureStatusEl = document.getElementById("structure-status");
const programWorkflowSelectEl = document.getElementById("program-workflow-select");
const programBlockSelectEl = document.getElementById("program-block-select");
const programActiveSummaryEl = document.getElementById("program-active-summary");

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
let activeCompileId = "";
let chatMessageCount = 0;
let activeTab = localStorage.getItem("aaps.studio.activeTab") || "project";
let selectedWorkflowFile = localStorage.getItem("aaps.studio.selectedWorkflowFile") || "";
let selectedProgramFile = localStorage.getItem("aaps.studio.selectedProgramFile") || "";
let selectedBlockFile = localStorage.getItem("aaps.studio.selectedBlockFile") || "";
let lastRuntimeResult = null;
let lastCompileResult = null;
let currentArtifacts = { items: [], counts: {}, kindCounts: {} };
let currentVersions = { items: [], count: 0 };
let draggedNodeRef = "";
let currentProjects = { items: [] };
let artifactFilter = "all";
let selectedArtifactPath = "";
let editorProjectPath = "";
let editorFile = "";
let currentSettings = {
  agentProvider: "codex",
  codexModel: "gpt-5.3-codex",
  codexReasoning: "medium",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-v4-pro",
  agintiProvider: "deepseek",
  agintiSafety: "normal",
  agintiSessionId: "",
  agentContextPack: true,
  autoCompileAfterChat: true,
  autoSaveAgentEdits: true,
};
let skillEditMode = "node";
let skillEditRef = "";
let skillEditDraft = null;
let nodeDetailRef = "";
let nodeDetailMode = "edit";
let blockCanvasFilter = localStorage.getItem("aaps.studio.blockCanvasFilter") || "explorer";

const STUDIO_I18N = {
  en: {
    lab: "Blocks",
    program: "Programs",
    project: "Project",
    general: "General",
    biology: "Biology",
    writing: "Writing",
    format: "Format",
    runbook: "Runbook",
    download: "Download",
    skillLibrary: "Skill Library",
    skillLibraryText: "Reusable blocks for app development, biology, writing, and general agents.",
    blockInspector: "Block Workspace",
    blockInspectorText: "Outputs and status stay visible here. Use each block card's menu for focused edit or full inspection.",
    projectWorkspace: "Project Workspace",
    projectWorkspaceText: "aaps.project.json describes one topic workspace: workflows, reusable blocks, scripts, tools, agents, data, artifacts, and runs.",
    workspaceFiles: "Workspace Files",
    workspaceFilesText: "Workflows are runnable programs. Blocks/skills are reusable capabilities. Scripts, tools, agents, and environments make blocks executable.",
    compileRuntime: "Manifest / Runtime",
    compileRuntimeText: "Manifest resolves missing blocks, scripts, tools, agents, and setup prompts before dry-runs or real runs.",
    structure: "Structure",
    load: "Load",
    sample: "Sample",
    validate: "Validate",
    saveManifest: "Save Manifest",
    checkMissing: "Check Missing",
    compile: "Manifest",
    applyCompile: "Apply Safe Manifest",
    saveActive: "Save Active File",
    dryRun: "Dry Run",
    run: "Run",
    send: "Send",
    history: "History",
    close: "Close",
    chatPlaceholder: "Ask AAPS to edit this tab: add block qc_image, explain current workflow, add a loop, prepare project summary",
  },
  "zh-Hans": {
    lab: "积木实验室", program: "程序", project: "项目", general: "通用", biology: "生物", writing: "写作", format: "格式化", runbook: "运行手册", download: "下载",
    skillLibrary: "技能库", skillLibraryText: "用于应用开发、生物、写作和通用智能体的可复用模块。", blockInspector: "模块工作区", blockInspectorText: "输出和状态固定显示在这里。用模块卡片菜单进行聚焦编辑或完整检查。",
    projectWorkspace: "项目工作区", projectWorkspaceText: "aaps.project.json 描述一个主题工作区：工作流、模块、脚本、工具、智能体、数据、产物和运行记录。",
    workspaceFiles: "工作区文件", workspaceFilesText: "工作流是可运行程序；模块/技能是可复用能力；脚本、工具、智能体和环境让模块可执行。",
    compileRuntime: "编译 / 运行", compileRuntimeText: "编译会在干跑或真实运行前解析缺失的模块、脚本、工具、智能体和安装提示。", structure: "结构",
    load: "加载", sample: "示例", validate: "校验", saveManifest: "保存清单", checkMissing: "检查缺失", compile: "编译", applyCompile: "安全应用编译", saveActive: "保存当前文件", dryRun: "干跑", run: "运行", send: "发送", history: "历史", close: "关闭", chatPlaceholder: "让 AAPS 编辑当前标签：添加 qc_image、解释工作流、添加循环、总结项目",
  },
  "zh-Hant": {
    lab: "積木實驗室", program: "程式", project: "專案", general: "通用", biology: "生物", writing: "寫作", format: "格式化", runbook: "執行手冊", download: "下載",
    skillLibrary: "技能庫", skillLibraryText: "用於應用開發、生物、寫作和通用智能體的可重用模組。", blockInspector: "模組工作區", blockInspectorText: "輸出和狀態固定顯示在這裡。用模組卡片選單進行聚焦編輯或完整檢查。",
    projectWorkspace: "專案工作區", projectWorkspaceText: "aaps.project.json 描述一個主題工作區：工作流、模組、腳本、工具、智能體、資料、產物和執行紀錄。",
    workspaceFiles: "工作區檔案", workspaceFilesText: "工作流是可執行程式；模組/技能是可重用能力；腳本、工具、智能體和環境讓模組可執行。",
    compileRuntime: "編譯 / 執行", compileRuntimeText: "編譯會在 dry-run 或真正執行前解析缺失的模組、腳本、工具、智能體和安裝提示。", structure: "結構",
    load: "載入", sample: "示例", validate: "驗證", saveManifest: "保存清單", checkMissing: "檢查缺失", compile: "編譯", applyCompile: "安全套用編譯", saveActive: "保存目前檔案", dryRun: "Dry Run", run: "執行", send: "送出", history: "歷史", close: "關閉", chatPlaceholder: "讓 AAPS 編輯目前分頁：新增 qc_image、解釋工作流、加入迴圈、總結專案",
  },
  ja: { lab: "ブロック", program: "プログラム", project: "プロジェクト", general: "汎用", biology: "生物", writing: "執筆", format: "整形", runbook: "手順書", download: "保存", skillLibrary: "スキルライブラリ", skillLibraryText: "アプリ開発、生物、執筆、汎用エージェント向けの再利用ブロック。", blockInspector: "ブロック作業領域", blockInspectorText: "出力と状態をここに表示します。カードのメニューで編集または詳細確認します。", projectWorkspace: "プロジェクト作業領域", projectWorkspaceText: "1つのテーマに複数のワークフロー、ブロック、スクリプト、ツール、エージェントをまとめます。", workspaceFiles: "作業領域ファイル", workspaceFilesText: "ワークフローは実行可能なプログラム、ブロックは再利用能力です。", compileRuntime: "コンパイル / 実行", compileRuntimeText: "実行前に不足ブロック、スクリプト、ツール、エージェント、設定を解決します。", structure: "構造", load: "読込", sample: "例", validate: "検証", saveManifest: "清單保存", checkMissing: "不足確認", compile: "コンパイル", applyCompile: "安全適用", saveActive: "保存", dryRun: "Dry Run", run: "実行", send: "送信", history: "履歴", close: "閉じる", chatPlaceholder: "AAPSに編集を依頼: ブロック追加、説明、ループ追加、プロジェクト要約" },
  ko: { lab: "블록 랩", program: "프로그램", project: "프로젝트", general: "일반", biology: "생물", writing: "쓰기", format: "정리", runbook: "런북", download: "다운로드", skillLibrary: "스킬 라이브러리", skillLibraryText: "앱 개발, 생물, 글쓰기, 에이전트용 재사용 블록.", blockInspector: "블록 작업공간", blockInspectorText: "출력과 상태를 여기에 유지합니다. 카드 메뉴로 집중 편집 또는 전체 검사를 엽니다.", projectWorkspace: "프로젝트 작업공간", projectWorkspaceText: "하나의 주제에 여러 워크플로, 블록, 스크립트, 도구, 에이전트를 묶습니다.", workspaceFiles: "작업공간 파일", workspaceFilesText: "워크플로는 실행 프로그램이고 블록은 재사용 기능입니다.", compileRuntime: "컴파일 / 실행", compileRuntimeText: "실행 전에 누락 블록, 스크립트, 도구, 에이전트, 설정을 해결합니다.", structure: "구조", load: "열기", sample: "예제", validate: "검증", saveManifest: "매니페스트 저장", checkMissing: "누락 확인", compile: "컴파일", applyCompile: "안전 적용", saveActive: "활성 파일 저장", dryRun: "드라이런", run: "실행", send: "전송", history: "기록", close: "닫기", chatPlaceholder: "AAPS에 요청: 블록 추가, 워크플로 설명, 루프 추가, 프로젝트 요약" },
  es: { lab: "Bloques", program: "Programa", project: "Proyecto", general: "General", biology: "Biología", writing: "Escritura", format: "Formatear", runbook: "Runbook", download: "Descargar", skillLibrary: "Biblioteca de skills", skillLibraryText: "Bloques reutilizables para apps, biología, escritura y agentes.", blockInspector: "Espacio de bloque", blockInspectorText: "Las salidas y el estado quedan visibles aquí. Usa el menú de cada tarjeta para editar o inspeccionar.", projectWorkspace: "Espacio del proyecto", projectWorkspaceText: "Un proyecto agrupa workflows, bloques, scripts, herramientas, agentes, datos, artefactos y ejecuciones de un tema.", workspaceFiles: "Archivos", workspaceFilesText: "Workflows ejecutables; bloques reutilizables; scripts, herramientas, agentes y entornos los hacen ejecutables.", compileRuntime: "Compilar / Ejecutar", compileRuntimeText: "La compilación resuelve faltantes antes de dry-runs o ejecuciones reales.", structure: "Estructura", load: "Cargar", sample: "Ejemplo", validate: "Validar", saveManifest: "Guardar manifest", checkMissing: "Faltantes", compile: "Compilar", applyCompile: "Aplicar seguro", saveActive: "Guardar activo", dryRun: "Dry run", run: "Ejecutar", send: "Enviar", history: "Historial", close: "Cerrar", chatPlaceholder: "Pide a AAPS editar: añadir bloque, explicar workflow, añadir loop, resumir proyecto" },
  fr: { lab: "Blocs", program: "Programme", project: "Projet", general: "Général", biology: "Biologie", writing: "Écriture", format: "Formater", runbook: "Runbook", download: "Télécharger", skillLibrary: "Bibliothèque de skills", skillLibraryText: "Blocs réutilisables pour apps, biologie, écriture et agents.", blockInspector: "Espace bloc", blockInspectorText: "Les sorties et l'état restent visibles ici. Utilisez le menu de carte pour éditer ou inspecter.", projectWorkspace: "Espace projet", projectWorkspaceText: "Un projet regroupe workflows, blocs, scripts, outils, agents, données, artefacts et runs d'un même sujet.", workspaceFiles: "Fichiers", workspaceFilesText: "Les workflows sont exécutables; les blocs sont des capacités réutilisables.", compileRuntime: "Compiler / Exécuter", compileRuntimeText: "La compilation résout les composants manquants avant dry-run ou run réel.", structure: "Structure", load: "Charger", sample: "Exemple", validate: "Valider", saveManifest: "Enregistrer", checkMissing: "Manquants", compile: "Compiler", applyCompile: "Appliquer sûr", saveActive: "Enregistrer actif", dryRun: "Dry run", run: "Exécuter", send: "Envoyer", history: "Historique", close: "Fermer", chatPlaceholder: "Demandez à AAPS de modifier: bloc, explication, boucle, résumé projet" },
  de: { lab: "Blocklabor", program: "Programm", project: "Projekt", general: "Allgemein", biology: "Biologie", writing: "Schreiben", format: "Format", runbook: "Runbook", download: "Download", skillLibrary: "Skill-Bibliothek", skillLibraryText: "Wiederverwendbare Blöcke für Apps, Biologie, Schreiben und Agenten.", blockInspector: "Blockarbeitsbereich", blockInspectorText: "Ausgaben und Status bleiben hier sichtbar. Das Kartenmenü öffnet Editor oder Inspektor.", projectWorkspace: "Projektarbeitsbereich", projectWorkspaceText: "Ein Projekt bündelt Workflows, Blöcke, Skripte, Tools, Agenten, Daten, Artefakte und Runs zu einem Thema.", workspaceFiles: "Arbeitsdateien", workspaceFilesText: "Workflows sind ausführbare Programme; Blöcke sind wiederverwendbare Fähigkeiten.", compileRuntime: "Kompilieren / Ausführen", compileRuntimeText: "Kompilieren löst fehlende Komponenten vor Dry-runs oder echten Runs.", structure: "Struktur", load: "Laden", sample: "Beispiel", validate: "Prüfen", saveManifest: "Manifest speichern", checkMissing: "Fehlendes prüfen", compile: "Kompilieren", applyCompile: "Sicher anwenden", saveActive: "Aktive Datei speichern", dryRun: "Dry Run", run: "Ausführen", send: "Senden", history: "Verlauf", close: "Schließen", chatPlaceholder: "AAPS bitten: Block hinzufügen, Workflow erklären, Loop hinzufügen, Projekt zusammenfassen" },
  ru: { lab: "Блоки", program: "Программа", project: "Проект", general: "Общее", biology: "Биология", writing: "Текст", format: "Формат", runbook: "Runbook", download: "Скачать", skillLibrary: "Библиотека навыков", skillLibraryText: "Переиспользуемые блоки для приложений, биологии, письма и агентов.", blockInspector: "Рабочая область блока", blockInspectorText: "Выводы и статус остаются видимыми здесь. Меню карточки открывает редактор или инспектор.", projectWorkspace: "Рабочая область", projectWorkspaceText: "Проект объединяет workflow, блоки, скрипты, инструменты, агентов, данные, артефакты и запуски одной темы.", workspaceFiles: "Файлы", workspaceFilesText: "Workflow исполняемы; блоки переиспользуемы; скрипты и окружения делают их runnable.", compileRuntime: "Компиляция / запуск", compileRuntimeText: "Компиляция решает отсутствующие компоненты перед dry-run или запуском.", structure: "Структура", load: "Открыть", sample: "Пример", validate: "Проверить", saveManifest: "Сохранить manifest", checkMissing: "Недостающее", compile: "Компилировать", applyCompile: "Безопасно применить", saveActive: "Сохранить активный", dryRun: "Dry run", run: "Запуск", send: "Отправить", history: "История", close: "Закрыть", chatPlaceholder: "Попросите AAPS: добавить блок, объяснить workflow, добавить цикл, резюмировать проект" },
  ar: { lab: "المكعبات", program: "البرنامج", project: "المشروع", general: "عام", biology: "أحياء", writing: "كتابة", format: "تنسيق", runbook: "دليل التشغيل", download: "تنزيل", skillLibrary: "مكتبة المهارات", skillLibraryText: "مكعبات قابلة لإعادة الاستخدام للتطبيقات والأحياء والكتابة والوكلاء.", blockInspector: "مساحة عمل المكعب", blockInspectorText: "تبقى المخرجات والحالة ظاهرة هنا. تفتح قائمة البطاقة التحرير أو الفحص.", projectWorkspace: "مساحة المشروع", projectWorkspaceText: "المشروع يجمع workflows ومكعبات وسكربتات وأدوات ووكلاء وبيانات ومخرجات وتشغيلات لموضوع واحد.", workspaceFiles: "ملفات العمل", workspaceFilesText: "الـ workflows برامج قابلة للتشغيل، والمكعبات قدرات قابلة لإعادة الاستخدام.", compileRuntime: "ترجمة / تشغيل", compileRuntimeText: "الترجمة تحل العناصر المفقودة قبل dry-run أو التشغيل الحقيقي.", structure: "البنية", load: "تحميل", sample: "مثال", validate: "تحقق", saveManifest: "حفظ البيان", checkMissing: "فحص الناقص", compile: "ترجمة", applyCompile: "تطبيق آمن", saveActive: "حفظ الحالي", dryRun: "تجربة", run: "تشغيل", send: "إرسال", history: "السجل", close: "إغلاق", chatPlaceholder: "اطلب من AAPS: إضافة مكعب، شرح workflow، إضافة حلقة، تلخيص المشروع" },
  vi: { lab: "Block Lab", program: "Chương trình", project: "Dự án", general: "Chung", biology: "Sinh học", writing: "Viết", format: "Định dạng", runbook: "Runbook", download: "Tải xuống", skillLibrary: "Thư viện kỹ năng", skillLibraryText: "Block tái sử dụng cho app, sinh học, viết và agent.", blockInspector: "Không gian block", blockInspectorText: "Output và trạng thái luôn ở đây. Dùng menu trên thẻ để sửa hoặc kiểm tra đầy đủ.", projectWorkspace: "Không gian dự án", projectWorkspaceText: "Một dự án gom workflow, block, script, công cụ, agent, dữ liệu, artifact và lần chạy cho một chủ đề.", workspaceFiles: "Tệp dự án", workspaceFilesText: "Workflow là chương trình chạy được; block là năng lực tái sử dụng.", compileRuntime: "Compile / Chạy", compileRuntimeText: "Compile xử lý phần thiếu trước dry-run hoặc chạy thật.", structure: "Cấu trúc", load: "Mở", sample: "Mẫu", validate: "Kiểm tra", saveManifest: "Lưu manifest", checkMissing: "Kiểm tra thiếu", compile: "Compile", applyCompile: "Áp dụng an toàn", saveActive: "Lưu tệp hiện tại", dryRun: "Dry run", run: "Chạy", send: "Gửi", history: "Lịch sử", close: "Đóng", chatPlaceholder: "Yêu cầu AAPS sửa: thêm block, giải thích workflow, thêm loop, tóm tắt dự án" },
};

function t(key) {
  const lang = languageSelectEl?.value || "en";
  return (STUDIO_I18N[lang] && STUDIO_I18N[lang][key]) || STUDIO_I18N.en[key] || key;
}

function applyStudioLanguage(lang) {
  if (!languageSelectEl) return;
  languageSelectEl.value = STUDIO_I18N[lang] ? lang : "en";
  document.documentElement.lang = languageSelectEl.value;
  document.documentElement.dir = languageSelectEl.value === "ar" ? "rtl" : "ltr";
  const set = (selector, key) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = t(key);
  };
  set('[data-tab="lab"]', "lab");
  set('[data-tab="program"]', "program");
  set('[data-tab="project"]', "project");
  set("#sample-general", "general");
  set("#sample-biology", "biology");
  set("#sample-writing", "writing");
  set("#format-btn", "format");
  set("#markdown-btn", "runbook");
  set("#download-btn", "download");
  set(".library-panel .panel-head h2", "skillLibrary");
  set(".library-panel .panel-head p", "skillLibraryText");
  set(".inspector-panel .panel-head h2", "blockInspector");
  set(".inspector-panel .panel-head p", "blockInspectorText");
  set(".project-manifest-panel .panel-head h2", "projectWorkspace");
  set(".project-manifest-panel .panel-head p", "projectWorkspaceText");
  set(".project-files-panel .panel-head h2", "workspaceFiles");
  set(".project-files-panel .panel-head p", "workspaceFilesText");
  set('[data-panel="project"] .project-structure-panel .panel-head h2', "compileRuntime");
  set('[data-panel="project"] .project-structure-panel .panel-head p', "compileRuntimeText");
  set("#load-project-btn", "load");
  set("#sample-project-btn", "sample");
  set("#validate-project-btn", "validate");
  set("#save-project-btn", "saveManifest");
  set("#compile-check-btn", "checkMissing");
  set("#compile-suggest-btn", "compile");
  set("#compile-apply-btn", "applyCompile");
  set("#save-active-file-btn", "saveActive");
  set("#dry-run-active-file-btn", "dryRun");
  set("#run-active-file-btn", "run");
  const sendButton = chatFormEl?.querySelector('button[type="submit"]');
  if (sendButton) sendButton.textContent = t("send");
  if (chatHistoryToggleEl) chatHistoryToggleEl.firstChild.textContent = `${t("history")} `;
  if (chatHistoryCloseEl) chatHistoryCloseEl.textContent = t("close");
  if (chatInputEl) chatInputEl.placeholder = t("chatPlaceholder");
  updateChatContext();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
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

function currentProjectPath() {
  return projectPathEl.value || ".";
}

function clearEditorOwnership() {
  editorProjectPath = "";
  editorFile = "";
}

function markEditorSource(file) {
  editorProjectPath = currentProjectPath();
  editorFile = file || "";
}

function sourceForExecution(file, { projectWide = false } = {}) {
  if (projectWide) return "";
  if (!file) return sourceEl.value;
  if (!editorFile) return sourceEl.value;
  return editorFile === file && editorProjectPath === currentProjectPath() ? sourceEl.value : "";
}

function projectCounts(manifest, payload) {
  const files = payload.files || [];
  const countByPrefix = (prefix) => files.filter((file) => file.startsWith(`${prefix}/`)).length;
  return {
    workflows: (manifest.files?.workflows || []).length || countByPrefix("workflows"),
    blocks: (manifest.files?.blocks || []).length || countByPrefix("blocks"),
    skills: (manifest.files?.skills || []).length || countByPrefix("skills"),
    scripts: (payload.script_files || []).length,
    tools: (payload.tool_files || []).length || (manifest.tools || []).length,
    agents: (payload.agent_files || []).length || (manifest.agents || []).length,
    environments: (payload.environment_files || []).length,
    runs: countByPrefix(manifest.paths?.runs || "runs"),
  };
}

function recentProjectPaths() {
  try {
    return JSON.parse(localStorage.getItem("aaps.studio.recentProjects") || "[]").filter(Boolean);
  } catch {
    return [];
  }
}

function rememberProjectPath(pathValue) {
  const path = String(pathValue || ".").trim() || ".";
  const next = [path, ...recentProjectPaths().filter((item) => item !== path)].slice(0, 12);
  localStorage.setItem("aaps.studio.recentProjects", JSON.stringify(next));
}

function renderProjectSelector(payload = currentProjects) {
  if (!projectSelectorEl) return;
  const current = projectPathEl.value || ".";
  const byPath = new Map();
  const optionValue = (item) => item.absolutePath || item.absolute_path || item.path || ".";
  (payload.items || []).forEach((item) => byPath.set(optionValue(item), item));
  recentProjectPaths().forEach((path) => {
    if (!byPath.has(path)) byPath.set(path, { path, absolutePath: path, name: path, domain: "recent", source: "recent" });
  });
  if (!byPath.has(current)) byPath.set(current, { path: current, absolutePath: current, name: current, domain: "current", source: "current" });
  projectSelectorEl.innerHTML = [...byPath.values()]
    .map(
      (item) => {
        const value = optionValue(item);
        const displayPath = item.absolutePath || item.absolute_path || item.path || value;
        const shortPath = item.path && item.path !== displayPath ? ` · ${escapeHtml(item.path)}` : "";
        return `<option value="${escapeAttr(value)}"${value === current ? " selected" : ""}>${escapeHtml(item.name || displayPath)} · ${escapeHtml(displayPath)}${shortPath}${item.domain ? ` · ${escapeHtml(item.domain)}` : ""}</option>`;
      }
    )
    .join("");
}

async function loadProjectChoices() {
  const response = await fetch(`/api/aaps/projects?path=${encodeURIComponent(projectPathEl.value || ".")}`);
  if (!response.ok) throw new Error(`projects API returned ${response.status}`);
  currentProjects = await response.json();
  renderProjectSelector(currentProjects);
  return currentProjects;
}

function tmuxCommand(manifest) {
  const project = projectPathEl.value || ".";
  const session = `aaps-${(AAPS.slug(manifest.name || "project").slice(0, 24) || "project")}`;
  const workflow = manifest.activeFile || manifest.defaultMain || "workflows/main.aaps";
  return `tmux new-session -d -s ${session} 'cd ${project} && aaps run ${workflow} --project . --json'`;
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
  const counts = projectCounts(manifest, payload);
  const errorCount = diagnostics.filter((item) => item.severity === "error").length;
  const warningCount = diagnostics.filter((item) => item.severity === "warning").length;
  const knownFiles = new Set(files);
  if (selectedWorkflowFile && !knownFiles.has(selectedWorkflowFile)) selectedWorkflowFile = "";
  if (selectedProgramFile && !knownFiles.has(selectedProgramFile)) selectedProgramFile = "";
  if (selectedBlockFile && !knownFiles.has(selectedBlockFile)) selectedBlockFile = "";
  if (!selectedWorkflowFile && manifest.defaultMain) selectedWorkflowFile = manifest.defaultMain;
  if (!selectedProgramFile && manifest.activeFile && projectFileRole(manifest.activeFile) === "program") {
    selectedProgramFile = manifest.activeFile;
  }
  localStorage.setItem("aaps.studio.selectedWorkflowFile", selectedWorkflowFile);
  localStorage.setItem("aaps.studio.selectedProgramFile", selectedProgramFile);
  localStorage.setItem("aaps.studio.selectedBlockFile", selectedBlockFile);
  rememberProjectPath(payload.absolute_path || payload.project_path || projectPathEl.value || ".");

  projectManifestEl.value = JSON.stringify(manifest, null, 2);
  projectPathEl.value = payload.absolute_path || payload.project_path || projectPathEl.value || ".";
  renderProjectSelector(currentProjects);
  renderProgramSelectors(manifest);
  projectStatusEl.textContent = errorCount
    ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
    : warningCount
      ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
      : "valid";
  projectFileCountEl.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
  projectStructureEl.textContent = AAPS.projectStructureText(manifest);
  tmuxCommandEl.textContent = tmuxCommand(manifest);

  projectSummaryEl.innerHTML = `
    <div class="project-topic">
      <strong>${escapeHtml(manifest.name)}</strong>
      <span>${escapeHtml(manifest.domain)} project</span>
      <span>active: ${escapeHtml(manifest.activeFile || manifest.defaultMain || "(none)")}</span>
      <span>main: ${escapeHtml(manifest.defaultMain || "(none)")}</span>
      <span>workflow: ${escapeHtml(selectedWorkflowFile || manifest.defaultMain || "(none)")}</span>
      <span>block: ${escapeHtml(selectedBlockFile || "(none)")}</span>
    </div>
    <div>${escapeHtml(manifest.description || "Use this workspace for one topic, then keep many pipelines and reusable capabilities inside it.")}</div>
    <div class="project-kpis">
      <div class="project-kpi"><strong>${counts.workflows}</strong>workflows</div>
      <div class="project-kpi"><strong>${counts.blocks}</strong>blocks</div>
      <div class="project-kpi"><strong>${counts.scripts}</strong>scripts</div>
      <div class="project-kpi"><strong>${counts.tools}</strong>tools</div>
      <div class="project-kpi"><strong>${counts.agents}</strong>agents</div>
      <div class="project-kpi"><strong>${counts.environments}</strong>env files</div>
    </div>
    ${
      diagnostics.length
        ? `<div>${diagnostics
            .map((item) => `${escapeHtml(item.severity)}: ${escapeHtml(item.message)}`)
            .join("<br>")}</div>`
        : "<div>No project manifest diagnostics.</div>"
    }
  `;

  const workspaceCategoryOrder = ["workflows", "subworkflows", "modules", "blocks", "skills", "drafts", "archives", "references"];
  const remainingCategories = AAPS.PROJECT_FILE_CATEGORIES.filter((category) => !workspaceCategoryOrder.includes(category));
  const aapsSections = [...workspaceCategoryOrder, ...remainingCategories].map((category) => {
    const categoryFiles = manifest.files[category] || [];
    if (!categoryFiles.length) return "";
    return `
      <section class="project-category">
        <h3>${escapeHtml(category)}</h3>
        ${categoryFiles
          .map(
            (file) => projectFileRow(file, files.includes(file) ? "found" : "listed", manifest)
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
                <button class="${escapeAttr(projectFileClasses(file, manifest))}" type="button" data-project-text-file="${escapeHtml(file)}" aria-pressed="${activeFileMatches(file, manifest) ? "true" : "false"}">
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
              <button class="${escapeAttr(projectFileClasses(file, manifest))}" type="button" data-project-text-file="${escapeHtml(file)}" aria-pressed="${activeFileMatches(file, manifest) ? "true" : "false"}">
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
  renderBlockBrowser(getIr());
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
  if (runtimeResumeRunEl && result.runId) runtimeResumeRunEl.value = result.runId;
  runStatusEl.textContent = record.status || result.status || "unknown";
  const plan = result.plan || {};
  const failed = (result.results || []).filter((item) => item.status === "failed").length;
  const skipped = (result.results || []).filter((item) => item.status === "skipped_completed").length;
  const invalidated = (result.resumeDecisions || []).filter((item) => item.action === "rerun").length;
  const humanReviews = (result.humanReviewQueue || []).filter((item) => item.status === "pending").length;
  const readiness = result.readiness || {};
  const readyBlocks = (readiness.blocks || []).filter((item) => item.ready).length;
  const compileRequests = result.compilePlan?.requests?.length || 0;
  const pause = result.pause || {};
  runSummaryEl.innerHTML = `
    <div><strong>${escapeHtml(result.runId || record.id || "")}</strong> · ${escapeHtml(result.file || record.file || "")}</div>
    <div class="project-kpis">
      <div class="project-kpi"><strong>${plan.steps || 0}</strong>steps</div>
      <div class="project-kpi"><strong>${plan.executableSteps || 0}</strong>exec</div>
      <div class="project-kpi"><strong>${failed}</strong>failed</div>
      <div class="project-kpi"><strong>${skipped}</strong>skipped</div>
      <div class="project-kpi"><strong>${invalidated}</strong>invalidated</div>
      <div class="project-kpi"><strong>${humanReviews}</strong>review</div>
      <div class="project-kpi"><strong>${readyBlocks}/${(readiness.blocks || []).length || 0}</strong>ready</div>
      <div class="project-kpi"><strong>${compileRequests}</strong>manifest prompts</div>
    </div>
    ${
      pause.paused
        ? `<div><strong>Paused:</strong> ${escapeHtml(pause.reason || "")} at ${escapeHtml(pause.pausedAtStep || "")}. ${escapeHtml(pause.nextHint || "")}</div>`
        : ""
    }
    ${
      humanReviews
        ? `<div><strong>Human review queue:</strong> ${humanReviews} pending item(s). Use Continue Run with approval after review.</div>`
        : ""
    }
    ${
      invalidated
        ? `<div><strong>Freshness invalidation:</strong> ${invalidated} completed step(s) reran because outputs were missing/stale or dependencies changed.</div>`
        : ""
    }
    <div>${escapeHtml(result.runDir || "")}</div>
  `;
  runLogEl.textContent = JSON.stringify(result, null, 2);
  renderSelectedReadiness(result);
}

function renderCompile(record) {
  if (!record) {
    lastCompileResult = null;
    compileSummaryEl.innerHTML = "<div>No manifest has started.</div>";
    compileLogEl.textContent = "";
    return;
  }
  const result = record.result || record;
  lastCompileResult = result;
  const missing = result.missingComponents || [];
  const written = [...(result.generatedFiles || []), ...(result.modifiedFiles || [])].filter((item) => item.written);
  const prompts = (result.agentPrompts || []).length + (result.setupPrompts || []).length;
  compileSummaryEl.innerHTML = `
    <div><strong>Manifest ${escapeHtml(record.id || result.compileId || "")}</strong> · ${escapeHtml(record.status || result.status || "unknown")} · ${escapeHtml(result.mode || record.mode || "")}</div>
    <div class="project-kpis">
      <div class="project-kpi"><strong>${missing.length}</strong>missing</div>
      <div class="project-kpi"><strong>${written.length}</strong>written</div>
      <div class="project-kpi"><strong>${prompts}</strong>prompts</div>
      <div class="project-kpi"><strong>${result.plan?.steps || 0}</strong>steps</div>
    </div>
    <div>${escapeHtml(result.compileDir || "")}</div>
    ${
      missing.length
        ? `<ul class="missing-list">${missing
            .slice(0, 8)
            .map((item) => `<li>${escapeHtml(item.type)}: ${escapeHtml(item.name || item.expected || "")}</li>`)
            .join("")}</ul>`
        : "<div>Manifest status is ready for planning and execution.</div>"
    }
  `;
  compileLogEl.textContent = JSON.stringify(result, null, 2);
}

function formatBytes(size) {
  const value = Number(size || 0);
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value > 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function artifactFileUrl(file, projectPath = projectPathEl.value || ".") {
  return `/api/aaps/artifact-file?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}`;
}

function artifactDisplayKind(item) {
  const path = String(item?.path || "").toLowerCase();
  if (item?.kind === "run") return "run";
  if (item?.kind === "image") return "image";
  if (item?.kind === "table" || path.endsWith(".csv") || path.endsWith(".tsv")) return "table";
  if (path.endsWith(".pdf")) return "pdf";
  if (["source", "json", "jsonl"].includes(item?.kind) || /\.(aaps|py|js|mjs|cjs|sh|json|jsonl|yaml|yml|toml)$/i.test(path)) return "source";
  if (["text"].includes(item?.kind) || /\.(md|txt|log)$/i.test(path)) return "text";
  return item?.kind || "file";
}

function artifactMatchesFilter(item, filter = artifactFilter) {
  if (!filter || filter === "all") return true;
  const kind = artifactDisplayKind(item);
  if (filter === "source") return kind === "source" || kind === "text";
  return kind === filter;
}

function setArtifactFilter(filter) {
  artifactFilter = filter || "all";
  document.querySelectorAll("[data-artifact-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.artifactFilter === artifactFilter);
  });
  renderArtifacts(currentArtifacts);
}

function csvRows(text, maxRows = 6) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
      if (rows.length >= maxRows) break;
    } else {
      cell += char;
    }
  }
  if (rows.length < maxRows && (cell || row.length)) {
    row.push(cell);
    if (row.some((value) => String(value).trim())) rows.push(row);
  }
  return rows.slice(0, maxRows);
}

async function previewArtifact(item) {
  if (!artifactPreviewEl || !item) return;
  selectedArtifactPath = item.path || "";
  artifactListEl?.querySelectorAll("[data-artifact-path]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.artifactPath === selectedArtifactPath);
  });
  const kind = artifactDisplayKind(item);
  const url = artifactFileUrl(item.path);
  artifactPreviewEl.innerHTML = `
    <div class="artifact-preview-head">
      <div>
        <strong>${escapeHtml(item.path)}</strong>
        <span>${escapeHtml(item.source || "")} · ${escapeHtml(kind)} · ${formatBytes(item.size)}</span>
      </div>
      <a href="${url}" target="_blank" rel="noopener noreferrer">Open raw</a>
    </div>
    <div class="message">Loading preview...</div>
  `;
  if (kind === "image") {
    artifactPreviewEl.innerHTML = `
      <div class="artifact-preview-head">
        <div><strong>${escapeHtml(item.path)}</strong><span>${escapeHtml(item.source || "")} · image · ${formatBytes(item.size)}</span></div>
        <a href="${url}" target="_blank" rel="noopener noreferrer">Open raw</a>
      </div>
      <figure class="artifact-image-preview"><img src="${url}" alt="${escapeHtml(item.path)}" /></figure>`;
    return;
  }
  if (kind === "pdf") {
    artifactPreviewEl.innerHTML = `
      <div class="artifact-preview-head">
        <div><strong>${escapeHtml(item.path)}</strong><span>${escapeHtml(item.source || "")} · pdf · ${formatBytes(item.size)}</span></div>
        <a href="${url}" target="_blank" rel="noopener noreferrer">Open raw</a>
      </div>
      <iframe class="artifact-pdf-preview" src="${url}" title="${escapeAttr(item.path)}"></iframe>`;
    return;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`artifact preview returned ${response.status}`);
  const text = await response.text();
  if (kind === "table") {
    artifactPreviewEl.innerHTML = artifactPreviewEl.innerHTML.replace('<div class="message">Loading preview...</div>', csvPreviewHtml(text, item.path));
    return;
  }
  if (kind === "run" || kind === "source" || kind === "text") {
    let pretty = text;
    if (String(item.path || "").toLowerCase().endsWith(".json")) {
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        pretty = text;
      }
    }
    artifactPreviewEl.innerHTML = artifactPreviewEl.innerHTML.replace(
      '<div class="message">Loading preview...</div>',
      `<textarea class="artifact-editor" readonly spellcheck="false">${escapeHtml(pretty)}</textarea>`
    );
    return;
  }
  artifactPreviewEl.innerHTML = artifactPreviewEl.innerHTML.replace(
    '<div class="message">Loading preview...</div>',
    `<pre class="artifact-text-preview">${escapeHtml(text.slice(0, 20000))}</pre>`
  );
}

function csvPreviewHtml(text, caption) {
  const rows = csvRows(text, 7);
  if (!rows.length) return "";
  const [head, ...body] = rows;
  return `
    <div class="run-table-preview">
      <strong>${escapeHtml(caption)}</strong>
      <div class="run-table-scroll">
        <table>
          <thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
          <tbody>${body.map((row) => `<tr>${head.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function validationPreviewHtml(runData) {
  const validations = (runData.results || []).flatMap((result) =>
    (result.validations || []).map((validation) => ({
      step: result.id || result.step || "",
      status: validation.ok === false ? "failed" : "passed",
      rule: validation.rule || "",
      observed: validation.observed || "",
      path: validation.path || "",
    }))
  );
  const failed = validations.filter((item) => item.status === "failed");
  const shown = [...failed, ...validations.filter((item) => item.status !== "failed")].slice(0, 14);
  return `
    <div class="run-validation-preview">
      <div class="block-canvas-head">
        <div>
          <strong>Validation details</strong>
          <span>${validations.length - failed.length}/${validations.length} passed${failed.length ? ` · ${failed.length} failed` : ""}</span>
        </div>
      </div>
      <ul>
        ${shown
          .map(
            (item) => `
              <li class="${item.status === "failed" ? "bad" : "ok"}">
                <strong>${escapeHtml(item.status)}</strong>
                <span>${escapeHtml(item.step)} · ${escapeHtml(item.rule)}${item.observed ? ` · observed ${escapeHtml(item.observed)}` : ""}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function methodPreviewHtml(runData) {
  const selections = Array.isArray(runData.methodSelections) ? runData.methodSelections : [];
  if (!selections.length) return "";
  return `
    <div class="run-method-preview">
      <strong>Method selection</strong>
      ${selections
        .map(
          (item) => `
            <div>
              <span>${escapeHtml(item.stageId || item.stage || "stage")} selected <strong>${escapeHtml(item.selected || "(none)")}</strong></span>
              <span>${escapeHtml(item.reason || "")}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function runManifestPreviewHtml(manifest, manifestPath) {
  if (!manifest || typeof manifest !== "object") return "";
  const requiredOutputs = Array.isArray(manifest.required_outputs) ? manifest.required_outputs : [];
  return `
    <div class="run-manifest-preview">
      <strong>Run manifest</strong>
      <div>
        <span>Actual method</span>
        <strong>${escapeHtml(manifest.method || "(not recorded)")}</strong>
      </div>
      ${
        manifest.fallback_reason
          ? `<div><span>Fallback reason</span><span>${escapeHtml(manifest.fallback_reason)}</span></div>`
          : ""
      }
      <div>
        <span>Processed images</span>
        <strong>${escapeHtml(manifest.processed_count ?? 0)} processed · ${escapeHtml(manifest.mask_count ?? 0)} masks · ${escapeHtml(manifest.overlay_count ?? 0)} overlays</strong>
      </div>
      <div>
        <span>Declared output evidence</span>
        <strong>${requiredOutputs.length} required outputs listed</strong>
      </div>
      <small>${escapeHtml(manifestPath || "")}</small>
    </div>
  `;
}

function qcComparisonHtml(review) {
  const items = Array.isArray(review?.comparisonItems) ? review.comparisonItems.slice(0, 4) : [];
  const method = review?.method || {};
  if (!items.length) {
    return `
      <div class="qc-comparison-panel empty">
        <strong>Artifact comparison</strong>
        <span>No paired mask/overlay artifacts were found for this run yet.</span>
      </div>
    `;
  }
  return `
    <div class="qc-comparison-panel">
      <div class="qc-comparison-head">
        <div>
          <strong>Side-by-side segmentation QC</strong>
          <span>${escapeHtml(method.method || "method not recorded")}${method.fallbackReason ? ` · ${escapeHtml(method.fallbackReason)}` : ""}</span>
        </div>
        <small>${items.length} preview pair${items.length === 1 ? "" : "s"}</small>
      </div>
      <div class="qc-comparison-grid">
        ${items
          .map(
            (item) => `
              <article class="qc-comparison-card">
                <header>
                  <strong>${escapeHtml(item.imageId || "image")}</strong>
                  <span>${escapeHtml(item.condition || item.qcFlag || "")}</span>
                </header>
                <div class="qc-image-pair">
                  <figure>
                    <img src="${escapeAttr(artifactFileUrl(item.overlayPath))}" alt="Overlay for ${escapeAttr(item.imageId || "image")}">
                    <figcaption>Overlay</figcaption>
                  </figure>
                  <figure>
                    <img src="${escapeAttr(artifactFileUrl(item.maskPath))}" alt="Mask for ${escapeAttr(item.imageId || "image")}">
                    <figcaption>Mask</figcaption>
                  </figure>
                </div>
                <footer>
                  <span>objects ${escapeHtml(item.objectCount ?? "n/a")}</span>
                  <span>foreground ${escapeHtml(item.foregroundFraction ?? "n/a")}</span>
                  <span>${escapeHtml(item.method || "")}</span>
                </footer>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function qcReviewHtml(runPath, review) {
  const status = review?.status || "unreviewed";
  const historyCount = Number(review?.historyCount || 0);
  return `
    <div class="run-qc-review" data-qc-run="${escapeHtml(runPath)}">
      <div class="block-canvas-head">
        <div>
          <strong>Human QC review</strong>
          <span>${escapeHtml(status)} · ${historyCount} review events</span>
        </div>
      </div>
      <div class="qc-review-summary">
        <span>${Number(review?.overlayCount || 0)} overlays</span>
        <span>${Number(review?.maskCount || 0)} masks</span>
        <span>${escapeHtml(review?.reviewPath || "")}</span>
      </div>
      ${qcComparisonHtml(review)}
      <label>QC notes
        <textarea data-qc-notes rows="3" placeholder="Example: overlays are acceptable, but low-density images need a higher min_area.">${escapeHtml(review?.notes || "")}</textarea>
      </label>
      <label>Parameter refinement suggestion
        <textarea data-qc-params rows="2" placeholder="Example: rerun threshold fallback with min_area=120 and preview_limit=6.">${escapeHtml(review?.parameterSuggestion || "")}</textarea>
      </label>
      <div class="form-actions qc-actions">
        <button type="button" data-qc-action="accepted">Accept QC</button>
        <button type="button" data-qc-action="needs_refinement">Needs Refinement</button>
        <button type="button" data-qc-action="rejected">Reject QC</button>
        <button type="button" data-qc-rerun="refinement">Run Refinement Preview</button>
      </div>
      <small data-qc-rerun-status>Refinement runs use the selected block/program and write a new durable run.</small>
      <small>QC decisions are written into the run directory and indexed under .aaps-work/qc for later refinement.</small>
    </div>
  `;
}

function parseRefinementOverrides(text) {
  const aliases = {
    minArea: "min_mask_pixels",
    min_area: "min_mask_pixels",
    minSize: "min_mask_pixels",
    min_size: "min_mask_pixels",
  };
  const overrides = {};
  const pattern = /([A-Za-z_][\w.-]*)\s*=\s*("[^"]*"|'[^']*'|[^,\n;\s]+)/g;
  let match = pattern.exec(text || "");
  while (match) {
    const key = aliases[match[1]] || match[1];
    if (/^[A-Za-z_][\w.-]*$/.test(key)) {
      const rawValue = match[2] || "";
      overrides[key] = rawValue.replace(/^["']|["']$/g, "");
    }
    match = pattern.exec(text || "");
  }
  return overrides;
}

async function loadQcReview(runPath) {
  const response = await fetch(`/api/aaps/qc-review?path=${encodeURIComponent(projectPathEl.value || ".")}&runPath=${encodeURIComponent(runPath)}`);
  if (!response.ok) throw new Error(`QC review API returned ${response.status}`);
  return response.json();
}

async function saveQcReview(runPath, status) {
  const card = document.querySelector(`[data-qc-run="${CSS.escape(runPath)}"]`);
  if (!card) return;
  const payload = {
    path: projectPathEl.value || ".",
    runPath,
    status,
    reviewer: "studio_user",
    notes: card.querySelector("[data-qc-notes]")?.value || "",
    parameterSuggestion: card.querySelector("[data-qc-params]")?.value || "",
  };
  const response = await fetch("/api/aaps/qc-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const review = await response.json();
  if (!response.ok) throw new Error(review.error || `QC review save returned ${response.status}`);
  card.outerHTML = qcReviewHtml(runPath, review);
  await loadArtifacts(projectPathEl.value || ".");
}

async function runQcRefinement(runPath) {
  const card = document.querySelector(`[data-qc-run="${CSS.escape(runPath)}"]`);
  if (!card) return;
  const statusEl = card.querySelector("[data-qc-rerun-status]");
  const manifest = getProjectManifest();
  if (manifest.error) throw new Error(manifest.error);
  const selectedNode = nodeRefs.get(selectedRef);
  const file = selectedBlockFile || selectedProgramFile || selectedWorkflowFile || manifest.activeFile || manifest.defaultMain || "pipeline.aaps";
  const inputOverrides = parseRefinementOverrides(card.querySelector("[data-qc-params]")?.value || "");
  if (statusEl) statusEl.textContent = `Submitting refinement run for ${file}${Object.keys(inputOverrides).length ? ` with ${JSON.stringify(inputOverrides)}` : ""}...`;
  const response = await fetch("/api/aaps/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: projectPathEl.value || ".",
      file,
      source: sourceForExecution(file),
      dryRun: false,
      block: selectedNode?.id || "",
      inputOverrides,
    }),
  });
  const record = await response.json();
  if (!response.ok) throw new Error(record.error || `refinement run returned ${response.status}`);
  activeRunId = record.id;
  renderRuntime(record);
  if (statusEl) statusEl.textContent = `Refinement run ${record.id} submitted; polling until outputs are durable.`;
  pollRun(record.id).catch((error) => {
    runStatusEl.textContent = "poll failed";
    runLogEl.textContent = error.message;
    if (statusEl) statusEl.textContent = `Refinement poll failed: ${error.message}`;
  });
}

async function loadRunCanvasDetails(runPath, keyFiles) {
  const detailsEl = document.querySelector(`[data-run-details="${CSS.escape(runPath)}"]`);
  if (!detailsEl) return;
  const runResponse = await fetch(artifactFileUrl(runPath));
  if (!runResponse.ok) throw new Error(`run detail fetch returned ${runResponse.status}`);
  const runData = await runResponse.json();
  const tableFiles = (keyFiles || [])
    .filter((item) => item.kind === "table" || String(item.path || "").toLowerCase().endsWith(".csv"))
    .slice(0, 3);
  const tables = [];
  for (const item of tableFiles) {
    const response = await fetch(artifactFileUrl(item.path));
    if (!response.ok) continue;
    tables.push(csvPreviewHtml(await response.text(), item.path));
  }
  const manifestFile = (keyFiles || []).find((item) => String(item.path || "").toLowerCase().endsWith("run_manifest.json"));
  let manifestPreview = "";
  if (manifestFile) {
    const response = await fetch(artifactFileUrl(manifestFile.path));
    if (response.ok) {
      manifestPreview = runManifestPreviewHtml(await response.json(), manifestFile.path);
    }
  }
  const reportFile = (keyFiles || []).find((item) => String(item.path || "").toLowerCase().endsWith("report.md"));
  let reportPreview = "";
  if (reportFile) {
    const response = await fetch(artifactFileUrl(reportFile.path));
    if (response.ok) {
      reportPreview = `<div class="run-report-preview"><strong>Report preview</strong><pre>${escapeHtml((await response.text()).slice(0, 1400))}</pre></div>`;
    }
  }
  let qcReview = "";
  try {
    qcReview = qcReviewHtml(runPath, await loadQcReview(runPath));
  } catch (error) {
    qcReview = `<div class="run-qc-review"><strong>Human QC review</strong><span>QC review could not load: ${escapeHtml(error.message)}</span></div>`;
  }
  detailsEl.innerHTML = [validationPreviewHtml(runData), methodPreviewHtml(runData), manifestPreview, tables.join(""), reportPreview, qcReview].filter(Boolean).join("");
}

function runItemsForNode(node) {
  const runs = (currentArtifacts.items || []).filter((item) => item.kind === "run" && item.runSummary);
  if (!runs.length) return null;
  let matches = [];
  if (node && node.id) {
    matches = runs.filter((item) => item.runSummary.block === node.id);
    if (matches.length) return matches;
  }
  const manifest = getProjectManifest();
  const activeFile = manifest.activeFile || manifest.defaultMain || "";
  if (activeFile) {
    matches = runs.filter((item) => item.runSummary.file === activeFile);
    if (matches.length) return matches;
  }
  return runs;
}

function latestRunForNode(node) {
  return runItemsForNode(node)?.[0] || null;
}

function nodeInputValues(node) {
  return Object.fromEntries((node?.inputs || []).map((input) => [input.name, String(input.value || "")]));
}

function resolveNodePathTemplate(value, inputValues = {}) {
  return String(value || "")
    .replace(/\$\{input\.([A-Za-z_][\w.-]*)\}/g, (_match, name) => inputValues[name] || "")
    .replace(/^\/+/, "");
}

function artifactRootsForNode(node) {
  const roots = new Set();
  const inputValues = nodeInputValues(node);
  if (inputValues.output_root) roots.add(inputValues.output_root.replace(/^\/+/, "").replace(/\/+$/, ""));
  [...(node?.outputs || []), ...(node?.artifacts || [])].forEach((item) => {
    const resolved = resolveNodePathTemplate(item.value || item.path || "", inputValues).replace(/\/+$/, "");
    if (!resolved || resolved.includes("${")) return;
    const hasFileExtension = /\.[A-Za-z0-9]{1,8}$/.test(resolved.split("/").pop() || "");
    roots.add(hasFileExtension ? resolved.split("/").slice(0, -1).join("/") : resolved);
  });
  return [...roots].filter(Boolean).sort((a, b) => a.length - b.length);
}

function blockCanvasKindMatches(item, filter = blockCanvasFilter) {
  if (!filter || filter === "explorer") return true;
  const kind = artifactDisplayKind(item);
  const path = String(item?.path || "").toLowerCase();
  if (filter === "images") return kind === "image";
  if (filter === "tables") return kind === "table";
  if (filter === "pdf") return kind === "pdf";
  if (filter === "source") return kind === "source";
  if (filter === "text") return kind === "text" || path.endsWith("report.md") || path.endsWith(".md") || path.endsWith(".log");
  if (filter === "runs") return kind === "run";
  if (filter === "other") return !["image", "table", "pdf", "source", "text", "run"].includes(kind);
  return true;
}

function blockCanvasTabCounts(items) {
  return {
    explorer: items.length,
    images: items.filter((item) => blockCanvasKindMatches(item, "images")).length,
    tables: items.filter((item) => blockCanvasKindMatches(item, "tables")).length,
    pdf: items.filter((item) => blockCanvasKindMatches(item, "pdf")).length,
    text: items.filter((item) => blockCanvasKindMatches(item, "text")).length,
    source: items.filter((item) => blockCanvasKindMatches(item, "source")).length,
    runs: items.filter((item) => blockCanvasKindMatches(item, "runs")).length,
    other: items.filter((item) => blockCanvasKindMatches(item, "other")).length,
  };
}

function renderBlockCanvasTabs(items) {
  const counts = blockCanvasTabCounts(items);
  const tabs = [
    ["explorer", "Explorer"],
    ["images", "Images"],
    ["tables", "Tables"],
    ["pdf", "PDF"],
    ["text", "Reports"],
    ["source", "Source"],
    ["runs", "Runs"],
    ["other", "Other"],
  ];
  return `
    <div class="block-artifact-tabs" role="tablist" aria-label="Block artifact filters">
      ${tabs
        .map(
          ([id, label]) => `
            <button type="button" class="${blockCanvasFilter === id ? "is-active" : ""}" data-block-artifact-filter="${escapeAttr(id)}">
              ${escapeHtml(label)} <span>${Number(counts[id] || 0)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBlockFileExplorer(items) {
  if (!items.length) return '<div class="message">No artifacts match this block/run filter yet.</div>';
  return `
    <div class="block-canvas-files block-canvas-explorer">
      ${items
        .slice(0, 80)
        .map(
          (item) => `
            <a href="${artifactFileUrl(item.path)}" target="_blank" rel="noopener noreferrer">
              <strong>${escapeHtml(artifactDisplayKind(item))}</strong>
              <span>${escapeHtml(item.path)} · ${formatBytes(item.size)}</span>
              ${
                item.runSummary
                  ? `<small>${escapeHtml(item.runSummary.status || "run")} · ${escapeHtml(item.runSummary.runId || "")} · ${escapeHtml(item.runSummary.file || "")}</small>`
                  : ""
              }
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBlockImages(items) {
  const images = items.filter((item) => blockCanvasKindMatches(item, "images") && Number(item.size || 0) <= 8_000_000);
  if (!images.length) return '<div class="message">No image artifacts match this block/run yet.</div>';
  return `
    <div class="block-canvas-images">
      ${images
        .slice(0, 24)
        .map(
          (item) => `
            <figure class="block-canvas-item">
              <img src="${artifactFileUrl(item.path)}" alt="${escapeAttr(item.title || item.path)}" loading="lazy" />
              <figcaption>${escapeHtml(item.path)}</figcaption>
            </figure>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBlockCanvasBody(items) {
  if (blockCanvasFilter === "images") return renderBlockImages(items);
  return renderBlockFileExplorer(items.filter((item) => blockCanvasKindMatches(item)));
}

function renderOutputVersions(runs, latestPath = "") {
  if (!runs?.length) return "";
  return `
    <div class="block-output-versions">
      <strong>Output Versions</strong>
      <div>
        ${runs
          .slice(0, 8)
          .map((item, index) => {
            const run = item.runSummary || {};
            return `
              <a class="${item.path === latestPath ? "is-current" : ""}" href="${artifactFileUrl(item.path)}" target="_blank" rel="noopener noreferrer">
                <span>${index === 0 ? "latest" : `v${index + 1}`}</span>
                <strong>${escapeHtml(run.status || "run")}</strong>
                <small>${escapeHtml(run.runId || item.path)} · ${escapeHtml(run.file || "")}</small>
              </a>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderBlockCanvas(payload = null) {
  if (!blockCanvasEl) return;
  const items = payload?.canvasItems || payload?.previewRun?.canvasItems || [];
  const preview = payload?.previewRun || {};
  if (!payload) {
    const selected = nodeRefs.get(selectedRef);
    const nodeRuns = runItemsForNode(selected) || [];
    const latestRun = nodeRuns[0] || null;
    if (selected && latestRun?.runSummary) {
      const run = latestRun.runSummary;
      const passed = Number(run.validations || 0) - Number(run.failedValidations || 0);
      const runBase = String(latestRun.path || "").replace(/\/run\.json$/, "");
      const declaredRoots = artifactRootsForNode(selected);
      const relatedItems = (currentArtifacts.items || [])
        .filter((item) => {
          const itemPath = String(item.path || "");
          if (!itemPath || itemPath === latestRun.path) return false;
          if (runBase && itemPath.startsWith(`${runBase}/`)) return true;
          return declaredRoots.some((root) => itemPath === root || itemPath.startsWith(`${root}/`));
        })
        .slice(0, 80);
      const previewImages = relatedItems
        .filter((item) => item.kind === "image" && Number(item.size || 0) <= 2_500_000)
        .slice(0, 4);
      const keyFiles = relatedItems
        .filter((item) => {
          const value = String(item.path || "").toLowerCase();
          return (
            item.kind !== "image" &&
            (value.endsWith("report.md") ||
              value.endsWith("run_manifest.json") ||
              value.endsWith("method_selection.json") ||
              value.includes("metrics") ||
              value.includes("summary") ||
              value.endsWith("events.jsonl") ||
              value.includes("/logs/") ||
              value.includes("/block_logs/"))
          );
        })
        .sort((a, b) => {
          const priority = (item) => {
            const value = String(item.path || "").toLowerCase();
            if (value.endsWith("report.md") && !value.includes("/aaps-runs/")) return 0;
            if (value.endsWith("report.md")) return 1;
            if (value.endsWith("run_manifest.json")) return 1;
            if (value.endsWith("method_selection.json")) return 2;
            if (value.includes("per_image_metrics")) return 3;
            if (value.includes("summary")) return 4;
            if (value.endsWith("events.jsonl")) return 5;
            return 10;
          };
          return priority(a) - priority(b) || String(a.path || "").localeCompare(String(b.path || ""));
        })
        .slice(0, 12);
      const canvasItems = [latestRun, ...relatedItems];
      blockCanvasEl.innerHTML = `
        <div class="block-canvas-head">
          <div>
            <strong>Latest ${escapeHtml(selected.kind)} Run</strong>
            <span>${escapeHtml(selected.id)} · ${escapeHtml(run.status)} · ${escapeHtml(run.runId || "")}</span>
          </div>
          <div class="block-canvas-kpis">
            <span>${Number(run.failedSteps || 0)} failed steps</span>
            <span>${passed}/${Number(run.validations || 0)} validations</span>
            <span>${Number(run.methodSelections || 0)} method routes</span>
          </div>
        </div>
        ${renderOutputVersions(nodeRuns, latestRun.path)}
        ${renderBlockCanvasTabs(canvasItems)}
        ${blockCanvasFilter === "images" && !previewImages.length ? '<div class="message">No small image previews found for this run.</div>' : ""}
        ${renderBlockCanvasBody(canvasItems)}
        <div class="block-run-card run-detail-card" data-run-details="${escapeHtml(latestRun.path)}">
          <strong>Loading validation details and table previews...</strong>
        </div>
      `;
      loadRunCanvasDetails(latestRun.path, keyFiles).catch((error) => {
        const detailsEl = document.querySelector(`[data-run-details="${CSS.escape(latestRun.path)}"]`);
        if (detailsEl) detailsEl.innerHTML = `<strong>Run details could not load</strong><span>${escapeHtml(error.message)}</span>`;
      });
      return;
    }
    blockCanvasEl.innerHTML = `
      <strong>Block Artifact Canvas</strong>
      <span>Ask block chat to create or refine a segmentation block. AAPS will run a small preview when possible and show masks, overlays, tables, and reports here.</span>
    `;
    return;
  }
  const imageItems = items.filter((item) => item.kind === "image");
  blockCanvasEl.innerHTML = `
    <div class="block-canvas-head">
      <div>
        <strong>Block Artifact Canvas</strong>
        <span>${escapeHtml(preview.status || "prepared")} · ${escapeHtml(preview.previewRoot || payload.canvasPath || "")}</span>
      </div>
      <div class="block-canvas-kpis">
        <span>${items.length} artifacts</span>
        <span>${imageItems.length} images</span>
        <span>${formatBytes(items.reduce((sum, item) => sum + Number(item.size || 0), 0))}</span>
      </div>
    </div>
    ${renderBlockCanvasTabs(items)}
    ${!imageItems.length && blockCanvasFilter === "images" ? '<div class="message">No preview images were produced. Check stdout/stderr in the block log.</div>' : ""}
    ${renderBlockCanvasBody(items)}
  `;
}

function renderArtifacts(payload = currentArtifacts) {
  currentArtifacts = payload || { items: [], counts: {}, kindCounts: {} };
  const items = currentArtifacts.items || [];
  const counts = currentArtifacts.counts || {};
  const kindCounts = currentArtifacts.kindCounts || {};
  if (!artifactSummaryEl || !artifactListEl) return;
  const totalSize = items.reduce((sum, item) => sum + Number(item.size || 0), 0);
  artifactSummaryEl.innerHTML = `
    <div class="project-kpis">
      <div class="project-kpi"><strong>${items.length}</strong>recent files</div>
      <div class="project-kpi"><strong>${formatBytes(totalSize)}</strong>listed size</div>
      <div class="project-kpi"><strong>${counts.outputs || 0}</strong>outputs</div>
      <div class="project-kpi"><strong>${counts.studio_runs || 0}</strong>run files</div>
      <div class="project-kpi"><strong>${counts.studio_artifacts || 0}</strong>chat artifacts</div>
      <div class="project-kpi"><strong>${kindCounts.image || 0}</strong>images</div>
      <div class="project-kpi"><strong>${kindCounts.run || 0}</strong>runs</div>
    </div>
  `;
  const shownItems = items.filter((item) => artifactMatchesFilter(item));
  artifactListEl.innerHTML = shownItems.length
    ? (() => {
        let previewedImages = 0;
        return shownItems
        .map((item) => {
          const kind = artifactDisplayKind(item);
          const isSmallPreview = kind === "image" && Number(item.size || 0) <= 2_500_000 && previewedImages < 12;
          if (isSmallPreview) previewedImages += 1;
          return `
            <article class="artifact-item${isSmallPreview ? "" : " artifact-item--compact"}${item.path === selectedArtifactPath ? " is-selected" : ""}">
              ${isSmallPreview ? `<img src="${artifactFileUrl(item.path)}" alt="${escapeHtml(item.path)}" loading="lazy" />` : ""}
              <div>
                <strong>${escapeHtml(item.path)}</strong>
                <span>${escapeHtml(item.source)} · <span class="artifact-kind">${escapeHtml(kind)}</span> · ${formatBytes(item.size)}${kind === "image" && !isSmallPreview ? " · preview opens on select" : ""}</span>
                ${
                  item.runSummary
                    ? `<span class="run-artifact-summary">${escapeHtml(item.runSummary.status)} · ${Number(item.runSummary.failedSteps || 0)} failed steps · ${Number(item.runSummary.validations || 0) - Number(item.runSummary.failedValidations || 0)}/${Number(item.runSummary.validations || 0)} validations passed · ${escapeHtml(item.runSummary.runId || "")}</span>`
                    : ""
                }
                <div class="artifact-actions">
                  <button type="button" data-artifact-path="${escapeAttr(item.path)}">Preview</button>
                  <a href="${artifactFileUrl(item.path)}" target="_blank" rel="noopener noreferrer">Open raw</a>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
      })()
    : '<div class="message">No artifacts match this filter yet. Run or compile a workflow first.</div>';
  if (selectedRef) renderBlockCanvas(null);
}

async function loadArtifacts(path = projectPathEl.value || ".") {
  const response = await fetch(`/api/aaps/artifacts?path=${encodeURIComponent(path)}&limit=240`);
  if (!response.ok) throw new Error(`artifacts API returned ${response.status}`);
  const payload = await response.json();
  renderArtifacts(payload);
  return payload;
}

function renderVersions(payload = currentVersions) {
  currentVersions = payload || { items: [], count: 0 };
  const items = currentVersions.items || [];
  if (!versionsSummaryEl || !versionsListEl) return;
  const fileCount = new Set(items.map((item) => item.file)).size;
  versionsSummaryEl.innerHTML = `
    <div class="project-kpis">
      <div class="project-kpi"><strong>${items.length}</strong>snapshots</div>
      <div class="project-kpi"><strong>${fileCount}</strong>files</div>
      <div class="project-kpi"><strong>${formatBytes(items.reduce((sum, item) => sum + Number(item.size || 0), 0))}</strong>listed size</div>
    </div>
  `;
  versionsListEl.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="version-item">
              <div>
                <strong>${escapeHtml(item.file)}</strong>
                <span>${escapeHtml(item.action)} · ${escapeHtml(item.time || "unknown time")} · ${formatBytes(item.size)}</span>
                <code>${escapeHtml(item.snapshot)}</code>
              </div>
              <button type="button" data-restore-version="${escapeHtml(item.snapshot)}">Restore</button>
            </article>
          `
        )
        .join("")
    : '<div class="message">No snapshots yet. Save a block, workflow, script, or manifest first.</div>';
}

async function loadVersions(path = projectPathEl.value || ".") {
  const response = await fetch(`/api/aaps/versions?path=${encodeURIComponent(path)}&limit=120`);
  if (!response.ok) throw new Error(`versions API returned ${response.status}`);
  const payload = await response.json();
  renderVersions(payload);
  return payload;
}

async function restoreVersion(snapshot) {
  const response = await fetch("/api/aaps/versions/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: projectPathEl.value || ".", snapshot }),
  });
  if (!response.ok) throw new Error(`version restore returned ${response.status}`);
  const payload = await response.json();
  renderProject(payload);
  if (payload.restored?.file?.endsWith(".aaps")) {
    await loadProjectFile(payload.restored.file);
  }
  loadArtifacts(projectPathEl.value || ".").catch(() => {});
  loadVersions(projectPathEl.value || ".").catch(() => {});
  if (payload.restored?.file) {
    addMessage("assistant", `Restored ${payload.restored.file} from ${snapshot}.`);
  }
  return payload;
}

function renderSettings(settings = currentSettings) {
  currentSettings = { ...currentSettings, ...(settings || {}) };
  if (agentProviderEl) agentProviderEl.value = currentSettings.agentProvider || "codex";
  if (codexModelEl) codexModelEl.value = currentSettings.codexModel || "gpt-5.3-codex";
  if (codexReasoningEl) codexReasoningEl.value = currentSettings.codexReasoning || "medium";
  if (deepseekModelEl) deepseekModelEl.value = currentSettings.deepseekModel || "deepseek-v4-pro";
  if (deepseekBaseUrlEl) deepseekBaseUrlEl.value = currentSettings.deepseekBaseUrl || "https://api.deepseek.com";
  if (agintiProviderEl) agintiProviderEl.value = currentSettings.agintiProvider || "deepseek";
  if (agintiSafetyEl) agintiSafetyEl.value = currentSettings.agintiSafety || "normal";
  if (agintiSessionIdEl) agintiSessionIdEl.value = currentSettings.agintiSessionId || "";
  if (autoCompileAfterChatEl) autoCompileAfterChatEl.checked = currentSettings.autoCompileAfterChat !== false;
  if (agentContextPackEl) agentContextPackEl.checked = currentSettings.agentContextPack !== false;
  if (autoSaveAgentEditsEl) autoSaveAgentEditsEl.checked = currentSettings.autoSaveAgentEdits !== false;
  if (settingsStatusEl) {
    const provider = currentSettings.agentProvider || "codex";
    const label = provider === "deepseek"
      ? currentSettings.deepseekModel
      : provider === "aginti"
        ? `${currentSettings.agintiProvider || "deepseek"} · ${currentSettings.agintiSessionId || "new persistent session"}`
        : currentSettings.codexModel;
    settingsStatusEl.textContent = `${provider} · ${label}`;
  }
  if (settingsAvailabilityEl) {
    const availability = [
      ["Codex CLI", currentSettings.codexAvailable],
      ["DeepSeek key", currentSettings.deepseekKeyAvailable],
      ["OpenAI key", currentSettings.openaiKeyAvailable],
      ["AgInTiFlow CLI", currentSettings.agintiflowAvailable],
      ["Context pack", currentSettings.agentContextPack !== false],
      ["Versioned agent edits", currentSettings.autoSaveAgentEdits !== false],
    ];
    settingsAvailabilityEl.innerHTML = availability
      .map(([label, ok]) => `<span class="${ok ? "ok" : "warn"}">${escapeHtml(label)}: ${ok ? "available" : "missing"}</span>`)
      .join("");
  }
}

function collectSettings() {
  return {
    agentProvider: agentProviderEl?.value || "codex",
    codexModel: codexModelEl?.value.trim() || "gpt-5.3-codex",
    codexReasoning: codexReasoningEl?.value || "medium",
    deepseekModel: deepseekModelEl?.value || "deepseek-v4-pro",
    deepseekBaseUrl: deepseekBaseUrlEl?.value.trim() || "https://api.deepseek.com",
    agintiProvider: agintiProviderEl?.value || "deepseek",
    agintiSafety: agintiSafetyEl?.value || "normal",
    agintiSessionId: agintiSessionIdEl?.value.trim() || "",
    agentContextPack: Boolean(agentContextPackEl?.checked),
    autoCompileAfterChat: Boolean(autoCompileAfterChatEl?.checked),
    autoSaveAgentEdits: Boolean(autoSaveAgentEditsEl?.checked),
  };
}

async function loadSettings() {
  const response = await fetch("/api/aaps/settings");
  if (!response.ok) throw new Error(`settings API returned ${response.status}`);
  const settings = await response.json();
  renderSettings(settings);
  return settings;
}

async function saveSettings() {
  const response = await fetch("/api/aaps/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectSettings()),
  });
  if (!response.ok) throw new Error(`settings save returned ${response.status}`);
  const settings = await response.json();
  renderSettings(settings);
  addMessage("assistant", `Saved ${settings.agentProvider} backend settings.`);
  return settings;
}

function getIr() {
  return AAPS.parseAAPS(sourceEl.value);
}

function setIr(ir) {
  sourceEl.value = AAPS.serializeAAPS(ir);
  render();
}

function setIrAndSelect(ir, nodeId, options = {}) {
  selectedRef = nodeRefById(ir, nodeId) || selectedRef;
  sourceEl.value = AAPS.serializeAAPS(ir);
  render();
  if (options.editInBlocks) activateTab("lab");
  return selectedRef;
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

function rootListForRef(ir, name) {
  if (name === "agent") return ir.pipeline.agents || (ir.pipeline.agents = []);
  if (name === "block") return ir.pipeline.blocks || (ir.pipeline.blocks = []);
  if (name === "skill") return ir.pipeline.skills || (ir.pipeline.skills = []);
  if (name === "task") return ir.pipeline.tasks || (ir.pipeline.tasks = []);
  return null;
}

function nodeLocationByRef(ir, ref) {
  if (!ref) return null;
  const parts = String(ref).split("/");
  const first = parts.shift();
  const rootMatch = first?.match(/^(agent|block|skill|task):(\d+)$/);
  if (!rootMatch) return null;
  let list = rootListForRef(ir, rootMatch[1]);
  let listRef = rootMatch[1];
  let index = Number(rootMatch[2]);
  let parent = null;
  let parentRef = "";
  let node = list?.[index];
  if (!node) return null;
  for (const part of parts) {
    const match = part.match(/^children:(\d+)$/);
    if (!match) return null;
    parent = node;
    parentRef = `${listRef}:${index}`;
    list = parent.children || (parent.children = []);
    listRef = `${parentRef}/children`;
    index = Number(match[1]);
    node = list[index];
    if (!node) return null;
  }
  return { list, listRef, index, node, parent, parentRef, ref: `${listRef}:${index}` };
}

function nodeRefById(ir, id) {
  const target = String(id || "").trim();
  if (!target) return "";
  function walk(nodes, listRef) {
    for (let index = 0; index < (nodes || []).length; index += 1) {
      const node = nodes[index];
      const ref = `${listRef}:${index}`;
      if (node.id === target) return ref;
      const childRef = walk(node.children || [], `${ref}/children`);
      if (childRef) return childRef;
    }
    return "";
  }
  return (
    walk(ir.pipeline.agents || [], "agent") ||
    walk(ir.pipeline.blocks || [], "block") ||
    walk(ir.pipeline.skills || [], "skill") ||
    walk(ir.pipeline.tasks || [], "task")
  );
}

function uniqueIdFromUsed(base, used) {
  const clean = AAPS.slug(base || "node") || "node";
  let candidate = clean;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${clean}_${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function cloneNodeForInsert(node, ir, suffix = "copy") {
  const used = new Set(allNodes(ir).map((item) => item.id));
  function cloneWithIds(item) {
    const copy = clone(item);
    copy.id = uniqueIdFromUsed(`${copy.id || copy.kind}_${suffix}`, used);
    copy.children = (copy.children || []).map(cloneWithIds);
    return copy;
  }
  return cloneWithIds(node);
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
    lab: t("lab"),
    program: t("program"),
    project: t("project"),
  }[tab] || "Studio";
}

function projectFileRole(file) {
  const value = String(file || "").trim();
  if (value.startsWith("blocks/")) return "block";
  if (value.startsWith("skills/")) return "skill";
  if (value.startsWith("modules/")) return "module";
  if (value.startsWith("subworkflows/") || value.startsWith("workflows/")) return "program";
  if (value.startsWith("drafts/")) return "draft";
  return value.endsWith(".aaps") ? "program" : "file";
}

function rememberSelectedProjectFile(file) {
  const value = String(file || "").trim();
  if (!value) return;
  const role = projectFileRole(value);
  if (role === "block") {
    selectedBlockFile = value;
    localStorage.setItem("aaps.studio.selectedBlockFile", value);
    return;
  }
  if (role === "program") {
    selectedProgramFile = value;
    selectedWorkflowFile = value;
    localStorage.setItem("aaps.studio.selectedProgramFile", value);
    localStorage.setItem("aaps.studio.selectedWorkflowFile", value);
  }
}

function selectedAapsScope() {
  const manifest = getProjectManifest();
  const activeFile = manifest.activeFile || manifest.defaultMain || "";
  if (activeFile) rememberSelectedProjectFile(activeFile);
  const workingFile = activeFile || selectedBlockFile || selectedProgramFile || selectedWorkflowFile || "";
  return {
    activeFile,
    workingFile,
    workingRole: projectFileRole(workingFile),
    selectedWorkflowFile: selectedWorkflowFile || manifest.defaultMain || "",
    selectedProgramFile: selectedProgramFile || manifest.defaultMain || "",
    selectedBlockFile,
  };
}

function selectedScopeLabel() {
  const scope = selectedAapsScope();
  const parts = [];
  if (scope.selectedWorkflowFile) parts.push(`workflow ${scope.selectedWorkflowFile}`);
  if (scope.selectedProgramFile && scope.selectedProgramFile !== scope.selectedWorkflowFile) {
    parts.push(`program ${scope.selectedProgramFile}`);
  }
  if (scope.selectedBlockFile) parts.push(`block ${scope.selectedBlockFile}`);
  if (scope.workingFile && !parts.some((part) => part.includes(scope.workingFile))) {
    parts.push(`editing ${scope.workingFile}`);
  }
  return parts.join(" · ");
}

function activeFileMatches(file, manifest) {
  return (
    file === manifest.activeFile ||
    file === selectedWorkflowFile ||
    file === selectedProgramFile ||
    file === selectedBlockFile ||
    file === openTextFile
  );
}

function projectFileClasses(file, manifest) {
  const classes = ["project-file"];
  if (activeFileMatches(file, manifest)) classes.push("is-active");
  if (file === selectedWorkflowFile || file === selectedProgramFile || file === selectedBlockFile) {
    classes.push("is-selected-file");
  }
  return classes.join(" ");
}

function projectFileEditLabel(file) {
  const role = projectFileRole(file);
  if (role === "block" || role === "skill") return "Edit in Blocks";
  if (role === "program" || role === "module") return "Edit in Programs";
  return "Edit";
}

function canEditProjectAapsFile(file) {
  return ["block", "skill", "program", "module"].includes(projectFileRole(file));
}

function projectFileRow(file, stateLabel, manifest) {
  const editButton = canEditProjectAapsFile(file)
    ? `<button class="project-file-edit" type="button" data-project-edit-file="${escapeAttr(file)}" title="${escapeAttr(projectFileEditLabel(file))}" aria-label="${escapeAttr(`${projectFileEditLabel(file)}: ${file}`)}">...</button>`
    : "";
  return `
    <div class="project-file-row">
      <button class="${escapeAttr(projectFileClasses(file, manifest))}" type="button" data-project-file="${escapeAttr(file)}" aria-pressed="${activeFileMatches(file, manifest) ? "true" : "false"}">
        <span>${escapeHtml(file)}</span>
        <span>${escapeHtml(stateLabel)}</span>
      </button>
      ${editButton}
    </div>
  `;
}

function renderProgramSelectors(manifest) {
  if (!programWorkflowSelectEl || !programBlockSelectEl) return;
  const workflows = [
    ...(manifest.files?.workflows || []),
    ...(manifest.files?.subworkflows || []),
    ...(manifest.files?.modules || []),
  ].filter(Boolean);
  const blocks = [...(manifest.files?.blocks || []), ...(manifest.files?.skills || [])].filter(Boolean);
  const workflowValue = selectedProgramFile || selectedWorkflowFile || manifest.activeFile || manifest.defaultMain || workflows[0] || "";
  const blockValue = selectedBlockFile || blocks[0] || "";
  programWorkflowSelectEl.innerHTML = workflows.length
    ? workflows
        .map((file) => `<option value="${escapeAttr(file)}"${file === workflowValue ? " selected" : ""}>${escapeHtml(file)}</option>`)
        .join("")
    : '<option value="">No workflows</option>';
  programBlockSelectEl.innerHTML = blocks.length
    ? blocks
        .map((file) => `<option value="${escapeAttr(file)}"${file === blockValue ? " selected" : ""}>${escapeHtml(file)}</option>`)
        .join("")
    : '<option value="">No blocks</option>';
  if (programActiveSummaryEl) {
    programActiveSummaryEl.textContent = `Program: ${workflowValue || "(none)"} · Block: ${blockValue || "(none)"} · Active: ${manifest.activeFile || manifest.defaultMain || "(none)"}`;
  }
}

function firstNodeRef(ir, preferredKinds = []) {
  const preferred = new Set(preferredKinds);
  const rootGroups = [
    ["block", ir.pipeline.blocks || []],
    ["skill", ir.pipeline.skills || []],
    ["task", ir.pipeline.tasks || []],
    ["agent", ir.pipeline.agents || []],
  ];
  for (const [prefix, nodes] of rootGroups) {
    if (nodes.length && (!preferred.size || preferred.has(prefix))) return `${prefix}:0`;
  }
  for (const [prefix, nodes] of rootGroups) {
    if (nodes.length) return `${prefix}:0`;
  }
  return "";
}

function setChatStatus(text) {
  chatStatusEl.textContent = text;
}

function setTemplateActive(name) {
  document.querySelectorAll("[data-template-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.templateChoice === name);
  });
}

function updateChatContext() {
  const selected = nodeRefs.get(selectedRef);
  const suffix = selected ? ` · ${selected.kind} ${selected.id}` : "";
  const scope = selectedScopeLabel();
  chatContextEl.textContent = `${tabLabel(activeTab)}${scope ? ` · ${scope}` : ""}${suffix}`;
}

function activateTab(tab, persist = true) {
  const target = document.querySelector(`[data-panel="${tab}"]`) ? tab : "project";
  document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("is-active", item.dataset.tab === target));
  document.querySelectorAll("[data-panel]").forEach((item) => item.classList.toggle("is-active", item.dataset.panel === target));
  activeTab = target;
  if (persist) localStorage.setItem("aaps.studio.activeTab", target);
  updateChatContext();
}

function setHistoryOpen(open) {
  chatHistoryPanelEl.classList.toggle("is-open", open);
  chatHistoryPanelEl.setAttribute("aria-hidden", open ? "false" : "true");
  chatHistoryOverlayEl.hidden = !open;
  if (open) loadChatHistory().catch(() => {});
}

function setCreateProjectOpen(open) {
  if (!createProjectModalEl || !createProjectOverlayEl) return;
  createProjectModalEl.classList.toggle("is-open", open);
  createProjectModalEl.setAttribute("aria-hidden", open ? "false" : "true");
  createProjectOverlayEl.hidden = !open;
  if (open) {
    const base = projectPathEl.value && projectPathEl.value !== "." ? `${projectPathEl.value}/projects/new-aaps-project` : "projects/new-aaps-project";
    if (newProjectPathEl && !newProjectPathEl.value.trim()) newProjectPathEl.value = base;
    window.setTimeout(() => newProjectPathEl?.focus(), 0);
  }
}

function setArtifactModalOpen(open) {
  if (!artifactModalEl || !artifactModalOverlayEl) return;
  artifactModalEl.classList.toggle("is-open", open);
  artifactModalEl.setAttribute("aria-hidden", open ? "false" : "true");
  artifactModalOverlayEl.hidden = !open;
  if (open) {
    renderArtifacts(currentArtifacts);
    if (!selectedArtifactPath && (currentArtifacts.items || []).length) {
      previewArtifact(currentArtifacts.items[0]).catch(() => {});
    }
  }
}

function setSkillEditOpen(open) {
  if (!skillEditModalEl || !skillEditOverlayEl) return;
  skillEditModalEl.classList.toggle("is-open", open);
  skillEditModalEl.setAttribute("aria-hidden", open ? "false" : "true");
  skillEditOverlayEl.hidden = !open;
  if (open) window.setTimeout(() => skillEditFields.prompt?.focus(), 0);
}

function setNodeDetailOpen(open) {
  if (!nodeDetailModalEl || !nodeDetailOverlayEl) return;
  nodeDetailModalEl.classList.toggle("is-open", open);
  nodeDetailModalEl.setAttribute("aria-hidden", open ? "false" : "true");
  nodeDetailOverlayEl.hidden = !open;
  if (open) {
    window.setTimeout(() => {
      if (nodeDetailMode === "edit") nodeDetailFields.title?.focus();
    }, 0);
  }
}

function setNodeDetailMode(mode) {
  nodeDetailMode = mode === "inspect" ? "inspect" : "edit";
  nodeDetailEditTabEl?.classList.toggle("is-active", nodeDetailMode === "edit");
  nodeDetailInspectTabEl?.classList.toggle("is-active", nodeDetailMode === "inspect");
  if (nodeDetailEditFormEl) nodeDetailEditFormEl.hidden = nodeDetailMode !== "edit";
  if (nodeDetailInspectorEl) nodeDetailInspectorEl.hidden = nodeDetailMode !== "inspect";
  if (nodeDetailSubtitleEl) {
    nodeDetailSubtitleEl.textContent =
      nodeDetailMode === "inspect"
        ? "Read the complete block contract, run evidence, and output roots without changing source."
        : "Edit the selected block contract. Save reparses and redraws the source, inline inspector, and canvas.";
  }
}

function fillNodeDetailEditor(node) {
  if (!node) return;
  if (nodeDetailTitleEl) nodeDetailTitleEl.textContent = `${node.kind} ${node.id}`;
  if (nodeDetailFields.kind) nodeDetailFields.kind.value = node.kind || "";
  if (nodeDetailFields.id) nodeDetailFields.id.value = node.id || "";
  if (nodeDetailFields.title) nodeDetailFields.title.value = node.title || "";
  if (nodeDetailFields.prompt) nodeDetailFields.prompt.value = node.prompt || "";
  if (nodeDetailFields.inputs) nodeDetailFields.inputs.value = portLines(node.inputs || []);
  if (nodeDetailFields.outputs) nodeDetailFields.outputs.value = portLines(node.outputs || []);
  if (nodeDetailFields.artifacts) nodeDetailFields.artifacts.value = portLines(node.artifacts || []);
  if (nodeDetailFields.exec) nodeDetailFields.exec.value = execLines(node.exec || []);
  if (nodeDetailFields.args) nodeDetailFields.args.value = keyValueLines(node.args || {});
  if (nodeDetailFields.requirements) nodeDetailFields.requirements.value = requirementsLines(node.requirements || {});
  if (nodeDetailFields.environment) nodeDetailFields.environment.value = environmentLines(node.environment || {});
  if (nodeDetailFields.compilePrompt) nodeDetailFields.compilePrompt.value = node.compile?.prompt || "";
  if (nodeDetailFields.code) nodeDetailFields.code.value = node.code || (node.exec && node.exec[0] && node.exec[0].code) || "";
  if (nodeDetailFields.run) nodeDetailFields.run.value = (node.run || []).join("\n");
  if (nodeDetailFields.validations) nodeDetailFields.validations.value = (node.validations || []).join("\n");
  if (nodeDetailFields.verify) nodeDetailFields.verify.value = (node.verify || []).join("\n");
  if (nodeDetailFields.recovery) nodeDetailFields.recovery.value = (node.recovery || []).join("\n");
  if (nodeDetailFields.repair) nodeDetailFields.repair.value = node.repair ? "true" : "false";
  if (nodeDetailFields.fallback) nodeDetailFields.fallback.value = node.fallback || "";
  if (nodeDetailFields.reviews) nodeDetailFields.reviews.value = (node.reviews || []).join("\n");
}

function nodeDetailPillList(items, empty = "none") {
  const values = (items || []).filter(Boolean);
  if (!values.length) return `<span class="node-detail-empty">${escapeHtml(empty)}</span>`;
  return values.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
}

function nodeDetailPortsHtml(title, ports) {
  const rows = (ports || []).map((port) => `<tr><td>${escapeHtml(port.name || "")}</td><td>${escapeHtml(port.type || "")}</td><td>${escapeHtml(port.value || "")}</td></tr>`).join("");
  return `
    <section class="node-detail-section">
      <h3>${escapeHtml(title)}</h3>
      ${
        rows
          ? `<table><thead><tr><th>Name</th><th>Type</th><th>Path / Value</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<div class="node-detail-empty">No declared ports.</div>'
      }
    </section>
  `;
}

function renderNodeDetailInspector(node) {
  if (!nodeDetailInspectorEl || !node) return;
  const latestRun = latestRunForNode(node);
  const roots = artifactRootsForNode(node);
  const requirements = node.requirements || {};
  const run = latestRun?.runSummary || {};
  nodeDetailInspectorEl.innerHTML = `
    <div class="node-detail-summary">
      <div><strong>${escapeHtml(node.kind)}</strong><span>kind</span></div>
      <div><strong>${escapeHtml(node.id || "")}</strong><span>id</span></div>
      <div><strong>${(node.inputs || []).length}</strong><span>inputs</span></div>
      <div><strong>${(node.outputs || []).length}</strong><span>outputs</span></div>
      <div><strong>${(node.artifacts || []).length}</strong><span>artifacts</span></div>
      <div><strong>${(node.validations || []).length}</strong><span>validations</span></div>
    </div>
    <section class="node-detail-section">
      <h3>Purpose</h3>
      <p>${escapeHtml(node.prompt || "No prompt/purpose is written yet.")}</p>
    </section>
    ${nodeDetailPortsHtml("Inputs", node.inputs || [])}
    ${nodeDetailPortsHtml("Outputs", node.outputs || [])}
    ${nodeDetailPortsHtml("Artifacts", node.artifacts || [])}
    <section class="node-detail-section">
      <h3>Requirements</h3>
      <div class="node-detail-pills">
        ${nodeDetailPillList([
          ...(requirements.commands || []).map((item) => `command: ${item}`),
          ...(requirements.files || []).map((item) => `file: ${item}`),
          ...(requirements.tools || []).map((item) => `tool: ${item}`),
          ...(requirements.pythonPackages || []).map((item) => `python: ${item}`),
          ...(requirements.nodePackages || []).map((item) => `node: ${item}`),
        ])}
      </div>
    </section>
    <section class="node-detail-section">
      <h3>Manifest Contract</h3>
      <p><strong>Agent:</strong> ${escapeHtml(node.compile?.agent || "(inherit/default)")}</p>
      <pre>${escapeHtml(node.compile?.prompt || "No compile prompt declared.")}</pre>
    </section>
    <section class="node-detail-section">
      <h3>Validation and Review</h3>
      <div class="node-detail-pills">${nodeDetailPillList(node.validations || [])}</div>
      <div class="node-detail-pills">${nodeDetailPillList(node.reviews || [], "no human-review steps")}</div>
    </section>
    <section class="node-detail-section">
      <h3>Output Roots</h3>
      <div class="node-detail-pills">${nodeDetailPillList(roots, "no resolvable output roots")}</div>
    </section>
    <section class="node-detail-section">
      <h3>Latest Run Evidence</h3>
      ${
        latestRun
          ? `<p><strong>${escapeHtml(run.status || "run")}</strong> · ${escapeHtml(run.runId || "")} · ${escapeHtml(run.file || "")}</p>
             <p>${Number(run.failedSteps || 0)} failed steps · ${Number(run.failedValidations || 0)} failed validations · ${Number(run.methodSelections || 0)} method routes</p>
             <a href="${artifactFileUrl(latestRun.path)}" target="_blank" rel="noopener noreferrer">${escapeHtml(latestRun.path)}</a>`
          : "<p>No run evidence is linked to this block yet.</p>"
      }
    </section>
  `;
}

function nodeFromDetailFields(baseNode) {
  const node = clone(baseNode || {});
  node.id = AAPS.slug(nodeDetailFields.id?.value || node.id || node.kind || "node");
  node.title = nodeDetailFields.title?.value.trim() || "";
  node.prompt = nodeDetailFields.prompt?.value.trim() || "";
  node.inputs = parsePorts(nodeDetailFields.inputs?.value || "");
  node.outputs = parsePorts(nodeDetailFields.outputs?.value || "");
  node.artifacts = parsePorts(nodeDetailFields.artifacts?.value || "");
  node.exec = parseExecActions(nodeDetailFields.exec?.value || "");
  node.args = parseKeyValues(nodeDetailFields.args?.value || "");
  node.requirements = parseRequirements(nodeDetailFields.requirements?.value || "");
  node.environment = parseEnvironment(nodeDetailFields.environment?.value || "");
  node.compile = {
    ...(node.compile || {}),
    prompt: nodeDetailFields.compilePrompt?.value.trim() || "",
    onMissing: (node.compile && node.compile.onMissing) || "prompt",
  };
  node.code = nodeDetailFields.code?.value.trim() || "";
  if (node.code && node.exec.length) node.exec[node.exec.length - 1].code = node.code;
  if (node.exec.length) node.exec[node.exec.length - 1].args = { ...node.args };
  node.run = parseLines(nodeDetailFields.run?.value || "");
  node.validations = parseLines(nodeDetailFields.validations?.value || "");
  node.verify = parseLines(nodeDetailFields.verify?.value || "");
  node.recovery = parseLines(nodeDetailFields.recovery?.value || "");
  node.repair = /^(true|yes|on|1)$/i.test(nodeDetailFields.repair?.value.trim() || "");
  node.fallback = nodeDetailFields.fallback?.value.trim() || "";
  node.reviews = parseLines(nodeDetailFields.reviews?.value || "");
  return node;
}

function saveNodeDetailEdit() {
  const ir = getIr();
  const loc = nodeLocationByRef(ir, nodeDetailRef || selectedRef);
  if (!loc) throw new Error("Could not find the selected block to save.");
  const updated = nodeFromDetailFields(loc.node);
  loc.list[loc.index] = updated;
  selectedRef = `${loc.listRef}:${loc.index}`;
  nodeDetailRef = selectedRef;
  sourceEl.value = AAPS.serializeAAPS(ir);
  render();
  fillNodeDetailEditor(updated);
  renderNodeDetailInspector(updated);
  addMessage("assistant", `Saved ${updated.kind} ${updated.id}.`);
  return updated;
}

function openNodeDetail(ref, mode = "edit") {
  const ir = getIr();
  const loc = nodeLocationByRef(ir, ref || selectedRef);
  if (!loc) return;
  selectedRef = `${loc.listRef}:${loc.index}`;
  nodeDetailRef = selectedRef;
  render();
  fillNodeDetailEditor(loc.node);
  renderNodeDetailInspector(loc.node);
  setNodeDetailMode(mode);
  setNodeDetailOpen(true);
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

function responseTextFromEvent(event) {
  const response = event?.response || {};
  if (typeof response === "string") return response;
  return response.message || response.summary || response.error || JSON.stringify(response, null, 2).slice(0, 1200);
}

async function loadChatHistory() {
  const scope = selectedAapsScope();
  const selected = nodeRefs.get(selectedRef);
  const historyScope = activeTab === "lab" && selected ? "block" : activeTab || "program";
  const historyId = activeTab === "lab" && selected ? selected.id : scope.workingFile || scope.activeFile || selectedRef || "active";
  const response = await fetch(
    `/api/aaps/history?path=${encodeURIComponent(projectPathEl.value || ".")}&scope=${encodeURIComponent(historyScope)}&id=${encodeURIComponent(historyId)}`
  );
  if (!response.ok) return;
  const payload = await response.json();
  const events = payload.events || [];
  if (!events.length) return;
  chatLogEl.innerHTML = "";
  chatMessageCount = 0;
  events.forEach((event) => {
    if (event.message) addMessage("user", event.message);
    addMessage("assistant", responseTextFromEvent(event));
  });
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

function closeNodeMenus(exceptRef = "") {
  document.querySelectorAll("[data-node-menu-panel]").forEach((panel) => {
    if (exceptRef && panel.dataset.nodeMenuPanel === exceptRef) return;
    panel.hidden = true;
    panel.style.left = "";
    panel.style.top = "";
    panel.closest(".node-card-tools")?.classList.remove("is-open");
  });
}

function toggleNodeMenu(ref, trigger = null) {
  const panel = trigger?.closest(".node-card-tools")?.querySelector(`[data-node-menu-panel="${CSS.escape(ref)}"]`) || document.querySelector(`[data-node-menu-panel="${CSS.escape(ref)}"]`);
  if (!panel) return;
  const willOpen = panel.hidden;
  closeNodeMenus();
  panel.hidden = !willOpen;
  panel.closest(".node-card-tools")?.classList.toggle("is-open", willOpen);
  if (willOpen && trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 8;
    const dockRect = document.querySelector(".chat-dock")?.getBoundingClientRect();
    const safeBottom = dockRect ? Math.max(gap, dockRect.top - gap) : window.innerHeight - gap;
    const below = triggerRect.bottom + gap;
    const above = triggerRect.top - panelRect.height - gap;
    const top = below + panelRect.height <= safeBottom ? below : Math.max(gap, above);
    const left = Math.min(window.innerWidth - panelRect.width - gap, Math.max(gap, triggerRect.right - panelRect.width));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }
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
    <article class="node-card${selectedClass}" data-ref="${escapeHtml(ref)}" data-node-kind="${escapeAttr(node.kind)}" draggable="true" tabindex="0" aria-selected="${ref === selectedRef ? "true" : "false"}" style="border-left-color:${nodeColor(node.kind)}">
      <div class="node-top">
        <div>
          <div class="node-kind">${escapeHtml(node.kind)}</div>
          <div class="node-id">${escapeHtml(node.id)}</div>
        </div>
        <div class="node-card-tools">
          <div class="node-kind">${(node.inputs || []).length} in / ${(node.outputs || []).length} out / ${(node.artifacts || []).length} art</div>
          <button class="node-more" type="button" data-node-menu-ref="${escapeAttr(ref)}" aria-label="Open block actions">...</button>
          <div class="node-menu-panel" data-node-menu-panel="${escapeAttr(ref)}" hidden>
            <button type="button" data-open-node-editor-ref="${escapeAttr(ref)}">Editor popup</button>
            <button type="button" data-open-node-inspector-ref="${escapeAttr(ref)}">Inspector popup</button>
            <button type="button" data-select-node-ref="${escapeAttr(ref)}">Focus inline</button>
          </div>
        </div>
      </div>
      <div class="node-actions">
        <button type="button" data-select-node-ref="${escapeHtml(ref)}">Select</button>
        <button type="button" data-open-node-editor-ref="${escapeHtml(ref)}">Editor</button>
        <button type="button" data-open-node-inspector-ref="${escapeHtml(ref)}">Inspector</button>
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

function blockFileGroup(file) {
  const lower = String(file || "").toLowerCase();
  if (lower.includes("app80")) return "APP80";
  if (lower.includes("app65")) return "APP65";
  if (lower.includes("app81")) return "APP81";
  if (lower.includes("segment")) return "Segmentation";
  if (lower.includes("quant")) return "Quantification";
  if (lower.includes("visual")) return "Visualization";
  if (lower.includes("tdv_browser")) return "Browser TDV";
  const parts = String(file || "").split("/");
  return parts.length > 2 ? parts[1] : "General";
}

function renderProjectBlockFiles() {
  const manifest = AAPS.normalizeProjectManifest(currentProjectPayload.manifest || AAPS.sampleProject);
  const files = manifest.files?.blocks || [];
  if (!files.length) return "";
  const groups = new Map();
  files.forEach((file) => {
    const group = blockFileGroup(file);
    groups.set(group, [...(groups.get(group) || []), file]);
  });
  return `
    <section class="tree-section block-file-section">
      <h3>Project Block Files</h3>
      ${[...groups.entries()]
        .map(
          ([group, groupFiles]) => `
            <div class="block-file-group">
              <strong>${escapeHtml(group)}</strong>
              ${groupFiles
                .map(
                  (file) => projectFileRow(file, (currentProjectPayload.files || []).includes(file) ? "found" : "listed", manifest)
                )
                .join("")}
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderBlockBrowser(ir) {
  if (!blockBrowserEl) return;
  const sourceSections = [
    renderSection("Blocks", ir.pipeline.blocks || [], "block"),
    renderSection("Skills", ir.pipeline.skills || [], "skill"),
    renderSection("Tasks", ir.pipeline.tasks || [], "task"),
  ].join("");
  const sections = [sourceSections, renderProjectBlockFiles()].join("");
  blockBrowserEl.innerHTML = sections || '<div class="message">No current blocks. Add a reusable block or ask block chat to create one.</div>';
  blockBrowserEl.querySelectorAll('.node-card[data-node-kind="skill"]').forEach((card) => {
    card.onclick = (event) => {
      if (event.target.closest("button")) return;
      event.stopPropagation();
      openSkillNodeEditor(card.dataset.ref);
    };
  });
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
    renderBlockCanvas(null);
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
  renderBlockCanvas(null);
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
  renderBlockBrowser(ir);
  blockCountEl.textContent = `${totalNodes} block${totalNodes === 1 ? "" : "s"}`;
  irSummaryEl.textContent = `${totalNodes} node${totalNodes === 1 ? "" : "s"}`;
  diagnosticsEl.textContent = ir.diagnostics.length
    ? `${ir.diagnostics.length} diagnostic${ir.diagnostics.length === 1 ? "" : "s"}`
    : "Ready";
  irEl.textContent = JSON.stringify(ir, null, 2);
  fillInspector(nodeRefs.get(selectedRef));
  updateChatContext();
}

function selectNodeRef(ref, options = {}) {
  selectedRef = ref || "";
  render();
  if (options.editInBlocks) activateTab("lab");
}

function editSelectedInBlocks(ref = selectedRef) {
  if (!ref) {
    addMessage("assistant", "Select a program or block node first.");
    return;
  }
  selectNodeRef(ref, { editInBlocks: true });
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
  if (["stage", "method", "choose"].includes(kind)) {
    base.kind = kind;
    base.id = kind === "choose" ? "method_route" : `new_${kind}`;
    base.prompt =
      kind === "choose"
        ? "Choose the best available method and record why."
        : kind === "method"
          ? "Implement one concrete method path with declared outputs and validations."
          : "Group related method, action, and validation steps.";
    base.verify = kind === "choose" ? ["A method-selection decision is recorded."] : base.verify;
  }
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

function skillMaterializeFile(node) {
  return `${node?.kind === "skill" ? "skills" : "blocks"}/${AAPS.slug(node?.id || "reusable_skill")}.aaps`;
}

function collectSkillModalNode(base = {}) {
  const node = {
    ...clone(base || {}),
    kind: "skill",
    id: AAPS.slug(skillEditFields.id?.value || base.id || "reusable_skill"),
    title: skillEditFields.title?.value.trim() || "",
    prompt: skillEditFields.prompt?.value.trim() || "",
    inputs: parsePorts(skillEditFields.inputs?.value || ""),
    outputs: parsePorts(skillEditFields.outputs?.value || ""),
    requirements: parseRequirements(skillEditFields.requirements?.value || ""),
    compile: {
      ...(base.compile || {}),
      agent: (base.compile && base.compile.agent) || "codex_repair_agent",
      prompt: skillEditFields.compilePrompt?.value.trim() || "",
      onMissing: (base.compile && base.compile.onMissing) || "prompt",
    },
  };
  node.artifacts = base.artifacts || [];
  node.exec = base.exec || [];
  node.args = base.args || {};
  node.environment = base.environment || { python: "", requirements: [], commands: [], nodePackages: [], files: [], env: {}, setup: [] };
  node.validations = base.validations || [];
  node.recovery = base.recovery || [];
  node.reviews = base.reviews || [];
  node.children = base.children || [];
  return node;
}

function fillSkillEditModal(node, mode = "node", ref = "") {
  skillEditMode = mode;
  skillEditRef = ref;
  skillEditDraft = clone(node || templateNode("skill_appdev", getIr()));
  if (skillEditTitleEl) skillEditTitleEl.textContent = mode === "template" ? "Create Reusable Skill" : "Edit Reusable Skill";
  if (skillEditSubtitleEl) {
    skillEditSubtitleEl.textContent =
      mode === "template"
        ? "Edit this template before inserting it into the current AAPS source."
        : "Edit the selected skill directly, or ask skill chat to refine its implementation contract.";
  }
  if (saveSkillEditBtnEl) saveSkillEditBtnEl.textContent = mode === "template" ? "Insert Skill" : "Save Skill";
  if (skillEditFields.id) skillEditFields.id.value = skillEditDraft.id || "reusable_skill";
  if (skillEditFields.title) skillEditFields.title.value = skillEditDraft.title || "";
  if (skillEditFields.prompt) skillEditFields.prompt.value = skillEditDraft.prompt || "";
  if (skillEditFields.inputs) skillEditFields.inputs.value = portLines(skillEditDraft.inputs || []);
  if (skillEditFields.outputs) skillEditFields.outputs.value = portLines(skillEditDraft.outputs || []);
  if (skillEditFields.requirements) skillEditFields.requirements.value = requirementsLines(skillEditDraft.requirements || {});
  if (skillEditFields.compilePrompt) skillEditFields.compilePrompt.value = skillEditDraft.compile?.prompt || "";
  if (skillEditFields.chat) skillEditFields.chat.value = "";
  if (skillEditStatusEl) {
    skillEditStatusEl.textContent =
      mode === "template"
        ? "Template loaded. Edit fields, then Insert Skill or Apply Skill Chat."
        : `Editing ${skillEditDraft.id}. Save fields or ask Skill Chat to refine it.`;
  }
}

function openSkillTemplateEditor(kind) {
  const ir = getIr();
  const node = templateNode(kind, ir);
  node.id = uniqueId(node.id || "reusable_skill", allNodes(ir));
  if (!node.title) {
    node.title = kind === "skill_segment" ? "Reusable Segmentation Skill" : kind === "skill_writing" ? "Reusable Writing Skill" : "Reusable AppDev Skill";
  }
  if (!node.prompt) {
    node.prompt =
      kind === "skill_segment"
        ? "Reusable segmentation skill: inspect microscopy inputs, define typed masks/metrics/report outputs, implement deterministic fallback, and require human QC before downstream use."
        : kind === "skill_writing"
          ? "Reusable writing skill: use the provided story or article context to draft clear prose, then hand formatting to the requested output layer."
          : "Reusable app-development skill: inspect project context, make a focused implementation or review plan, and return verifiable code or test artifacts.";
  }
  fillSkillEditModal(node, "template", "");
  setSkillEditOpen(true);
  addMessage("assistant", `Opened ${node.id} skill template editor.`);
}

function openSkillNodeEditor(ref) {
  const node = nodeRefs.get(ref);
  if (!node || node.kind !== "skill") return false;
  selectNodeRef(ref, { editInBlocks: true });
  fillSkillEditModal(nodeRefs.get(ref) || node, "node", ref);
  setSkillEditOpen(true);
  return true;
}

function commitSkillEditModal(options = {}) {
  const ir = getIr();
  const base = skillEditMode === "template" ? skillEditDraft || {} : clone(nodeLocationByRef(ir, skillEditRef)?.node || skillEditDraft || {});
  const node = collectSkillModalNode(base);
  if (skillEditMode === "template") {
    node.id = uniqueId(node.id, allNodes(ir));
    ir.pipeline.skills = ir.pipeline.skills || [];
    ir.pipeline.skills.push(node);
  } else {
    const loc = nodeLocationByRef(ir, skillEditRef);
    if (!loc || loc.node.kind !== "skill") throw new Error("Selected skill no longer exists.");
    loc.list[loc.index] = node;
  }
  const ref = setIrAndSelect(ir, node.id, { editInBlocks: true });
  skillEditMode = "node";
  skillEditRef = ref;
  skillEditDraft = clone(node);
  if (skillEditStatusEl) skillEditStatusEl.textContent = `Saved ${node.id}.`;
  if (!options.silent) addMessage("assistant", `${options.inserted ? "Inserted" : "Saved"} skill ${node.id}.`);
  return { node, ref };
}

async function applySkillModalChat() {
  const instruction = skillEditFields.chat?.value.trim() || "";
  if (!instruction) {
    if (skillEditStatusEl) skillEditStatusEl.textContent = "Write a skill-chat instruction first.";
    return;
  }
  const { node, ref } = commitSkillEditModal({ silent: true, inserted: skillEditMode === "template" });
  selectedRef = ref;
  if (blockChatInputEl) blockChatInputEl.value = instruction;
  if (skillEditStatusEl) skillEditStatusEl.textContent = `Routing skill chat for ${node.id}...`;
  await applyBlockChat();
  const latestNode = nodeRefs.get(selectedRef) || node;
  fillSkillEditModal(latestNode, "node", selectedRef);
  setSkillEditOpen(true);
  if (skillEditStatusEl) skillEditStatusEl.textContent = `Applied skill chat to ${latestNode.id}.`;
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
  setIrAndSelect(ir, node.id, { editInBlocks: activeTab === "lab" });
  addMessage("assistant", `Added ${node.kind} ${node.id}.`);
  return { node, ref: selectedRef };
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

function selectedInsertKind() {
  return nodeKindSelectEl?.value || "task";
}

function makeInsertedNode(ir, kind, baseId = "") {
  const node = templateNode(kind, ir);
  node.id = uniqueId(baseId || node.id || kind, allNodes(ir));
  return node;
}

function setStructureStatus(message) {
  if (structureStatusEl) structureStatusEl.textContent = message;
}

function runNodeStructureAction(action) {
  const ir = getIr();
  const loc = nodeLocationByRef(ir, selectedRef);
  const kind = selectedInsertKind();
  let message = "";
  if (!loc && !["add-child", "append-sibling", "prepend-sibling"].includes(action)) {
    setStructureStatus("Select a node first.");
    return false;
  }
  if (action === "add-child") {
    if (!loc) {
      const node = makeInsertedNode(ir, kind, kind);
      const list = node.kind === "block" ? ir.pipeline.blocks || (ir.pipeline.blocks = []) : ir.pipeline.tasks || (ir.pipeline.tasks = []);
      list.push(node);
      selectedRef = `${node.kind === "block" ? "block" : "task"}:${list.length - 1}`;
      message = `Added root ${node.kind} ${node.id}.`;
    } else {
      const node = makeInsertedNode(ir, kind, `${loc.node.id}_${kind}`);
      loc.node.children = loc.node.children || [];
      loc.node.children.push(node);
      selectedRef = `${loc.ref}/children:${loc.node.children.length - 1}`;
      message = `Added child ${node.kind} ${node.id} under ${loc.node.id}.`;
    }
  } else if (action === "append-sibling" || action === "prepend-sibling") {
    if (!loc) {
      setStructureStatus("Select a node before adding a sibling.");
      return false;
    }
    const node = makeInsertedNode(ir, kind, `${loc.node.id}_${action === "append-sibling" ? "next" : "previous"}_${kind}`);
    const insertAt = action === "append-sibling" ? loc.index + 1 : loc.index;
    loc.list.splice(insertAt, 0, node);
    selectedRef = `${loc.listRef}:${insertAt}`;
    message = `${action === "append-sibling" ? "Appended" : "Prepended"} ${node.kind} ${node.id}.`;
  } else if (action === "duplicate") {
    const copy = cloneNodeForInsert(loc.node, ir);
    loc.list.splice(loc.index + 1, 0, copy);
    selectedRef = `${loc.listRef}:${loc.index + 1}`;
    message = `Duplicated ${loc.node.id} as ${copy.id}.`;
  } else if (action === "move-up" || action === "move-down") {
    const delta = action === "move-up" ? -1 : 1;
    const nextIndex = loc.index + delta;
    if (nextIndex < 0 || nextIndex >= loc.list.length) {
      setStructureStatus(action === "move-up" ? "Already first in this level." : "Already last in this level.");
      return false;
    }
    const [node] = loc.list.splice(loc.index, 1);
    loc.list.splice(nextIndex, 0, node);
    selectedRef = `${loc.listRef}:${nextIndex}`;
    message = `Moved ${node.id} ${action === "move-up" ? "up" : "down"}.`;
  } else if (action === "indent") {
    if (loc.index <= 0) {
      setStructureStatus("Indent needs a previous sibling to become the parent.");
      return false;
    }
    const parent = loc.list[loc.index - 1];
    const [node] = loc.list.splice(loc.index, 1);
    parent.children = parent.children || [];
    parent.children.push(node);
    selectedRef = `${loc.listRef}:${loc.index - 1}/children:${parent.children.length - 1}`;
    message = `Indented ${node.id} under ${parent.id}.`;
  } else if (action === "outdent") {
    if (!loc.parentRef) {
      setStructureStatus("Root nodes cannot be outdented.");
      return false;
    }
    const parentLoc = nodeLocationByRef(ir, loc.parentRef);
    if (!parentLoc) {
      setStructureStatus("Could not find the parent node.");
      return false;
    }
    const [node] = loc.list.splice(loc.index, 1);
    parentLoc.list.splice(parentLoc.index + 1, 0, node);
    selectedRef = `${parentLoc.listRef}:${parentLoc.index + 1}`;
    message = `Outdented ${node.id} after ${parentLoc.node.id}.`;
  } else {
    setStructureStatus(`Unknown action: ${action}`);
    return false;
  }
  setIr(ir);
  setStructureStatus(message);
  addMessage("assistant", message);
  return true;
}

function moveNodeAfter(sourceRef, targetRef) {
  if (!sourceRef || !targetRef || sourceRef === targetRef || targetRef.startsWith(`${sourceRef}/`)) return false;
  const ir = getIr();
  const sourceLoc = nodeLocationByRef(ir, sourceRef);
  const targetLoc = nodeLocationByRef(ir, targetRef);
  if (!sourceLoc || !targetLoc) return false;
  const [node] = sourceLoc.list.splice(sourceLoc.index, 1);
  let insertAt = targetLoc.index + 1;
  if (sourceLoc.list === targetLoc.list && sourceLoc.index < targetLoc.index) insertAt -= 1;
  targetLoc.list.splice(insertAt, 0, node);
  selectedRef = `${targetLoc.listRef}:${insertAt}`;
  setIr(ir);
  const message = `Moved ${node.id} after ${targetLoc.node.id}.`;
  setStructureStatus(message);
  addMessage("assistant", message);
  return true;
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

function rootCounts(ir) {
  return {
    blocks: (ir.pipeline.blocks || []).length,
    skills: (ir.pipeline.skills || []).length,
    tasks: (ir.pipeline.tasks || []).length,
    agents: (ir.pipeline.agents || []).length,
    taskCalls: (ir.pipeline.tasks || []).reduce((sum, task) => sum + ((task.calls || []).length), 0),
  };
}

function backendEditLooksBlockOnly(previousSource, nextSource) {
  if (!nextSource || nextSource === previousSource) return false;
  try {
    const before = rootCounts(AAPS.parseAAPS(previousSource));
    const after = rootCounts(AAPS.parseAAPS(nextSource));
    return after.blocks > before.blocks && after.tasks <= before.tasks;
  } catch (_error) {
    return false;
  }
}

function backendProgramEditLooksWeak(previousSource, nextSource) {
  if (!nextSource || nextSource === previousSource) return true;
  try {
    const before = rootCounts(AAPS.parseAAPS(previousSource));
    const after = rootCounts(AAPS.parseAAPS(nextSource));
    const addedOnlyUnwiredTasks = after.tasks > before.tasks && after.blocks <= before.blocks && after.taskCalls <= before.taskCalls;
    const changedWithoutStructure = after.blocks <= before.blocks && after.tasks <= before.tasks && after.taskCalls <= before.taskCalls;
    return addedOnlyUnwiredTasks || changedWithoutStructure;
  } catch (_error) {
    return false;
  }
}

function structuredProgramPlanForChat(message, baseSource, priorResult = {}) {
  if (activeTab !== "program" || typeof AAPS.planProgramFromPrompt !== "function") return null;
  const baseIr = AAPS.parseAAPS(baseSource || sourceEl.value);
  const plan = AAPS.planProgramFromPrompt(baseIr, message, {
    selected: nodeRefs.get(selectedRef) || null,
    selectedRef,
  });
  if (plan.needsConfirmation) {
    return {
      mode: "review",
      route: "domain_switch_confirmation",
      message: plan.summary || "This looks like a different workflow domain. Ask for a new AAPS/workflow or explicitly override before I rewrite the current program.",
      source: baseSource,
      diagnostics: [],
    };
  }
  if (!plan.changed) return null;
  const plannedSource = AAPS.serializeAAPS(plan.ir);
  if (!plannedSource || plannedSource === baseSource) return null;
  const prefix = priorResult.message && !/mock router|source left unchanged/i.test(priorResult.message) ? `${priorResult.message} ` : "";
  return {
    mode: "edit",
    route: "structured_program_plan",
    message: `${prefix}${plan.summary}`,
    source: plannedSource,
    diagnostics: (plan.ir.diagnostics || []).map((diagnostic) => diagnostic.message || String(diagnostic)),
  };
}

function structuredBlockPlanForChat(message, baseSource, priorResult = {}) {
  if (activeTab !== "lab" || typeof AAPS.planBlockFromPrompt !== "function") return null;
  const baseIr = AAPS.parseAAPS(baseSource || sourceEl.value);
  const plan = AAPS.planBlockFromPrompt(baseIr, message, {
    selected: nodeRefs.get(selectedRef) || null,
    selectedRef,
  });
  if (!plan.changed) return null;
  const plannedSource = AAPS.serializeAAPS(plan.ir);
  if (!plannedSource || plannedSource === baseSource) return null;
  const prefix = priorResult.message && !/mock router|source left unchanged/i.test(priorResult.message) ? `${priorResult.message} ` : "";
  return {
    mode: "edit",
    route: "structured_block_plan",
    message: `${prefix}${plan.summary}`,
    source: plannedSource,
    diagnostics: (plan.ir.diagnostics || []).map((diagnostic) => diagnostic.message || String(diagnostic)),
  };
}

function localChatEdit(text) {
  const ir = getIr();
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  let match;
  if (!raw) return "No change.";
  if (lower.includes("create project") || lower.includes("new project")) {
    createStarterProject().catch((error) => {
      projectStatusEl.textContent = "create failed";
      addMessage("assistant", `Could not create project: ${error.message}`);
    });
    return "Started creating a starter AAPS project from the Project tab fields.";
  }
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
  if (lower.includes("compile") || lower.includes("missing component")) {
    const mode = lower.includes("apply") ? "apply" : lower.includes("suggest") ? "suggest" : "check";
    startCompile(mode).catch((error) => {
      compileLogEl.textContent = error.message;
    });
    return `Started an AAPS ${mode} manifest for the active workflow.`;
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
  match = raw.match(/^add child\s+(task|stage|method|choose|action|for_each|if)\s+([A-Za-z_][\w.-]*)\s+to\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const target = findNodeById(ir, match[3]);
    if (!target) return `Node ${match[3]} was not found.`;
    const child = makeInsertedNode(ir, match[1], match[2]);
    target.children = target.children || [];
    target.children.push(child);
    setIr(ir);
    return `Added child ${child.kind} ${child.id} to ${target.id}.`;
  }
  match = raw.match(/^append sibling\s+(task|stage|method|choose|action|for_each|if|block)\s+([A-Za-z_][\w.-]*)\s+after\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const targetRef = nodeRefById(ir, match[3]);
    const loc = nodeLocationByRef(ir, targetRef);
    if (!loc) return `Node ${match[3]} was not found.`;
    const sibling = makeInsertedNode(ir, match[1], match[2]);
    loc.list.splice(loc.index + 1, 0, sibling);
    setIr(ir);
    return `Appended ${sibling.kind} ${sibling.id} after ${loc.node.id}.`;
  }
  match = raw.match(/^prepend sibling\s+(task|stage|method|choose|action|for_each|if|block)\s+([A-Za-z_][\w.-]*)\s+before\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const targetRef = nodeRefById(ir, match[3]);
    const loc = nodeLocationByRef(ir, targetRef);
    if (!loc) return `Node ${match[3]} was not found.`;
    const sibling = makeInsertedNode(ir, match[1], match[2]);
    loc.list.splice(loc.index, 0, sibling);
    setIr(ir);
    return `Prepended ${sibling.kind} ${sibling.id} before ${loc.node.id}.`;
  }
  match = raw.match(/^move\s+([A-Za-z_][\w.-]*)\s+(up|down)$/i);
  if (match) {
    const ref = nodeRefById(ir, match[1]);
    if (!ref) return `Node ${match[1]} was not found.`;
    selectedRef = ref;
    return runNodeStructureAction(match[2].toLowerCase() === "up" ? "move-up" : "move-down")
      ? `Moved ${match[1]} ${match[2].toLowerCase()}.`
      : `Could not move ${match[1]} ${match[2].toLowerCase()}.`;
  }
  match = raw.match(/^(indent|outdent|duplicate)\s+([A-Za-z_][\w.-]*)$/i);
  if (match) {
    const ref = nodeRefById(ir, match[2]);
    if (!ref) return `Node ${match[2]} was not found.`;
    selectedRef = ref;
    return runNodeStructureAction(match[1].toLowerCase()) ? `${match[1]} ${match[2]}.` : `Could not ${match[1]} ${match[2]}.`;
  }
  match = raw.match(/^(?:set|update)\s+(?:selected|current)\s+(?:skill|block|node)\s+(prompt|title)\s*:\s*(.+)$/i);
  if (match) {
    const selected = nodeRefs.get(selectedRef);
    if (!selected) return "Select a skill or block first.";
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    updateSelectedNode((target) => {
      target[field] = value;
    });
    return `Updated ${field} for ${selected.kind} ${selected.id}.`;
  }
  match = raw.match(/^prompt\s+([A-Za-z_][\w.-]*)\s*:\s*(.+)$/i);
  if (match) {
    const target = findNodeById(ir, match[1]);
    if (!target) return `Block ${match[1]} was not found.`;
    target.prompt = match[2].trim();
    setIr(ir);
    return `Updated prompt for ${target.id}.`;
  }
  const structuredProgramPlan = structuredProgramPlanForChat(raw, sourceEl.value);
  if (structuredProgramPlan) {
    if (structuredProgramPlan.source && structuredProgramPlan.source !== sourceEl.value) {
      sourceEl.value = structuredProgramPlan.source;
      render();
    }
    return structuredProgramPlan.message;
  }
  const structuredBlockPlan = structuredBlockPlanForChat(raw, sourceEl.value);
  if (structuredBlockPlan) {
    sourceEl.value = structuredBlockPlan.source;
    render();
    return structuredBlockPlan.message;
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
  const previousSource = sourceEl.value;
  const scope = selectedAapsScope();
  const response = await fetch("/api/aaps/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: sourceEl.value,
      message: instruction,
      context: {
        tab: activeTab,
        projectPath: projectPathEl.value || ".",
        activeFile: scope.activeFile,
        workingFile: scope.workingFile,
        workingRole: scope.workingRole,
        selectedWorkflowFile: scope.selectedWorkflowFile,
        selectedProgramFile: scope.selectedProgramFile,
        selectedBlockFile: scope.selectedBlockFile,
        selectedBlock: nodeRefs.get(selectedRef) || null,
        activeRunId,
        diagnostics: getIr().diagnostics,
        settings: currentSettings,
      },
    }),
  });
  if (!response.ok) throw new Error(`router returned ${response.status}`);
  const payload = await response.json();
  const result = payload.result || payload;
  const routedSource = typeof result.source === "string" && result.source ? result.source : previousSource;
  const shouldUpgradeProgramPlan =
    activeTab === "program" &&
    (routedSource === previousSource || backendEditLooksBlockOnly(previousSource, routedSource) || backendProgramEditLooksWeak(previousSource, routedSource));
  if (shouldUpgradeProgramPlan) {
    const structuredProgramPlan = structuredProgramPlanForChat(instruction, previousSource, result);
    if (structuredProgramPlan) Object.assign(result, structuredProgramPlan);
  }
  const shouldUpgradeBlockPlan = activeTab === "lab" && routedSource === previousSource;
  if (shouldUpgradeBlockPlan) {
    const structuredBlockPlan = structuredBlockPlanForChat(instruction, previousSource, result);
    if (structuredBlockPlan) Object.assign(result, structuredBlockPlan);
  }
  if (result.source) {
    sourceEl.value = result.source;
    if (result.savedFile) rememberSelectedProjectFile(result.savedFile);
    render();
  }
  if (result.savedFile || result.previousSnapshot) {
    loadVersions(projectPathEl.value || ".").catch(() => {});
  }
  if (result.source && result.source !== previousSource && currentSettings.autoCompileAfterChat) {
    startCompile("check").catch((error) => {
      compileLogEl.textContent = error.message;
    });
  }
  const versionNote = result.savedFile ? ` Saved versioned edit to ${result.savedFile}.` : "";
  return `${result.message || result.summary || "Applied routed edit."}${versionNote}`;
}

async function createStarterProject() {
  const rawPath = newProjectPathEl?.value.trim() || "projects/new-aaps-project";
  const name = newProjectNameEl?.value.trim() || rawPath.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || "AAPS Project";
  const domain = newProjectDomainEl?.value.trim() || "general";
  const goal = newProjectGoalEl?.value.trim() || "Create a practical AAPS workflow with reusable blocks and safe execution.";
  projectStatusEl.textContent = "creating";
  const response = await fetch("/api/aaps/project/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: rawPath, name, domain, goal }),
  });
  if (!response.ok) throw new Error(`project create returned ${response.status}`);
  const payload = await response.json();
  projectPathEl.value = payload.absolute_path || payload.project_path || rawPath;
  renderProject(payload);
  rememberProjectPath(payload.absolute_path || payload.project_path || rawPath);
  loadProjectChoices().catch(() => {});
  const manifest = AAPS.normalizeProjectManifest(payload.manifest || {});
  if (manifest.activeFile || manifest.defaultMain) {
    await loadProjectFile(manifest.activeFile || manifest.defaultMain);
  }
  activateTab("project");
  setCreateProjectOpen(false);
  addMessage("assistant", `Created starter AAPS project ${manifest.name}.`);
  return payload;
}

async function loadProject(path = projectPathEl.value || ".") {
  const response = await fetch(`/api/aaps/project?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`project API returned ${response.status}`);
  const payload = await response.json();
  const nextProjectPath = payload.absolute_path || payload.project_path || path;
  if (editorProjectPath && editorProjectPath !== nextProjectPath) clearEditorOwnership();
  renderProject(payload);
  rememberProjectPath(payload.absolute_path || payload.project_path || path);
  loadProjectChoices().catch(() => {});
  loadArtifacts(path).catch((error) => {
    if (artifactListEl) artifactListEl.innerHTML = `<div class="message">${escapeHtml(error.message)}</div>`;
  });
  loadVersions(path).catch((error) => {
    if (versionsListEl) versionsListEl.innerHTML = `<div class="message">${escapeHtml(error.message)}</div>`;
  });
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
  loadArtifacts(projectPathEl.value || ".").catch(() => {});
  loadVersions(projectPathEl.value || ".").catch(() => {});
  addMessage("assistant", `Saved project manifest for ${payload.manifest.name}.`);
}

async function loadProjectFile(file) {
  const response = await fetch(
    `/api/aaps/project/file?path=${encodeURIComponent(projectPathEl.value || ".")}&file=${encodeURIComponent(file)}`
  );
  if (!response.ok) throw new Error(`file API returned ${response.status}`);
  const payload = await response.json();
  sourceEl.value = payload.source;
  markEditorSource(file);
  const manifest = getProjectManifest();
  const role = projectFileRole(file);
  if (!manifest.error) {
    rememberSelectedProjectFile(file);
    manifest.activeFile = file;
    renderProject({ ...currentProjectPayload, manifest });
  }
  selectedRef = firstNodeRef(getIr(), role === "block" ? ["block", "skill", "task"] : role === "program" ? ["task", "block", "skill"] : []);
  render();
  if (role === "block" || role === "skill") activateTab("lab");
  else if (role === "program") activateTab("program");
  addMessage("assistant", `Loaded ${file}.`);
}

function editProjectFile(file) {
  const role = projectFileRole(file);
  loadProjectFile(file)
    .then(() => {
      if (role === "block" || role === "skill") activateTab("lab");
      else if (role === "program" || role === "module") activateTab("program");
    })
    .catch((error) => {
      addMessage("assistant", `Could not edit project file: ${error.message}`);
    });
}

function setManifestActiveFile(file) {
  const manifest = getProjectManifest();
  if (manifest.error || !file) return null;
  rememberSelectedProjectFile(file);
  manifest.activeFile = file;
  renderProject({ ...currentProjectPayload, manifest });
  return manifest;
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
  markEditorSource(file);
  renderProject({ ...currentProjectPayload, files: payload.files, manifest });
  loadVersions(projectPathEl.value || ".").catch(() => {});
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
  loadVersions(projectPathEl.value || ".").catch(() => {});
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
  loadVersions(projectPathEl.value || ".").catch(() => {});
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
    loadArtifacts(projectPathEl.value || ".").catch(() => {});
    addMessage("assistant", `AAPS run ${id} ${record.status}.`);
  }
}

async function pollCompile(id) {
  const response = await fetch(`/api/aaps/compile?id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`manifest status returned ${response.status}`);
  const record = await response.json();
  renderCompile(record);
  if (record.status === "running") {
    window.setTimeout(() => {
      pollCompile(id).catch((error) => {
        compileLogEl.textContent = error.message;
      });
    }, 1200);
  } else {
    loadArtifacts(projectPathEl.value || ".").catch(() => {});
    addMessage("assistant", `AAPS manifest ${id} ${record.status}.`);
  }
}

async function startCompile(mode = "check", projectWide = false) {
  const manifest = getProjectManifest();
  if (manifest.error) {
    projectStatusEl.textContent = "invalid JSON";
    throw new Error(manifest.error);
  }
  const file = manifest.activeFile || manifest.defaultMain || "pipeline.aaps";
  compileSummaryEl.innerHTML = `<div>Starting ${mode} manifest...</div>`;
  compileLogEl.textContent = "";
  const response = await fetch("/api/aaps/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: projectPathEl.value || ".",
      file,
      source: sourceForExecution(file, { projectWide }),
      mode,
      projectWide,
    }),
  });
  if (!response.ok) throw new Error(`compile API returned ${response.status}`);
  const record = await response.json();
  activeCompileId = record.id;
  renderCompile(record);
  pollCompile(record.id).catch((error) => {
    compileLogEl.textContent = error.message;
  });
  return record;
}

function runtimeControlPayload(overrides = {}) {
  const payload = {};
  const resumeRun = String(runtimeResumeRunEl?.value || "").trim();
  const resumeMode = String(runtimeResumeModeEl?.value || "full").trim();
  const fromStep = String(runtimeFromStepEl?.value || "").trim();
  const pauseBefore = String(runtimePauseBeforeEl?.value || "").trim();
  const pauseAfter = String(runtimePauseAfterEl?.value || "").trim();
  if (resumeRun) payload.resumeRun = resumeRun;
  if (resumeMode && resumeMode !== "full") payload.resumeMode = resumeMode;
  if (fromStep) payload.fromStep = fromStep;
  if (pauseBefore) payload.pauseBefore = pauseBefore;
  if (pauseAfter) payload.pauseAfter = pauseAfter;
  if (runtimePauseHumanReviewEl?.checked) payload.pauseOnHumanReview = true;
  if (runtimeApproveHumanReviewEl?.checked) payload.approveHumanReview = true;
  return { ...payload, ...overrides };
}

async function startRuntimeRun(dryRun, blockId = "", runtimeOptions = {}) {
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
      source: sourceForExecution(file),
      dryRun,
      block: blockId,
      ...runtimeControlPayload(runtimeOptions),
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
      blockKind: node.kind,
      message,
      source: sourceEl.value,
      materialize: true,
      blockFile: skillMaterializeFile(node),
      runPreview: true,
      previewMaxImages: 3,
      previewMaxDimension: 768,
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
  renderBlockCanvas(payload);
  addMessage(
    "assistant",
    `${payload.summary || "Applied block chat action."}${payload.blockFile ? ` Block: ${payload.blockFile}.` : ""}${payload.historyPath ? ` History: ${payload.historyPath}.` : ""}${payload.artifactPath ? ` Artifact: ${payload.artifactPath}.` : ""}`
  );
  if (payload.script) {
    const latest = await loadProject(projectPathEl.value || ".");
    renderProject(latest);
  }
  loadVersions(projectPathEl.value || ".").catch(() => {});
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
    "## Manifest Agent",
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
    activateTab(button.dataset.tab);
  });
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => {
    const kind = button.dataset.template;
    if (String(kind || "").startsWith("skill_")) {
      openSkillTemplateEditor(kind);
      return;
    }
    addTemplate(kind);
  });
});

function handleNodeCardCommand(event) {
  const menuButton = event.target.closest("[data-node-menu-ref]");
  if (menuButton) {
    event.stopPropagation();
    toggleNodeMenu(menuButton.dataset.nodeMenuRef, menuButton);
    return true;
  }
  const editorButton = event.target.closest("[data-open-node-editor-ref]");
  if (editorButton) {
    event.stopPropagation();
    closeNodeMenus();
    openNodeDetail(editorButton.dataset.openNodeEditorRef, "edit");
    return true;
  }
  const inspectorButton = event.target.closest("[data-open-node-inspector-ref]");
  if (inspectorButton) {
    event.stopPropagation();
    closeNodeMenus();
    openNodeDetail(inspectorButton.dataset.openNodeInspectorRef, "inspect");
    return true;
  }
  const inlineFocusButton = event.target.closest(".node-menu-panel [data-select-node-ref]");
  if (inlineFocusButton) {
    event.stopPropagation();
    closeNodeMenus();
    selectNodeRef(inlineFocusButton.dataset.selectNodeRef, { editInBlocks: activeTab === "lab" });
    return true;
  }
  return false;
}

treeEl.addEventListener("click", (event) => {
  if (handleNodeCardCommand(event)) return;
  const editButton = event.target.closest("[data-edit-node-ref]");
  if (editButton) {
    event.stopPropagation();
    const ref = editButton.dataset.editNodeRef;
    const node = nodeRefs.get(ref);
    if (node?.kind === "skill") window.setTimeout(() => openSkillNodeEditor(ref), 0);
    else editSelectedInBlocks(ref);
    return;
  }
  const selectButton = event.target.closest("[data-select-node-ref]");
  if (selectButton) {
    event.stopPropagation();
    const ref = selectButton.dataset.selectNodeRef;
    const node = nodeRefs.get(ref);
    selectNodeRef(ref);
    if (node?.kind === "skill") window.setTimeout(() => openSkillNodeEditor(ref), 0);
    return;
  }
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  const node = nodeRefs.get(card.dataset.ref);
  selectNodeRef(card.dataset.ref);
  if (node?.kind === "skill") window.setTimeout(() => openSkillNodeEditor(card.dataset.ref), 0);
});

treeEl.addEventListener("dblclick", (event) => {
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  editSelectedInBlocks(card.dataset.ref);
});

blockBrowserEl?.addEventListener("click", (event) => {
  if (handleNodeCardCommand(event)) return;
  const editFileButton = event.target.closest("[data-project-edit-file]");
  if (editFileButton) {
    event.stopPropagation();
    editProjectFile(editFileButton.dataset.projectEditFile);
    return;
  }
  const fileButton = event.target.closest("[data-project-file]");
  if (fileButton) {
    loadProjectFile(fileButton.dataset.projectFile).catch((error) => {
      addMessage("assistant", `Could not load block file: ${error.message}`);
    });
    return;
  }
  const editButton = event.target.closest("[data-edit-node-ref]");
  if (editButton) {
    event.stopPropagation();
    editSelectedInBlocks(editButton.dataset.editNodeRef);
    return;
  }
  const selectButton = event.target.closest("[data-select-node-ref]");
  if (selectButton) {
    event.stopPropagation();
    selectNodeRef(selectButton.dataset.selectNodeRef);
    return;
  }
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  selectNodeRef(card.dataset.ref);
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-node-menu-ref]") || event.target.closest(".node-menu-panel")) return;
  closeNodeMenus();
});

function handleNodeDragStart(event) {
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  draggedNodeRef = card.dataset.ref;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedNodeRef);
}

function handleNodeDragOver(event) {
  if (!event.target.closest("[data-ref]")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleNodeDrop(event) {
  const card = event.target.closest("[data-ref]");
  if (!card) return;
  event.preventDefault();
  const sourceRef = event.dataTransfer.getData("text/plain") || draggedNodeRef;
  moveNodeAfter(sourceRef, card.dataset.ref);
  draggedNodeRef = "";
}

[treeEl, blockBrowserEl].filter(Boolean).forEach((container) => {
  container.addEventListener("dragstart", handleNodeDragStart);
  container.addEventListener("dragover", handleNodeDragOver);
  container.addEventListener("drop", handleNodeDrop);
});

sourceEl.addEventListener("input", render);

chatFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInputEl.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatInputEl.value = "";
  setChatStatus(`routing through ${currentSettings.agentProvider || "backend"} agent`);
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
openCreateProjectModalBtnEl?.addEventListener("click", () => setCreateProjectOpen(true));
closeCreateProjectModalBtnEl?.addEventListener("click", () => setCreateProjectOpen(false));
createProjectOverlayEl?.addEventListener("click", () => setCreateProjectOpen(false));
closeSkillEditModalBtnEl?.addEventListener("click", () => setSkillEditOpen(false));
skillEditOverlayEl?.addEventListener("click", () => setSkillEditOpen(false));
closeNodeDetailModalBtnEl?.addEventListener("click", () => setNodeDetailOpen(false));
nodeDetailOverlayEl?.addEventListener("click", () => setNodeDetailOpen(false));
nodeDetailEditTabEl?.addEventListener("click", () => {
  const node = nodeRefs.get(nodeDetailRef || selectedRef);
  if (node) fillNodeDetailEditor(node);
  setNodeDetailMode("edit");
});
nodeDetailInspectTabEl?.addEventListener("click", () => {
  const node = nodeRefs.get(nodeDetailRef || selectedRef);
  if (node) renderNodeDetailInspector(node);
  setNodeDetailMode("inspect");
});
nodeDetailEditFormEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    saveNodeDetailEdit();
    setNodeDetailOpen(false);
  } catch (error) {
    addMessage("assistant", `Could not save popup edit: ${error.message}`);
  }
});
selectNodeDetailBtnEl?.addEventListener("click", () => {
  selectNodeRef(nodeDetailRef || selectedRef, { editInBlocks: true });
  setNodeDetailOpen(false);
});
saveSkillEditBtnEl?.addEventListener("click", () => {
  try {
    commitSkillEditModal({ inserted: skillEditMode === "template" });
    setSkillEditOpen(false);
  } catch (error) {
    if (skillEditStatusEl) skillEditStatusEl.textContent = error.message;
  }
});
selectSkillEditBtnEl?.addEventListener("click", () => {
  if (skillEditMode === "template") {
    try {
      commitSkillEditModal({ inserted: true });
    } catch (error) {
      if (skillEditStatusEl) skillEditStatusEl.textContent = error.message;
      return;
    }
  }
  setSkillEditOpen(false);
  activateTab("lab");
});
chatSkillEditBtnEl?.addEventListener("click", () => {
  applySkillModalChat().catch((error) => {
    if (skillEditStatusEl) skillEditStatusEl.textContent = `Skill chat failed: ${error.message}`;
    addMessage("assistant", `Skill chat failed: ${error.message}`);
  });
});
openArtifactModalBtnEl?.addEventListener("click", () => setArtifactModalOpen(true));
closeArtifactModalBtnEl?.addEventListener("click", () => setArtifactModalOpen(false));
artifactModalOverlayEl?.addEventListener("click", () => setArtifactModalOpen(false));

inspectorFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  applyInspector();
});

document.getElementById("delete-block").addEventListener("click", deleteSelected);
document.querySelectorAll("[data-node-action]").forEach((button) => {
  button.addEventListener("click", () => runNodeStructureAction(button.dataset.nodeAction));
});
document.getElementById("save-block-file-btn").addEventListener("click", () => {
  applyInspector();
  saveActiveProjectFile().catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Could not save block file: ${error.message}`);
  });
});
document.getElementById("sample-general").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.general;
  selectedRef = "";
  setTemplateActive("general");
  render();
});
document.getElementById("sample-biology").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.biology;
  selectedRef = "";
  setTemplateActive("biology");
  render();
});
document.getElementById("sample-writing").addEventListener("click", () => {
  sourceEl.value = AAPS.samples.writing;
  selectedRef = "";
  setTemplateActive("writing");
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
  const editFileButton = event.target.closest("[data-project-edit-file]");
  const button = event.target.closest("[data-project-file]");
  const textButton = event.target.closest("[data-project-text-file]");
  if (editFileButton) {
    editProjectFile(editFileButton.dataset.projectEditFile);
    return;
  }
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

refreshArtifactsBtnEl?.addEventListener("click", () => {
  loadArtifacts(projectPathEl.value || ".").catch((error) => {
    addMessage("assistant", `Could not refresh artifacts: ${error.message}`);
  });
});

document.querySelectorAll("[data-artifact-filter]").forEach((button) => {
  button.addEventListener("click", () => setArtifactFilter(button.dataset.artifactFilter));
});

artifactListEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-artifact-path]");
  if (!button) return;
  const item = (currentArtifacts.items || []).find((candidate) => candidate.path === button.dataset.artifactPath);
  if (!item) return;
  previewArtifact(item).catch((error) => {
    if (artifactPreviewEl) artifactPreviewEl.innerHTML = `<strong>Preview failed</strong><span>${escapeHtml(error.message)}</span>`;
  });
});

blockCanvasEl?.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-block-artifact-filter]");
  if (filterButton) {
    blockCanvasFilter = filterButton.dataset.blockArtifactFilter || "explorer";
    localStorage.setItem("aaps.studio.blockCanvasFilter", blockCanvasFilter);
    renderBlockCanvas(null);
    return;
  }
  const button = event.target.closest("[data-qc-action]");
  const rerunButton = event.target.closest("[data-qc-rerun]");
  const target = button || rerunButton;
  if (!target) return;
  const card = target.closest("[data-qc-run]");
  if (!card) return;
  if (rerunButton) {
    runQcRefinement(card.dataset.qcRun).catch((error) => {
      blockLogEl.textContent = error.message;
      addMessage("assistant", `Could not run QC refinement: ${error.message}`);
    });
    return;
  }
  saveQcReview(card.dataset.qcRun, button.dataset.qcAction).catch((error) => {
    blockLogEl.textContent = error.message;
    addMessage("assistant", `Could not save QC review: ${error.message}`);
  });
});

refreshVersionsBtnEl?.addEventListener("click", () => {
  loadVersions(projectPathEl.value || ".").catch((error) => {
    addMessage("assistant", `Could not refresh versions: ${error.message}`);
  });
});

versionsListEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-restore-version]");
  if (!button) return;
  const snapshot = button.dataset.restoreVersion;
  restoreVersion(snapshot).catch((error) => {
    addMessage("assistant", `Could not restore snapshot: ${error.message}`);
  });
});

createProjectBtnEl?.addEventListener("click", () => {
  createStarterProject().catch((error) => {
    projectStatusEl.textContent = "create failed";
    addMessage("assistant", `Could not create project: ${error.message}`);
  });
});

projectSelectorEl?.addEventListener("change", () => {
  projectPathEl.value = projectSelectorEl.value || ".";
  loadProject(projectPathEl.value).catch((error) => {
    addMessage("assistant", `Could not load selected project: ${error.message}`);
  });
});

refreshProjectsBtnEl?.addEventListener("click", () => {
  loadProjectChoices().catch((error) => {
    addMessage("assistant", `Could not refresh projects: ${error.message}`);
  });
});

saveSettingsBtnEl?.addEventListener("click", () => {
  saveSettings().catch((error) => {
    if (settingsStatusEl) settingsStatusEl.textContent = "save failed";
    addMessage("assistant", `Could not save settings: ${error.message}`);
  });
});

programWorkflowSelectEl?.addEventListener("change", () => {
  selectedProgramFile = programWorkflowSelectEl.value || "";
  selectedWorkflowFile = selectedProgramFile;
  setManifestActiveFile(selectedProgramFile);
});

programBlockSelectEl?.addEventListener("change", () => {
  selectedBlockFile = programBlockSelectEl.value || "";
  localStorage.setItem("aaps.studio.selectedBlockFile", selectedBlockFile);
  renderProject(currentProjectPayload);
});

document.getElementById("program-load-btn")?.addEventListener("click", () => {
  const file = programWorkflowSelectEl?.value || selectedProgramFile || selectedWorkflowFile;
  if (!file) {
    addMessage("assistant", "Select a workflow/program first.");
    return;
  }
  loadProjectFile(file).catch((error) => addMessage("assistant", `Could not load program: ${error.message}`));
});

document.getElementById("program-compile-btn")?.addEventListener("click", () => {
  const file = programWorkflowSelectEl?.value || selectedProgramFile || selectedWorkflowFile;
  if (file) setManifestActiveFile(file);
  startCompile("check").catch((error) => addMessage("assistant", `Could not manifest selected program: ${error.message}`));
});

document.getElementById("program-dry-run-btn")?.addEventListener("click", () => {
  const file = programWorkflowSelectEl?.value || selectedProgramFile || selectedWorkflowFile;
  if (file) setManifestActiveFile(file);
  startRuntimeRun(true).catch((error) => addMessage("assistant", `Could not dry run selected program: ${error.message}`));
});

document.getElementById("program-run-btn")?.addEventListener("click", () => {
  const file = programWorkflowSelectEl?.value || selectedProgramFile || selectedWorkflowFile;
  if (file) setManifestActiveFile(file);
  startRuntimeRun(false).catch((error) => addMessage("assistant", `Could not run selected program: ${error.message}`));
});

document.getElementById("program-edit-selected-btn")?.addEventListener("click", () => {
  const file = programBlockSelectEl?.value || selectedBlockFile;
  if (file) {
    loadProjectFile(file).catch((error) => addMessage("assistant", `Could not load block: ${error.message}`));
    return;
  }
  if (selectedRef) {
    editSelectedInBlocks(selectedRef);
    return;
  }
  if (!file) {
    addMessage("assistant", "Select a block first.");
    return;
  }
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

document.getElementById("compile-check-btn").addEventListener("click", () => {
  startCompile("check").catch((error) => {
    addMessage("assistant", `Could not manifest/check active workflow: ${error.message}`);
  });
});

document.getElementById("compile-suggest-btn").addEventListener("click", () => {
  startCompile("suggest").catch((error) => {
    addMessage("assistant", `Could not manifest active workflow: ${error.message}`);
  });
});

document.getElementById("compile-apply-btn").addEventListener("click", () => {
  startCompile("apply").catch((error) => {
    addMessage("assistant", `Could not apply safe manifest: ${error.message}`);
  });
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

runtimeContinueBtnEl?.addEventListener("click", () => {
  const runId = String(runtimeResumeRunEl?.value || lastRuntimeResult?.runId || "").trim();
  if (!runId) {
    addMessage("assistant", "Enter a run id or start a run before continuing.");
    return;
  }
  if (runtimeResumeRunEl) runtimeResumeRunEl.value = runId;
  if (runtimeResumeModeEl && runtimeResumeModeEl.value === "full") runtimeResumeModeEl.value = "skip-completed";
  startRuntimeRun(false, "", {
    continueRun: runId,
    resumeMode: runtimeResumeModeEl?.value || "skip-completed",
    approveHumanReview: Boolean(runtimeApproveHumanReviewEl?.checked),
  }).catch((error) => {
    addMessage("assistant", `Could not continue run: ${error.message}`);
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

if (languageSelectEl) {
  const savedLanguage = localStorage.getItem("aaps.studio.language") || "en";
  applyStudioLanguage(savedLanguage);
  languageSelectEl.addEventListener("change", () => {
    localStorage.setItem("aaps.studio.language", languageSelectEl.value);
    applyStudioLanguage(languageSelectEl.value);
  });
}

sourceEl.value = AAPS.samples.biology;
addMessage("assistant", "AAPS Studio is ready. Use chat to prepare skills or edit source directly.");
render();
renderProject(currentProjectPayload);
renderRuntime(null);
renderCompile(null);
renderArtifacts(currentArtifacts);
renderSettings(currentSettings);
activateTab(activeTab, false);
setHistoryOpen(false);
setCreateProjectOpen(false);
setArtifactModalOpen(false);
setTemplateActive("biology");
loadSettings().catch((error) => {
  if (settingsStatusEl) settingsStatusEl.textContent = "local defaults";
  settingsAvailabilityEl.textContent = error.message;
});
loadProjectChoices().catch(() => {});
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
