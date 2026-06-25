import {readdir, readFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {getPost, updatePostCard} from '../posts/posts-service.mjs';
import {uploadPostAsset} from '../posts/post-assets-service.mjs';
import {
  applyItemToPost,
  applyPostSettingsToCards,
  syncPostName,
} from '../posts/post-settings.mjs';
import {
  findEmojiImageCards,
  rememberSelectedEmoji,
  syncEmojiToImageCards,
  usesEmojiWorkflow,
} from '../generation/rubric-emoji.mjs';

const ALLOWED_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg']);

function emojisDir(studioRoot) {
  return path.join(studioRoot, 'ALL EMOJIS');
}

function emojiDisplayName(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/^\d+[\s._-]+/i, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Original catalog order (01–50) after emoji files were renamed to CAPS. */
const EMOJI_CANONICAL_ORDER = [
  'LAVASH.png',
  'KHOROVATS.png',
  'GLASS OF ARMENIAN WINE.png',
  'MATSUN.png',
  'BOTTLE OF ARMENIAN WINE.png',
  'CUP OF ARMENIAN COFFEE.png',
  'POMEGRANATE.png',
  'APRICOT.png',
  'TOLMA.png',
  'GREEN PLATE.png',
  'GRAPES.png',
  'MATNAKASH.png',
  'BAKLAVA.png',
  'SUJUKH.png',
  'BASTURMA.png',
  'GATA.png',
  'BASKET OF FRUIT.png',
  'ZHINGYALOV HATS.png',
  'WEDDING DRESS.png',
  'DHOL.png',
  'BACKGAMMON.png',
  'DUDUK.png',
  'A BUCKET OF WATER.png',
  'CHURCH.png',
  'CARPET.png',
  'KHACHKAR.png',
  'PULPULAK.png',
  'GYUMRI.png',
  'GARNI TAMPLE.png',
  'GEGHARD MONASTERY.png',
  'TATEV MONASTERY.png',
  'JERMUK WATER.png',
  'MOUNTAIN.png',
  'ARARAT.png',
  'SEVAN TROUT.png',
  'STREET LAMP.png',
  'BALCONY.png',
  'BRUTALISM.png',
  'SUN.png',
  'MAP.png',
  'JAZVE.png',
  'JUG.png',
  'BACKPACK.png',
  'TUF.png',
  'ARMENIAN PASSPORT.png',
  'FOUNTAINS.png',
  'TASHI TUSHI (DANCING MAN).png',
  'ARMENIAN CAR.png',
  'RESTAURANT PLATE.png',
  'GHAPAMA.png',
];

const emojiOrderIndex = new Map(EMOJI_CANONICAL_ORDER.map((name, index) => [name.toLowerCase(), index]));

function sortEmojiFilename(a, b) {
  const ia = emojiOrderIndex.get(a.toLowerCase());
  const ib = emojiOrderIndex.get(b.toLowerCase());
  if (ia !== undefined && ib !== undefined) return ia - ib;
  if (ia !== undefined) return -1;
  if (ib !== undefined) return 1;
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && /^\d+/.test(a) && /^\d+/.test(b)) return na - nb;
  return emojiDisplayName(a).localeCompare(emojiDisplayName(b), 'en');
}

/** Catalog slot 0..49, or null for generated extras. */
export function emojiCatalogSlot(filename) {
  const lower = filename.toLowerCase();
  const idx = emojiOrderIndex.get(lower);
  if (idx !== undefined) return idx;
  const base = path.basename(filename, path.extname(filename));
  const m = base.match(/^(\d+)\s+/);
  if (m) {
    const slot = parseInt(m[1], 10) - 1;
    if (slot >= 0 && slot < EMOJI_CANONICAL_ORDER.length) return slot;
  }
  return null;
}

/** Lower rank = preferred on-disk name (CAPS > numbered legacy). */
function emojiFileRank(filename) {
  const lower = filename.toLowerCase();
  if (emojiOrderIndex.has(lower)) return 0;
  if (/^\d+\s+/i.test(path.basename(filename, path.extname(filename)))) return 1;
  return 2;
}

/**
 * One file per catalog item. Drops legacy numbered duplicates when CAPS file exists.
 * @param {string[]} files
 */
export function dedupeEmojiFilenames(files) {
  const bySlot = new Map();
  const extraByKey = new Map();
  for (const filename of files) {
    const slot = emojiCatalogSlot(filename);
    if (slot !== null) {
      const prev = bySlot.get(slot);
      if (!prev || emojiFileRank(filename) < emojiFileRank(prev)) {
        bySlot.set(slot, filename);
      }
      continue;
    }
    const key = emojiDisplayName(filename).toLowerCase();
    const prev = extraByKey.get(key);
    if (!prev || emojiFileRank(filename) < emojiFileRank(prev)) {
      extraByKey.set(key, filename);
    }
  }
  const keep = [...bySlot.values(), ...extraByKey.values()];
  const keepSet = new Set(keep);
  return {
    keep,
    remove: files.filter((f) => !keepSet.has(f)),
  };
}

/** @param {string[]} files */
export function buildEmojiIdMigrationMap(files) {
  const {keep, remove} = dedupeEmojiFilenames(files);
  const keepBySlot = new Map();
  for (const filename of keep) {
    const slot = emojiCatalogSlot(filename);
    if (slot !== null) keepBySlot.set(slot, filename);
  }
  const extraKeepByName = new Map();
  for (const filename of keep) {
    if (emojiCatalogSlot(filename) === null) {
      extraKeepByName.set(emojiDisplayName(filename).toLowerCase(), filename);
    }
  }
  const map = new Map();
  for (const legacy of remove) {
    const slot = emojiCatalogSlot(legacy);
    if (slot !== null && keepBySlot.has(slot)) {
      map.set(legacy, keepBySlot.get(slot));
      continue;
    }
    const byName = extraKeepByName.get(emojiDisplayName(legacy).toLowerCase());
    if (byName) map.set(legacy, byName);
  }
  return map;
}

async function listEmojiFilenames(studioRoot) {
  const dir = emojisDir(studioRoot);
  const entries = await readdir(dir, {withFileTypes: true});
  return entries
    .filter((entry) => entry.isFile() && ALLOWED_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name);
}

/**
 * @param {string} studioRoot
 */
export async function listEmojis(studioRoot) {
  const dir = emojisDir(studioRoot);
  const files = await listEmojiFilenames(studioRoot);
  const {keep} = dedupeEmojiFilenames(files);

  const catalog = keep
    .filter((f) => emojiCatalogSlot(f) !== null)
    .sort((a, b) => emojiCatalogSlot(a) - emojiCatalogSlot(b));

  const extraFiles = keep.filter((f) => emojiCatalogSlot(f) === null);
  const extraWithMtime = await Promise.all(
    extraFiles.map(async (f) => {
      try {
        const s = await stat(path.join(dir, f));
        return {f, mtime: s.mtimeMs};
      } catch {
        return {f, mtime: 0};
      }
    }),
  );
  const extra = extraWithMtime
    .sort((a, b) => a.mtime - b.mtime)
    .map(({f}) => f);

  return [...catalog, ...extra].map((filename) => ({
    id: filename,
    name: emojiDisplayName(filename),
    url: `/api/emojis/${encodeURIComponent(filename)}`,
  }));
}

/**
 * @param {string} studioRoot
 * @param {string} filename
 */
export function resolveEmojiPath(studioRoot, filename) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) {
    throw new Error('Invalid emoji filename');
  }
  const ext = path.extname(safeName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Invalid emoji format');
  }
  const resolved = path.resolve(emojisDir(studioRoot), safeName);
  if (!resolved.startsWith(path.resolve(emojisDir(studioRoot)))) {
    throw new Error('Invalid emoji path');
  }
  return resolved;
}

