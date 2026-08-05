import {access, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {crc32} from 'node:zlib';
import {getPost} from './posts-service.mjs';
import {isRubric01Template, isRubric02Template} from '../rubric/rubric-ids.mjs';

/** @param {Buffer} buf @returns {number} */
function computeCrc32(buf) { return crc32(buf); }

/** @param {number} val @returns {number[]} */
function u32le(val) {
  return [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff];
}

/** @param {number} val @returns {number[]} */
function u16le(val) { return [val & 0xff, (val >> 8) & 0xff]; }

/**
 * Build a ZIP file in memory (stored, no compression) from a map of name→buffer.
 * @param {Map<string, Buffer>} files
 * @returns {Buffer}
 */
function buildZip(files) {
  /** @type {Array<{name: Buffer, data: Buffer, crc: number, offset: number}>} */
  const entries = [];
  const parts = [];
  let offset = 0;

  for (const [name, data] of files) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = computeCrc32(data);
    const size = data.length;

    const localHeader = Buffer.from([
      0x50, 0x4b, 0x03, 0x04,
      ...u16le(20), ...u16le(0), ...u16le(0), ...u16le(0), ...u16le(0),
      ...u32le(crc), ...u32le(size), ...u32le(size),
      ...u16le(nameBytes.length), ...u16le(0),
    ]);

    entries.push({name: nameBytes, data, crc, offset});
    parts.push(localHeader, nameBytes, data);
    offset += localHeader.length + nameBytes.length + size;
  }

  const centralDirStart = offset;
  for (const entry of entries) {
    const centralHeader = Buffer.from([
      0x50, 0x4b, 0x01, 0x02,
      ...u16le(20), ...u16le(20), ...u16le(0), ...u16le(0), ...u16le(0), ...u16le(0),
      ...u32le(entry.crc), ...u32le(entry.data.length), ...u32le(entry.data.length),
      ...u16le(entry.name.length), ...u16le(0), ...u16le(0), ...u16le(0), ...u16le(0),
      ...u32le(0), ...u32le(entry.offset),
    ]);
    parts.push(centralHeader, entry.name);
    offset += centralHeader.length + entry.name.length;
  }

  const centralDirSize = offset - centralDirStart;
  const endRecord = Buffer.from([
    0x50, 0x4b, 0x05, 0x06,
    ...u16le(0), ...u16le(0),
    ...u16le(entries.length), ...u16le(entries.length),
    ...u32le(centralDirSize), ...u32le(centralDirStart),
    ...u16le(0),
  ]);
  parts.push(endRecord);

  return Buffer.concat(parts);
}

/**
 * @param {string} studioRoot
 * @param {string} postId
 * @param {{ png?: boolean, mp4?: boolean, suffix?: string }} [options]
 */
export async function buildPostZip(studioRoot, postId, options = {}) {
  const includePng = options.png !== false;
  const includeMp4 = options.mp4 !== false;
  const post = await getPost(studioRoot, postId);
  if (!post.lastRender?.cards?.length) {
    throw new Error('Render the post first');
  }

  const renderRoot = path.join(studioRoot, 'out', 'renders', 'posts', postId);
  try {
    await access(renderRoot);
  } catch {
    throw new Error('Render files not found — run the render again');
  }

  const files = new Map();
  const isVideoSequence =
    (isRubric01Template(post.templateId) || isRubric02Template(post.templateId))
    && includePng
    && includeMp4;

  if (isVideoSequence) {
    const sortedPostCards = [...(post.cards || [])].sort((a, b) => a.cardIndex - b.cardIndex);
    for (let i = 0; i < sortedPostCards.length; i++) {
      const card = sortedPostCards[i];
      const slideNum = i + 1;
      const slideName = String(slideNum).padStart(2, '0');
      const videoPath = post.generation?.videoAssets?.[card.cardIndex];
      if (isRubric02Template(post.templateId) && videoPath) {
        try {
          files.set(`sequence/slide-${slideName}.mp4`, await readFile(path.join(studioRoot, 'public', videoPath)));
        } catch {
          throw new Error(`Generated video file for slide ${slideNum} not found — generate videos again`);
        }
        continue;
      }

      if (isRubric01Template(post.templateId) && videoPath) {
        const renderedVideoPath = path.join(renderRoot, String(card.cardIndex), 'video.mp4');
        try {
          files.set(`sequence/slide-${slideName}.mp4`, await readFile(renderedVideoPath));
        } catch {
          throw new Error(`Rendered video for slide ${slideNum} not found — run the export again`);
        }
        continue;
      }

      const pngPath = path.join(renderRoot, String(card.cardIndex), 'still.png');
      try {
        files.set(`sequence/slide-${slideName}.png`, await readFile(pngPath));
      } catch {
        throw new Error(`PNG card for slide ${slideNum} not found — run the export again`);
      }
    }
  } else {
    // Sort cards by cardIndex to get slide-1, slide-2, ... order
    const sortedCards = [...post.lastRender.cards].sort((a, b) => a.cardIndex - b.cardIndex);

    for (let i = 0; i < sortedCards.length; i++) {
      const card = sortedCards[i];
      const slideNum = i + 1;
      const cardDir = path.join(renderRoot, String(card.cardIndex));

      if (includePng) {
        const pngPath = path.join(cardDir, 'still.png');
        try {
          files.set(`png/slide-${slideNum}.png`, await readFile(pngPath));
        } catch {
          // skip if file missing
        }
      }

      if (includeMp4) {
        const mp4Path = path.join(cardDir, 'video.mp4');
        try {
          files.set(`mp4/slide-${slideNum}.mp4`, await readFile(mp4Path));
        } catch {
          // skip if not rendered as video
        }
      }
    }
  }

  if (!files.size) {
    throw new Error('No matching rendered files found — run the render again');
  }

  const zipBuf = buildZip(files);

  const zipDir = path.join(studioRoot, 'out', 'renders', 'posts', '_zip');
  await mkdir(zipDir, {recursive: true});
  const suffix = options.suffix ? `-${options.suffix}` : '';
  const zipPath = path.join(zipDir, `${postId}${suffix}.zip`);
  await rm(zipPath, {force: true});
  await writeFile(zipPath, zipBuf);

  return {
    zipPath,
    zipUrl: `/renders/posts/_zip/${postId}${suffix}.zip`,
    filename: `helloiam-post-${postId.slice(0, 8)}${suffix}.zip`,
  };
}
