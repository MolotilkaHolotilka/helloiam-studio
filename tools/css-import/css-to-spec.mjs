import {componentizeCss} from '../../packages/css-pipeline/css-componentizer-service.js';
import {splitCssFrames} from '../../packages/css-pipeline/css-split-service.js';

function num(box, axis) {
  const entry = box?.[axis];
  return typeof entry?.value === 'number' ? entry.value : 0;
}

function boxFromComponent(component) {
  return {
    left: num(component.box, 'x'),
    top: num(component.box, 'y'),
    width: num(component.box, 'width'),
    height: num(component.box, 'height'),
  };
}

function parsePx(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d*\.?\d+)px$/);
  return match ? Number(match[1]) : null;
}

function normalizeHex(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase()
      : trimmed.slice(0, 7).toUpperCase();
  }
  return null;
}

function isGroupElement(component) {
  const name = String(component.name || '').trim();
  const fontSize = parsePx(component.style?.['font-size']);
  return /^group\s*\d*$/i.test(name) && !fontSize;
}

function shouldSkipComponent(component) {
  if (component.role === 'container') return true;
  if (component.style?.visibility === 'hidden') return true;
  if (isGroupElement(component)) return true;
  const name = String(component.name || '').trim();
  if (/^source:/i.test(name)) return true;
  return false;
}

/**
 * Figma groups export children at 0,0 — accumulate parent group offsets.
 */
function applyGroupOffsets(components) {
  let activeGroup = null;
  const adjusted = [];

  for (const component of components) {
    if (isGroupElement(component)) {
      activeGroup = {x: num(component.box, 'x'), y: num(component.box, 'y')};
      continue;
    }

    const left = num(component.box, 'x');
    const top = num(component.box, 'y');
    const isGroupChild = activeGroup && left === 0 && top === 0;
    const offsetX = isGroupChild ? activeGroup.x : 0;
    const offsetY = isGroupChild ? activeGroup.y : 0;

    if (activeGroup && !isGroupChild) {
      activeGroup = null;
    }

    adjusted.push({
      ...component,
      box: {
        ...component.box,
        x: {value: left + offsetX, unit: 'px', raw: `${left + offsetX}px`},
        y: {value: top + offsetY, unit: 'px', raw: `${top + offsetY}px`},
      },
    });
  }

  return adjusted;
}

function textStyleFromComponent(component) {
  const style = component.style || {};
  const fontFamilyRaw = String(style['font-family'] || '').toLowerCase();
  const fontSize = parsePx(style['font-size']) ?? 26;
  const lineHeightRaw = style['line-height'] || `${Math.round(fontSize * 0.88)}px`;
  const lineHeight = /px$/.test(lineHeightRaw) ? lineHeightRaw : `${lineHeightRaw}px`;
  const textAlignRaw = String(style['text-align'] || 'left').toLowerCase();

  return {
    fontFamily: fontFamilyRaw.includes('serif') ? 'serif' : 'sans',
    fontSize,
    lineHeight,
    fontWeight: Number.parseInt(style['font-weight'] || '400', 10) || 400,
    fontStyle: style['font-style'] === 'italic' ? 'italic' : 'normal',
    textTransform: style['text-transform'] === 'uppercase' ? 'uppercase' : 'none',
    textAlign: textAlignRaw === 'center' || textAlignRaw === 'right' ? textAlignRaw : 'left',
    color: normalizeHex(style.color) ?? undefined,
  };
}

function formatTitleText(text, box, textStyle, family) {
  const raw = String(text || '').trim();
  if (!raw || raw.includes('\n')) return raw;

  if (family === 'intro-hero' && (textStyle?.fontSize ?? 0) >= 120) {
    const helloMeans = raw.match(/^HELLO\s+I\s+AM\s+AM\s+MEANS\s+(.+)$/i);
    if (helloMeans) {
      return `HELLO\nI AM\nAM\nMEANS\n${helloMeans[1].trim()}`.toUpperCase();
    }

    const helloIam = raw.match(/^HELLO,?\s+I\s+AM\s+(.+)$/i);
    if (helloIam) {
      const tail = helloIam[1].trim();
      if (!tail.includes(' ')) {
        return `HELLO,\nI AM\n${tail}`.toUpperCase();
      }
    }
  }

  return raw;
}

