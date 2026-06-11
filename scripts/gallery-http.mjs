import {createServer} from 'node:http';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {importCssFromString, listCssFrames} from '../tools/css-import/run-import.mjs';
import {syncGalleryManifest} from '../tools/css-import/sync-gallery-manifest-lib.mjs';
import {renderComposition} from '../tools/render/render-composition.mjs';
import {loadCompositionProps} from '../tools/render/load-composition-props.mjs';
import {listStudioAssets, uploadStudioAsset} from '../tools/assets/studio-assets-service.mjs';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const TEXTAREA_KEYS = new Set(['quote', 'body']);
const SKIP_TEMPLATE_DIRS = new Set(['_shared', '_generated']);

function inferPropType(key, value) {
  if (key === 'image') return 'image';
  if (key === 'background' || key.endsWith('Color')) return 'color';
  if (typeof value === 'string' && HEX_COLOR.test(value)) return 'color';
  if (TEXTAREA_KEYS.has(key) || (typeof value === 'string' && value.length > 60)) return 'textarea';
  return 'string';
}

function keyToLabel(key) {
  const base = key.replace(/Color$/, '');
  const words = base.replace(/([A-Z])/g, ' $1').trim();
  const titled = words ? words[0].toUpperCase() + words.slice(1) : key;
  return key.endsWith('Color') ? `${titled} color` : titled;
}

function resolvePropsFields(meta) {
  if (Array.isArray(meta.propsFields) && meta.propsFields.length > 0) {
    return meta.propsFields;
  }
  const defaults = meta.defaultProps ?? {};
  return Object.keys(defaults).map((key) => ({
    key,
    type: inferPropType(key, defaults[key]),
    label: keyToLabel(key),
  }));
}

/**
 * @param {string} studioRoot
 * @param {string} compositionId
 */
async function findTemplateMeta(studioRoot, compositionId) {
  const templatesRoot = path.join(studioRoot, 'src', 'templates');
  const entries = await readdir(templatesRoot, {withFileTypes: true});

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_TEMPLATE_DIRS.has(entry.name) || entry.name.startsWith('_')) {
      continue;
    }
    const metaPath = path.join(templatesRoot, entry.name, 'meta.json');
    try {
      const meta = JSON.parse(await readFile(metaPath, 'utf8'));
      if (meta.id === compositionId) {
        return {templateDir: entry.name, metaPath, meta};
      }
    } catch {
      // skip dirs without readable meta.json
    }
  }

  return null;
}

/**
 * @param {Record<string, unknown>} props
 * @param {Array<{ key: string, type: string }>} propsFields
 * @param {Set<string>} assetPaths
 */
