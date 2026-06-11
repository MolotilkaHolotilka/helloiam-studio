import {execFile} from 'node:child_process';
import {access, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {getPost} from './posts-service.mjs';

const execFileAsync = promisify(execFile);

/**
 * @param {string} studioRoot
 * @param {string} postId
 */
export async function buildPostZip(studioRoot, postId) {
  const post = await getPost(studioRoot, postId);
  if (!post.lastRender?.cards?.length) {
    throw new Error('Сначала отрендерите пост');
  }

  const renderRoot = path.join(studioRoot, 'out', 'renders', 'posts', postId);
  try {
    await access(renderRoot);
  } catch {
    throw new Error('Файлы рендера не найдены — запустите рендер снова');
  }

  const zipDir = path.join(studioRoot, 'out', 'renders', 'posts', '_zip');
  await mkdir(zipDir, {recursive: true});
  const zipPath = path.join(zipDir, `${postId}.zip`);

  await rm(zipPath, {force: true});
  await execFileAsync('zip', ['-r', zipPath, '.'], {cwd: renderRoot});

  return {
    zipPath,
    zipUrl: `/renders/posts/_zip/${postId}.zip`,
    filename: `helloiam-post-${postId.slice(0, 8)}.zip`,
  };
}
