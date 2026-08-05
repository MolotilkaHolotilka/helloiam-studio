import {createServer} from 'node:http';
import {isDashboardPath, proxyDashboardRequest} from './dashboard-proxy.mjs';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {syncGalleryManifest} from '../tools/gallery-sync.mjs';
import {renderComposition} from '../tools/render/render-composition.mjs';
import {loadCompositionProps} from '../tools/render/load-composition-props.mjs';
import {deleteStudioAsset, listStudioAssets, uploadStudioAsset} from '../tools/assets/studio-assets-service.mjs';
import {
  clearAssetFromAllPosts,
  createPost,
  deletePost,
  getPost,
  listAssetBindings,
  listPosts,
  updatePostCard,
  updatePostSettings,
} from '../tools/posts/posts-service.mjs';
import {COLOR_STYLES, CATEGORY_LABELS, POST_CATEGORIES} from '../tools/posts/post-settings.mjs';
import {
  generatePostContent,
  generatePostImagePrompts,
  generatePostImages,
  generatePostTexts,
  generatePostVideos,
  isFalConfigured,
  isLlmConfigured,
  updatePostGeneration,
} from '../tools/generation/generation-service.mjs';
import {
  deletePostAsset,
  deletePostAssets,
  listPostAssets,
  uploadPostAsset,
} from '../tools/posts/post-assets-service.mjs';
import {renderPost, renderPostCard} from '../tools/posts/render-post.mjs';
import {buildPostZip} from '../tools/posts/download-post-zip.mjs';
import {loadStoryTemplate} from '../tools/story-templates-service.mjs';
import {loadChangelog} from '../tools/changelog-service.mjs';
import {
  addBrandCardToPost,
  addBrandCardSlotToPost,
  listBrandCards,
  resetBrandCardSlotsForPost,
  resolveBrandCardPath,
} from '../tools/cards/cards-service.mjs';
import {addEmojiToPost, addEmojiSlotToPost, listEmojis, resolveEmojiPath} from '../tools/emojis/emojis-service.mjs';
import {generateEmoji} from '../tools/generation/emoji-generator.mjs';
import {listTemplateSlideReferences} from '../tools/template-references.mjs';
import {
  getResearchArchive,
  getResearchSnapshot,
  getTrendFeed,
  getResolvedResearchFavorites,
  searchResearch,
} from '../tools/new-ia/research-read-service.mjs';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from '../tools/calendar/calendar-service.mjs';
import {createCollab, deleteCollab, listCollabs, updateCollab} from '../tools/collabs/collabs-service.mjs';
import {getSiteStatus} from '../tools/site/site-status-service.mjs';
import {getBrandPresets, getTemplateRegistry} from '../tools/new-ia/template-registry-service.mjs';

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
        reject(new Error('Request body too large'));
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

