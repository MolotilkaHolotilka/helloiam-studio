import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {CATEGORY_LABELS, getPostItem} from '../posts/post-settings.mjs';
import {syncCardPropAliases} from '../card-props.mjs';
import {fillPromptTemplate, loadGenerationPrompts} from './prompt-loader.mjs';
import {chatCompletionJson, isLlmConfigured as llmReady} from './llm-client.mjs';
import {generateImageFromPrompt, isFalConfigured} from './fal-client.mjs';
import {
  INSTAGRAM_VIDEO_SIZE,
  generateVideoFromPrompt,
  isFalVideoConfigured,
  normalizeVideoToInstagram45,
} from './fal-video-client.mjs';
import {getRubric01Title, isRubric01Template} from './rubric-01-titles.mjs';
import {
  cardUsesEmoji,
  cardNeedsGeneratedImage,
  syncEmojiToImageCards,
  usesEmojiWorkflow,
} from './rubric-emoji.mjs';
import {FORMAT05_GENERATED_TEXT_KEYS, isRubric05Template} from './format-05-news.mjs';
import {
  isRubric03Template,
  isRubric04Template,
  isRubric05Template as isNewsTemplate,
  isRubric02Template,
  isRubric06Template,
} from '../rubric/rubric-ids.mjs';
import {getPostAssetPathSet, isPostAssetRegistered, uploadPostAsset} from '../posts/post-assets-service.mjs';

const TEXT_FIELD_TYPES = new Set(['string', 'textarea']);
const LOCKED_PROP_KEYS = new Set([
  'background',
  'titleColor',
  'labelColor',
  'accentColor',
  'brandColor',
  'factColor',
  'quoteColor',
  'body2Color',
  'body4Color',
  'image',
  'engine',
  'cardKind',
  'cardIndex',
  'cardCount',
  'cardLayout',
  'introLayout',
  'title',
  'item',
  'titleAccent',
  'label',
  'brandLeft',
  'brandRight',
  'source',
]);

function inferCardRole(card) {
  const kind = card.props?.cardKind;
  if (typeof kind === 'string' && kind) return kind;
  const keys = new Set((card.fields || []).map((f) => f.key));
  if (keys.has('brandLeft')) return 'brand';
  if (keys.has('fact') || keys.has('quote')) return 'quote';
  if (card.cardIndex === 0 && (keys.has('item') || keys.has('titleAccent'))) return 'hello';
  if (keys.has('title') && (keys.has('item') || keys.has('titleAccent')) && keys.has('label')) return 'intro-hero';
  if (keys.has('brandLeft') && keys.has('brandRight')) return 'brand';
  if (keys.has('image') && !keys.has('title') && !keys.has('fact') && !keys.has('quote')) return 'photo';
  return 'generic';
}

function buildCardsBlueprint(post) {
  return (post.cards || [])
    .map((card) => {
      const role = inferCardRole(card);
      const textFields = (card.fields || [])
        .filter((f) => TEXT_FIELD_TYPES.has(f.type) && !LOCKED_PROP_KEYS.has(f.key))
        .map((f) => (f.key === 'quote' ? 'fact' : f.key));
      const hasImage = (card.fields || []).some((f) => f.type === 'image');
      return {cardIndex: card.cardIndex, label: card.label, role, textFields, hasImage, card};
    })
    .sort((a, b) => a.cardIndex - b.cardIndex);
}