function validateProps(props, propsFields, assetPaths) {
  const errors = [];
  const allowedKeys = new Set(propsFields.map((field) => field.key));

  for (const field of propsFields) {
    const value = props[field.key];
    if (value === undefined) {
      errors.push(`Missing prop: ${field.key}`);
      continue;
    }

    switch (field.type) {
      case 'string':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(`${field.key}: must be a string`);
        }
        break;
      case 'color':
        if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
          errors.push(`${field.key}: must be a hex color (#RRGGBB)`);
        }
        break;
      case 'image':
        if (typeof value !== 'string' || !assetPaths.has(value)) {
          errors.push(`${field.key}: image path not in studio assets`);
        }
        break;
      default:
        if (typeof value !== 'string') {
          errors.push(`${field.key}: unsupported field type ${field.type}`);
        }
    }
  }

  for (const key of Object.keys(props)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown prop: ${key}`);
    }
  }

  return errors;
}

function readJsonBody(req, limit = 6_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('CSS file too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(`${JSON.stringify(payload)}\n`);
}

/**
 * @param {{ studioRoot: string, galleryDir: string }} options
 */
export function createGalleryServer({studioRoot, galleryDir}) {
  const srcDir = path.join(studioRoot, 'src');
  const rendersDir = path.join(studioRoot, 'out', 'renders');
  const publicDir = path.join(studioRoot, 'public');
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
  };

  return createServer(async (req, res) => {
    const urlPath = req.url?.split('?')[0] || '/';
    const method = req.method || 'GET';

    if (method === 'POST' && urlPath === '/api/css-frames') {
      try {
        const body = await readJsonBody(req);
        if (typeof body.css !== 'string' || !body.css.trim()) {
          sendJson(res, 400, {
            error: 'CSS пустой. Сохраните файл (⌘S) или вставьте экспорт Figma в поле ниже.',
          });
          return;
        }
        const frames = listCssFrames(body.css);
        if (frames.length === 0) {
          sendJson(res, 400, {
            error: 'CSS не распознан. Нужен flat-экспорт Figma с кадром 1080×1350.',
          });
          return;
        }
        sendJson(res, 200, {frames});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось разобрать CSS'});
      }
      return;
    }

    if (method === 'POST' && urlPath === '/api/render') {
      try {
        const body = await readJsonBody(req, 200_000);
        const compositionId = body.compositionId;
        if (typeof compositionId !== 'string' || !compositionId.trim()) {
          sendJson(res, 400, {error: 'Укажите compositionId'});
          return;
        }
        const result = await renderComposition(
          studioRoot,
          compositionId.trim(),
          body.props && typeof body.props === 'object' ? body.props : {},
        );
        sendJson(res, 200, {ok: true, ...result});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Рендер не удался'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/assets') {
      try {
        const assets = await listStudioAssets(studioRoot);
        sendJson(res, 200, {assets});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось загрузить список изображений'});
      }
      return;
    }

    if (method === 'POST' && urlPath === '/api/assets/upload') {
      try {
        const body = await readJsonBody(req, 16_000_000);
        if (typeof body.data !== 'string' || !body.data.trim()) {
          sendJson(res, 400, {error: 'Нет данных файла'});
          return;
        }
        const match = body.data.match(/^data:([^;]+);base64,(.+)$/s);
        const base64 = match ? match[2] : body.data;
        const buffer = Buffer.from(base64, 'base64');
        const result = await uploadStudioAsset(studioRoot, {
          buffer,
          originalName: typeof body.name === 'string' ? body.name : 'image.png',
        });
        sendJson(res, 200, {ok: true, ...result});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Загрузка не удалась'});
      }
      return;
    }

    if (method === 'POST' && urlPath === '/api/import-css') {
      try {
        const body = await readJsonBody(req);
        if (typeof body.css !== 'string' || !body.css.trim()) {
          sendJson(res, 400, {
            error: 'CSS пустой. Сохраните файл (⌘S) или вставьте экспорт Figma в поле ниже.',
          });
          return;
        }
        const frameIndex = Number(body.frameIndex) || 1;
        const result = await importCssFromString(body.css, {
          frameIndex,
          project: body.project,
        });
        sendJson(res, 200, {ok: true, ...result});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Импорт не удался'});
      }
      return;
    }

    const templateGetMatch = urlPath.match(/^\/api\/templates\/([^/]+)$/);
    if (method === 'GET' && templateGetMatch) {
      const compositionId = decodeURIComponent(templateGetMatch[1]);
      try {
        const found = await findTemplateMeta(studioRoot, compositionId);
        if (found) {
          const {meta} = found;
          sendJson(res, 200, {
            meta,
            propsFields: resolvePropsFields(meta),
            defaultProps: meta.defaultProps ?? {},
          });
          return;
        }

        const loaded = await loadCompositionProps(studioRoot, compositionId);
        const meta = {id: compositionId, defaultProps: loaded.defaultProps};
        sendJson(res, 200, {
          meta,
          propsFields: resolvePropsFields(meta),
          defaultProps: loaded.defaultProps,
        });
      } catch (error) {
        sendJson(res, 404, {error: error.message || `Composition не найдена: ${compositionId}`});
      }
      return;
    }

    const templatePutMatch = urlPath.match(/^\/api\/templates\/([^/]+)\/props$/);
    if (method === 'PUT' && templatePutMatch) {
      const compositionId = decodeURIComponent(templatePutMatch[1]);
      try {
        const found = await findTemplateMeta(studioRoot, compositionId);
        if (!found) {
          sendJson(res, 404, {error: `Composition не найдена: ${compositionId}`});
          return;
        }

        const body = await readJsonBody(req, 200_000);
        if (!body.props || typeof body.props !== 'object' || Array.isArray(body.props)) {
          sendJson(res, 400, {error: 'Body must be { props: { ... } }'});
          return;
        }

        const {meta, metaPath} = found;
        const propsFields = resolvePropsFields(meta);
        const assets = await listStudioAssets(studioRoot);
        const assetPaths = new Set(assets.map((asset) => asset.path));
        const errors = validateProps(body.props, propsFields, assetPaths);
        if (errors.length > 0) {
          sendJson(res, 400, {error: 'Validation failed', details: errors});
          return;
        }

        const defaultProps = {};
        for (const field of propsFields) {
          defaultProps[field.key] = body.props[field.key];
        }

        const nextMeta = {...meta, defaultProps};
        await writeFile(metaPath, `${JSON.stringify(nextMeta, null, 2)}\n`, 'utf8');
        const synced = await syncGalleryManifest(studioRoot);

        sendJson(res, 200, {
          ok: true,
          compositionId,
          defaultProps,
          synced,
        });
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось сохранить props'});
      }
      return;
    }

    const filePath =
      urlPath === '/' || urlPath === '/index.html'
        ? path.join(galleryDir, 'picker.html')
        : urlPath === '/projects.json'
          ? path.join(srcDir, 'projects.json')
          : urlPath.startsWith('/renders/')
            ? path.join(rendersDir, urlPath.slice('/renders/'.length))
            : urlPath.startsWith('/public/')
              ? path.join(publicDir, urlPath.slice('/public/'.length))
              : path.join(galleryDir, path.basename(urlPath));

    try {
      if (urlPath.startsWith('/public/')) {
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(publicDir))) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
      }
      const body = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, {'Content-Type': mime[ext] || 'text/plain'});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}
