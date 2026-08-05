#!/usr/bin/env node
/**
 * Applies Rubric v2 UI patches to picker.html (English, split generation, emoji→item).
 */
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const pickerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/gallery/picker.html');
let html = await readFile(pickerPath, 'utf8');

const replacements = [
  ['lang="ru"', 'lang="en"'],
  ['<title>HelloIAM Stories</title>', '<title>HelloIAM Posts</title>'],
  ['<h1>HelloIAM Stories</h1>', '<h1>HelloIAM Posts</h1>'],
  ['Конструктор сторис для SMM — alpha v002.01', 'Post carousel builder for SMM'],
  ['id="nav-generate" class="active">Генерация</a>', 'id="nav-generate" class="active">Create</a>'],
  ['id="nav-posts">Посты</a>', 'id="nav-posts">Posts</a>'],
  ['id="nav-assets">Изображения</a>', 'id="nav-assets">Images</a>'],
  ['<h2>Создать пост</h2>', '<h2>Create a post</h2>'],
  ['Пошаговый конвейер: формат → настройка → контент → экспорт.', 'Step by step: rubric → settings → content → export → download.'],
  ['<strong>Выберите формат</strong>', '<strong>Pick a rubric</strong>'],
  ['Шаблон карусели и число слайдов', 'Carousel layout and slide count'],
  ['<strong>Настройка</strong>', '<strong>Settings</strong>'],
  ['Рубрика, цвет, эмодзи, предмет', 'Topic, color style, emoji'],
  ['<strong>Контент</strong>', '<strong>Content</strong>'],
  ['Тексты и промпты по слайдам', 'Slide texts and pictures'],
  ['<strong>Экспорт</strong>', '<strong>Export</strong>'],
  ['Видео и статика в папку поста', 'Build PNG slides'],
  ['const FORMAT02_ID = "HelloIamWineV1";\n      const FORMAT03_ID = "IAmMatsunDeepDive";\n      const FORMAT04_ID = "GreenPlateIntro";\n      const FORMAT05_ID = "HelloIamNewsV1";\n\n      function isFormat02Post(post) {\n        return post?.templateId === FORMAT02_ID;\n      }\n\n      function isFormat03Post(post) {\n        return post?.templateId === FORMAT03_ID;\n      }\n\n      function isFormat04Post(post) {\n        return post?.templateId === FORMAT04_ID;\n      }\n\n      function isEmojiImageFormat(post) {\n        return isFormat03Post(post) || isFormat04Post(post);\n      }',
   `const LEGACY_RUBRIC = {
        Format01: "Rubric01", HelloIamWineV1: "Rubric02", IAmMatsunDeepDive: "Rubric03",
        GreenPlateIntro: "Rubric04", HelloIamNewsV1: "Rubric05",
      };
      function normalizeTemplateId(id) { return LEGACY_RUBRIC[id] || id; }
      function isRubric02Post(post) { return normalizeTemplateId(post?.templateId) === "Rubric02"; }
      function isRubric03Post(post) { return normalizeTemplateId(post?.templateId) === "Rubric03"; }
      function isRubric04Post(post) { return normalizeTemplateId(post?.templateId) === "Rubric04"; }
      function isRubric05Post(post) { return normalizeTemplateId(post?.templateId) === "Rubric05"; }
      const isFormat02Post = isRubric02Post;
      const isFormat03Post = isRubric03Post;
      const isFormat04Post = isRubric04Post;
      const isFormat05Post = isRubric05Post;
      function rubricEmojiOnFirst(post) { return isRubric03Post(post) || isRubric04Post(post); }
      const isEmojiImageFormat = rubricEmojiOnFirst;`],
  [`function cardUsesEmoji(post, card) {
        if (!isEmojiImageFormat(post)) return false;
        if (!(card.fields || []).some((field) => field.type === "image")) return false;
        const last = lastCardIndex(post);
        return card.cardIndex === 0 || card.cardIndex === last;
      }`,
   `function cardUsesEmoji(post, card) {
        const rubricId = normalizeTemplateId(post?.templateId);
        if (rubricId === "Rubric05") return false;
        if (!(card.fields || []).some((field) => field.type === "image")) return false;
        const last = lastCardIndex(post);
        if (rubricId === "Rubric03" || rubricId === "Rubric04") {
          return card.cardIndex === 0 || card.cardIndex === last;
        }
        return card.cardIndex === last;
      }`],
  [`function cardNeedsGeneratedImage(post, card) {
        if (!(card.fields || []).some((field) => field.type === "image")) return false;
        if (isEmojiImageFormat(post)) return !cardUsesEmoji(post, card);
        return true;
      }`,
   `function cardNeedsGeneratedImage(post, card) {
        if (!(card.fields || []).some((field) => field.type === "image")) return false;
        return !cardUsesEmoji(post, card);
      }`],
  ['function isFormat05Post(post) {\n        return post?.templateId === FORMAT05_ID;\n      }\n\n      function pipelineSettingsDesc()',
   'function settingsReady() {\n        if (isRubric05Post(currentPost)) return Boolean(currentPost?.subject?.trim());\n        return postHasSelectedEmoji();\n      }\n\n      function pipelineSettingsDesc()'],
  ['if (isFormat05Post(currentPost)) return "Инфоповод, цвет";',
   'if (isRubric05Post(currentPost)) return "Infopov, color style";'],
  ['if (isFormat02Post(currentPost)) return "Рубрика, цвет, карточка, предмет";',
   'if (isRubric02Post(currentPost)) return "Topic, color, brand card";'],
  ['return "Рубрика, цвет, эмодзи, предмет";',
   'return "Topic, color style, emoji";'],
  ['return "Сначала укажите инфоповод на шаге «Настройка» — новостной повод об Армении.";',
   'return "Enter the news angle in Settings first.";'],
  ['return "Сначала укажите предмет на шаге «Настройка» (матсун, суджук…).";',
   'return "Pick an emoji in Settings first — it sets the headline item.";'],
  ['if (isFormat05Post(currentPost)) return "Укажите инфоповод перед переходом к контенту.";',
   'if (isRubric05Post(currentPost)) return "Enter infopov before continuing to content.";'],
  ['return "Укажите предмет перед переходом к контенту.";',
   'return "Pick an emoji in Settings before continuing to content.";'],
  ['return "Укажите инфоповод (новостной повод об Армении), затем нажмите «Далее».";',
   'return "Enter infopov, then click Next.";'],
  ['return "Укажите предмет (матсун, суджук…), затем нажмите «Далее».";',
   'return "Pick an emoji in Settings, then click Next.";'],
  ['if (isFormat05Post(currentPost)) return `Инфоповод: «${subject}»`;',
   'if (isRubric05Post(currentPost)) return `Infopov: «${subject}»`;'],
  ['return `Предмет: «${subject}»`;',
   'return `Item: «${subject}»`;'],
  ['const PIPELINE_EDITOR_STEPS = [\n        { id: "settings", title: "Настройка", desc: "Рубрика, цвет, эмодзи, предмет" },\n        { id: "content", title: "Контент", desc: "Тексты и промпты по слайдам" },\n        { id: "export", title: "Экспорт", desc: "Видео и статика" },\n      ];',
   'const PIPELINE_EDITOR_STEPS = [\n        { id: "settings", title: "Settings", desc: "Topic, color style, emoji" },\n        { id: "content", title: "Content", desc: "Slide texts and pictures" },\n        { id: "export", title: "Export", desc: "Build PNG slides" },\n        { id: "download", title: "Download", desc: "ZIP with all slides" },\n      ];'],
  ['if (target > 0 && !currentPost.subject?.trim()) {',
   'if (target > 0 && !settingsReady()) {'],
  ['if (!currentPost.subject?.trim()) {',
   'if (!settingsReady()) {'],
  ['<button type="button" class="primary-btn" id="generate-content-btn">Сгенерировать тексты + промпты</button>',
   `<div class="generation-actions">
                  <button type="button" class="primary-btn" id="generate-texts-btn">Write all slide texts</button>
                  <button type="button" class="secondary-btn" id="generate-prompts-btn">Create all picture descriptions</button>
                  <button type="button" class="secondary-btn" id="generate-images-btn">Make all pictures</button>
                </div>`],
  ['<button type="button" class="primary-btn render-btn" id="render-post-btn">Создать видео (все карточки)</button>\n                    <button type="button" class="secondary-btn" id="render-post-stills-btn">Создать статику (все карточки)</button>',
   '<button type="button" class="primary-btn render-btn" id="render-post-stills-btn">Build all PNG slides</button>'],
  ['id="render-post-btn">Создать видео',
   'id="render-post-btn" hidden>Video'],
];

