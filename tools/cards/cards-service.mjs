import {readdir, readFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {uploadPostAsset} from '../posts/post-assets-service.mjs';
import {applyItemToPost, applyPostSettingsToCards, syncPostName} from '../posts/post-settings.mjs';
import {normalizeTemplateId, isRubric02Template} from '../rubric/rubric-ids.mjs';

// Card number → item name (matches ALL CARDS order: 01 Lavash, 02 Khorovats, …)
const CARD_ITEM_NAMES = [
  'LAVASH', 'KHOROVATS', 'GLASS OF ARMENIAN WINE', 'MATSUN', 'BOTTLE OF ARMENIAN WINE',
  'CUP OF ARMENIAN COFFEE', 'POMEGRANATE', 'APRICOT', 'TOLMA', 'GREEN PLATE',
  'GRAPES', 'MATNAKASH', 'BAKLAVA', 'SUJUKH', 'BASTURMA',
  'GATA', 'BASKET OF FRUIT', 'ZHINGYALOV HATS', 'WEDDING DRESS', 'DHOL',
  'BACKGAMMON', 'DUDUK', 'A BUCKET OF WATER', 'CHURCH', 'CARPET',
  'KHACHKAR', 'PULPULAK', 'GYUMRI', 'GARNI TAMPLE', 'GEGHARD MONASTERY',
  'TATEV MONASTERY', 'JERMUK WATER', 'MOUNTAIN', 'ARARAT', 'SEVAN TROUT',
  'STREET LAMP', 'BALCONY', 'BRUTALISM', 'SUN', 'MAP',
  'JAZVE', 'JUG', 'BACKPACK', 'TUF', 'ARMENIAN PASSPORT',
  'FOUNTAINS', 'TASHI TUSHI (DANCING MAN)', 'ARMENIAN CAR',   'RESTAURANT PLATE', 'GHAPAMA', 'NEWS',
];

export const FORMAT02_ID = 'HelloIamWineV1';

const ALLOWED_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function cardsDir(studioRoot) {
  return path.join(studioRoot, 'ALL CARDS');
}

/**
 * Parse the leading number from filenames like "01 Lavash.png" or "card-v2-3.png".
 * Returns NaN if not found.
 */
function cardNumber(filename) {
  const base = path.basename(filename, path.extname(filename));
  // "01 Lavash" — leading digits + whitespace
  let m = base.match(/^(\d+)\s+/);
  if (m) return parseInt(m[1], 10);
  // "card-v2-3" — trailing digits after dash
  m = base.match(/-(\d+)$/);
  if (m) return parseInt(m[1], 10);
  return Number.NaN;
}

function sortCardFilename(a, b) {
  const na = cardNumber(a);
  const nb = cardNumber(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'en');
}

/**
 * Extract the human-readable item name from a card filename.
 * "01 Lavash.png" → "LAVASH"
 * "card-v2-1.png" → "LAVASH" (via CARD_ITEM_NAMES lookup)
 */
export function cardItemName(filename) {
  const n = cardNumber(filename);
  if (!Number.isNaN(n) && n >= 1) {
    return CARD_ITEM_NAMES[n - 1] || '';
  }
  // Fallback: strip leading digits + whitespace from basename
  const base = path.basename(filename, path.extname(filename));
  const stripped = base.replace(/^\d+[\s._-]+/, '').trim();
  return stripped.toUpperCase() || base.toUpperCase();
}

function cardDisplayName(filename) {
  const n = cardNumber(filename);
  if (!Number.isNaN(n) && n >= 1) {
    const name = CARD_ITEM_NAMES[n - 1];
    if (name) return `${String(n).padStart(2, '0')} ${name}`;
    return `Card ${n}`;
  }
  return path.basename(filename, path.extname(filename));
}

/** Catalog slot 0..49, or null for extras. */
export function cardCatalogSlot(filename) {
  const n = cardNumber(filename);
  if (!Number.isNaN(n) && n >= 1 && n <= CARD_ITEM_NAMES.length) return n - 1;
  return null;
}

/** Lower rank = preferred (numbered > card-v2 legacy). */
function cardFileRank(filename) {
  const base = path.basename(filename, path.extname(filename));
  if (/^\d+\s+/i.test(base)) return 0;
  if (/card-v2-/i.test(filename)) return 1;
  return 2;
}

/**
 * One file per catalog card. Drops card-v2-* when numbered file exists.
 * @param {string[]} files
 */
export function dedupeCardFilenames(files) {
  const bySlot = new Map();
  const extraByName = new Map();
  for (const filename of files) {
    const slot = cardCatalogSlot(filename);
    if (slot !== null) {
      const prev = bySlot.get(slot);
      if (!prev || cardFileRank(filename) < cardFileRank(prev)) {
        bySlot.set(slot, filename);
      }
      continue;
    }
    const key = cardItemName(filename);
    const prev = extraByName.get(key);
    if (!prev || cardFileRank(filename) < cardFileRank(prev)) {
      extraByName.set(key, filename);
    }
  }
  const keep = [...bySlot.values(), ...extraByName.values()];
  const keepSet = new Set(keep);
  return {
    keep: keep.sort(sortCardFilename),
    remove: files.filter((f) => !keepSet.has(f)),
  };
}

/** @param {string[]} files */
export function buildCardIdMigrationMap(files) {
  const {keep, remove} = dedupeCardFilenames(files);
  const keepBySlot = new Map();
  for (const filename of keep) {
    const slot = cardCatalogSlot(filename);
    if (slot !== null) keepBySlot.set(slot, filename);
  }
  const map = new Map();
  for (const legacy of remove) {
    const slot = cardCatalogSlot(legacy);
    if (slot !== null && keepBySlot.has(slot)) {
      map.set(legacy, keepBySlot.get(slot));
    }
  }
  return map;
}

async function listCardFilenames(studioRoot) {
  const dir = cardsDir(studioRoot);
  const entries = await readdir(dir, {withFileTypes: true});
  return entries
    .filter((entry) => entry.isFile() && ALLOWED_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
}

/**
 * @param {string | undefined} templateId
 */
export function isFormat02Template(templateId) {
  return normalizeTemplateId(templateId) === 'Rubric02';
}

/**
 * @param {string} studioRoot
 */
export async function listBrandCards(studioRoot) {
  const files = await listCardFilenames(studioRoot);
  const {keep} = dedupeCardFilenames(files);
  return keep.map((filename) => ({
    id: filename,
    name: cardDisplayName(filename),
    itemName: cardItemName(filename),
    url: `/api/cards/${encodeURIComponent(filename)}`,
  }));
}

/**
 * @param {string} studioRoot
 * @param {string} filename
 */
export function resolveBrandCardPath(studioRoot, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) {
    throw new Error('Недопустимое имя карточки');
  }
  const ext = path.extname(safeName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Недопустимый формат карточки');
  }
  const resolved = path.resolve(cardsDir(studioRoot), safeName);
  if (!resolved.startsWith(path.resolve(cardsDir(studioRoot)))) {
    throw new Error('Недопустимый путь карточки');
  }
  return resolved;
}

/**
 * @param {string} studioRoot
 * @param {string} filename
 */
export async function resolveBrandCardPathOrAlias(studioRoot, filename) {
  const direct = resolveBrandCardPath(studioRoot, filename);
  try {
    await stat(direct);
    return direct;
  } catch {
    const files = await listCardFilenames(studioRoot);
    const migration = buildCardIdMigrationMap(files);
    const mapped = migration.get(filename);
    if (mapped && mapped !== filename) {
      return resolveBrandCardPath(studioRoot, mapped);
    }
    const slot = cardCatalogSlot(filename);
    if (slot !== null) {
      const {keep} = dedupeCardFilenames(files);
      const match = keep.find((f) => cardCatalogSlot(f) === slot);
      if (match) return resolveBrandCardPath(studioRoot, match);
    }
    throw new Error(`Card not found: ${filename}`);
  }
}

async function persistPost(studioRoot, postId, post) {
  post.updatedAt = new Date().toISOString();
  await writeFile(
    path.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );
}

/**
 * Add a branded card to a specific slot in a Rubric02 post (5-slot pipeline).
 * Slot N maps to cardIndex N*2 (even card). Extracts item name from card filename.
 *
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} cardFilename  e.g. "01 Lavash.png"
 * @param {number} slot  0..4
 */
export async function addBrandCardSlotToPost(studioRoot, postId, cardFilename, slot) {
  const sourcePath = await resolveBrandCardPathOrAlias(studioRoot, cardFilename);
  const buffer = await readFile(sourcePath);
  const asset = await uploadPostAsset(studioRoot, postId, {
    buffer,
    originalName: path.basename(cardFilename),
  });

  const itemName = cardItemName(cardFilename);

  let post = await getPost(studioRoot, postId);
  if (!Array.isArray(post.selectedEmojis)) post.selectedEmojis = [];

  const entry = {slot, emojiId: cardFilename, emojiName: itemName, assetPath: asset.path};
  const existing = post.selectedEmojis.findIndex((e) => e.slot === slot);
  if (existing >= 0) post.selectedEmojis[existing] = entry;
  else post.selectedEmojis.push(entry);
  post.selectedEmojis.sort((a, b) => a.slot - b.slot);

  // Keep legacy selectedEmojiId/Path pointing to slot 0 for backward compatibility
  if (slot === 0) {
    post.selectedEmojiId = cardFilename;
    post.selectedEmojiAssetPath = asset.path;
    applyItemToPost(post, itemName);
  }

  applyPostSettingsToCards(post);
  syncPostName(post);
  await persistPost(studioRoot, postId, post);

  // Place the card image on the corresponding even card (cardIndex = slot * 2)
  const emojiCardIndex = slot * 2;
  const emojiCard = (post.cards || []).find((c) => c.cardIndex === emojiCardIndex);
  if (emojiCard) {
    const fieldKey = (emojiCard.fields || []).find((f) => f.type === 'image')?.key || 'image';
    await updatePostCard(studioRoot, postId, emojiCardIndex, {[fieldKey]: asset.path}, {strict: false});
  }

  post = await getPost(studioRoot, postId);
  return {
    ...asset,
    itemName,
    cardName: cardDisplayName(cardFilename),
    slot,
    post,
  };
}

/**
 * Replace all Rubric02 selected card slots at once.
 * @param {string} studioRoot
 * @param {string} postId
 * @param {Array<{slot?: number, emojiId?: string, cardId?: string, emojiName?: string}>} slots
 */
export async function resetBrandCardSlotsForPost(studioRoot, postId, slots = []) {
  let post = await getPost(studioRoot, postId);
  const normalized = [];

  for (let i = 0; i < Math.min(5, slots.length); i++) {
    const raw = slots[i] || {};
    const cardFilename = String(raw.emojiId || raw.cardId || '').trim();
    if (!cardFilename) continue;
    const sourcePath = await resolveBrandCardPathOrAlias(studioRoot, cardFilename);
    const buffer = await readFile(sourcePath);
    const asset = await uploadPostAsset(studioRoot, postId, {
      buffer,
      originalName: path.basename(cardFilename),
    });
    const itemName = raw.emojiName || cardItemName(cardFilename);
    normalized.push({
      slot: normalized.length,
      emojiId: cardFilename,
      emojiName: itemName,
      assetPath: asset.path,
    });
  }

  post = await getPost(studioRoot, postId);
  post.selectedEmojis = normalized;
  if (normalized[0]) {
    post.selectedEmojiId = normalized[0].emojiId;
    post.selectedEmojiAssetPath = normalized[0].assetPath;
    applyItemToPost(post, normalized[0].emojiName);
  } else {
    post.selectedEmojiId = '';
    post.selectedEmojiAssetPath = '';
  }

  for (let slot = 0; slot < 5; slot++) {
    const emojiCardIndex = slot * 2;
    const emojiCard = (post.cards || []).find((c) => c.cardIndex === emojiCardIndex);
    if (!emojiCard) continue;
    const fieldKey = (emojiCard.fields || []).find((f) => f.type === 'image')?.key || 'image';
    const entry = normalized.find((item) => item.slot === slot);
    if (!emojiCard.props) emojiCard.props = {};
    emojiCard.props[fieldKey] = entry?.assetPath || '';
  }

  applyPostSettingsToCards(post);
  syncPostName(post);
  post.updatedAt = new Date().toISOString();
  await writeFile(
    path.join(studioRoot, 'data', 'posts', `${postId}.json`),
    `${JSON.stringify(post, null, 2)}\n`,
    'utf8',
  );

  return getPost(studioRoot, postId);
}

/**
 * Legacy: add a single brand card to card 0 (old 2-card Format02 pipeline).
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} cardFilename
 */
export async function addBrandCardToPost(studioRoot, postId, cardFilename) {
  const post = await getPost(studioRoot, postId);

  const sourcePath = await resolveBrandCardPathOrAlias(studioRoot, cardFilename);
  const buffer = await readFile(sourcePath);
  const asset = await uploadPostAsset(studioRoot, postId, {
    buffer,
    originalName: path.basename(cardFilename),
  });

  // Place on card 0 (first image-capable card)
  const target = (post.cards || []).find((c) => c.cardIndex === 0)
    || (post.cards || []).find((c) => (c.fields || []).some((f) => f.type === 'image'));
  if (target) {
    const fieldKey = (target.fields || []).find((f) => f.type === 'image')?.key || 'image';
    await updatePostCard(studioRoot, postId, target.cardIndex, {[fieldKey]: asset.path}, {strict: false});
  }

  const itemName = cardItemName(cardFilename);
  if (itemName) {
    const fresh = await getPost(studioRoot, postId);
    fresh.selectedEmojiId = itemName;
    fresh.selectedEmojiAssetPath = asset.path;
    fresh.updatedAt = new Date().toISOString();
    await writeFile(
      path.join(studioRoot, 'data', 'posts', `${postId}.json`),
      `${JSON.stringify(fresh, null, 2)}\n`,
      'utf8',
    );
  }

  return asset;
}
