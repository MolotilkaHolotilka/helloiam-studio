export const FAL_IMAGE_MODEL = 'fal-ai/nano-banana-2';

export function isFalConfigured() {
  return Boolean(process.env.FAL_API_KEY?.trim());
}

function falModel() {
  return FAL_IMAGE_MODEL;
}

function isNanoBananaModel(model) {
  return model.includes('nano-banana');
}

/**
 * @param {string} prompt
 * @param {string} model
 * @param {{ aspectRatio?: string, resolution?: string }} [options]
 */
function buildFalRequestBody(prompt, model, options = {}) {
  if (isNanoBananaModel(model)) {
    const resolution = options.resolution || process.env.FAL_RESOLUTION?.trim() || '1K';
    const aspectRatio = options.aspectRatio || process.env.FAL_ASPECT_RATIO?.trim() || '4:5';
    return {
      prompt,
      num_images: 1,
      resolution,
      aspect_ratio: aspectRatio,
      output_format: 'png',
      limit_generations: true,
    };
  }

  return {
    prompt,
    image_size: {width: 1080, height: 1350},
    num_images: 1,
  };
}

/**
 * @param {string} prompt
 * @param {{ aspectRatio?: string, resolution?: string }} [options]
 */
export async function generateImageFromPrompt(prompt, options = {}) {
  const apiKey = process.env.FAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FAL_API_KEY не задан. Добавьте ключ в .env');
  }

  const model = falModel();
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(buildFalRequestBody(prompt, model, options)),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`fal.ai ответ не JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || text.slice(0, 300);
    throw new Error(`fal.ai ошибка (${res.status}): ${msg}`);
  }

  const url = data?.images?.[0]?.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('fal.ai не вернул URL изображения');
  }

  const imageRes = await fetch(url);
  if (!imageRes.ok) {
    throw new Error(`Не удалось скачать изображение (${imageRes.status})`);
  }

  const buffer = Buffer.from(await imageRes.arrayBuffer());
  if (!buffer.length) throw new Error('Пустой файл изображения');

  const contentType = imageRes.headers.get('content-type') || '';
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';
  return {buffer, ext, model, aspectRatio: options.aspectRatio || process.env.FAL_ASPECT_RATIO?.trim() || '4:5'};
}

/**
 * @param {string} prompt
 * @param {{ aspectRatio?: string, resolution?: string }} [options]
 */
export async function generateImageWithNanoBanana(prompt, options = {}) {
  const apiKey = process.env.FAL_API_KEY?.trim();
  if (!apiKey) throw new Error('FAL_API_KEY не задан');

  const model = FAL_IMAGE_MODEL;
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      num_images: 1,
      resolution: options.resolution || process.env.FAL_RESOLUTION?.trim() || '1K',
      aspect_ratio: options.aspectRatio || '1:1',
      output_format: 'png',
      limit_generations: true,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`fal.ai nano-banana-2 ответ не JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const msg = data?.detail || data?.message || text.slice(0, 400);
    throw new Error(`fal.ai nano-banana-2 ошибка ${res.status}: ${msg}`);
  }
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai nano-banana-2 не вернул URL изображения');
  const buffer = await downloadUrl(url);
  return {buffer, model};
}

async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось скачать изображение (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('Пустой файл изображения');
  return buffer;
}