for (const [from, to] of replacements) {
  if (!html.includes(from)) {
    console.warn('Skip (not found):', from.slice(0, 60));
    continue;
  }
  html = html.replace(from, to);
}

// Inject CARD_EDITOR_HIDDEN and filter in renderCardForm if not present
if (!html.includes('CARD_EDITOR_HIDDEN')) {
  html = html.replace(
    'const PREVIEW_SCALE = 280 / 1080;',
    `const PREVIEW_SCALE = 280 / 1080;
      const CARD_EDITOR_HIDDEN = new Set([
        "title", "item", "titleAccent", "label", "background", "titleColor",
        "accentColor", "labelColor", "factColor", "quoteColor", "brandLeft", "brandRight", "source",
      ]);`,
  );
  html = html.replace(
    'form.innerHTML = (card.fields || []).filter((field) => {\n          if (hiddenKeys.has(field.key)) return false;',
    `form.innerHTML = (card.fields || []).filter((field) => {
          if (hiddenKeys.has(field.key)) return false;
          if (CARD_EDITOR_HIDDEN.has(field.key)) return false;
          if (field.type === "color") return false;`,
  );
  html = html.replace(
    'if (field.type === "textarea") {\n            return `<div class="import-field${errClass}"><label>${escapeHtml(field.label)}</label><textarea name="${field.key}">${escapeHtml(val)}</textarea></div>`;',
    `if (field.key === "fact" || field.key === "quote") {
            const label = "Slide text";
            const factVal = card.props?.fact ?? card.props?.quote ?? "";
            return \`<div class="import-field\${errClass}"><label>\${escapeHtml(label)}</label><textarea name="fact">\${escapeHtml(factVal)}</textarea></div>\`;
          }
          if (field.type === "textarea") {
            return \`<div class="import-field\${errClass}"><label>\${escapeHtml(field.label)}</label><textarea name="\${field.key}">\${escapeHtml(val)}</textarea></div>\`;
          }`,
  );
  html = html.replace(
    '<label>Промпт на изображение</label>',
    '<label>Picture description</label>',
  );
}

