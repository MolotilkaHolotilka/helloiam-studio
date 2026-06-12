import {staticFile} from 'remotion';

/** Remotion static path, or undefined when the prop is empty / missing. */
export function resolveImageSrc(image: unknown): string | undefined {
  if (typeof image !== 'string' || !image.trim()) return undefined;
  const normalized = image.trim().replace(/^public[\\/]/, '').replace(/\\/g, '/');
  return staticFile(normalized);
}