function parsePromptSections(raw) {
  const matches = [...raw.matchAll(/^##\s+([a-z0-9_-]+)\s*$/gim)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const next = matches[index + 1];
    const end = next?.index ?? raw.length;
    const key = match[1].toLowerCase();
    return {
      key,
      title: match[0].replace(/^##\s+/, '').trim(),
      content: raw.slice(contentStart, end).replace(/^\n/, '').replace(/\s+$/, ''),
    };
  });
}

async function loadPromptLibrary(studioRoot) {
  const filePath = path.join(studioRoot, 'docs', 'GENERATION_PROMPTS.md');
  const raw = await readFile(filePath, 'utf8');
  return {sections: parsePromptSections(raw)};
}

async function updatePromptSection(studioRoot, key, content) {
  if (!/^[a-z0-9_-]+$/i.test(key)) {
    throw new Error('Invalid prompt section key');
  }
  if (typeof content !== 'string') {
    throw new Error('Prompt content must be a string');
  }
  const filePath = path.join(studioRoot, 'docs', 'GENERATION_PROMPTS.md');
  const raw = await readFile(filePath, 'utf8');
  const matches = [...raw.matchAll(/^##\s+([a-z0-9_-]+)\s*$/gim)];
  const matchIndex = matches.findIndex((match) => match[1].toLowerCase() === key.toLowerCase());
  if (matchIndex < 0) {
    throw new Error(`Prompt section not found: ${key}`);
  }
  const match = matches[matchIndex];
  const contentStart = (match.index ?? 0) + match[0].length;
  const next = matches[matchIndex + 1];
  const end = next?.index ?? raw.length;
  const cleanContent = content.replace(/\s+$/, '');
  const nextSeparator = next ? '\n\n' : '\n';
  const updated = `${raw.slice(0, contentStart)}\n\n${cleanContent}${nextSeparator}${raw.slice(end).replace(/^\s+/, '')}`;
  await writeFile(filePath, updated);
  return loadPromptLibrary(studioRoot);
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
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
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

    if (method === 'GET' && urlPath === '/api/story-templates') {
      try {
        const raw = await readFile(path.join(galleryDir, 'story-templates.json'), 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          sendJson(res, 200, {
            projects: [{id: 'helloiam', name: 'HelloIAM', accent: '#4A7BFF'}],
            templates: parsed.map((t) => ({...t, project: t.project || 'helloiam'})),
          });
          return;
        }
        sendJson(res, 200, parsed);
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Failed to load templates'});
      }
      return;
    }

    const storyTemplateRefsMatch = urlPath.match(/^\/api\/story-templates\/([^/]+)\/references$/);
    if (method === 'GET' && storyTemplateRefsMatch) {
      const templateId = decodeURIComponent(storyTemplateRefsMatch[1]);
      try {
        const references = await listTemplateSlideReferences(studioRoot, templateId);
        sendJson(res, 200, {templateId, references});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось загрузить референсы'});
      }
      return;
    }

    const storyTemplateMatch = urlPath.match(/^\/api\/story-templates\/([^/]+)$/);
    if (method === 'GET' && storyTemplateMatch) {
      const templateId = decodeURIComponent(storyTemplateMatch[1]);
      try {
        const data = await loadStoryTemplate(studioRoot, templateId);
        sendJson(res, 200, data);
      } catch (error) {
        sendJson(res, 404, {error: error.message || `Шаблон не найден: ${templateId}`});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/emojis') {
      try {
        const emojis = await listEmojis(studioRoot);
        sendJson(res, 200, {emojis});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось загрузить эмодзи'});
      }
      return;
    }

    if (method === 'POST' && urlPath === '/api/emojis/generate') {
      try {
        const body = await readJsonBody(req, 16_000);
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name) {
          sendJson(res, 400, {error: 'Укажите name — название предмета для генерации'});
          return;
        }
        const overwrite = body.overwrite !== false;
        const result = await generateEmoji(name, studioRoot, {overwrite});
        sendJson(res, 200, {ok: true, ...result});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Ошибка генерации эмодзи'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/cards') {
      try {
        const cards = await listBrandCards(studioRoot);
        sendJson(res, 200, {cards});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось загрузить карточки'});
      }
      return;
    }

    const brandCardFileMatch = urlPath.match(/^\/api\/cards\/([^/]+)$/);
    if (method === 'GET' && brandCardFileMatch) {
      const filename = decodeURIComponent(brandCardFileMatch[1]);
      try {
        const filePath = resolveBrandCardPath(studioRoot, filename);
        const body = await readFile(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType =
          ext === '.webp'
            ? 'image/webp'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : 'image/png';
        res.writeHead(200, {'Content-Type': contentType});
        res.end(body);
      } catch (error) {
        sendJson(res, 404, {error: error.message || 'Карточка не найдена'});
      }
      return;
    }

    const emojiFileMatch = urlPath.match(/^\/api\/emojis\/([^/]+)$/);
    if (method === 'GET' && emojiFileMatch) {
      const filename = decodeURIComponent(emojiFileMatch[1]);
      try {
        const filePath = resolveEmojiPath(studioRoot, filename);
        const body = await readFile(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType =
          ext === '.webp'
            ? 'image/webp'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : 'image/png';
        res.writeHead(200, {'Content-Type': contentType});
        res.end(body);
      } catch (error) {
        sendJson(res, 404, {error: error.message || 'Эмодзи не найден'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/changelog') {
      try {
        const changelog = await loadChangelog(studioRoot);
        sendJson(res, 200, changelog);
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load changelog'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/app-config') {
      sendJson(res, 200, {
        admin: process.env.ADMIN === '1' || process.env.ADMIN === 'true',
        llmConfigured: isLlmConfigured(),
        falConfigured: Boolean(process.env.FAL_API_KEY?.trim()),
        categories: POST_CATEGORIES.map((id) => ({id, label: CATEGORY_LABELS[id]})),
        colorStyles: COLOR_STYLES.map(({id, label, themeColor, colors}) => ({
          id,
          label,
          themeColor,
          background: colors?.background || themeColor,
          accentColor: colors?.accentColor || themeColor,
          textColor: colors?.titleColor || '#FFFFFF',
        })),
        brandColors: COLOR_STYLES.map(({id, label, themeColor}) => ({id, hex: themeColor, label})),
      });
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/research') {
      try {
        const params = new URL(req.url || '/', 'http://localhost').searchParams;
        const source = params.get('source') || 'news';
        const date = params.get('date') || undefined;
        sendJson(res, 200, await getResearchSnapshot(studioRoot, source, date));
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Could not load research data'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/research/favorites') {
      try {
        sendJson(res, 200, await getResolvedResearchFavorites(studioRoot));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load favorites'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/research/search') {
      try {
        const params = new URL(req.url || '/', 'http://localhost').searchParams;
        sendJson(res, 200, await searchResearch(studioRoot, params.get('q') || ''));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not search research'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/research/trends') {
      try {
        const params = new URL(req.url || '/', 'http://localhost').searchParams;
        sendJson(res, 200, await getTrendFeed(studioRoot, {
          period: params.get('period') || 'day',
          source: params.get('source') || 'all',
          hashtag: params.get('hashtag') || '',
        }));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load trend feed'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/brand-presets') {
      try {
        sendJson(res, 200, await getBrandPresets(studioRoot));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load brand presets'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/template-registry') {
      try {
        sendJson(res, 200, await getTemplateRegistry(studioRoot));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not build template registry'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/new-ia/research/archive') {
      try {
        sendJson(res, 200, await getResearchArchive(studioRoot));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load research archive'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/site-status') {
      try {
        sendJson(res, 200, await getSiteStatus());
      } catch (error) {
        sendJson(res, 502, {error: error.message || 'Could not inspect public site'});
      }
      return;
    }

    if (urlPath === '/api/calendar') {
      try {
        if (method === 'GET') {
          sendJson(res, 200, {items: await listCalendarEvents(studioRoot)});
          return;
        }
        if (method === 'POST') {
          const body = await readJsonBody(req, 32_000);
          sendJson(res, 201, {event: await createCalendarEvent(studioRoot, body)});
          return;
        }
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Calendar request failed'});
        return;
      }
    }

    const calendarEventMatch = urlPath.match(/^\/api\/calendar\/([^/]+)$/);
    if (calendarEventMatch && (method === 'PUT' || method === 'DELETE')) {
      try {
        const id = decodeURIComponent(calendarEventMatch[1]);
        const event = method === 'PUT'
          ? await updateCalendarEvent(studioRoot, id, await readJsonBody(req, 32_000))
          : await deleteCalendarEvent(studioRoot, id);
        sendJson(res, 200, {ok: true, event});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Calendar update failed'});
      }
      return;
    }

    if (urlPath === '/api/collabs') {
      try {
        if (method === 'GET') {
          sendJson(res, 200, {items: await listCollabs(studioRoot)});
          return;
        }
        if (method === 'POST') {
          const body = await readJsonBody(req, 48_000);
          sendJson(res, 201, {item: await createCollab(studioRoot, body)});
          return;
        }
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Collabs request failed'});
        return;
      }
    }

    const collabMatch = urlPath.match(/^\/api\/collabs\/([^/]+)$/);
    if (collabMatch && (method === 'PUT' || method === 'DELETE')) {
      try {
        const id = decodeURIComponent(collabMatch[1]);
        const item = method === 'PUT'
          ? await updateCollab(studioRoot, id, await readJsonBody(req, 48_000))
          : await deleteCollab(studioRoot, id);
        sendJson(res, 200, {ok: true, item});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Collabs update failed'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/prompts') {
      try {
        sendJson(res, 200, await loadPromptLibrary(studioRoot));
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Could not load prompts'});
      }
      return;
    }

    const promptSectionMatch = urlPath.match(/^\/api\/prompts\/([^/]+)$/);
    if (method === 'PUT' && promptSectionMatch) {
      try {
        const key = decodeURIComponent(promptSectionMatch[1]);
        const body = await readJsonBody(req, 512_000);
        sendJson(res, 200, await updatePromptSection(studioRoot, key, body.content));
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Could not save prompt'});
      }
      return;
    }

    if (method === 'GET' && urlPath === '/api/posts') {
      try {
        const posts = await listPosts(studioRoot);
        sendJson(res, 200, {posts});
      } catch (error) {
        sendJson(res, 500, {error: error.message || 'Не удалось загрузить посты'});
      }
      return;
    }

    if (method === 'POST' && urlPath === '/api/posts') {
      try {
        const body = await readJsonBody(req, 50_000);
        const templateId = body.templateId;
        if (typeof templateId !== 'string' || !templateId.trim()) {
          sendJson(res, 400, {error: 'Укажите templateId'});
          return;
        }
        const post = await createPost(studioRoot, templateId.trim());
        sendJson(res, 201, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось создать пост'});
      }
      return;
    }

    const postAssetsMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets$/);
    if (postAssetsMatch) {
      const postId = decodeURIComponent(postAssetsMatch[1]);
      if (method === 'GET') {
        try {
          const assets = await listPostAssets(studioRoot, postId);
          sendJson(res, 200, {assets});
        } catch (error) {
          sendJson(res, 404, {error: error.message || 'Не удалось загрузить изображения поста'});
        }
        return;
      }
      if (method === 'DELETE') {
        try {
          const body = await readJsonBody(req, 16_000);
          if (Array.isArray(body.paths) && body.paths.length > 0) {
            const result = await deletePostAssets(studioRoot, postId, body.paths);
            sendJson(res, 200, {ok: true, ...result});
            return;
          }
          if (typeof body.path === 'string' && body.path.trim()) {
            const result = await deletePostAsset(studioRoot, postId, body.path.trim());
            sendJson(res, 200, {ok: true, ...result});
            return;
          }
          sendJson(res, 400, {error: 'Укажите path или paths'});
        } catch (error) {
          sendJson(res, 400, {error: error.message || 'Удаление не удалось'});
        }
        return;
      }
    }

    const postCardAssetMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/from-card$/);
    if (method === 'POST' && postCardAssetMatch) {
      const postId = decodeURIComponent(postCardAssetMatch[1]);
      try {
        const body = await readJsonBody(req, 16_000);
        const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';
        if (!cardId) {
          sendJson(res, 400, {error: 'Укажите cardId'});
          return;
        }
        const asset = await addBrandCardToPost(studioRoot, postId, cardId);
        const post = await getPost(studioRoot, postId);
        sendJson(res, 200, {ok: true, asset, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось добавить карточку'});
      }
      return;
    }

    const postEmojiAssetMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/from-emoji$/);
    if (method === 'POST' && postEmojiAssetMatch) {
      const postId = decodeURIComponent(postEmojiAssetMatch[1]);
      try {
        const body = await readJsonBody(req, 16_000);
        const emojiId = typeof body.emojiId === 'string' ? body.emojiId.trim() : '';
        if (!emojiId) {
          sendJson(res, 400, {error: 'Укажите emojiId'});
          return;
        }
        const asset = await addEmojiToPost(studioRoot, postId, emojiId);
        const post = await getPost(studioRoot, postId);
        sendJson(res, 200, {ok: true, asset, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось добавить эмодзи'});
      }
      return;
    }

    const postEmojiSlotMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/from-emoji-slot$/);
    if (method === 'POST' && postEmojiSlotMatch) {
      const postId = decodeURIComponent(postEmojiSlotMatch[1]);
      try {
        const body = await readJsonBody(req, 16_000);
        const emojiId = typeof body.emojiId === 'string' ? body.emojiId.trim() : '';
        const slot = typeof body.slot === 'number' ? body.slot : parseInt(body.slot, 10);
        if (!emojiId) {
          sendJson(res, 400, {error: 'Укажите emojiId'});
          return;
        }
        if (isNaN(slot) || slot < 0 || slot > 4) {
          sendJson(res, 400, {error: 'slot должен быть числом от 0 до 4'});
          return;
        }
        const result = await addEmojiSlotToPost(studioRoot, postId, emojiId, slot);
        sendJson(res, 200, {ok: true, asset: result, post: result.post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось добавить эмодзи'});
      }
      return;
    }

    const postCardSlotMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/from-card-slot$/);
    if (method === 'POST' && postCardSlotMatch) {
      const postId = decodeURIComponent(postCardSlotMatch[1]);
      try {
        const body = await readJsonBody(req, 16_000);
        const cardId = typeof body.cardId === 'string' ? body.cardId.trim() : '';
        const slot = typeof body.slot === 'number' ? body.slot : parseInt(body.slot, 10);
        if (!cardId) {
          sendJson(res, 400, {error: 'Укажите cardId'});
          return;
        }
        if (isNaN(slot) || slot < 0 || slot > 4) {
          sendJson(res, 400, {error: 'slot должен быть числом от 0 до 4'});
          return;
        }
        const result = await addBrandCardSlotToPost(studioRoot, postId, cardId, slot);
        sendJson(res, 200, {ok: true, asset: result, post: result.post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось добавить карточку'});
      }
      return;
    }

    const postCardSlotsResetMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/reset-card-slots$/);
    if (method === 'POST' && postCardSlotsResetMatch) {
      const postId = decodeURIComponent(postCardSlotsResetMatch[1]);
      try {
        const body = await readJsonBody(req, 200_000);
        const slots = Array.isArray(body.slots) ? body.slots : [];
        const post = await resetBrandCardSlotsForPost(studioRoot, postId, slots);
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось сохранить порядок карточек'});
      }
      return;
    }

    const postAssetsUploadMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/assets\/upload$/);
    if (method === 'POST' && postAssetsUploadMatch) {
      const postId = decodeURIComponent(postAssetsUploadMatch[1]);
      try {
        const body = await readJsonBody(req, 64_000_000);
        const inputs = [];
        if (Array.isArray(body.files)) {
          for (const file of body.files) {
            if (typeof file?.data !== 'string' || !file.data.trim()) continue;
            const match = file.data.match(/^data:([^;]+);base64,(.+)$/s);
            const base64 = match ? match[2] : file.data;
            inputs.push({
              buffer: Buffer.from(base64, 'base64'),
              originalName: typeof file.name === 'string' ? file.name : 'image.png',
            });
          }
        } else if (typeof body.data === 'string' && body.data.trim()) {
          const match = body.data.match(/^data:([^;]+);base64,(.+)$/s);
          const base64 = match ? match[2] : body.data;
          inputs.push({
            buffer: Buffer.from(base64, 'base64'),
            originalName: typeof body.name === 'string' ? body.name : 'image.png',
          });
        }
        if (!inputs.length) {
          sendJson(res, 400, {error: 'Нет данных файла'});
          return;
        }
        const uploaded = [];
        for (const input of inputs) {
          uploaded.push(await uploadPostAsset(studioRoot, postId, input));
        }
        sendJson(res, 200, {ok: true, assets: uploaded});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Загрузка не удалась'});
      }
      return;
    }

    const postGenerateTextsMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generate-texts$/);
    if (method === 'POST' && postGenerateTextsMatch) {
      const postId = decodeURIComponent(postGenerateTextsMatch[1]);
      try {
        const post = await generatePostTexts(studioRoot, postId);
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Text generation failed'});
      }
      return;
    }

    const postGeneratePromptsMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generate-prompts$/);
    if (method === 'POST' && postGeneratePromptsMatch) {
      const postId = decodeURIComponent(postGeneratePromptsMatch[1]);
      try {
        const post = await generatePostImagePrompts(studioRoot, postId);
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Picture description generation failed'});
      }
      return;
    }

    const postGenerateMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generate-content$/);
    if (method === 'POST' && postGenerateMatch) {
      const postId = decodeURIComponent(postGenerateMatch[1]);
      try {
        const post = await generatePostContent(studioRoot, postId);
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Генерация не удалась'});
      }
      return;
    }

    const postGenerateImagesMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generate-images$/);
    if (method === 'POST' && postGenerateImagesMatch) {
      const postId = decodeURIComponent(postGenerateImagesMatch[1]);
      try {
        const body = await readJsonBody(req, 50_000).catch(() => ({}));
        const cardIndexes = Array.isArray(body.cardIndexes)
          ? body.cardIndexes.map(Number).filter((n) => !Number.isNaN(n))
          : undefined;
        const {post, results} = await generatePostImages(studioRoot, postId, {cardIndexes});
        sendJson(res, 200, {ok: true, post, results});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Генерация изображений не удалась'});
      }
      return;
    }

    const postGenerateVideosMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generate-videos$/);
    if (method === 'POST' && postGenerateVideosMatch) {
      const postId = decodeURIComponent(postGenerateVideosMatch[1]);
      try {
        const body = await readJsonBody(req, 50_000).catch(() => ({}));
        const cardIndexes = Array.isArray(body.cardIndexes)
          ? body.cardIndexes.map(Number).filter((n) => !Number.isNaN(n))
          : undefined;
        const seconds = Number(body.seconds);
        const {post, results, errors} = await generatePostVideos(studioRoot, postId, {
          cardIndexes,
          ...(seconds > 0 ? {seconds} : {}),
          force: body.force === true,
        });
        sendJson(res, 200, {ok: true, post, results, errors});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Генерация видео не удалась'});
      }
      return;
    }

    const postGenerationMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/generation$/);
    if (method === 'PUT' && postGenerationMatch) {
      const postId = decodeURIComponent(postGenerationMatch[1]);
      try {
        const body = await readJsonBody(req, 200_000);
        const post = await updatePostGeneration(studioRoot, postId, body);
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось сохранить генерацию'});
      }
      return;
    }

    const postSettingsMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/settings$/);
    if (method === 'PUT' && postSettingsMatch) {
      const postId = decodeURIComponent(postSettingsMatch[1]);
      try {
        const body = await readJsonBody(req, 50_000);
        const post = await updatePostSettings(studioRoot, postId, body, {
          admin: process.env.ADMIN === '1' || process.env.ADMIN === 'true',
        });
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        if (error.details) {
          sendJson(res, 400, {error: error.message, details: error.details});
          return;
        }
        sendJson(res, 400, {error: error.message || 'Не удалось сохранить настройки'});
      }
      return;
    }

    const postGetMatch = urlPath.match(/^\/api\/posts\/([^/]+)$/);
    if (postGetMatch) {
      const postId = decodeURIComponent(postGetMatch[1]);
      if (method === 'GET') {
        try {
          const post = await getPost(studioRoot, postId);
          sendJson(res, 200, {post});
        } catch (error) {
          sendJson(res, 404, {error: error.message || 'Пост не найден'});
        }
        return;
      }
      if (method === 'DELETE') {
        try {
          await deletePost(studioRoot, postId);
          sendJson(res, 200, {ok: true, id: postId});
        } catch (error) {
          sendJson(res, 404, {error: error.message || 'Пост не найден'});
        }
        return;
      }
    }

    const postRenderMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/render$/);
    if (method === 'POST' && postRenderMatch) {
      const postId = decodeURIComponent(postRenderMatch[1]);
      try {
        const {post, results} = await renderPost(studioRoot, postId);
        sendJson(res, 200, {ok: true, post, results});
      } catch (error) {
        if (error.details) {
          sendJson(res, 400, {error: error.message, details: error.details});
          return;
        }
        sendJson(res, 500, {error: error.message || 'Рендер не удался'});
      }
      return;
    }

    const postRenderCardMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/render-card\/(\d+)$/);
    if (method === 'POST' && postRenderCardMatch) {
      const postId = decodeURIComponent(postRenderCardMatch[1]);
      const cardIndex = Number(postRenderCardMatch[2]);
      try {
        const body = await readJsonBody(req, 4_000).catch(() => ({}));
        const {post, result} = await renderPostCard(studioRoot, postId, cardIndex, {
          video: body.video !== false,
        });
        sendJson(res, 200, {ok: true, post, result});
      } catch (error) {
        if (error.details) {
          sendJson(res, 400, {error: error.message, details: error.details});
          return;
        }
        sendJson(res, 500, {error: error.message || 'Рендер не удался'});
      }
      return;
    }

    const postZipMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/download\.zip$/);
    if (method === 'GET' && postZipMatch) {
      const postId = decodeURIComponent(postZipMatch[1]);
      try {
        const {zipPath, filename} = await buildPostZip(studioRoot, postId);
        const body = await readFile(zipPath);
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.end(body);
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось собрать ZIP'});
      }
      return;
    }

    const postPngZipMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/download-png\.zip$/);
    if (method === 'GET' && postPngZipMatch) {
      const postId = decodeURIComponent(postPngZipMatch[1]);
      try {
        const {zipPath, filename} = await buildPostZip(studioRoot, postId, {
          png: true,
          mp4: false,
          suffix: 'png',
        });
        const body = await readFile(zipPath);
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.end(body);
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Не удалось собрать PNG ZIP'});
      }
      return;
    }

    const postCardMatch = urlPath.match(/^\/api\/posts\/([^/]+)\/cards\/(\d+)$/);
    if (method === 'PUT' && postCardMatch) {
      const postId = decodeURIComponent(postCardMatch[1]);
      const cardIndex = Number(postCardMatch[2]);
      try {
        const body = await readJsonBody(req, 200_000);
        if (!body.props || typeof body.props !== 'object' || Array.isArray(body.props)) {
          sendJson(res, 400, {error: 'Body must be { props: { ... } }'});
          return;
        }
        const post = await updatePostCard(studioRoot, postId, cardIndex, body.props, {
          strict: body.strict !== false,
        });
        sendJson(res, 200, {ok: true, post});
      } catch (error) {
        if (error.details) {
          sendJson(res, 400, {error: error.message, details: error.details});
          return;
        }
        sendJson(res, 400, {error: error.message || 'Не удалось сохранить карточку'});
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
        const [assets, bindings] = await Promise.all([
          listStudioAssets(studioRoot),
          listAssetBindings(studioRoot),
        ]);
        sendJson(res, 200, {assets, bindings});
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

    if (method === 'DELETE' && urlPath === '/api/assets') {
      try {
        const body = await readJsonBody(req, 4_000);
        if (typeof body.path !== 'string' || !body.path.trim()) {
          sendJson(res, 400, {error: 'Не указан путь изображения'});
          return;
        }
        const assetPath = body.path.trim();
        const cleared = await clearAssetFromAllPosts(studioRoot, assetPath);
        const result = await deleteStudioAsset(studioRoot, assetPath);
        sendJson(res, 200, {ok: true, ...result, ...cleared});
      } catch (error) {
        sendJson(res, 400, {error: error.message || 'Удаление не удалось'});
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

    if (urlPath.startsWith('/api/')) {
      sendJson(res, 404, {error: `API route not found: ${method} ${urlPath}`});
      return;
    }

    if (isDashboardPath(urlPath)) {
      proxyDashboardRequest(req, res);
      return;
    }

    const filePath =
      urlPath === '/' || urlPath === '/index.html'
        ? path.join(galleryDir, 'picker.html')
        : urlPath === '/projects.json'
          ? path.join(srcDir, 'projects.json')
          : urlPath === '/story-templates.json' || urlPath === '/templates.json'
            ? path.join(galleryDir, 'story-templates.json')
            : urlPath === '/preview-layouts.json'
              ? path.join(galleryDir, 'preview-layouts.json')
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
      const headers = {'Content-Type': mime[ext] || 'text/plain'};
      if (
        urlPath === '/' ||
        urlPath === '/index.html' ||
        urlPath === '/studio-ui.css' ||
        urlPath === '/architecture-preview.html' ||
        urlPath === '/architecture-preview.css' ||
        urlPath === '/architecture-project-config.js' ||
        urlPath === '/picker.html'
      ) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}
