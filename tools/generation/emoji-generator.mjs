import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import path from 'node:path';
import {fillPromptTemplate, loadGenerationPrompts} from './prompt-loader.mjs';
import {generateImageWithNanoBanana} from './fal-client.mjs';

/** Default reference image relative to studioRoot */
const DEFAULT_REFERENCE_PATH = path.join('public', 'emoji-style-reference.png');

const DEFAULT_EMOJI_PROMPTS = {
  edits:
    'Generate a single flat cartoon illustration emoji of: {name}. ' +
    'Match exactly the visual style of the reference images: flat 2D illustration, ' +
    'isolated on white background, clean simple lines, soft natural colors. ' +
    'Show only this one item centered, no other objects, no text.',
  generations:
    'A single flat cartoon illustration emoji of {name}. ' +
    'Isolated on pure white background, clean simple lines, ' +
    'soft natural colors, subtle drop shadow, centered, no text. ' +
    'Armenian sticker pack illustration style.',
  recraft:
    'A single flat illustration emoji sticker of {name}, isolated on white background, ' +
    'clean cartoon art, soft colors, no text, centered, simple drop shadow',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось скачать изображение (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('Пустой файл изображения');
  return buffer;
}

async function loadEmojiPrompts(studioRoot) {
  try {
    const sections = await loadGenerationPrompts(studioRoot);
    return {
      edits: (sections['emoji-openai-edits'] || DEFAULT_EMOJI_PROMPTS.edits).trim(),
      generations: (sections['emoji-openai-generations'] || DEFAULT_EMOJI_PROMPTS.generations).trim(),
      recraft: (sections['emoji-recraft'] || DEFAULT_EMOJI_PROMPTS.recraft).trim(),
    };
  } catch {
    return DEFAULT_EMOJI_PROMPTS;
  }
}

// ─── OpenAI image generation ──────────────────────────────────────────────────

/**
 * Generate a styled emoji using OpenAI gpt-image-1.
 * With reference: sends the style grid as an input image so the model follows
 * the visual style exactly.
 * Without reference: text-only prompt.
 */
async function generateWithOpenAI(name, referenceBuffer, templates) {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) throw new Error('LLM_API_KEY не задан');

  const apiUrl = (process.env.LLM_API_URL?.trim() || 'https://api.openai.com/v1')
    .replace(/\/$/, '');

  if (referenceBuffer) {
    // Use /images/edits — provide the reference as the input image.
    // The model sees the style grid and applies that exact style to the new subject.
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append(
      'prompt',
      fillPromptTemplate(templates.edits, {name}),
    );
    form.append('n', '1');
    form.append('size', '1024x1024');
    const blob = new Blob([referenceBuffer], {type: 'image/png'});
    form.append('image[]', blob, 'style-reference.png');

    const res = await fetch(`${apiUrl}/images/edits`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`},
      body: form,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`OpenAI ответ не JSON (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
      const msg = data?.error?.message || text.slice(0, 400);
      throw new Error(`OpenAI images/edits ошибка ${res.status}: ${msg}`);
    }

    // gpt-image-1 edits returns base64 in data[0].b64_json
    const b64 = data?.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, 'base64');

    const url = data?.data?.[0]?.url;
    if (url) return downloadUrl(url);
    throw new Error('OpenAI не вернул изображение');
  } else {
    // Text-only generation with gpt-image-1
    const res = await fetch(`${apiUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fillPromptTemplate(templates.generations, {name}),
        n: 1,
        size: '1024x1024',
      }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`OpenAI ответ не JSON (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
      const msg = data?.error?.message || text.slice(0, 400);
      throw new Error(`OpenAI images/generations ошибка ${res.status}: ${msg}`);
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, 'base64');
    const url = data?.data?.[0]?.url;
    if (url) return downloadUrl(url);
    throw new Error('OpenAI не вернул изображение');
  }
}

// ─── fal.ai Nano Banana 2 ─────────────────────────────────────────────────────

/**
 * Generate emoji via fal-ai/nano-banana-2 (1K, square).
 */
async function generateWithNanoBanana(name, templates) {
  const prompt =
    fillPromptTemplate(templates.recraft, {name}) +
    ' Square sticker, flat cartoon illustration, isolated on white background.';
  const result = await generateImageWithNanoBanana(prompt, {aspectRatio: '1:1', resolution: '1K'});
  return {buffer: result.buffer, model: result.model};
}

// ─── fal.ai recraft fallback ──────────────────────────────────────────────────

/**
 * Fallback: fal-ai/recraft-v3 — the best text-to-icon/emoji model on fal.ai.
 */
async function generateWithRecraft(name, templates) {
  const apiKey = process.env.FAL_API_KEY?.trim();
  if (!apiKey) throw new Error('FAL_API_KEY не задан');

  const res = await fetch('https://fal.run/fal-ai/recraft-v3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: fillPromptTemplate(templates.recraft, {name}),
      image_size: 'square_hd',
      style: 'digital_illustration',
      n: 1,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`fal.ai recraft ответ не JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const msg = data?.detail || data?.message || text.slice(0, 400);
    throw new Error(`fal.ai recraft ошибка ${res.status}: ${msg}`);
  }
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai recraft не вернул URL изображения');
  return {buffer: await downloadUrl(url), model: 'fal-ai/recraft-v3'};
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Generate a new emoji PNG for the given item name in the Armenian sticker pack style.
 *
 * Generation order:
 *   1. fal-ai/nano-banana-2 @ 1K (primary)
 *   2. OpenAI gpt-image-1 /images/edits with style reference grid
 *   3. OpenAI gpt-image-1 /images/generations text-only (if reference missing)
 *   4. fal-ai/recraft-v3 (last resort)
 *
 * @param {string} name          - Item name, e.g. "shawarma"
 * @param {string} studioRoot    - Absolute path to the project root
 * @param {{
 *   referenceImagePath?: string,
 *   overwrite?: boolean,
 *   promptSuffix?: string,
 * }} [options]
 */
export async function generateEmoji(name, studioRoot, options = {}) {
  const cleanName = name.trim().toUpperCase().replace(/[/\\]/g, '');
  if (!cleanName) throw new Error('name не может быть пустым');

  const filename = `${cleanName}.png`;
  const outPath = path.join(studioRoot, 'ALL EMOJIS', filename);

  if (!options.overwrite && (await fileExists(outPath))) {
    throw new Error(`Эмодзи уже существует: ${filename}. Передайте overwrite: true для замены.`);
  }

  // Load reference image if available
  const refPath =
    options.referenceImagePath ?? path.join(studioRoot, DEFAULT_REFERENCE_PATH);
  let referenceBuffer = null;
  try {
    referenceBuffer = await readFile(refPath);
  } catch {
    // reference unavailable — will use text-only path
  }

  let buffer;
  let usedModel;
  const templates = await loadEmojiPrompts(studioRoot);

  // 1. Try fal-ai/nano-banana-2 @ 1K
  const falKey = process.env.FAL_API_KEY?.trim();
  if (falKey) {
    try {
      const result = await generateWithNanoBanana(cleanName, templates);
      buffer = result.buffer;
      usedModel = result.model;
    } catch (err) {
      console.error(`[emoji-gen] nano-banana-2 failed: ${err.message}`);
    }
  }

  // 2. Try OpenAI gpt-image-1
  const openAiKey = process.env.LLM_API_KEY?.trim();
  if (!buffer && openAiKey) {
    try {
      buffer = await generateWithOpenAI(cleanName, referenceBuffer, templates);
      usedModel = referenceBuffer ? 'gpt-image-1/edits' : 'gpt-image-1/generations';
    } catch (err) {
      console.error(`[emoji-gen] OpenAI failed: ${err.message}`);
    }
  }

  // 3. Fallback: fal-ai/recraft-v3
  if (!buffer) {
    if (!falKey) throw new Error('Ни FAL_API_KEY, ни LLM_API_KEY не настроены');
    const result = await generateWithRecraft(cleanName, templates);
    buffer = result.buffer;
    usedModel = result.model;
  }

  await mkdir(path.dirname(outPath), {recursive: true});
  await writeFile(outPath, buffer);

  return {
    name: cleanName,
    filename,
    emojiUrl: `/api/emojis/${encodeURIComponent(filename)}`,
    usedModel,
    hasReference: Boolean(referenceBuffer),
  };
}
