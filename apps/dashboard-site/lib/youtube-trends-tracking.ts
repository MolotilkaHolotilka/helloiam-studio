import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_YOUTUBE_HASHTAGS, getHashtagConfig } from './youtube-hashtag-config';

export interface TrendsTrackingEntry {
  tag: string;
  enabled: boolean;
}

export interface TrendsTrackingConfig {
  tags: TrendsTrackingEntry[];
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'youtube-trends-tracking.json');

function ensureDataDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase();
}

function createDefaultConfig(): TrendsTrackingConfig {
  return {
    tags: DEFAULT_YOUTUBE_HASHTAGS.map((tag) => ({
      tag,
      enabled: true,
    })),
  };
}

function syncWithSearchConfig(config: TrendsTrackingConfig): TrendsTrackingConfig {
  const searchTags = getHashtagConfig().tags.map((entry) => entry.tag);
  const allTags = new Set([
    ...config.tags.map((entry) => entry.tag),
    ...searchTags,
    ...DEFAULT_YOUTUBE_HASHTAGS,
  ]);

  const enabledMap = new Map(config.tags.map((entry) => [entry.tag, entry.enabled]));

  return {
    tags: [...allTags].map((tag) => ({
      tag,
      enabled: enabledMap.get(tag) ?? true,
    })),
  };
}

export function getTrendsTrackingConfig(): TrendsTrackingConfig {
  ensureDataDir();

  if (!existsSync(CONFIG_PATH)) {
    const defaults = syncWithSearchConfig(createDefaultConfig());
    writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }

  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TrendsTrackingConfig;
    const synced = syncWithSearchConfig(parsed);
    writeFileSync(CONFIG_PATH, JSON.stringify(synced, null, 2), 'utf-8');
    return synced;
  } catch {
    const defaults = syncWithSearchConfig(createDefaultConfig());
    writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
}

export function saveTrendsTrackingConfig(config: TrendsTrackingConfig) {
  ensureDataDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function getEnabledTrendsTags(): string[] {
  return getTrendsTrackingConfig()
    .tags
    .filter((entry) => entry.enabled)
    .map((entry) => entry.tag);
}

export function setTrendsTagEnabled(tag: string, enabled: boolean): TrendsTrackingConfig {
  const normalized = normalizeTag(tag);
  const config = getTrendsTrackingConfig();
  const entry = config.tags.find((item) => item.tag === normalized);

  if (entry) {
    entry.enabled = enabled;
  } else {
    config.tags.push({ tag: normalized, enabled });
  }

  saveTrendsTrackingConfig(config);
  return config;
}