/**
 * Resolve emoji file, including legacy duplicate filenames (e.g. "01 Lavash.png" → "LAVASH.png").
 * @param {string} studioRoot
 * @param {string} filename
 */
export async function resolveEmojiPathOrAlias(studioRoot, filename) {
  const direct = resolveEmojiPath(studioRoot, filename);
  try {
    await stat(direct);
    return direct;
  } catch {
    const files = await listEmojiFilenames(studioRoot);
    const migration = buildEmojiIdMigrationMap(files);
    const mapped = migration.get(filename);
    if (mapped && mapped !== filename) {
      return resolveEmojiPath(studioRoot, mapped);
    }
    const slot = emojiCatalogSlot(filename);
    if (slot !== null) {
      const {keep} = dedupeEmojiFilenames(files);
      const match = keep.find((f) => emojiCatalogSlot(f) === slot);
      if (match) return resolveEmojiPath(studioRoot, match);
    }
    throw new Error(`Emoji not found: ${filename}`);
  }
}

/**
 * @param {Record<string, unknown>} post
 */
function findEmojiTargetCards(post) {
  if (usesEmojiWorkflow(post.templateId)) {
    return findEmojiImageCards(post);
  }
  for (const card of post.cards || []) {
    const kind = card.props?.cardKind ?? card.defaultProps?.cardKind;
    if (kind === 'brand') return [card];
  }
  for (const card of post.cards || []) {
    const hasEmojiImage = (card.fields || []).some(
      (field) => field.type === 'image' && /emoji|sticker/i.test(field.label || ''),
    );
    if (hasEmojiImage) return [card];
  }
  const last = [...(post.cards || [])].sort((a, b) => a.cardIndex - b.cardIndex).pop();
  return last ? [last] : [];
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
 * Add an emoji to a specific slot in a Rubric02 post (5-slot multi-emoji pipeline).
 * Slot N maps to cardIndex N*2 (emoji card).
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} emojiFilename
 * @param {number} slot  0..4
 */
