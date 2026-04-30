const header = document.querySelector(".site-header");
const languageSelect = document.getElementById("language-select");

const WEB_I18N = {
  en: {
    install: "Install", studio: "Studio", language: "Language", project: "Project", runtime: "Runtime", examples: "Examples", deploy: "Deploy",
    eyebrow: "Autonomous Agentic Pipeline Script", subtitle: "Prompt Is All You Need",
    heroText: "A small programming language and visual studio for turning prompts into planned, resumable, verifiable autonomous work across software, biology, writing, and operations.",
    openStudio: "Open Studio", agentPortal: "Agent Portal", readSpec: "Read Spec", copy: "Copy", copied: "Copied", selected: "Selected",
    installTitle: "Install AAPS from npm", installText: "AAPS is published as a scoped npm package so one install can provide the parser, agent-based compiler, CLI runner, and local Studio server.",
    studioTitle: "Visual editing plus chat-directed changes", studioText: "The Studio webapp has Block Lab, Program, and Project tabs. Projects now make a topic workspace clear, with workflows, reusable blocks, tools, agents, compile reports, tmux run commands, runtime logs, and block-level code chat.", launchStudio: "Launch Studio",
    languageTitle: "Readable scripts for agent pipelines", languageText: "AAPS abstracts the practical loop from agentic app builders, writing systems, biomedical analysis tools, and report generators: inspect, route, act, verify, summarize, and publish.",
    projectTitle: "One manifest for many workflow files", projectText: "AAPS projects use aaps.project.json to track reusable blocks, workflows, scripts, tools, agents, environment registries, data folders, artifacts, runs, and notes.",
    runtimeTitle: "Parse, compile, plan, execute", runtimeText: "AAPS separates parse, compile, plan, and execute. The compiler resolves missing blocks, scripts, tools, agents, dependencies, setup prompts, and provenance before the runtime runs local actions.",
    examplesTitle1: "Organoid Demo", examplesTitle2: "App Check", examplesTitle3: "Book Pipeline", examplesTitle4: "CLI",
    deployTitle: "Hosted at aaps.lazying.art", deployText: "The repository ships with GitHub Pages deployment from website/, a custom domain file, and a Studio artifact copied to /studio/ during deployment.",
  },
  "zh-Hans": {
    install: "安装", studio: "Studio", language: "语言", project: "项目", runtime: "运行时", examples: "示例", deploy: "部署",
    eyebrow: "自主智能体流水线脚本", subtitle: "Prompt Is All You Need", heroText: "把提示词变成可规划、可恢复、可验证的自主工作流，覆盖软件、生物、写作和运营。", openStudio: "打开 Studio", agentPortal: "智能体入口", readSpec: "阅读规范", copy: "复制", copied: "已复制", selected: "已选中",
    installTitle: "从 npm 安装 AAPS", installText: "AAPS 以 scoped npm 包发布，一次安装即可获得解析器、智能体编译器、CLI 运行器和本地 Studio。",
    studioTitle: "可视化编辑与聊天驱动修改", studioText: "Studio 包含 Block Lab、Program 和 Project 标签。项目现在清楚表示一个主题工作区，包含工作流、可复用模块、工具、智能体、编译报告、tmux 命令、运行日志和模块级代码聊天。", launchStudio: "启动 Studio",
    languageTitle: "面向智能体流水线的可读脚本", languageText: "AAPS 抽象出通用循环：检查、路由、执行、验证、总结和发布。", projectTitle: "一个清单管理多个工作流", projectText: "AAPS 项目用 aaps.project.json 跟踪模块、工作流、脚本、工具、智能体、环境、数据、产物、运行和笔记。",
    runtimeTitle: "解析、编译、计划、执行", runtimeText: "AAPS 分离 parse、compile、plan、execute。编译器在运行前解析缺失模块、脚本、工具、智能体、依赖、安装提示和来源记录。", examplesTitle1: "类器官示例", examplesTitle2: "应用检查", examplesTitle3: "书籍流水线", examplesTitle4: "CLI", deployTitle: "托管于 aaps.lazying.art", deployText: "仓库通过 website/ 部署 GitHub Pages，并将 Studio 复制到 /studio/。"
  },
  "zh-Hant": { install: "安裝", studio: "Studio", language: "語言", project: "專案", runtime: "執行", examples: "示例", deploy: "部署", eyebrow: "自主智能體流水線腳本", subtitle: "Prompt Is All You Need", heroText: "把提示詞變成可規劃、可恢復、可驗證的自主工作流。", openStudio: "打開 Studio", agentPortal: "智能體入口", readSpec: "閱讀規範", copy: "複製", copied: "已複製", selected: "已選取", installTitle: "從 npm 安裝 AAPS", installText: "一次安裝即可取得解析器、智能體編譯器、CLI 和本地 Studio。", studioTitle: "可視化編輯與聊天驅動修改", studioText: "Project 分頁讓一個主題工作區更清楚：工作流、模組、工具、智能體、編譯報告、tmux 命令和日誌。", launchStudio: "啟動 Studio", languageTitle: "面向智能體流水線的可讀腳本", languageText: "AAPS 抽象檢查、路由、執行、驗證、總結和發布。", projectTitle: "一個清單管理多個工作流", projectText: "用 aaps.project.json 管理模組、工作流、腳本、工具、智能體、環境和產物。", runtimeTitle: "解析、編譯、計劃、執行", runtimeText: "編譯器在執行前解析缺失元件並生成提示與來源記錄。", examplesTitle1: "類器官示例", examplesTitle2: "應用檢查", examplesTitle3: "書籍流水線", examplesTitle4: "CLI", deployTitle: "託管於 aaps.lazying.art", deployText: "使用 GitHub Pages 部署 website/ 並附帶 /studio/。" },
  ja: { install: "インストール", studio: "Studio", language: "言語", project: "プロジェクト", runtime: "実行", examples: "例", deploy: "デプロイ", eyebrow: "自律エージェント・パイプラインスクリプト", heroText: "プロンプトを計画可能で検証可能なワークフローにします。", openStudio: "Studioを開く", agentPortal: "Agent Portal", readSpec: "仕様", copy: "コピー", copied: "コピー済み", selected: "選択済み", installTitle: "npm から AAPS をインストール", installText: "パーサー、エージェントコンパイラ、CLI、ローカルStudioを提供します。", studioTitle: "視覚編集とチャット編集", studioText: "Projectタブはテーマごとのワークスペース、workflow、block、tool、agent、compile report、tmux commandを明確にします。", launchStudio: "Studio起動", languageTitle: "エージェント用の読みやすいスクリプト", languageText: "inspect, route, act, verify, summarize, publish を表現します。", projectTitle: "1つのmanifestで複数workflow", projectText: "aaps.project.jsonでblocks, workflows, scripts, tools, agents, environmentsを管理します。", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "実行前に不足コンポーネントを解決します。" },
  ko: { install: "설치", studio: "Studio", language: "언어", project: "프로젝트", runtime: "런타임", examples: "예제", deploy: "배포", eyebrow: "자율 에이전트 파이프라인 스크립트", heroText: "프롬프트를 계획, 재개, 검증 가능한 워크플로로 만듭니다.", openStudio: "Studio 열기", agentPortal: "Agent Portal", readSpec: "스펙", copy: "복사", copied: "복사됨", selected: "선택됨", installTitle: "npm으로 AAPS 설치", installText: "파서, 에이전트 컴파일러, CLI, 로컬 Studio를 제공합니다.", studioTitle: "시각 편집과 채팅 편집", studioText: "Project 탭은 topic workspace, workflows, blocks, tools, agents, compile reports, tmux commands를 명확히 보여줍니다.", launchStudio: "Studio 실행", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "실행 전 누락 구성요소를 해결합니다." },
  es: { install: "Instalar", studio: "Studio", language: "Lenguaje", project: "Proyecto", runtime: "Runtime", examples: "Ejemplos", deploy: "Deploy", eyebrow: "Script de pipelines agenticos", heroText: "Convierte prompts en workflows planificados, verificables y ejecutables.", openStudio: "Abrir Studio", agentPortal: "Portal Agent", readSpec: "Leer spec", copy: "Copiar", copied: "Copiado", selected: "Seleccionado", installTitle: "Instala AAPS desde npm", installText: "Incluye parser, compilador agentico, CLI y Studio local.", studioTitle: "Edición visual y por chat", studioText: "Project aclara workflows, bloques, herramientas, agentes, reportes de compilación y comandos tmux.", launchStudio: "Lanzar Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Resuelve componentes faltantes antes de ejecutar." },
  fr: { install: "Installer", studio: "Studio", language: "Langage", project: "Projet", runtime: "Runtime", examples: "Exemples", deploy: "Déployer", eyebrow: "Script de pipeline agentique", heroText: "Transforme les prompts en workflows planifiés, vérifiables et exécutables.", openStudio: "Ouvrir Studio", agentPortal: "Portail Agent", readSpec: "Lire spec", copy: "Copier", copied: "Copié", selected: "Sélectionné", installTitle: "Installer AAPS depuis npm", installText: "Inclut parser, compilateur agentique, CLI et Studio local.", studioTitle: "Édition visuelle et chat", studioText: "Project clarifie workflows, blocs, outils, agents, rapports de compilation et commandes tmux.", launchStudio: "Lancer Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Résout les composants manquants avant l'exécution." },
  de: { install: "Installieren", studio: "Studio", language: "Sprache", project: "Projekt", runtime: "Runtime", examples: "Beispiele", deploy: "Deploy", eyebrow: "Agentische Pipeline-Skripte", heroText: "Macht Prompts zu geplanten, prüfbaren und ausführbaren Workflows.", openStudio: "Studio öffnen", agentPortal: "Agent Portal", readSpec: "Spec lesen", copy: "Kopieren", copied: "Kopiert", selected: "Ausgewählt", installTitle: "AAPS von npm installieren", installText: "Enthält Parser, Agent-Compiler, CLI und lokales Studio.", studioTitle: "Visuelles und Chat-Editing", studioText: "Project zeigt Workflows, Blöcke, Tools, Agents, Compile-Berichte und tmux-Befehle klar.", launchStudio: "Studio starten", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Löst fehlende Komponenten vor der Ausführung." },
  ru: { install: "Установить", studio: "Studio", language: "Язык", project: "Проект", runtime: "Runtime", examples: "Примеры", deploy: "Деплой", eyebrow: "Скрипт агентных пайплайнов", heroText: "Преобразует prompts в планируемые, проверяемые и исполняемые workflows.", openStudio: "Открыть Studio", agentPortal: "Agent Portal", readSpec: "Спецификация", copy: "Копировать", copied: "Скопировано", selected: "Выбрано", installTitle: "Установка AAPS из npm", installText: "Парсер, агентный компилятор, CLI и локальная Studio.", studioTitle: "Визуальное и чат-редактирование", studioText: "Project показывает workflows, blocks, tools, agents, compile reports и tmux commands.", launchStudio: "Запустить Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Решает отсутствующие компоненты перед запуском." },
  ar: { install: "تثبيت", studio: "Studio", language: "اللغة", project: "المشروع", runtime: "التشغيل", examples: "أمثلة", deploy: "نشر", eyebrow: "سكربت خطوط عمل وكيلة", heroText: "يحوّل المطالبات إلى workflows قابلة للتخطيط والتحقق والتنفيذ.", openStudio: "فتح Studio", agentPortal: "بوابة الوكلاء", readSpec: "المواصفة", copy: "نسخ", copied: "تم النسخ", selected: "تم التحديد", installTitle: "تثبيت AAPS من npm", installText: "يتضمن parser وcompiler agentic وCLI وStudio محلي.", studioTitle: "تحرير بصري وبالدردشة", studioText: "Project يوضح workflows وblocks وtools وagents وتقارير compile وأوامر tmux.", launchStudio: "تشغيل Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "يحل العناصر الناقصة قبل التشغيل." },
  vi: { install: "Cài đặt", studio: "Studio", language: "Ngôn ngữ", project: "Dự án", runtime: "Runtime", examples: "Ví dụ", deploy: "Deploy", eyebrow: "Script pipeline agentic", heroText: "Biến prompt thành workflow có kế hoạch, kiểm tra được và chạy được.", openStudio: "Mở Studio", agentPortal: "Agent Portal", readSpec: "Đọc spec", copy: "Sao chép", copied: "Đã sao chép", selected: "Đã chọn", installTitle: "Cài AAPS từ npm", installText: "Gồm parser, agent compiler, CLI và Studio cục bộ.", studioTitle: "Chỉnh sửa trực quan và bằng chat", studioText: "Project làm rõ workflows, blocks, tools, agents, compile reports và lệnh tmux.", launchStudio: "Mở Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Xử lý phần thiếu trước khi chạy." },
};

function tr(key) {
  const lang = languageSelect?.value || "en";
  return (WEB_I18N[lang] && WEB_I18N[lang][key]) || WEB_I18N.en[key] || key;
}

function setText(selector, key) {
  const node = document.querySelector(selector);
  if (node) node.textContent = tr(key);
}

function applyLanguage(lang) {
  if (!languageSelect) return;
  languageSelect.value = WEB_I18N[lang] ? lang : "en";
  document.documentElement.lang = languageSelect.value;
  document.documentElement.dir = languageSelect.value === "ar" ? "rtl" : "ltr";
  const nav = [tr("install"), tr("studio"), tr("language"), tr("project"), tr("runtime"), tr("examples"), tr("deploy"), "GitHub"];
  document.querySelectorAll(".site-nav a").forEach((node, index) => {
    node.textContent = nav[index] || node.textContent;
  });
  setText(".hero .eyebrow", "eyebrow");
  setText(".subtitle", "subtitle");
  setText(".hero-text", "heroText");
  setText(".hero-actions .button-primary", "openStudio");
  setText(".hero-actions .button:nth-child(2)", "agentPortal");
  setText(".hero-actions .button:nth-child(3)", "readSpec");
  setText("#install h2", "installTitle");
  setText("#install p:not(.eyebrow)", "installText");
  setText("#studio h2", "studioTitle");
  setText("#studio p:not(.eyebrow)", "studioText");
  setText("#studio .button", "launchStudio");
  setText("#language h2", "languageTitle");
  setText("#language p:not(.eyebrow)", "languageText");
  setText("#project h2", "projectTitle");
  setText("#project p:not(.eyebrow)", "projectText");
  setText("#runtime h2", "runtimeTitle");
  setText("#runtime p:not(.eyebrow)", "runtimeText");
  setText("#examples article:nth-child(1) h2", "examplesTitle1");
  setText("#examples article:nth-child(2) h2", "examplesTitle2");
  setText("#examples article:nth-child(3) h2", "examplesTitle3");
  setText("#examples article:nth-child(4) h2", "examplesTitle4");
  setText("#deploy h2", "deployTitle");
  setText("#deploy p:not(.eyebrow)", "deployText");
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    if (!button.dataset.state || button.dataset.state === "idle") button.textContent = tr("copy");
  });
}

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    const text = target?.textContent?.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      button.dataset.state = "copied";
      button.textContent = tr("copied");
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      button.dataset.state = "selected";
      button.textContent = tr("selected");
    }

    window.setTimeout(() => {
      button.dataset.state = "idle";
      button.textContent = tr("copy");
    }, 1800);
  });
});

if (languageSelect) {
  applyLanguage(localStorage.getItem("aaps.website.language") || "en");
  languageSelect.addEventListener("change", () => {
    localStorage.setItem("aaps.website.language", languageSelect.value);
    applyLanguage(languageSelect.value);
  });
}