function normalizeGeneratedProps(card, props, categoryLabel, item, templateId) {
  const role = inferCardRole(card);
  const news = isNewsTemplate(templateId);
  const allowed = new Set(
    (card.fields || [])
      .filter((f) => TEXT_FIELD_TYPES.has(f.type) && !LOCKED_PROP_KEYS.has(f.key))
      .map((f) => (f.key === 'quote' ? 'fact' : f.key)),
  );
  if (news) {
    for (const key of allowed) {
      if (!FORMAT05_GENERATED_TEXT_KEYS.has(key) && key !== 'fact') allowed.delete(key);
    }
  }

  /** @type {Record<string, string>} */
  const cleaned = {};
  for (const [key, value] of Object.entries(props || {})) {
    const normalizedKey = key === 'quote' ? 'fact' : key;
    if (!allowed.has(normalizedKey)) continue;
    if (typeof value === 'string' && value.trim()) cleaned[normalizedKey] = value.trim();
  }

  if (!news && (role === 'hello' || role === 'quote' || role === 'intro-hero')) {
    cleaned.title = 'HELLO,\nI AM';
    if (item) {
      cleaned.item = item;
      cleaned.titleAccent = item;
    }
  }

  if (role === 'brand') {
    if ('brandLeft' in (card.props || {})) cleaned.brandLeft = 'helloiam';
    if ('brandRight' in (card.props || {})) cleaned.brandRight = 'am';
  }

  if ('label' in (card.props || {}) && !news && (role === 'hello' || role === 'quote' || role === 'intro-hero')) {
    cleaned.label = categoryLabel;
  }

  syncCardPropAliases(cleaned);
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

function resolveGenerationSubject(post) {
  if (isNewsTemplate(post.templateId)) {
    return (post.subject || post.name || '').trim();
  }
  // Rubric02: subject comes from the first filled slot's clean item name
  if (isRubric02Template(post.templateId)) {
    const slots = Array.isArray(post.selectedEmojis) ? post.selectedEmojis : [];
    const first = slots.find((e) => e && (e.emojiName || e.emojiId));
    if (first) {
      // emojiName is the pre-parsed clean name (e.g. "LAVASH") set by both addEmojiSlotToPost and addBrandCardSlotToPost
      if (first.emojiName) return first.emojiName.toUpperCase();
      // Fallback: strip leading number + whitespace from raw filename
      return first.emojiId.replace(/^\d+\s+/, '').replace(/\.png$/i, '').toUpperCase();
    }
    // Legacy single-field fallback (old posts)
    const emojiId = (post.selectedEmojiId || '').trim();
    if (emojiId) return emojiId.replace(/^\d+\s+/, '').replace(/\.png$/i, '').toUpperCase();
    const emojiPath = (post.selectedEmojiAssetPath || '').trim();
    if (emojiPath) {
      const filename = emojiPath.split('/').pop() || '';
      return filename.replace(/^\d+\s+/, '').replace(/\.png$/i, '').toUpperCase();
    }
    return '';
  }
  return getPostItem(post) || (post.subject || '').trim();
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {Record<string, unknown>} patch
 */
async function persistGeneration(studioRoot, postId, patch) {
  const post = await getPost(studioRoot, postId);
  post.generation = {...(post.generation || {status: 'draft'}), ...patch};
  post.updatedAt = new Date().toISOString();
  const {writeFile} = await import('node:fs/promises');
  const pathMod = await import('node:path');
  await writeFile(
    pathMod.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );
  return post;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function generatePostTexts(studioRoot, postId) {
  if (!llmReady()) {
    throw new Error('Slide texts are unavailable — server setup required');
  }

  const post = await getPost(studioRoot, postId);
  if (isRubric06Template(post.templateId)) {
    throw new Error('Rubric 06 is emoji-only — use Settings to generate');
  }
  let livePost = post;
  const subject = resolveGenerationSubject(post);
  const news = isNewsTemplate(post.templateId);
  if (!subject) {
    throw new Error(
      news
        ? 'Enter the news angle in Settings (infopov about Armenia)'
        : isRubric02Template(post.templateId)
          ? 'Select at least one emoji in Settings first'
          : 'Pick an emoji in Settings first — it sets the headline item',
    );
  }

  const categoryId = post.category || 'food';
  const categoryLabel = CATEGORY_LABELS[categoryId] || CATEGORY_LABELS.food;
  const blueprint = buildCardsBlueprint(post);
  const prompts = await loadGenerationPrompts(studioRoot);
  const systemContent = (prompts.system || '').trim();
  const fewShotQuote = (prompts['few-shot-quote'] || prompts['few-shot-fact'] || '').trim();
  const item = news ? subject : subject.toUpperCase();

  const singleTextTemplate = isRubric02Template(post.templateId)
    ? prompts['user-template-text-promo02'] || prompts['user-template-single-text'] || ''
    : news
    ? prompts['user-template-single-text-news'] || prompts['user-template-single-text'] || ''
    : prompts['user-template-single-text'] || prompts['user-template-batch-facts'] || '';

  /** @type {Record<number, Record<string, string>>} */
  const texts = {};

  if (isRubric01Template(post.templateId)) {
    for (const bp of blueprint) {
      const fixedTitle = getRubric01Title(bp.cardIndex);
      if (!fixedTitle) continue;
      const props = {title: fixedTitle};
      texts[bp.cardIndex] = props;
      await updatePostCard(studioRoot, postId, bp.cardIndex, props, {strict: false});
    }
    return persistGeneration(studioRoot, postId, {
      status: 'texts',
      texts,
      generatedAt: new Date().toISOString(),
    });
  }

  // Rubric02: 5 pairs (emoji card + AI-photo card). Only even cards (Post103Css) have text.
  // body2 = fixed "helloiam am", body4 = generated tagline using per-pair emoji as subject.
  if (isRubric02Template(post.templateId)) {
    const slots = Array.isArray(post.selectedEmojis) ? post.selectedEmojis : [];
    for (const bp of blueprint) {
      // Only even cards have text fields (body2, body4)
      if (bp.cardIndex % 2 !== 0) continue;
      if (bp.textFields.length === 0) continue;

      const pairSlot = Math.floor(bp.cardIndex / 2);
      const slotEntry = slots.find((e) => e.slot === pairSlot);
      // Prefer pre-parsed emojiName; strip number prefix from raw filename as fallback
      const pairSubject = (slotEntry?.emojiName?.toUpperCase())
        || (slotEntry?.emojiId?.replace(/^\d+\s+/, '').replace(/\.png$/i, '').toUpperCase())
        || subject;

      // body2 is always "helloiam am" — never generate it
      const fixed = {body2: 'helloiam am'};
      texts[bp.cardIndex] = {...(texts[bp.cardIndex] || {}), ...fixed};
      await updatePostCard(studioRoot, postId, bp.cardIndex, fixed, {strict: false});

      if (!pairSubject) continue;

      // Only generate body4 (the tagline / subheading)
      const taglineFields = bp.textFields.filter((k) => k === 'body4');
      if (taglineFields.length === 0) continue;

      const userMessage = fillPromptTemplate(singleTextTemplate, {
        subject: pairSubject,
        cardIndex: String(bp.cardIndex),
        cardLabel: bp.label,
        role: bp.role,
        textFields: taglineFields.join(', '),
      });

      const parsed = await requestJson(systemContent, userMessage, {maxTokens: 400});
      const rawProps = parsed?.props && typeof parsed.props === 'object' ? parsed.props : parsed;
      // Only keep body4 from response
      const body4 = typeof rawProps?.body4 === 'string' && rawProps.body4.trim()
        ? rawProps.body4.trim()
        : null;
      if (body4) {
        const pairProps = {body4};
        texts[bp.cardIndex] = {...(texts[bp.cardIndex] || {}), ...pairProps};
        await updatePostCard(studioRoot, postId, bp.cardIndex, pairProps, {strict: false});
      }
    }
    return persistGeneration(studioRoot, postId, {
      status: 'texts',
      texts,
      generatedAt: new Date().toISOString(),
    });
  }

  for (const bp of blueprint) {
    if (bp.role === 'brand') {
      const props = normalizeGeneratedProps(bp.card, {brandLeft: 'helloiam', brandRight: 'am'}, categoryLabel, item, post.templateId);
      texts[bp.cardIndex] = props;
      await updatePostCard(studioRoot, postId, bp.cardIndex, props, {strict: false});
      continue;
    }

    if (bp.textFields.length === 0) continue;

    const textFields = news
      ? bp.textFields.filter((key) => FORMAT05_GENERATED_TEXT_KEYS.has(key) || key === 'fact')
      : bp.textFields.filter((key) => key === 'fact' || (key !== 'title' && key !== 'label'));
    if (textFields.length === 0) continue;

    const userMessage = fillPromptTemplate(singleTextTemplate, {
      subject,
      categoryLabel,
      categoryId,
      cardIndex: String(bp.cardIndex),
      cardLabel: bp.label,
      role: bp.role,
      textFields: textFields.join(', '),
      fewShotQuote,
    });

    const parsed = await requestJson(systemContent, userMessage, {maxTokens: 1200});
    const rawProps = parsed?.props && typeof parsed.props === 'object' ? parsed.props : parsed;
    const props = normalizeGeneratedProps(bp.card, rawProps, categoryLabel, item, post.templateId);

    if (Object.keys(props).length > 0) {
      texts[bp.cardIndex] = props;
      await updatePostCard(studioRoot, postId, bp.cardIndex, props, {strict: false});
      await persistGeneration(studioRoot, postId, {
        status: 'texts',
        texts: {...(livePost.generation?.texts || {}), ...texts},
        generatedAt: new Date().toISOString(),
      });
      livePost = await getPost(studioRoot, postId);
    }
  }

  return persistGeneration(studioRoot, postId, {
    status: 'texts',
    texts,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function generatePostImagePrompts(studioRoot, postId) {
  if (!llmReady()) {
    throw new Error('Picture descriptions are unavailable — server setup required');
  }

  const post = await getPost(studioRoot, postId);
  const subject = resolveGenerationSubject(post);
  if (!subject) {
    throw new Error('Complete Settings first (emoji or infopov)');
  }

  const categoryId = post.category || 'food';
  const categoryLabel = CATEGORY_LABELS[categoryId] || CATEGORY_LABELS.food;
  const blueprint = buildCardsBlueprint(post);
  const prompts = await loadGenerationPrompts(studioRoot);
  const systemContent = (prompts.system || '').trim();
  const imageStyle = (prompts['image-style'] || '').trim();
  const videoMode = isRubric01Template(post.templateId) || isRubric02Template(post.templateId);
  const videoStyle = videoMode
    ? 'Video prompt mode: write motion-focused text-to-video prompts for short vertical 9:16 cultural clips. Treat the exact subject literally. Do not use food styling unless the subject itself is food.'
    : '';
  const imagesSystem = [
    systemContent,
    !videoMode && imageStyle ? `Image style: ${imageStyle}` : '',
    videoStyle,
  ].filter(Boolean).join('\n\n');
  const news = isNewsTemplate(post.templateId);
  const singleImageTemplate = videoMode
    ? prompts['user-template-video-promo'] || prompts['user-template-single-image'] || ''
    : news
      ? prompts['user-template-single-image-news'] || prompts['user-template-single-image'] || ''
      : prompts['user-template-single-image'] || '';

  /** @type {Record<number, string>} */
  const imagePrompts = {...(post.generation?.imagePrompts || {})};

  // Build a slot→itemName lookup for Rubric02 per-pair image subjects
  const rubric02Slots = isRubric02Template(post.templateId) && Array.isArray(post.selectedEmojis)
    ? Object.fromEntries(post.selectedEmojis.map((e) => [
        e.slot,
        e.emojiName?.toUpperCase()
          || e.emojiId?.replace(/^\d+\s+/, '').replace(/\.png$/i, '').toUpperCase()
          || '',
      ]))
    : null;

  for (const bp of blueprint.filter((c) => c.hasImage)) {
    if (bp.role === 'brand') continue;
    if (cardUsesEmoji(post, bp.card)) continue;

    // For Rubric02 odd cards (AI-photo), use the emoji from the matching pair slot
    let cardSubject = subject;
    if (rubric02Slots !== null) {
      const pairSlot = Math.floor(bp.cardIndex / 2);
      cardSubject = rubric02Slots[pairSlot] || subject;
    }

    const userMessage = fillPromptTemplate(singleImageTemplate, {
      subject: cardSubject,
      ...(videoMode ? {} : {categoryLabel}),
      cardIndex: String(bp.cardIndex),
      cardLabel: bp.label,
      role: bp.role,
    });

    const parsed = await requestJson(imagesSystem, userMessage, {maxTokens: 500});
    const promptText = typeof parsed.videoPrompt === 'string'
      ? parsed.videoPrompt
      : typeof parsed.imagePrompt === 'string'
        ? parsed.imagePrompt
        : '';
    if (promptText.trim()) {
      imagePrompts[bp.cardIndex] = promptText.trim();
    }
  }

  const fresh = await getPost(studioRoot, postId);
  if (usesEmojiWorkflow(fresh.templateId)) {
    await syncEmojiToImageCards(studioRoot, postId);
  }

  return persistGeneration(studioRoot, postId, {
    status: 'prompts',
    imagePrompts,
    ...(videoMode ? {videoPrompts: imagePrompts} : {}),
    promptsGeneratedAt: new Date().toISOString(),
  });
}

/** @deprecated use generatePostTexts + generatePostImagePrompts */
export async function generatePostContent(studioRoot, postId) {
  await generatePostTexts(studioRoot, postId);
  return generatePostImagePrompts(studioRoot, postId);
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

  if (patch.videoPrompts && typeof patch.videoPrompts === 'object') {
    generation.videoPrompts = {...(generation.videoPrompts || {})};
    generation.imagePrompts = {...(generation.imagePrompts || {})};
    for (const [idx, prompt] of Object.entries(patch.videoPrompts)) {
      if (typeof prompt === 'string') {
        generation.videoPrompts[Number(idx)] = prompt.trim();
        generation.imagePrompts[Number(idx)] = prompt.trim();
      }
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

  if (typeof patch.status === 'string') generation.status = patch.status;
  if (typeof patch.emojiFilename === 'string') generation.emojiFilename = patch.emojiFilename;
  if (typeof patch.emojiUrl === 'string') generation.emojiUrl = patch.emojiUrl;
  if (typeof patch.generatedAt === 'string') generation.generatedAt = patch.generatedAt;
  if (typeof patch.usedModel === 'string') generation.usedModel = patch.usedModel;

  if (generation.status === 'draft' && patch.texts) generation.status = 'texts';
  return persistGeneration(studioRoot, postId, generation);
}

function cardHasImageField(card) {
  return (card.fields || []).some((f) => f.type === 'image');
}

function findExistingVideoAsset(post, cardIndex) {
  const prefix = `card-${cardIndex + 1}-video`;
  return [...(post.assets || [])]
    .reverse()
    .find((assetPath) => {
      const fileName = String(assetPath).split('/').pop() || '';
      return fileName.startsWith(prefix) && /\.mp4$/i.test(fileName);
    });
}

function imageAspectRatioForCard(post, card) {
  if (isRubric03Template(post.templateId) || isRubric04Template(post.templateId)) {
    return '3:2';
  }
  if (isNewsTemplate(post.templateId)) {
    if (card.cardIndex === 0) return '5:4';
    return '16:9';
  }
  return undefined;
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
  let post = await getPost(studioRoot, postId);
  if (usesEmojiWorkflow(post.templateId)) {
    post = await syncEmojiToImageCards(studioRoot, postId);
  }

  const generation = post.generation;

  const requested =
    options.cardIndexes?.length
      ? options.cardIndexes.map(Number)
      : Object.keys(generation?.imagePrompts || {}).map(Number);
  const needsFal = requested.some((cardIndex) => {
    const card = post.cards.find((c) => c.cardIndex === cardIndex);
    return card && cardNeedsGeneratedImage(post, card);
  });

  if (!needsFal) {
    return {post, results: []};
  }

  if (!isFalConfigured()) {
    throw new Error('Image generation is unavailable — server setup required');
  }
  if (!generation?.imagePrompts || !Object.keys(generation.imagePrompts).length) {
    throw new Error('Create picture descriptions first');
  }

  const forceIndexes = new Set(options.cardIndexes?.map(Number) || []);
  const assetPaths = await getPostAssetPathSet(studioRoot, postId);
  const emojiAssetPath = post.selectedEmojiAssetPath || null;

  const results = [];

  for (const cardIndex of requested) {
    const card = post.cards.find((c) => c.cardIndex === cardIndex);
    if (!card || !cardHasImageField(card)) continue;
    if (card.props?.cardKind === 'brand') continue;
    if (cardUsesEmoji(post, card)) continue;

    const fieldKey = imageFieldKey(card);
    const existing = (card.props || {})[fieldKey];
    const isEmojiOnNonEmojiCard = emojiAssetPath && existing === emojiAssetPath;
    if (isPostAssetRegistered(existing, assetPaths) && !forceIndexes.has(cardIndex) && !isEmojiOnNonEmojiCard) {
      results.push({cardIndex, path: existing, source: 'existing'});
      continue;
    }

    const prompt = generation.imagePrompts[cardIndex];
    if (!prompt?.trim()) continue;

    const aspectRatio = imageAspectRatioForCard(post, card);
    const {buffer, ext, model, aspectRatio: generatedAspectRatio} = await generateImageFromPrompt(prompt, {aspectRatio});
    const asset = await uploadPostAsset(studioRoot, postId, {
      buffer,
      originalName: `card-${cardIndex + 1}${ext}`,
    });

    await updatePostCard(studioRoot, postId, cardIndex, {[fieldKey]: asset.path}, {strict: false});
    results.push({cardIndex, path: asset.path, source: 'fal', model, aspectRatio: generatedAspectRatio});
    post = await getPost(studioRoot, postId);
  }

  const updated = await persistGeneration(studioRoot, postId, {
    ...post.generation,
    status: 'images',
    imagesGeneratedAt: new Date().toISOString(),
  });

  return {post: updated, results};
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {{ cardIndexes?: number[], seconds?: number, force?: boolean }} [options]
 */
export async function generatePostVideos(studioRoot, postId, options = {}) {
  let post = await getPost(studioRoot, postId);
  if (!isRubric01Template(post.templateId) && !isRubric02Template(post.templateId)) {
    throw new Error('Video generation is available only for Rubric 01 and Promo 02');
  }
  if (!isFalVideoConfigured()) {
    throw new Error('Video generation is unavailable — server setup required');
  }

  const generation = post.generation || {};
  const prompts = generation.videoPrompts || generation.imagePrompts || {};
  if (!Object.keys(prompts).length) {
    throw new Error('Create video prompts first');
  }

  const requested =
    options.cardIndexes?.length
      ? options.cardIndexes.map(Number)
      : Object.keys(prompts).map(Number);
  const forceIndexes = new Set(options.force ? requested : (options.cardIndexes?.map(Number) || []));
  const existingVideos = generation.videoAssets || {};
  const results = [];
  const errors = [];

  const tasks = [];

  for (const cardIndex of requested) {
    const card = post.cards.find((c) => c.cardIndex === cardIndex);
    if (!card || !cardHasImageField(card)) continue;
    if (cardUsesEmoji(post, card)) continue;
    const recoveredVideo = existingVideos[cardIndex] || findExistingVideoAsset(post, cardIndex);
    if (recoveredVideo && !forceIndexes.has(cardIndex)) {
      existingVideos[cardIndex] = recoveredVideo;
      results.push({cardIndex, path: recoveredVideo, source: 'existing'});
      continue;
    }

    const prompt = prompts[cardIndex];
    if (!prompt?.trim()) continue;

    tasks.push((async () => {
      const seconds = Number(options.seconds) > 0 ? Number(options.seconds) : 5;
      const videoPrompt = `${prompt.trim()}\n\nCreate a vertical 9:16 social media video, ${seconds} seconds long, smooth natural motion, no text overlays, no captions. Keep the main subject centered with safe margins because the final file will be cropped to a 4:5 Instagram feed canvas.`;
      const {buffer, ext, model, aspectRatio} = await generateVideoFromPrompt(videoPrompt, {seconds});
      const normalizedBuffer = await normalizeVideoToInstagram45(buffer);
      const asset = await uploadPostAsset(studioRoot, postId, {
        buffer: normalizedBuffer,
        originalName: `card-${cardIndex + 1}-video-1080x1350${ext}`,
      });

      existingVideos[cardIndex] = asset.path;
      results.push({
        cardIndex,
        path: asset.path,
        source: 'fal',
        model,
        aspectRatio,
        finalSize: `${INSTAGRAM_VIDEO_SIZE.width}x${INSTAGRAM_VIDEO_SIZE.height}`,
        finalAspectRatio: INSTAGRAM_VIDEO_SIZE.aspectRatio,
      });
      const freshPost = await getPost(studioRoot, postId);
      post = await persistGeneration(studioRoot, postId, {
        ...(freshPost.generation || {}),
        videoPrompts: {...prompts},
        videoAssets: {...existingVideos},
        status: 'videos',
        videosGeneratedAt: new Date().toISOString(),
        videoErrors: [],
      });
    })().catch((error) => {
      errors.push({cardIndex, error: error.message || 'Video generation failed'});
    }));
  }

  await Promise.all(tasks);

  if (results.length === 0 && errors.length > 0) {
    const err = new Error(errors.map((item) => `Slide ${item.cardIndex + 1}: ${item.error}`).join('; '));
    err.details = errors;
    throw err;
  }

  const updated = await persistGeneration(studioRoot, postId, {
    ...post.generation,
    videoPrompts: {...prompts},
    videoAssets: existingVideos,
    status: 'videos',
    videosGeneratedAt: new Date().toISOString(),
    videoErrors: errors,
  });

  return {post: updated, results, errors};
}

export {llmReady as isLlmConfigured, isFalConfigured};