// Replace updateGenerationToolbar block
const toolbarOld = /function updateGenerationToolbar\(\) \{[\s\S]*?\n      \}/;
const toolbarNew = `function updateGenerationToolbar() {
        const hint = document.getElementById("generation-hint");
        const textsBtn = document.getElementById("generate-texts-btn");
        const promptsBtn = document.getElementById("generate-prompts-btn");
        const imagesBtn = document.getElementById("generate-images-btn");
        if (!hint || !textsBtn) return;
        if (!appConfig.llmConfigured) {
          hint.textContent = "Slide texts are unavailable — server setup required.";
          hint.className = "generation-hint warn";
          textsBtn.disabled = true;
          promptsBtn.disabled = true;
          imagesBtn.disabled = true;
          return;
        }
        hint.className = "generation-hint";
        const item = currentPost?.subject?.trim();
        const preview = item ? subjectPreviewLabel(item.length > 80 ? \`\${item.slice(0, 77)}…\` : item) : "";
        const hasTexts = Boolean(currentPost?.generation?.texts && Object.keys(currentPost.generation.texts).length);
        const hasPrompts = Boolean(currentPost?.generation?.imagePrompts && Object.keys(currentPost.generation.imagePrompts).length);
        if (!settingsReady()) {
          hint.textContent = subjectRequiredHint();
          textsBtn.disabled = true;
          promptsBtn.disabled = true;
          imagesBtn.disabled = true;
        } else {
          hint.textContent = hasPrompts
            ? \`\${preview} · texts and picture descriptions ready.\`
            : hasTexts
              ? \`\${preview} · slide texts ready. Create picture descriptions next.\`
              : \`\${preview} · start with “Write all slide texts”.\`;
          textsBtn.disabled = generateContentInFlight || !appReady;
          promptsBtn.disabled = generateContentInFlight || !hasTexts || !appReady;
          imagesBtn.disabled = generateImagesInFlight || !hasPrompts || !appConfig.falConfigured || !appReady;
        }
      }`;
