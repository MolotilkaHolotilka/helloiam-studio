const FRAME_COMMENT_RE = /\/\*\s*Instagram\s+post\s*-\s*(\d+)\s*\*\//gi;
const FRAME_SIZE_MARKER =
  /position:\s*relative;\s*width:\s*1080px;\s*height:\s*1350px;/gi;

/**
 * Detect Figma Dev Mode flat CSS (property blocks + layer comments, no rule braces).
 *
 * @param {string} css
 */
export function isFigmaFlatCss(css) {
  if (typeof css !== "string" || !css.trim()) return false;
  if (/\{/.test(css)) return false;
  return /position:\s*(?:relative|absolute)/i.test(css);
}

/**
 * Split pasted CSS into per-frame chunks for multi-card Figma exports.
 *
 * @param {string} css
 * @returns {Array<{ frameId: string, label: string | null, css: string, index: number }>}
 */
export function splitCssFrames(css) {
  if (typeof css !== "string" || !css.trim()) {
    return [];
  }

  const trimmed = css.trim();
  const commentMatches = [...trimmed.matchAll(FRAME_COMMENT_RE)];

  if (commentMatches.length > 0) {
    return commentMatches.map((match, index) => {
      const start = match.index;
      const end =
        index + 1 < commentMatches.length
          ? commentMatches[index + 1].index
          : trimmed.length;

      return {
        frameId: match[1],
        label: match[0],
        css: trimmed.slice(start, end).trim(),
        index: index + 1
      };
    });
  }

  const sizeMatches = [...trimmed.matchAll(FRAME_SIZE_MARKER)];
  if (sizeMatches.length > 1) {
    return sizeMatches.map((match, index) => {
      const start = match.index;
      const end =
        index + 1 < sizeMatches.length ? sizeMatches[index + 1].index : trimmed.length;

      return {
        frameId: String(index + 1),
        label: null,
        css: trimmed.slice(start, end).trim(),
        index: index + 1
      };
    });
  }

  return [
    {
      frameId: "1",
      label: null,
      css: trimmed,
      index: 1
    }
  ];
}
