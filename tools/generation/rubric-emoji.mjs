import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {findEmojiAssetInPost} from './emoji-match.mjs';
import {
  normalizeTemplateId,
  RUBRIC01_ID,
  RUBRIC02_ID,
  RUBRIC03_ID,
  RUBRIC04_ID,
  RUBRIC05_ID,
  rubricShowsEmojiPicker,
} from '../rubric/rubric-ids.mjs';

export {
  RUBRIC03_ID as FORMAT03_ID,
  RUBRIC04_ID as FORMAT04_ID,
} from '../rubric/rubric-ids.mjs';

/**
 * @param {{ cards?: Array<{ cardIndex: number }> }} post
 */
export function lastCardIndex(post) {
  const cards = [...(post.cards || [])].sort((a, b) => a.cardIndex - b.cardIndex);
  return cards[cards.length - 1]?.cardIndex;
}

/**
 * @param {string | undefined} templateId
 */
export function usesEmojiWorkflow(templateId) {
  return rubricShowsEmojiPicker(templateId);
}

/** @deprecated use usesEmojiWorkflow */
export function isEmojiImageTemplate(templateId) {
  return usesEmojiWorkflow(templateId);
}

/**
 * @param {{ templateId?: string, cards?: Array<{ cardIndex: number, fields?: Array<{ type: string }> }> }} post
 * @param {{ cardIndex: number, fields?: Array<{ type: string }> }} card
 */
export function cardUsesEmoji(post, card) {
  const rubricId = normalizeTemplateId(post.templateId);
  if (!rubricShowsEmojiPicker(rubricId)) return false;
  if (rubricId === RUBRIC01_ID) return false;
  if (!(card.fields || []).some((field) => field.type === 'image')) return false;
  const last = lastCardIndex(post);
  if (rubricId === RUBRIC03_ID || rubricId === RUBRIC04_ID) {
    return card.cardIndex === 0 || card.cardIndex === last;
  }
  if (rubricId === RUBRIC02_ID) {
    // Even cards (0,2,4,6,8) are emoji cards; odd cards are AI-photo cards
    return card.cardIndex % 2 === 0;
  }
  return false;
}

/**
 * @param {{ templateId?: string, cards?: Array<{ cardIndex: number, fields?: Array<{ type: string }> }> }} post
 * @param {{ cardIndex: number, fields?: Array<{ type: string }> }} card
 */
export function cardNeedsGeneratedImage(post, card) {
  if (card.props?.cardKind === 'brand') return false;
  if (!(card.fields || []).some((field) => field.type === 'image')) return false;
  if (usesEmojiWorkflow(post.templateId)) return !cardUsesEmoji(post, card);
  return true;
}

/**
 * @param {{ templateId?: string, cards?: Array<{ cardIndex: number, fields?: Array<{ type: string }> }> }} post
 */
export function findEmojiImageCards(post) {
  return (post.cards || []).filter((card) => cardUsesEmoji(post, card));
}

/**
 * @param {{ assets?: string[], cards?: Array<{ fields?: Array<{ type: string }>, props?: Record<string, string> }>, selectedEmojiId?: string, selectedEmojiAssetPath?: string }} post
 */
export function resolvePostEmojiAssetPath(post) {
  if (typeof post.selectedEmojiAssetPath === 'string' && post.selectedEmojiAssetPath.trim()) {
    const assetPath = post.selectedEmojiAssetPath.trim();
    if ((post.assets || []).includes(assetPath)) return assetPath;
  }

  if (typeof post.selectedEmojiId === 'string' && post.selectedEmojiId.trim()) {
    const match = findAssetByEmojiFilename(post, post.selectedEmojiId.trim());
    if (match) return match;
  }

  const fromAssets = findEmojiAssetInPost(post);
  if (fromAssets) return fromAssets;

  const brand = (post.cards || []).find((card) => card.props?.cardKind === 'brand');
  if (brand) {
    const fieldKey = (brand.fields || []).find((field) => field.type === 'image')?.key || 'image';
    const assetPath = brand.props?.[fieldKey];
    if (typeof assetPath === 'string' && assetPath.trim() && (post.assets || []).includes(assetPath.trim())) {
      return assetPath.trim();
    }
  }

  return null;
}