export async function addEmojiSlotToPost(studioRoot, postId, emojiFilename, slot) {
  const sourcePath = await resolveEmojiPathOrAlias(studioRoot, emojiFilename);
  const buffer = await readFile(sourcePath);
  const asset = await uploadPostAsset(studioRoot, postId, {
    buffer,
    originalName: path.basename(emojiFilename),
  });

  const itemName = emojiDisplayName(emojiFilename).toUpperCase();

  let post = await getPost(studioRoot, postId);
  if (!Array.isArray(post.selectedEmojis)) post.selectedEmojis = [];
  // Update or insert the slot entry
  const existing = post.selectedEmojis.findIndex((e) => e.slot === slot);
  const entry = {slot, emojiId: emojiFilename, emojiName: itemName, assetPath: asset.path};
  if (existing >= 0) post.selectedEmojis[existing] = entry;
  else post.selectedEmojis.push(entry);
  post.selectedEmojis.sort((a, b) => a.slot - b.slot);

  // Keep legacy selectedEmojiId pointing to slot 0 for backwards-compat
  if (slot === 0) {
    post.selectedEmojiId = emojiFilename;
    post.selectedEmojiAssetPath = asset.path;
    applyItemToPost(post, itemName);
  }

  applyPostSettingsToCards(post);
  syncPostName(post);
  await persistPost(studioRoot, postId, post);

  // Place the emoji image on the corresponding emoji card (cardIndex = slot * 2)
  const emojiCardIndex = slot * 2;
  const emojiCard = (post.cards || []).find((c) => c.cardIndex === emojiCardIndex);
  if (emojiCard) {
    const fieldKey = (emojiCard.fields || []).find((f) => f.type === 'image')?.key || 'image';
    await updatePostCard(studioRoot, postId, emojiCardIndex, {[fieldKey]: asset.path}, {strict: false});
  }

  post = await getPost(studioRoot, postId);
  return {
    ...asset,
    emojiName: itemName,
    slot,
    post,
  };
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {string} emojiFilename
 */
export async function addEmojiToPost(studioRoot, postId, emojiFilename) {
  const sourcePath = await resolveEmojiPathOrAlias(studioRoot, emojiFilename);
  const buffer = await readFile(sourcePath);
  const asset = await uploadPostAsset(studioRoot, postId, {
    buffer,
    originalName: path.basename(emojiFilename),
  });

  await rememberSelectedEmoji(studioRoot, postId, emojiFilename, asset.path);

  let post = await getPost(studioRoot, postId);
  const itemName = emojiDisplayName(emojiFilename).toUpperCase();
  applyItemToPost(post, itemName);
  applyPostSettingsToCards(post);
  syncPostName(post);
  await persistPost(studioRoot, postId, post);

  if (usesEmojiWorkflow(post.templateId)) {
    await syncEmojiToImageCards(studioRoot, postId);
  } else {
    post = await getPost(studioRoot, postId);
    for (const target of findEmojiTargetCards(post)) {
      const fieldKey = (target.fields || []).find((field) => field.type === 'image')?.key || 'image';
      await updatePostCard(studioRoot, postId, target.cardIndex, {[fieldKey]: asset.path}, {strict: false});
    }
  }

  post = await getPost(studioRoot, postId);
  return {
    ...asset,
    emojiName: emojiDisplayName(emojiFilename),
    post,
  };
}
