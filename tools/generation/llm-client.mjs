/**
 * OpenAI-compatible chat completions client.
 */
export function isLlmConfigured() {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

function resolveChatUrl() {
  const base = (process.env.LLM_API_URL || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
  if (base.endsWith('/chat/completions')) return base;
  return `${base}/chat/completions`;
}

function isRetryableError(message) {
  return /504|таймаут|time-?out|429|502|503/i.test(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHtmlResponse(text) {
  return /^\s*</.test(text) && /<html/i.test(text);
}

/**
 * @param {string} text
 */
function extractJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * @param {string} content
 */
export function parseJsonFromLlm(content) {
  let trimmed = content.trim();
  if (!trimmed) throw new Error('LLM вернул пустой ответ');

  trimmed = trimmed.replace(/^Thinking Process:[\s\S]*?(?=\{)/i, '');
  trimmed = trimmed.replace(/^[\s\S]*?```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  const attempts = [
    trimmed,
    extractJsonObject(trimmed),
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(),
    (() => {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
    })(),
  ].filter(Boolean);

  let lastError;
  for (const candidate of attempts) {
    try {
      return JSON.parse(/** @type {string} */ (candidate));
    } catch (error) {
      lastError = error;
    }
  }

  const preview = trimmed.slice(0, 240).replace(/\s+/g, ' ');
  throw new Error(
    `Не удалось разобрать JSON из ответа LLM. Начало ответа: ${preview}`,
    {cause: lastError},
  );
}

/**
 * @param {{ messages: Array<{ role: string, content: string }>, jsonMode?: boolean, maxTokens?: number, model?: string }} params
 */
export async function chatCompletion({messages, jsonMode, maxTokens, model}) {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('LLM_API_KEY не задан. Добавьте ключ в .env и перезапустите сервер.');
  }

  const resolvedModel = model || process.env.LLM_MODEL?.trim() || 'gpt-4o-mini';
  const useJsonMode =
    jsonMode ??
    (process.env.LLM_JSON_MODE === '1' || process.env.LLM_JSON_MODE === 'true');

  const body = {
    model: resolvedModel,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens ?? (Number(process.env.LLM_MAX_TOKENS) || 8000),
  };
  if (useJsonMode) body.response_format = {type: 'json_object'};

  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 55_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(resolveChatUrl(), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (/** @type {Error} */ (error).name === 'AbortError') {
      throw new Error(`LLM таймаут (${Math.round(timeoutMs / 1000)}с)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();

  if (isHtmlResponse(text)) {
    if (res.status === 504 || /time-?out/i.test(text)) {
      throw new Error('LLM API не ответил вовремя (504)');
    }
    throw new Error(`LLM вернул HTML вместо JSON (${res.status})`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`LLM ответ не JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text.slice(0, 300);
    throw new Error(`LLM ошибка (${res.status}): ${msg}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    const reason = data?.choices?.[0]?.finish_reason || 'unknown';
    throw new Error(`LLM вернул пустой ответ (finish_reason=${reason})`);
  }
  return content.trim();
}

/**
 * @param {Array<{ role: string, content: string }>} messages
 * @param {{ maxTokens?: number, model?: string }} [options]
 */
export async function chatCompletionJson(messages, options = {}) {
  const retries = Number(process.env.LLM_RETRIES) || 3;
  const fallbackModel = process.env.LLM_FALLBACK_MODEL?.trim() || 'gpt-4o-mini';
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    const model = attempt > 0 ? fallbackModel : options.model;
    try {
      const raw = await chatCompletion({
        messages,
        jsonMode: false,
        maxTokens: options.maxTokens,
        model,
      });
      return parseJsonFromLlm(raw);
    } catch (error) {
      lastError = error;
      const message = String(/** @type {Error} */ (error).message || error);
      if (!isRetryableError(message) && !message.includes('разобрать JSON')) {
        throw error;
      }
      if (attempt < retries - 1) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
    }
  }

  try {
    const raw = await chatCompletion({
      messages: [
        ...messages,
        {
          role: 'user',
          content: 'Reply with a single valid JSON object only. No markdown, no commentary.',
        },
      ],
      jsonMode: false,
      maxTokens: options.maxTokens,
      model: fallbackModel,
    });
    return parseJsonFromLlm(raw);
  } catch (error) {
    throw lastError || error;
  }
}