function slugifyAssetBase(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {{ assets?: string[] }} post
 * @param {string} emojiFilename
 */
function findAssetByEmojiFilename(post, emojiFilename) {
  const expected = slugifyAssetBase(path.basename(emojiFilename));
  if (!expected) return null;
  for (let i = (post.assets || []).length - 1; i >= 0; i--) {
    const assetPath = post.assets[i];
    const base = slugifyAssetBase(path.basename(assetPath));
    if (base === expected || base.startsWith(`${expected}-`)) return assetPath;
  }
  return null;
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function syncEmojiToImageCards(studioRoot, postId) {
  const post = await getPost(studioRoot, postId);
  if (!usesEmojiWorkflow(post.templateId)) return post;

  const rubricId = normalizeTemplateId(post.templateId);

  // Rubric02: each even card N gets its own emoji from selectedEmojis[N/2].
  // Always use the per-slot model — never fall through to the legacy single-emoji path.
  if (rubricId === RUBRIC02_ID) {
    const slots = Array.isArray(post.selectedEmojis) ? post.selectedEmojis : [];
    // Apply each slot's emoji to its even card
    for (const entry of slots) {
      const cardIndex = entry.slot * 2;
      const card = (post.cards || []).find((c) => c.cardIndex === cardIndex);
      if (!card || !entry.assetPath) continue;
      const fieldKey = (card.fields || []).find((f) => f.type === 'image')?.key || 'image';
      if ((card.props || {})[fieldKey] === entry.assetPath) continue;
      await updatePostCard(studioRoot, postId, cardIndex, {[fieldKey]: entry.assetPath}, {strict: false});
    }
    // Clear emoji images from ALL odd cards (they should always have generated photos, never emojis)
    const filledPaths = new Set(slots.map((e) => e.assetPath).filter(Boolean));
    const fresh = await getPost(studioRoot, postId);
    for (const card of fresh.cards || []) {
      if (card.cardIndex % 2 === 0) continue; // skip even cards
      const fieldKey = (card.fields || []).find((f) => f.type === 'image')?.key;
      if (!fieldKey) continue;
      const val = (card.props || {})[fieldKey];
      if (val && filledPaths.has(val)) {
        // Image is an emoji asset — clear it
        await updatePostCard(studioRoot, postId, card.cardIndex, {[fieldKey]: ''}, {strict: false});
      }
    }
    return getPost(studioRoot, postId);
  }

  const emojiPath = resolvePostEmojiAssetPath(post);
  if (!emojiPath) return post;

  // Place emoji on cards that should have it
  for (const card of findEmojiImageCards(post)) {
    const fieldKey = (card.fields || []).find((field) => field.type === 'image')?.key || 'image';
    if ((card.props || {})[fieldKey] === emojiPath) continue;
    await updatePostCard(studioRoot, postId, card.cardIndex, {[fieldKey]: emojiPath}, {strict: false});
  }

  // Clear emoji from cards that should NOT have it but currently do
  const fresh = await getPost(studioRoot, postId);
  for (const card of fresh.cards || []) {
    if (cardUsesEmoji(fresh, card)) continue;
    const fieldKey = (card.fields || []).find((f) => f.type === 'image')?.key;
    if (!fieldKey) continue;
    const val = (card.props || {})[fieldKey];
    if (val === emojiPath) {
      await updatePostCard(studioRoot, postId, card.cardIndex, {[fieldKey]: ''}, {strict: false});
    }
  }

  return getPost(studioRoot, postId);
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} emojiFilename
 * @param {string} [assetPath]
 */
export async function rememberSelectedEmoji(studioRoot, postId, emojiFilename, assetPath) {
  const post = await getPost(studioRoot, postId);
  post.selectedEmojiId = emojiFilename;
  if (assetPath) post.selectedEmojiAssetPath = assetPath;
  post.updatedAt = new Date().toISOString();
  await writeFile(
    path.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );
  return post;
}