if (toolbarOld.test(html)) {
  html = html.replace(toolbarOld, toolbarNew);
}

// Replace runGenerateContent and add split handlers before it
if (!html.includes('runGenerateTexts')) {
  html = html.replace(
    'async function runGenerateContent() {',
    `async function runGenerateTexts() {
        if (!currentPost || generateContentInFlight) return;
        const statusEl = document.getElementById("generation-status");
        generateContentInFlight = true;
        updateGenerationToolbar();
        statusEl.textContent = "Writing slide texts…";
        statusEl.className = "edit-status";
        try {
          const res = await fetch(\`/api/posts/\${currentPost.id}/generate-texts\`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Text generation failed");
          currentPost = data.post;
          updatePostHeader();
          renderCardForm();
          statusEl.textContent = "Slide texts ready.";
          statusEl.className = "edit-status ok";
        } catch (e) {
          statusEl.textContent = e.message;
          statusEl.className = "edit-status err";
        } finally {
          generateContentInFlight = false;
          updateGenerationToolbar();
        }
      }

      async function runGeneratePrompts() {
        if (!currentPost || generateContentInFlight) return;
        const statusEl = document.getElementById("generation-status");
        generateContentInFlight = true;
        updateGenerationToolbar();
        statusEl.textContent = "Creating picture descriptions…";
        statusEl.className = "edit-status";
        try {
          const res = await fetch(\`/api/posts/\${currentPost.id}/generate-prompts\`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed");
          currentPost = data.post;
          renderCardForm();
          statusEl.textContent = "Picture descriptions ready.";
          statusEl.className = "edit-status ok";
        } catch (e) {
          statusEl.textContent = e.message;
          statusEl.className = "edit-status err";
        } finally {
          generateContentInFlight = false;
          updateGenerationToolbar();
        }
      }

      async function runGenerateAllImages() {
        await runGenerateImages(undefined, { statusEl: document.getElementById("generation-status") });
      }

      async function runGenerateContent() {`,
  );
}

// Settings form: remove subject for non-news, use colorStyleId
html = html.replace(
  `const subjectField = isNewsFormat ? \`
          <div class="import-field">
            <label>Инфоповод</label>
            <textarea name="subject" rows="4" placeholder="Например: рост турпотока в Армении — рекордные 172 705 иностранных посетителей в апреле 2026. Или коротко: туризм в Армении, рекорд апреля.">\${escapeHtml(currentPost.subject || "")}</textarea>
            <p class="field-hint">Новостной повод для карусели AM NEWS: одно или несколько слов, или несколько предложений об актуальной теме для Армении.</p>
          </div>
        \` : \`
          <div class="import-field">
            <label>Предмет поста</label>
            <input type="text" name="subject" value="\${escapeHtml(currentPost.subject || "")}" placeholder="Matsun, sujuk…" />
          </div>
        \`;`,
  `const subjectField = isNewsFormat ? \`
          <div class="import-field">
            <label>Infopov</label>
            <textarea name="subject" rows="4" placeholder="News angle about Armenia…">\${escapeHtml(currentPost.subject || "")}</textarea>
            <p class="field-hint">The news hook for AM NEWS slides.</p>
          </div>
        \` : \`
          <div class="import-field">
            <label>Headline item</label>
            <p class="settings-readonly">\${escapeHtml(currentPost.subject || "Pick an emoji below")}</p>
            <p class="field-hint">Set automatically when you pick an emoji.</p>
          </div>
        \`;`,
);

