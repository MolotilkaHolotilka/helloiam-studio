import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {CATEGORY_LABELS} from '../posts/post-settings.mjs';
import {fillPromptTemplate, loadGenerationPrompts} from './prompt-loader.mjs';
import {chatCompletionJson, isLlmConfigured as llmReady} from './llm-client.mjs';
import {generateImageFromPrompt, isFalConfigured} from './fal-client.mjs';
import {getPostAssetPathSet, isPostAssetRegistered, uploadPostAsset} from '../posts/post-assets-service.mjs';

const TEXT_FIELD_TYPES = new Set(['string', 'textarea']);
const LOCKED_PROP_KEYS = new Set([
  'background',
  'titleColor',
  'accentColor',
  'labelColor',
  'quoteColor',
  'brandColor',
  'body2Color',
  'body4Color',
  'image',
  'engine',
  'cardKind',
  'cardIndex',
  'cardCount',
  'cardLayout',
  'introLayout',
]);

function inferCardRole(card) {
  const kind = card.props?.cardKind;
  if (typeof kind === 'string' && kind) return kind;
  const keys = new Set((card.fields || []).map((f) => f.key));
  if (keys.has('brandLeft')) return 'brand';
  if (keys.has('quote')) return 'quote';
  if (card.cardIndex === 0 && keys.has('titleAccent')) return 'hello';
  if (keys.has('image') && !keys.has('title') && !keys.has('quote')) return 'photo';
  return 'generic';
}

function buildCardsBlueprint(post) {
  return (post.cards || [])
    .map((card) => {
      const role = inferCardRole(card);
      const textFields = (card.fields || [])
        .filter((f) => TEXT_FIELD_TYPES.has(f.type) && !LOCKED_PROP_KEYS.has(f.key))
        .map((f) => f.key);
      const hasImage = (card.fields || []).some((f) => f.type === 'image');
      return {cardIndex: card.cardIndex, label: card.label, role, textFields, hasImage, card};
    })
    .sort((a, b) => a.cardIndex - b.cardIndex);
}

function normalizeGeneratedProps(card, props, categoryLabel, subject) {
  const role = inferCardRole(card);
  const allowed = new Set(
    (card.fields || [])
      .filter((f) => TEXT_FIELD_TYPES.has(f.type) && !LOCKED_PROP_KEYS.has(f.key))
      .map((f) => f.key),
  );

  /** @type {Record<string, string>} */
  const cleaned = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (!allowed.has(key)) continue;
    if (typeof value === 'string' && value.trim()) cleaned[key] = value.trim();
  }

  if (role === 'hello' || role === 'quote') {
    cleaned.title = 'HELLO,\nI AM';
    cleaned.titleAccent = subject.toUpperCase();
  }

  if (role === 'brand') {
    if ('brandLeft' in (card.props || {})) cleaned.brandLeft = 'helloiam';
    if ('brandRight' in (card.props || {})) cleaned.brandRight = 'am';
  }

  if ('label' in (card.props || {}) && (role === 'hello' || role === 'quote')) {
    cleaned.label = categoryLabel;
  }

  return cleaned;
}

/**
 * @param {string} systemContent
 * @param {string} userMessage
 * @param {{ maxTokens?: number }} [options]
 */
