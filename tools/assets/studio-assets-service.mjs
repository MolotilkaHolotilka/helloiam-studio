import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const MAX_BYTES = 12 * 1024 * 1024;

function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function manifestPath(studioRoot) {
  return path.join(studioRoot, 'src', 'lib', 'studio-assets.json');
}

function assetOptionsPath(studioRoot) {
  return path.join(studioRoot, 'src', 'lib', 'asset-options.ts');
}

function generatedDir(studioRoot) {
  return path.join(studioRoot, 'public', 'generated');
}

async function readManifest(studioRoot) {
  const raw = await readFile(manifestPath(studioRoot), 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.images)) {
    throw new Error('studio-assets.json: images must be an array');
  }
  return data;
}

export async function syncAssetOptions(studioRoot) {
  const {images} = await readManifest(studioRoot);
  const body = images.map((item) => `  '${item.replace(/'/g, "\\'")}',`).join('\n');
  const content = `/* AUTO-UPDATED — gallery upload or edit studio-assets.json */\nexport const STUDIO_IMAGE_OPTIONS = [\n${body}\n] as const;\n`;
  await writeFile(assetOptionsPath(studioRoot), content, 'utf8');
}

export async function listStudioAssets(studioRoot) {
  const {images} = await readManifest(studioRoot);
  const generated = await readdir(generatedDir(studioRoot)).catch(() => []);

  const onDisk = generated
    .filter((name) => ALLOWED_EXT.has(path.extname(name).toLowerCase()))
    .map((name) => `generated/${name}`);

  const merged = [...new Set([...images, ...onDisk])].sort();
  return merged.map((assetPath) => ({
    path: assetPath,
    name: path.basename(assetPath),
    kind: assetPath.startsWith('generated/') ? 'uploaded' : 'builtin',
  }));
}

/**
 * @param {string} studioRoot
 * @param {{ buffer: Buffer, originalName: string }} input
 */
export async function uploadStudioAsset(studioRoot, input) {
  const buffer = input.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Файл пустой');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Файл слишком большой (макс. 12 МБ)');
  }

  const ext = path.extname(input.originalName || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Допустимы PNG, JPG, WEBP, SVG');
  }

  const base = slugify(path.basename(input.originalName || 'image', ext)) || `image-${Date.now()}`;
  const filename = `${base}${ext}`;
  const relPath = `generated/${filename}`;

  await mkdir(generatedDir(studioRoot), {recursive: true});
  await writeFile(path.join(generatedDir(studioRoot), filename), buffer);

  const manifest = await readManifest(studioRoot);
  if (!manifest.images.includes(relPath)) {
    manifest.images.push(relPath);
    manifest.images.sort();
    await writeFile(manifestPath(studioRoot), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  await syncAssetOptions(studioRoot);
  return {path: relPath, name: filename, size: buffer.length};
}