function refineRole(component) {
  const style = component.style || {};
  const fontSize = parsePx(style['font-size']) ?? 0;
  const fontFamily = String(style['font-family'] || '').toLowerCase();

  if (component.role === 'image') return 'image';
  if (component.role === 'label') return 'label';

  if (fontSize >= 120 && fontFamily.includes('instrument sans')) {
    return 'title';
  }
  if (fontSize === 44 && fontFamily.includes('instrument sans')) {
    return 'title';
  }
  if (fontSize === 64 && fontFamily.includes('instrument serif')) {
    return 'quote';
  }
  if (fontSize === 26 && fontFamily.includes('instrument sans') && style['font-weight'] === '700') {
    return 'label';
  }
  if (component.role === 'quote') return 'quote';
  if (component.role === 'title') return 'title';
  return 'text';
}

function detectFamily(components) {
  const textLayers = components.filter((c) => c.role !== 'image');
  const title = textLayers.find((c) => c.role === 'title');
  const titleSize = title?.textStyle?.fontSize ?? 0;

  if (titleSize >= 120) return 'intro-hero';
  if (textLayers.some((c) => c.role === 'quote') && titleSize >= 40 && titleSize <= 50) {
    return 'news-126';
  }
  return 'generic';
}

function roleToPropKey(role, used) {
  const base = role === 'text' ? 'body' : role;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}${i}`)) i += 1;
  const key = `${base}${i}`;
  used.add(key);
  return key;
}

/**
 * @param {string} css
 * @param {{ frameIndex?: number }} [options]
 */
export async function cssToSpec(css, options = {}) {
  const frames = splitCssFrames(css);
  const frameIndex = options.frameIndex ?? 1;
  const frame = frames.find((f) => f.index === frameIndex) ?? frames[0];
  if (!frame) {
    throw new Error('CSS не содержит кадров 1080×1350');
  }

  const componentized = await componentizeCss(frame.css, {
    frame: {width: 1080, height: 1350},
  });

  const frameComponents = applyGroupOffsets(componentized.components || []);

  const container = frameComponents.find((c) => c.role === 'container');
  const background =
    normalizeHex(container?.style?.background || container?.style?.['background-color']) ||
    '#D9DDE0';

  const imageLayers = frameComponents
    .filter((c) => refineRole(c) === 'image')
    .map((c) => boxFromComponent(c));

  const usedKeys = new Set(['image', 'background']);
  const textComponents = frameComponents
    .filter((c) => refineRole(c) !== 'image' && !shouldSkipComponent(c))
    .map((c) => {
      const role = refineRole(c);
      const key = roleToPropKey(role, usedKeys);
      const textStyle = textStyleFromComponent(c);
      const box = boxFromComponent(c);
      const familyHint = role === 'title' && textStyle.fontSize >= 120 ? 'intro-hero' : 'generic';
      const defaultText = formatTitleText(c.text || c.name || '', box, textStyle, familyHint);

      if (role === 'title' && familyHint === 'intro-hero' && textStyle.textTransform === 'none') {
        textStyle.textTransform = 'uppercase';
      }

      return {
        key,
        role,
        box,
        textStyle,
        defaultText,
        defaultColor: textStyle.color,
      };
    })
    .filter((layer) => layer.role !== 'text' || layer.defaultText.trim());

  const family = detectFamily(textComponents);

  for (const layer of textComponents) {
    if (layer.role === 'title') {
      layer.defaultText = formatTitleText(layer.defaultText, layer.box, layer.textStyle, family);
    }
  }

  const spec = {
    frameId: frame.frameId,
    family,
    card: {width: 1080, height: 1350, background},
    layers: textComponents,
    imageLayers,
  };

  return {spec, frame, componentized};
}