async function requestJson(systemContent, userMessage, options = {}) {
  return chatCompletionJson(
    [
      {role: 'system', content: systemContent},
      {role: 'user', content: userMessage},
    ],
    options,
  );
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function generatePostContent(studioRoot, postId) {
  if (!llmReady()) {
    throw new Error('LLM не настроен: задайте LLM_API_KEY в .env');
  }

  const post = await getPost(studioRoot, postId);
  const subject = (post.subject || post.name || '').trim();
  if (!subject) {
    throw new Error('Укажите предмет поста на вкладке «Настройка» (например: матсун, суджук)');
  }

  const categoryId = post.category || 'food';
  const categoryLabel = CATEGORY_LABELS[categoryId] || CATEGORY_LABELS.food;
  const blueprint = buildCardsBlueprint(post);
  const prompts = await loadGenerationPrompts(studioRoot);
  const systemContent = (prompts.system || '').trim();
  const fewShotQuote = (prompts['few-shot-quote'] || '').trim();
  const imageStyle = (prompts['image-style'] || '').trim();
  const imagesSystem = [systemContent, imageStyle ? `Image style: ${imageStyle}` : ''].filter(Boolean).join('\n\n');

  const singleTextTemplate = prompts['user-template-single-text'] || '';
  const singleImageTemplate = prompts['user-template-single-image'] || '';

  /** @type {Record<number, Record<string, string>>} */
  const texts = {};
  /** @type {Record<number, string>} */
  const imagePrompts = {};

  for (const bp of blueprint) {
    if (bp.role === 'brand') {
      const props = normalizeGeneratedProps(bp.card, {brandLeft: 'helloiam', brandRight: 'am'}, categoryLabel, subject);
      texts[bp.cardIndex] = props;
      await updatePostCard(studioRoot, postId, bp.cardIndex, props, {strict: false});
      continue;
    }

    if (bp.textFields.length === 0) continue;

    const userMessage = fillPromptTemplate(singleTextTemplate, {
      subject,
      categoryLabel,
      categoryId,
      cardIndex: String(bp.cardIndex),
      cardLabel: bp.label,
      role: bp.role,
      textFields: bp.textFields.join(', '),
      fewShotQuote,
    });

    const parsed = await requestJson(systemContent, userMessage, {maxTokens: 1200});
    const props = normalizeGeneratedProps(
      bp.card,
      parsed?.props && typeof parsed.props === 'object' ? parsed.props : parsed,
      categoryLabel,
      subject,
    );

    if (Object.keys(props).length > 0) {
      texts[bp.cardIndex] = props;
      await updatePostCard(studioRoot, postId, bp.cardIndex, props, {strict: false});
    }
  }

  for (const bp of blueprint.filter((c) => c.hasImage)) {
    const userMessage = fillPromptTemplate(singleImageTemplate, {
      subject,
      categoryLabel,
      cardIndex: String(bp.cardIndex),
      cardLabel: bp.label,
      role: bp.role,
    });

    const parsed = await requestJson(imagesSystem, userMessage, {maxTokens: 500});

    if (typeof parsed.imagePrompt === 'string' && parsed.imagePrompt.trim()) {
      imagePrompts[bp.cardIndex] = parsed.imagePrompt.trim();
    }
  }

  const fresh = await getPost(studioRoot, postId);
  fresh.generation = {
    status: 'texts',
    texts,
    imagePrompts,
    generatedAt: new Date().toISOString(),
  };
  fresh.updatedAt = new Date().toISOString();

  const {writeFile} = await import('node:fs/promises');
  const path = await import('node:path');
  await writeFile(
    path.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(fresh, null, 2)}\n`,
    'utf8',
  );

  return fresh;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {{ imagePrompts?: Record<string, string>, texts?: Record<string, Record<string, string>> }} patch
 */
export async function updatePostGeneration(studioRoot, postId, patch) {
  const post = await getPost(studioRoot, postId);
  const generation = post.generation && typeof post.generation === 'object' ? {...post.generation} : {status: 'draft'};

  if (patch.imagePrompts && typeof patch.imagePrompts === 'object') {
    generation.imagePrompts = {...(generation.imagePrompts || {})};
    for (const [idx, prompt] of Object.entries(patch.imagePrompts)) {
      if (typeof prompt === 'string') generation.imagePrompts[Number(idx)] = prompt.trim();
    }
  }

  if (patch.texts && typeof patch.texts === 'object') {
    generation.texts = {...(generation.texts || {})};
    for (const [idx, props] of Object.entries(patch.texts)) {
      if (props && typeof props === 'object') {
        generation.texts[Number(idx)] = props;
        const card = post.cards.find((c) => c.cardIndex === Number(idx));
        if (card) {
          await updatePostCard(studioRoot, postId, Number(idx), props, {strict: false});
        }
      }
    }
  }

  generation.status = generation.status === 'draft' ? 'texts' : generation.status;
  post.generation = generation;
  post.updatedAt = new Date().toISOString();

  const {writeFile} = await import('node:fs/promises');
  const path = await import('node:path');
  await writeFile(
    path.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );
  return post;
}

function cardHasImageField(card) {
  return (card.fields || []).some((f) => f.type === 'image');
}

function imageFieldKey(card) {
  return (card.fields || []).find((f) => f.type === 'image')?.key || 'image';
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {{ cardIndexes?: number[] }} [options]
 */
export async function generatePostImages(studioRoot, postId, options = {}) {
  if (!isFalConfigured()) {
    throw new Error('fal.ai не настроен: задайте FAL_API_KEY в .env');
  }

  let post = await getPost(studioRoot, postId);
  const generation = post.generation;
  if (!generation?.imagePrompts || !Object.keys(generation.imagePrompts).length) {
    throw new Error('Сначала сгенерируйте тексты и промпты на изображения');
  }

  const requested =
    options.cardIndexes?.length
      ? options.cardIndexes.map(Number)
      : Object.keys(generation.imagePrompts).map(Number);
  const forceIndexes = new Set(options.cardIndexes?.map(Number) || []);
  const assetPaths = await getPostAssetPathSet(studioRoot, postId);

  const results = [];

  for (const cardIndex of requested) {
    const card = post.cards.find((c) => c.cardIndex === cardIndex);
    if (!card || !cardHasImageField(card)) continue;

    const fieldKey = imageFieldKey(card);
    const existing = (card.props || {})[fieldKey];
    if (isPostAssetRegistered(existing, assetPaths) && !forceIndexes.has(cardIndex)) {
      results.push({cardIndex, path: existing, source: 'existing'});
      continue;
    }

    const prompt = generation.imagePrompts[cardIndex];
    if (!prompt?.trim()) continue;

    const {buffer, ext} = await generateImageFromPrompt(prompt);
    const asset = await uploadPostAsset(studioRoot, postId, {
      buffer,
      originalName: `card-${cardIndex + 1}${ext}`,
    });

    await updatePostCard(studioRoot, postId, cardIndex, {[fieldKey]: asset.path}, {strict: false});
    results.push({cardIndex, path: asset.path, source: 'fal'});
    post = await getPost(studioRoot, postId);
  }

  post.generation = {
    ...post.generation,
    status: 'images',
    imagesGeneratedAt: new Date().toISOString(),
  };
  post.updatedAt = new Date().toISOString();

  const {writeFile} = await import('node:fs/promises');
  const pathMod = await import('node:path');
  await writeFile(
    pathMod.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );

  return {post, results};
}

export {llmReady as isLlmConfigured, isFalConfigured};
