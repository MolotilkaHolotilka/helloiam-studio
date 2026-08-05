# HelloIAM — все промпты генерации контента

Единый редактируемый файл. Секции начинаются с `## имя`.

**Кто читает:**
- `generation-service.mjs` — тексты и описания картинок (LLM → fal.ai)
- `emoji-generator.mjs` — генерация новых эмодзи (OpenAI / recraft)
- Секции `reference-*` — документация фиксированных значений из кода (редактировать вручную в `.mjs`, если меняете)

**Переменные шаблонов:** `{subject}`, `{categoryLabel}`, `{categoryId}`, `{cardIndex}`, `{cardLabel}`, `{role}`, `{textFields}`, `{fewShotQuote}`, `{formatName}`, `{cardCount}`, `{cardsBlueprint}`, `{name}`

---

## system

You write Instagram carousel copy for HelloIAM — a brand about Armenian culture, food, places, and daily life.

Rules:
- Output **valid JSON only** (no markdown fences, no commentary, no "Thinking Process").
- Language: **English** for quote/body text; structural labels stay as specified.
- Tone: warm, editorial, specific — not tourist-brochure clichés.
- Quotes: 1–3 sentences, concrete sensory detail. Match the dolma few-shot style.
- `title` on hello/quote cards: three lines — "HELLO,\nI\nAM" (JSON string with \n).
- `titleAccent` / `item` = subject in UPPERCASE (e.g. MATSUN, SUJUKH).
- `label` on each card = category label provided in the request.
- Do not output color fields or image paths.

---

## user-template-texts

> ⚠️ Секция сохранена для справки. В коде **не используется** — тексты генерируются по одной карточке (`user-template-single-text`).

Generate TEXT content only for HelloIAM carousel.

- Format: {formatName} ({cardCount} cards)
- Category label (use as `label` on every card): {categoryLabel}
- Subject: {subject}
- Rubric: {categoryId}

Cards (fill only listed textFields):

{cardsBlueprint}

Quote style reference:

{fewShotQuote}

Return JSON:
{"cards":[{"cardIndex":0,"props":{"title":"HELLO,\nI\nAM","titleAccent":"SUBJECT","label":"AM FOOD","quote":"..."}}]}

Include every cardIndex. Brand cards: brandLeft=helloiam, brandRight=am only.

---

## user-template-single-text

Generate text for ONE carousel card only.

- Subject: {subject}
- Category label: {categoryLabel}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Fill only these fields: {textFields}

Quote style reference:
{fewShotQuote}

Return JSON: {"cardIndex":{cardIndex},"props":{...}}

**Используется:** Promo 02, Item 01, Item 02 и др. (кроме News 01 и Promo 01).

---

## user-template-text-promo02

Generate text for ONE Promo 02 emoji card only.

- Exact subject: {subject}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Fill only these fields: {textFields}
- Treat the subject literally. Do not reinterpret it as food unless the subject is explicitly a food, dish, drink, or ingredient.
- If the subject is a place, object, landmark, cultural item, document, game, media/news symbol, or material, write about that exact thing.
- Do not add meals, plates, dishes, herbs, rustic food tables, dolma, lavash, restaurants, grilled meats, salads, kitchens, aromas, bites, or flavors unless directly relevant to the exact subject.
- Tone: short, warm, editorial, concrete, one or two sentences.

Return JSON: {"cardIndex":{cardIndex},"props":{"body4":"..."}}

**Используется:** Promo 02 / Rubric 02 для поля `body4`. Категория не передаётся намеренно, чтобы не тянуть неедовые предметы в food-контекст.

---

## user-template-single-text-news

Generate news carousel copy for HelloIAM **AM NEWS** (News 01 / Rubric 05).

- Infopovod (news hook about Armenia): {subject}
- Category label: {categoryLabel}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Fill only these fields: {textFields}

Card rules:
- cardIndex 0 (cover): `quote` = punchy news headline, 1–2 sentences, English, red headline tone.
- cardIndex 1–2 (body): `quote` = 2–4 sentences editorial news copy with HelloIAM wit.

Do not output `title`, `label`, or `source` (those are fixed in the template).

Return JSON: {"cardIndex":{cardIndex},"props":{...}}

---

## user-template-single-image

Generate image prompt for ONE carousel card.

- Subject: {subject}
- Category: {categoryLabel}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Style: editorial photorealistic, Armenian context, no text in image

Return JSON: {"cardIndex":{cardIndex},"imagePrompt":"one line prompt"}