html = html.replace(
  '<label>Рубрика</label>',
  '<label>Topic</label>',
);
html = html.replace(
  '<label>Цвет поста</label>',
  '<label>Color style</label>',
);

// colorStyleId in collectSettingsPatch
html = html.replace(
  `const colors = appConfig.brandColors?.length ? appConfig.brandColors : [
          {hex: "#FFFFFF", label: "Белый"},
          {hex: "#D9DDE0", label: "Серый"},
          {hex: "#FFC53A", label: "Жёлтый"},
          {hex: "#D61E23", label: "Красный"},
          {hex: "#4A7BFF", label: "Синий"},
          {hex: "#1E1E1E", label: "Чёрный"},
        ];`,
  `const colors = appConfig.colorStyles?.length ? appConfig.colorStyles : (appConfig.brandColors?.length ? appConfig.brandColors : [
          {id: "gray-blue", themeColor: "#D9DDE0", label: "Gray & blue"},
          {id: "red-yellow", themeColor: "#FFC53A", label: "Red & yellow"},
        ]);`,
);

html = html.replace(
  `const colorSwatches = colors.map((c) => \`
          <button type="button" class="color-swatch\${currentPost.themeColor?.toUpperCase() === c.hex.toUpperCase() ? " active" : ""}"
            data-color="\${escapeHtml(c.hex)}" title="\${escapeHtml(c.label)}" style="background:\${escapeHtml(c.hex)}"
            \${lockColors ? "disabled" : ""}></button>
        \`).join("");`,
  `const activeStyle = currentPost.colorStyleId || colors.find((c) => (c.themeColor || c.hex)?.toUpperCase() === currentPost.themeColor?.toUpperCase())?.id || colors[0]?.id;
        const colorSwatches = colors.map((c) => \`
          <button type="button" class="color-swatch\${activeStyle === (c.id || c.hex) ? " active" : ""}"
            data-style-id="\${escapeHtml(c.id || c.hex)}" data-color="\${escapeHtml(c.themeColor || c.hex)}" title="\${escapeHtml(c.label)}" style="background:\${escapeHtml(c.themeColor || c.hex)}"
            \${lockColors ? "disabled" : ""}></button>
        \`).join("");`,
);

html = html.replace(
  `const patch = { subject };
        if (subject) {
          patch.name = isFormat05Post(currentPost)
            ? (subject.split("\\n")[0].trim() || subject).slice(0, 120)
            : subject;
        }`,
  `const patch = {};
        if (isRubric05Post(currentPost)) patch.subject = subject;`,
);

html = html.replace(
  `} else if (activeSwatch?.dataset.color) {
          patch.themeColor = activeSwatch.dataset.color;
        }`,
  `} else if (activeSwatch?.dataset.styleId) {
          patch.colorStyleId = activeSwatch.dataset.styleId;
        } else if (activeSwatch?.dataset.color) {
          patch.themeColor = activeSwatch.dataset.color;
        }`,
);

// Event listeners for new buttons at end of script
if (!html.includes('generate-texts-btn')) {
  console.warn('generate-texts-btn not in HTML');
} else if (!html.includes('getElementById("generate-texts-btn")')) {
  html = html.replace(
    'document.getElementById("generate-content-btn")?.addEventListener("click", runGenerateContent);',
    `document.getElementById("generate-texts-btn")?.addEventListener("click", runGenerateTexts);
      document.getElementById("generate-prompts-btn")?.addEventListener("click", runGeneratePrompts);
      document.getElementById("generate-images-btn")?.addEventListener("click", runGenerateAllImages);
      document.getElementById("generate-content-btn")?.addEventListener("click", runGenerateContent);`,
  );
}

await writeFile(pickerPath, html, 'utf8');
console.log('Patched picker.html');
