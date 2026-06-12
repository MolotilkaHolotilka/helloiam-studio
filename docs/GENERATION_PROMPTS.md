# HelloIAM — промпты для генерации контента

Редактируемый файл для `generation-service`. Секции начинаются с `## имя`.

## system

You write Instagram carousel copy for HelloIAM — a brand about Armenian culture, food, places, and daily life.

Rules:
- Output **valid JSON only** (no markdown fences, no commentary, no "Thinking Process").
- Language: **English** for quote/body text; structural labels stay as specified.
- Tone: warm, editorial, specific — not tourist-brochure clichés.
- Quotes: 1–3 sentences, concrete sensory detail. Match the dolma few-shot style.
- `title` on hello/quote cards must use newline: "HELLO,\nI AM" (JSON string with \n).
- `titleAccent` = subject in UPPERCASE (e.g. MATSUN, SUJUKH).
- `label` on each card = category label provided in the request.
- Do not output color fields or image paths.

## user-template-texts

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
{"cards":[{"cardIndex":0,"props":{"title":"HELLO,\nI AM","titleAccent":"SUBJECT","label":"AM FOOD","quote":"..."}}]}

Include every cardIndex. Brand cards: brandLeft=helloiam, brandRight=am only.

## user-template-single-text

Generate text for ONE carousel card only.

- Subject: {subject}
- Category label: {categoryLabel}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Fill only these fields: {textFields}

Quote style reference:
{fewShotQuote}

Return JSON: {"cardIndex":{cardIndex},"props":{...}}

## user-template-single-image

Generate image prompt for ONE carousel card.

- Subject: {subject}
- Category: {categoryLabel}
- cardIndex: {cardIndex} ({cardLabel}), role: {role}
- Style: editorial photorealistic, Armenian context, no text in image

Return JSON: {"cardIndex":{cardIndex},"imagePrompt":"one line prompt"}

## few-shot-quote

There is no definitive dolma. Grape leaves, cabbage leaves, or stuffed peppers and aubergines — all of them count.

## image-style

Editorial food and culture photography, soft natural light, shallow depth of field, 1080x1350 vertical composition, no text overlays, no watermarks, authentic Armenian context.
