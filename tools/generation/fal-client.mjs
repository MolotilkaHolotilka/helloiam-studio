export function isFalConfigured() {
  return Boolean(process.env.FAL_API_KEY?.trim());
}

function falModel() {
  return process.env.FAL_MODEL?.trim() || 'fal-ai/flux/schnell';
}

/**
 * @param {string} prompt
 */
export async function generateImageFromPrompt(prompt) {
  const apiKey = process.env.FAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FAL_API_KEY не задан. Добавьте ключ в .env');
  }

  const res = await fetch(`https://fal.run/${falModel()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: {width: 1080, height: 1350},
      num_images: 1,
    }),
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
  return {buffer, ext};
}
