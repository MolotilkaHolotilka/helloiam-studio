import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface HashtagEntry {
  tag: string;
  enabled: boolean;
  builtin: boolean;
}

export interface HashtagConfig {
  tags: HashtagEntry[];
  removed?: string[];
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'youtube-hashtag-config.json');

export const DEFAULT_YOUTUBE_HASHTAGS = [
  'armenia',
  'yerevan',
  'visitarmenia',
  'armeniatravel',
  'hayastan',
  'армения',
  'ереван',
  'armfood',
  'dilijan',
  'garni',
];

function ensureDataDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase();
}

function createDefaultConfig(): HashtagConfig {
  return {
    tags: DEFAULT_YOUTUBE_HASHTAGS.map((tag) => ({
      tag,
      enabled: true,
      builtin: true,
    })),
    removed: [],
  };
}

function mergeWithDefaults(saved: HashtagConfig | null): HashtagConfig {
  const defaults = createDefaultConfig();
  if (!saved?.tags?.length) return defaults;

  const removed = new Set((saved.removed ?? []).map(normalizeTag));
  const savedMap = new Map(saved.tags.map((entry) => [entry.tag, entry]));
  const merged: HashtagEntry[] = defaults.tags
    .filter((entry) => !removed.has(entry.tag))
    .map((entry) => {
      const existing = savedMap.get(entry.tag);
      return existing
        ? { ...entry, enabled: existing.enabled }
        : entry;
    });

  for (const entry of saved.tags) {
    if (!entry.builtin && !merged.some((item) => item.tag === entry.tag)) {
      merged.push({
        tag: entry.tag,
        enabled: entry.enabled,
        builtin: false,
      });
    }
  }

  return { tags: merged, removed: [...removed] };
}

export function getHashtagConfig(): HashtagConfig {
  ensureDataDir();
  if (!existsSync(CONFIG_PATH)) {
    const defaults = createDefaultConfig();
    writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as HashtagConfig;
    const merged = mergeWithDefaults(parsed);
    writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch {
    const defaults = createDefaultConfig();
    writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
}

export function saveHashtagConfig(config: HashtagConfig) {
  ensureDataDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getEnabledHashtagSearchQueries(): string[] {
  return getHashtagConfig()
    .tags
    .filter((entry) => entry.enabled)
    .map((entry) => `#${entry.tag}`);
}

export function getEnabledHashtagTags(): string[] {
  return getHashtagConfig()
    .tags
    .filter((entry) => entry.enabled)
    .map((entry) => entry.tag.toLowerCase());
}

export function setHashtagEnabled(tag: string, enabled: boolean): HashtagConfig {
  const normalized = normalizeTag(tag);
  const config = getHashtagConfig();
  const entry = config.tags.find((item) => item.tag === normalized);

  if (entry) {
    entry.enabled = enabled;
  } else {
    config.tags.push({ tag: normalized, enabled, builtin: false });
    config.removed = (config.removed ?? []).filter((item) => item !== normalized);
  }

  saveHashtagConfig(config);
  return config;
}

export function addHashtag(tag: string): HashtagConfig {
  const normalized = normalizeTag(tag);
  if (!normalized) return getHashtagConfig();

  const config = getHashtagConfig();
  config.removed = (config.removed ?? []).filter((item) => item !== normalized);

  const existing = config.tags.find((item) => item.tag === normalized);
  if (existing) {
    existing.enabled = true;
  } else {
    const isBuiltin = DEFAULT_YOUTUBE_HASHTAGS.includes(normalized);
    config.tags.push({ tag: normalized, enabled: true, builtin: isBuiltin });
  }

  saveHashtagConfig(config);
  return config;
}

export function removeHashtag(tag: string): HashtagConfig {
  const normalized = normalizeTag(tag);
  const config = getHashtagConfig();
  const entry = config.tags.find((item) => item.tag === normalized);

  if (!entry) return config;

  config.tags = config.tags.filter((item) => item.tag !== normalized);

  if (entry.builtin) {
    const removed = new Set(config.removed ?? []);
    removed.add(normalized);
    config.removed = [...removed];
  }

  saveHashtagConfig(config);
  return config;
}

// backwards compat for API
export function toggleHashtag(tag: string): HashtagConfig {
  const normalized = normalizeTag(tag);
  const config = getHashtagConfig();
  const entry = config.tags.find((item) => item.tag === normalized);
  return setHashtagEnabled(tag, entry ? !entry.enabled : true);
}
