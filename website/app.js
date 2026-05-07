const header = document.querySelector(".site-header");
const languageSelect = document.getElementById("language-select");

const WEB_I18N = {
  en: {
    install: "Install", studio: "Studio", language: "Language", project: "Project", runtime: "Runtime", examples: "Examples", deploy: "Deploy",
    eyebrow: "Prompt-native workflow programming", subtitle: "Prompt is All You Need.",
    heroText: "AAPS is a project oriented and prompt-native programming language and visual studio for turning prompts into structured, verifiable pipelines.",
    openStudio: "Open Studio", agentPortal: "Agent Portal", readSpec: "Read Spec", copy: "Copy", copied: "Copied", selected: "Selected",
    installTitle: "Install AAPS from npm", installText: "AAPS is published as a scoped npm package so one install can provide the parser, agent-based compiler, CLI runner, and local Studio server.",
    studioTitle: "Visual editing plus chat-directed changes", studioText: "Studio opens on Projects, then Blocks, then Programs. Create a topic workspace from a starter template, configure Codex or DeepSeek v4 pro locally, compile missing blocks/scripts/tools, and use block-level chat for code.", launchStudio: "Launch Studio",
    languageTitle: "Readable scripts for agent pipelines", languageText: "AAPS abstracts the practical loop from agentic app builders, writing systems, biomedical analysis tools, and report generators: inspect, route, act, verify, summarize, and publish.",
    projectTitle: "One manifest for many workflow files", projectText: "AAPS projects use aaps.project.json to track reusable blocks, workflows, scripts, tools, agents, environment registries, data folders, artifacts, runs, and notes.",
    runtimeTitle: "Parse, compile, plan, execute", runtimeText: "AAPS separates parse, compile, plan, and execute. The compiler resolves missing blocks, scripts, tools, agents, dependencies, setup prompts, and provenance before the runtime runs local actions.",
    examplesTitle1: "Organoid Demo", examplesTitle2: "App Check", examplesTitle3: "Book Pipeline", examplesTitle4: "CLI",
    deployTitle: "Hosted at aaps.lazying.art", deployText: "The repository ships with GitHub Pages deployment from website/, a custom domain file, and a Studio artifact copied to /studio/ during deployment.",
  },
  "zh-Hans": {
    install: "安装", studio: "Studio", language: "语言", project: "项目", runtime: "运行时", examples: "示例", deploy: "部署",
    eyebrow: "面向项目的 prompt-native 工作流编程", subtitle: "Prompt is All You Need.", heroText: "AAPS 是一个 project oriented 且 prompt-native 的编程语言与可视化 Studio，用来把提示词转成结构化、可验证的 pipeline。", openStudio: "打开 Studio", agentPortal: "智能体入口", readSpec: "阅读规范", copy: "复制", copied: "已复制", selected: "已选中",
    installTitle: "从 npm 安装 AAPS", installText: "AAPS 以 scoped npm 包发布，一次安装即可获得解析器、智能体编译器、CLI 运行器和本地 Studio。",
    studioTitle: "可视化编辑与聊天驱动修改", studioText: "Studio 默认打开 Project，然后是 Blocks 和 Programs。可以从模板创建主题工作区，本地配置 Codex 或 DeepSeek v4 pro，编译缺失模块/脚本/工具，并用模块聊天写代码。", launchStudio: "启动 Studio",
    languageTitle: "面向智能体流水线的可读脚本", languageText: "AAPS 抽象出通用循环：检查、路由、执行、验证、总结和发布。", projectTitle: "一个清单管理多个工作流", projectText: "AAPS 项目用 aaps.project.json 跟踪模块、工作流、脚本、工具、智能体、环境、数据、产物、运行和笔记。",
    runtimeTitle: "解析、编译、计划、执行", runtimeText: "AAPS 分离 parse、compile、plan、execute。编译器在运行前解析缺失模块、脚本、工具、智能体、依赖、安装提示和来源记录。", examplesTitle1: "类器官示例", examplesTitle2: "应用检查", examplesTitle3: "书籍流水线", examplesTitle4: "CLI", deployTitle: "托管于 aaps.lazying.art", deployText: "仓库通过 website/ 部署 GitHub Pages，并将 Studio 复制到 /studio/。"
  },
  "zh-Hant": { install: "安裝", studio: "Studio", language: "語言", project: "專案", runtime: "執行", examples: "示例", deploy: "部署", eyebrow: "面向專案的 prompt-native 工作流編程", subtitle: "Prompt is All You Need.", heroText: "AAPS 是一個 project oriented 且 prompt-native 的程式語言與視覺化 Studio，用來把提示詞轉成結構化、可驗證的 pipeline。", openStudio: "打開 Studio", agentPortal: "智能體入口", readSpec: "閱讀規範", copy: "複製", copied: "已複製", selected: "已選取", installTitle: "從 npm 安裝 AAPS", installText: "一次安裝即可取得解析器、智能體編譯器、CLI 和本地 Studio。", studioTitle: "可視化編輯與聊天驅動修改", studioText: "Studio 先顯示 Project，再到 Blocks 和 Programs。可從模板建立主題工作區，本地設定 Codex 或 DeepSeek v4 pro，編譯缺失模組/腳本/工具，並用模組聊天寫程式。", launchStudio: "啟動 Studio", languageTitle: "面向智能體流水線的可讀腳本", languageText: "AAPS 抽象檢查、路由、執行、驗證、總結和發布。", projectTitle: "一個清單管理多個工作流", projectText: "用 aaps.project.json 管理模組、工作流、腳本、工具、智能體、環境和產物。", runtimeTitle: "解析、編譯、計劃、執行", runtimeText: "編譯器在執行前解析缺失元件並生成提示與來源記錄。", examplesTitle1: "類器官示例", examplesTitle2: "應用檢查", examplesTitle3: "書籍流水線", examplesTitle4: "CLI", deployTitle: "託管於 aaps.lazying.art", deployText: "使用 GitHub Pages 部署 website/ 並附帶 /studio/。" },
  ja: { install: "インストール", studio: "Studio", language: "言語", project: "プロジェクト", runtime: "実行", examples: "例", deploy: "デプロイ", eyebrow: "プロジェクト指向の prompt-native ワークフロー programming", subtitle: "Prompt is All You Need.", heroText: "AAPS は project-oriented かつ prompt-native なプログラミング言語とビジュアル Studio で、プロンプトを構造化され検証可能なパイプラインへ変換します。", openStudio: "Studioを開く", agentPortal: "Agent Portal", readSpec: "仕様", copy: "コピー", copied: "コピー済み", selected: "選択済み", installTitle: "npm から AAPS をインストール", installText: "パーサー、エージェントコンパイラ、CLI、ローカルStudioを提供します。", studioTitle: "視覚編集とチャット編集", studioText: "Projectタブはテーマごとのワークスペース、workflow、block、tool、agent、compile report、tmux commandを明確にします。", launchStudio: "Studio起動", languageTitle: "エージェント用の読みやすいスクリプト", languageText: "inspect, route, act, verify, summarize, publish を表現します。", projectTitle: "1つのmanifestで複数workflow", projectText: "aaps.project.jsonでblocks, workflows, scripts, tools, agents, environmentsを管理します。", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "実行前に不足コンポーネントを解決します。" },
  ko: { install: "설치", studio: "Studio", language: "언어", project: "프로젝트", runtime: "런타임", examples: "예제", deploy: "배포", eyebrow: "프로젝트 지향 prompt-native workflow programming", subtitle: "Prompt is All You Need.", heroText: "AAPS는 project-oriented이자 prompt-native인 프로그래밍 언어와 비주얼 Studio로, 프롬프트를 구조화되고 검증 가능한 pipeline으로 바꿉니다.", openStudio: "Studio 열기", agentPortal: "Agent Portal", readSpec: "스펙", copy: "복사", copied: "복사됨", selected: "선택됨", installTitle: "npm으로 AAPS 설치", installText: "파서, 에이전트 컴파일러, CLI, 로컬 Studio를 제공합니다.", studioTitle: "시각 편집과 채팅 편집", studioText: "Project 탭은 topic workspace, workflows, blocks, tools, agents, compile reports, tmux commands를 명확히 보여줍니다.", launchStudio: "Studio 실행", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "실행 전 누락 구성요소를 해결합니다." },
  es: { install: "Instalar", studio: "Studio", language: "Lenguaje", project: "Proyecto", runtime: "Runtime", examples: "Ejemplos", deploy: "Deploy", eyebrow: "Programación de workflows project-oriented y prompt-native", subtitle: "Prompt is All You Need.", heroText: "AAPS es un lenguaje de programación y un Studio visual project-oriented y prompt-native para convertir prompts en pipelines estructurados y verificables.", openStudio: "Abrir Studio", agentPortal: "Portal Agent", readSpec: "Leer spec", copy: "Copiar", copied: "Copiado", selected: "Seleccionado", installTitle: "Instala AAPS desde npm", installText: "Incluye parser, compilador agentico, CLI y Studio local.", studioTitle: "Edición visual y por chat", studioText: "Project aclara workflows, bloques, herramientas, agentes, reportes de compilación y comandos tmux.", launchStudio: "Lanzar Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Resuelve componentes faltantes antes de ejecutar." },
  fr: { install: "Installer", studio: "Studio", language: "Langage", project: "Projet", runtime: "Runtime", examples: "Exemples", deploy: "Déployer", eyebrow: "Programmation de workflows project-oriented et prompt-native", subtitle: "Prompt is All You Need.", heroText: "AAPS est un langage de programmation et un Studio visuel project-oriented et prompt-native pour transformer des prompts en pipelines structurés et vérifiables.", openStudio: "Ouvrir Studio", agentPortal: "Portail Agent", readSpec: "Lire spec", copy: "Copier", copied: "Copié", selected: "Sélectionné", installTitle: "Installer AAPS depuis npm", installText: "Inclut parser, compilateur agentique, CLI et Studio local.", studioTitle: "Édition visuelle et chat", studioText: "Project clarifie workflows, blocs, outils, agents, rapports de compilation et commandes tmux.", launchStudio: "Lancer Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Résout les composants manquants avant l'exécution." },
  de: { install: "Installieren", studio: "Studio", language: "Sprache", project: "Projekt", runtime: "Runtime", examples: "Beispiele", deploy: "Deploy", eyebrow: "Project-oriented und prompt-native Workflow-Programmierung", subtitle: "Prompt is All You Need.", heroText: "AAPS ist eine project-oriented und prompt-native Programmiersprache mit visuellem Studio, die Prompts in strukturierte, überprüfbare Pipelines verwandelt.", openStudio: "Studio öffnen", agentPortal: "Agent Portal", readSpec: "Spec lesen", copy: "Kopieren", copied: "Kopiert", selected: "Ausgewählt", installTitle: "AAPS von npm installieren", installText: "Enthält Parser, Agent-Compiler, CLI und lokales Studio.", studioTitle: "Visuelles und Chat-Editing", studioText: "Project zeigt Workflows, Blöcke, Tools, Agents, Compile-Berichte und tmux-Befehle klar.", launchStudio: "Studio starten", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Löst fehlende Komponenten vor der Ausführung." },
  ru: { install: "Установить", studio: "Studio", language: "Язык", project: "Проект", runtime: "Runtime", examples: "Примеры", deploy: "Деплой", eyebrow: "Project-oriented и prompt-native workflow programming", subtitle: "Prompt is All You Need.", heroText: "AAPS — project-oriented и prompt-native язык программирования с визуальной Studio для превращения prompt'ов в структурированные и проверяемые pipeline'ы.", openStudio: "Открыть Studio", agentPortal: "Agent Portal", readSpec: "Спецификация", copy: "Копировать", copied: "Скопировано", selected: "Выбрано", installTitle: "Установка AAPS из npm", installText: "Парсер, агентный компилятор, CLI и локальная Studio.", studioTitle: "Визуальное и чат-редактирование", studioText: "Project показывает workflows, blocks, tools, agents, compile reports и tmux commands.", launchStudio: "Запустить Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Решает отсутствующие компоненты перед запуском." },
  ar: { install: "تثبيت", studio: "Studio", language: "اللغة", project: "المشروع", runtime: "التشغيل", examples: "أمثلة", deploy: "نشر", eyebrow: "برمجة workflows project-oriented وprompt-native", subtitle: "Prompt is All You Need.", heroText: "AAPS هو لغة برمجة وStudio مرئية project-oriented وprompt-native لتحويل التعليمات النصية إلى pipelines منظمة وقابلة للتحقق.", openStudio: "فتح Studio", agentPortal: "بوابة الوكلاء", readSpec: "المواصفة", copy: "نسخ", copied: "تم النسخ", selected: "تم التحديد", installTitle: "تثبيت AAPS من npm", installText: "يتضمن parser وcompiler agentic وCLI وStudio محلي.", studioTitle: "تحرير بصري وبالدردشة", studioText: "Project يوضح workflows وblocks وtools وagents وتقارير compile وأوامر tmux.", launchStudio: "تشغيل Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "يحل العناصر الناقصة قبل التشغيل." },
  vi: { install: "Cài đặt", studio: "Studio", language: "Ngôn ngữ", project: "Dự án", runtime: "Runtime", examples: "Ví dụ", deploy: "Deploy", eyebrow: "Workflow programming project-oriented và prompt-native", subtitle: "Prompt is All You Need.", heroText: "AAPS là một ngôn ngữ lập trình và Studio trực quan project-oriented, prompt-native để biến prompt thành pipeline có cấu trúc và kiểm chứng được.", openStudio: "Mở Studio", agentPortal: "Agent Portal", readSpec: "Đọc spec", copy: "Sao chép", copied: "Đã sao chép", selected: "Đã chọn", installTitle: "Cài AAPS từ npm", installText: "Gồm parser, agent compiler, CLI và Studio cục bộ.", studioTitle: "Chỉnh sửa trực quan và bằng chat", studioText: "Project làm rõ workflows, blocks, tools, agents, compile reports và lệnh tmux.", launchStudio: "Mở Studio", runtimeTitle: "Parse, Compile, Plan, Execute", runtimeText: "Xử lý phần thiếu trước khi chạy." },
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

document.querySelectorAll("[data-studio-carousel]").forEach((carousel) => {
  const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  let index = 0;
  let timer = null;

  function setSlide(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
      slide.classList.toggle("is-prev", slideIndex === (index - 1 + slides.length) % slides.length);
      slide.classList.toggle("is-next", slideIndex === (index + 1) % slides.length);
      slide.setAttribute("aria-hidden", slideIndex === index ? "false" : "true");
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
      dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
    });
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    timer = window.setInterval(() => setSlide(index + 1), 5200);
  }

  previous?.addEventListener("click", () => {
    setSlide(index - 1);
    start();
  });
  next?.addEventListener("click", () => {
    setSlide(index + 1);
    start();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setSlide(Number(dot.dataset.carouselDot || 0));
      start();
    });
  });
  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", start);
  setSlide(0);
  start();
});

if (languageSelect) {
  applyLanguage(localStorage.getItem("aaps.website.language") || "en");
  languageSelect.addEventListener("change", () => {
    localStorage.setItem("aaps.website.language", languageSelect.value);
    applyLanguage(languageSelect.value);
  });
}