**Дальше:** строка `imagePrompt` уходит в fal.ai (`FAL_MODEL`, по умолчанию `fal-ai/nano-banana-2`, resolution `1K`, aspect `4:5` для слайдов 1080×1350).

---

## user-template-single-image-news

Generate image prompt for ONE **AM NEWS** carousel card.

- Infopovod: {subject}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Style: cartoon editorial illustration (Family Guy / American Dad aesthetic), satirical news scene, Armenia context, no text in image, 1080x1350 vertical

Return JSON: {"cardIndex":{cardIndex},"imagePrompt":"one line prompt"}

---

## user-template-video-promo

Generate a video prompt for ONE HelloIAM carousel slide.

- Exact subject: {subject}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Treat the subject literally. Do not reinterpret it as food unless the subject is explicitly a food, dish, drink, or ingredient.
- If the subject is a place, object, landmark, cultural item, document, game, or symbol, show that exact thing directly.
- Armenian context is welcome, but do not add plates, dishes, herbs, rustic food tables, dolma, lavash, restaurant props, or kitchen props unless they are directly relevant to the subject.
- Style: editorial cultural video, natural light, vertical 9:16, no text overlays, no captions, no UI, no logos.
- Motion: describe one clear camera movement or one simple subject movement.

Return JSON: {"cardIndex":{cardIndex},"videoPrompt":"one line prompt"}

**Используется:** Rubric 01 / Promo 01 и Rubric 02 / Promo 02. Категория не передаётся намеренно, чтобы не тянуть предметы в `food`.

---

## few-shot-quote

There is no definitive dolma. Grape leaves, cabbage leaves, or stuffed peppers and aubergines — all of them count.

---

## image-style

Editorial food and culture photography, soft natural light, shallow depth of field, 1080x1350 vertical composition, no text overlays, no watermarks, authentic Armenian context.

**Используется:** склеивается с `system` при генерации image prompts в `generation-service.mjs`.

---

## emoji-openai-edits

Generate a single flat cartoon illustration emoji of: {name}. Match exactly the visual style of the reference images: flat 2D illustration, isolated on white background, clean simple lines, soft natural colors. Show only this one item centered, no other objects, no text.

**Модель:** OpenAI `gpt-image-1`, endpoint `/images/edits`. Референс: `public/emoji-style-reference.png`.

---

## emoji-openai-generations

A single flat cartoon illustration emoji of {name}. Isolated on pure white background, clean simple lines, soft natural colors, subtle drop shadow, centered, no text. Armenian sticker pack illustration style.

**Модель:** OpenAI `gpt-image-1`, endpoint `/images/generations` (если референс недоступен).

---

## emoji-recraft

A single flat illustration emoji sticker of {name}, isolated on white background, clean cartoon art, soft colors, no text, centered, simple drop shadow

**Модель:** fal.ai `fal-ai/nano-banana-2`, resolution `1K`, `aspect_ratio: 1:1`. Primary path; OpenAI/recraft — fallback.

---

## llm-retry-json

Reply with a single valid JSON object only. No markdown, no commentary.

**Используется:** повторный запрос в `llm-client.mjs`, если LLM вернул невалидный JSON.

---

## reference-fixed-promo01

Фиксированные заголовки **Promo 01** (Rubric 01). LLM не вызывается. Код: `tools/generation/rubric-01-titles.mjs`.

| cardIndex | title |
|-----------|-------|
| 0 | HELLO\nI AM |
| 1 | HELLO\nI AM\nAM |
| 2 | AM\nMEANS |
| 3 | AM\nMEANS\nARMENIA |
| 4–8 | HELLO\nI AM\nAM\nMEANS\nARMENIA |

---

## reference-fixed-promo02

**Promo 02** (Rubric 02). Код: `generation-service.mjs`.

- `body2` = `helloiam am` — всегда фикс, LLM не генерирует
- LLM генерирует только `body4` (tagline) — через `user-template-single-text`, subject = название карточки из слота

---

## reference-fixed-news05

Фиксированные поля **News 01** (Rubric 05). Код: `tools/generation/format-05-news.mjs`.

- title = `Hello, WORLD`
- label = `AM NEWS`
- source = `source: armradio.am`
- LLM генерирует только `fact` / `quote`

---

## reference-post-process

Пост-обработка после ответа LLM. Код: `normalizeGeneratedProps()` в `generation-service.mjs`.

Для hello / quote / intro-hero (не News):
- title принудительно = `HELLO,\nI\nAM`
- item и titleAccent = subject (UPPERCASE)
- label = category label из настроек поста

Для brand-слайдов:
- brandLeft = `helloiam`
- brandRight = `am`
