import { createHash } from 'node:crypto';
import { translate } from 'google-translate-api-x';
import { formatApiErrorForLog } from './api-errors';
import { RUBRICS, type Rubric } from './rubrics';
import {
  cleanText,
  extractSourceName,
  truncateToSentences,
} from './text-utils';
import type { NewsItem } from './types';

const EXA_API_URL = 'https://api.exa.ai/search';

interface ExaResult {
  title?: string;
  url: string;
  publishedDate?: string;
  image?: string;
  favicon?: string;
  summary?: string;
  /** Exa relevance similarity, typically 0–1 (neural search). */
  score?: number;
}

interface TaggedResult {
  item: ExaResult;
  rubric: Rubric;
}

function getStartPublishedDate(daysBack: number) {
  return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
}

async function searchExa(
  apiKey: string,
  query: string,
  rubric: Rubric,
): Promise<ExaResult[]> {
  const body: Record<string, unknown> = {
    query,
    type: 'neural',
    numResults: rubric.numResults + 2,
    startPublishedDate: getStartPublishedDate(rubric.daysBack),
    contents: { summary: true },
  };

  if (rubric.category) body.category = rubric.category;
  if (rubric.includeDomains?.length) body.includeDomains = rubric.includeDomains;

  const response = await fetch(EXA_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const hint = response.status === 403 ? ' (blocked or quota)' : '';
    throw new Error(`Exa API error ${response.status}${hint}`);
  }

  const data = await response.json();
  const results: ExaResult[] = data.results ?? [];
  return results.map((result) => ({
    ...result,
    score: typeof result.score === 'number' ? result.score : undefined,
  }));
}

/** Map Exa relevance score (0–1) to dashboard importance (0–10). */
export function exaScoreToImportance(score: number | undefined): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0;
  return Math.round(Math.min(1, Math.max(0, score)) * 10);
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const param of [
      'utm_source', 'utm_medium', 'utm_campaign',
      'utm_content', 'utm_term', 'fbclid', 'ref',
    ]) {
      parsed.searchParams.delete(param);
    }
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

function tokenize(text: string) {
  return new Set(
    text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2),
  );
}

function titleSimilarity(a: string, b: string) {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  return intersection / new Set([...wordsA, ...wordsB]).size;
}

function deduplicateResults(results: TaggedResult[]) {
  const unique: TaggedResult[] = [];

  function upsert(entry: TaggedResult) {
    const normalized = normalizeUrl(entry.item.url);
    const byUrl = unique.findIndex((e) => normalizeUrl(e.item.url) === normalized);
    if (byUrl >= 0) {
      if ((entry.item.score ?? 0) > (unique[byUrl].item.score ?? 0)) {
        unique[byUrl] = entry;
      }
      return;
    }

    const byTitle = unique.findIndex(
      ({ item }) => titleSimilarity(item.title ?? '', entry.item.title ?? '') >= 0.55,
    );
    if (byTitle >= 0) {
      if ((entry.item.score ?? 0) > (unique[byTitle].item.score ?? 0)) {
        unique[byTitle] = entry;
      }
      return;
    }

    unique.push(entry);
  }

  for (const entry of results) upsert(entry);
  return unique;
}

function isRussian(text: string) {
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  return cyrillic > latin;
}

async function toRussian(text: string) {
  if (!text || isRussian(text)) return text;

  try {
    const result = await translate(text, { to: 'ru' });
    return result.text;
  } catch {
    return text;
  }
}

export function createNewsId(date: string, title: string, url: string) {
  const hash = createHash('md5').update(`${url}:${title}`).digest('hex').slice(0, 12);
  return `${date}-${hash}`;
}

async function normalizeItem(
  entry: TaggedResult,
  date: string,
): Promise<NewsItem> {
  const { item, rubric } = entry;
  const rawSummary = item.summary ?? item.title ?? '';

  const [title, fullSummary] = await Promise.all([
    toRussian(item.title ?? ''),
    toRussian(cleanText(rawSummary)),
  ]);

  return {
    id: createNewsId(date, title, item.url),
    title,
    summary: truncateToSentences(fullSummary, 2),
    fullSummary,
    url: item.url,
    imageUrl: item.image ?? '',
    publishedAt: item.publishedDate ?? new Date().toISOString(),
    category: rubric.id,
    categoryLabel: rubric.label,
    categoryEmoji: rubric.emoji,
    sourceName: extractSourceName(item.url),
    dataSource: 'exa',
    importanceScore: exaScoreToImportance(item.score),
    faviconUrl: item.favicon ?? '',
  };
}

function pickForRubric(entries: TaggedResult[], rubric: Rubric) {
  return entries
    .filter(({ rubric: r }) => r.id === rubric.id)
    .sort((a, b) => (b.item.score ?? 0) - (a.item.score ?? 0))
    .slice(0, rubric.numResults);
}

async function searchExaSafe(
  apiKey: string,
  query: string,
  rubric: Rubric,
): Promise<TaggedResult[]> {
  try {
    const results = await searchExa(apiKey, query, rubric);
    return results.map((item) => ({ item, rubric }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[news] Exa skipped ("${query}"): ${formatApiErrorForLog(message)}`);
    return [];
  }
}

export async function collectArmeniaNews(apiKey = process.env.EXA_API_KEY) {
  if (!apiKey) {
    throw new Error('EXA_API_KEY is required');
  }

  const searchJobs = RUBRICS.flatMap((rubric) =>
    rubric.queries.map((query) => searchExaSafe(apiKey, query, rubric)),
  );

  const batches = await Promise.all(searchJobs);
  const merged = batches.flat();
  if (merged.length === 0) {
    throw new Error('Exa API error 403 (blocked or quota)');
  }

  const deduped = deduplicateResults(merged);

  const selected: TaggedResult[] = [];
  const usedUrls = new Set<string>();

  for (const rubric of RUBRICS) {
    const picks = pickForRubric(deduped, rubric);
    for (const entry of picks) {
      const url = normalizeUrl(entry.item.url);
      if (usedUrls.has(url)) continue;
      usedUrls.add(url);
      selected.push(entry);
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  return Promise.all(selected.map((entry) => normalizeItem(entry, date)));
}
