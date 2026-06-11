import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {importCssFromString, listCssFrames} from '../tools/css-import/run-import.mjs';
import {renderComposition} from '../tools/render/render-composition.mjs';
import {listStudioAssets, uploadStudioAsset} from '../tools/assets/studio-assets-service.mjs';

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
