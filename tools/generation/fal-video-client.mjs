export const FAL_VIDEO_MODEL = 'fal-ai/kling-video/v3/pro/text-to-video';
export const FAL_VIDEO_ASPECT_RATIO = '9:16';
export const INSTAGRAM_VIDEO_SIZE = {width: 1080, height: 1350, aspectRatio: '4:5'};

export function isFalVideoConfigured() {
  return Boolean(process.env.FAL_API_KEY?.trim());
}

/**
 * @param {string} prompt
 * @param {{ seconds?: number }} [options]
 */
export async function generateVideoFromPrompt(prompt, options = {}) {
  const apiKey = process.env.FAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FAL_API_KEY не задан. Добавьте ключ в .env');
  }

  const seconds = options.seconds || 5;
  const res = await fetch(`https://fal.run/${FAL_VIDEO_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      duration: String(seconds),
      aspect_ratio: FAL_VIDEO_ASPECT_RATIO,
      generate_audio: false,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`fal.ai video ответ не JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || text.slice(0, 400);
    throw new Error(`fal.ai video ошибка (${res.status}): ${msg}`);
  }

  const url = data?.video?.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('fal.ai video не вернул URL видео');
  }

  const videoRes = await fetch(url);
  if (!videoRes.ok) {
    throw new Error(`Не удалось скачать видео (${videoRes.status})`);
  }
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  if (!buffer.length) throw new Error('Пустой файл видео');

  return {buffer, ext: '.mp4', model: FAL_VIDEO_MODEL, aspectRatio: FAL_VIDEO_ASPECT_RATIO};
}

/**
 * Convert fal/Kling vertical output into the 4:5 Instagram feed canvas.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
export async function normalizeVideoToInstagram45(buffer) {
  const {mkdtemp, readFile, rm, writeFile} = await import('node:fs/promises');
  const {tmpdir} = await import('node:os');
  const path = await import('node:path');
  const {execFile} = await import('node:child_process');

  const workDir = await mkdtemp(path.join(tmpdir(), 'helloiam-video-'));
  const inputPath = path.join(workDir, 'input.mp4');
  const outputPath = path.join(workDir, 'output-1080x1350.mp4');

  try {
    await writeFile(inputPath, buffer);
    await new Promise((resolve, reject) => {
      execFile(
        'ffmpeg',
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          inputPath,
          '-vf',
          'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1350:(iw-1080)/2:(ih-1350)/2',
          '-an',
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          outputPath,
        ],
        (error, _stdout, stderr) => {
          if (error) {
            reject(new Error(`ffmpeg 1080x1350 conversion failed: ${stderr || error.message}`));
            return;
          }
          resolve();
        },
      );
    });
    return await readFile(outputPath);
  } finally {
    await rm(workDir, {recursive: true, force: true});
  }
}
