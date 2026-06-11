import { isParsedCss, parseCss } from "./css-parse-service.js";
import { isFigmaFlatCss, splitCssFrames } from "./css-split-service.js";

const DEFAULT_FRAME = { width: 1080, height: 1350 };

const IMAGE_HINT_PATTERN = /(?:^|[\s.#])(?:image|img|media|photo|hero-image|sticker)(?:$|[\s.#_-])/i;
const TEXT_HINT_PATTERN = /(?:^|[\s.#])(?:title|quote|label|text|heading|subtitle|brand)(?:$|[\s.#_-])/i;
const CONTAINER_HINT_PATTERN = /(?:^|[\s.#])(?:card|frame|canvas|slide)(?:$|[\s.#_-])/i;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function selectorTail(selector) {
  const parts = selector.split(/\s+/);
  const last = parts[parts.length - 1] || selector;
  return last.replace(/^[^.#]*([.#][\w-]+).*$/, "$1").replace(/^[.#]/, "");
}

function hasTypography(rule) {
  return Object.keys(rule.typography || {}).length > 0;
}

function hasAbsoluteLayout(rule) {
  const position = rule.layout?.position?.raw;
  return position === "absolute" || position === "fixed";
}

function hasSizedBox(rule) {
  return Boolean(rule.layout?.width || rule.layout?.height);
}

function inferComponentType(rule) {
  const selector = rule.baseSelector || rule.selector;
  const hasBackgroundImage = rule.declarations.some(
    (decl) =>
      decl.property === "background-image" &&
      decl.value &&
      decl.value !== "none"
  );
  const hasObjectFit = rule.declarations.some((decl) => decl.property === "object-fit");

  if (hasBackgroundImage || hasObjectFit || IMAGE_HINT_PATTERN.test(selector)) {
    return "image";
  }

  if (hasTypography(rule) || TEXT_HINT_PATTERN.test(selector)) {
    return "text";
  }

  if (hasSizedBox(rule) || hasAbsoluteLayout(rule) || CONTAINER_HINT_PATTERN.test(selector)) {
    return "box";
  }

  return "box";
}

function inferRole(rule, type) {
  const selector = rule.baseSelector || rule.selector;

  if (IMAGE_HINT_PATTERN.test(selector)) return "image";
  if (/(?:^|[\s.#])title-accent(?:$|[\s.#_-])/i.test(selector)) return "title-accent";
  if (/(?:^|[\s.#])title(?:$|[\s.#_-])/i.test(selector)) return "title";
  if (/(?:^|[\s.#])quote(?:$|[\s.#_-])/i.test(selector)) return "quote";
  if (/(?:^|[\s.#])label(?:$|[\s.#_-])/i.test(selector)) return "label";
  if (/(?:^|[\s.#])brand(?:$|[\s.#_-])/i.test(selector)) return "brand";

  if (type === "image") return "image";
  if (type === "text") return "text";
  if (CONTAINER_HINT_PATTERN.test(selector)) return "container";
  return "element";
}

function buildBox(layout = {}) {
  const read = (key) => layout[key] || null;
  const toCoord = (entry) =>
    entry && typeof entry.value === "number"
      ? { value: entry.value, unit: entry.unit || "px", raw: entry.raw }
      : null;

  return {
    position: read("position")?.raw || null,
    x: toCoord(read("left")),
    y: toCoord(read("top")),
    right: toCoord(read("right")),
    bottom: toCoord(read("bottom")),
    width: toCoord(read("width")),
    height: toCoord(read("height")),
    display: read("display")?.raw || null,
    flexDirection: read("flex-direction")?.raw || null,
    alignItems: read("align-items")?.raw || null,
    justifyContent: read("justify-content")?.raw || null,
    gap: toCoord(read("gap")),
    overflow: read("overflow")?.raw || null,
    zIndex: toCoord(read("z-index"))
  };
}

function componentHintsFromRule(rule, context = {}) {
  return {
    positioned: hasAbsoluteLayout(rule),
    hasTextStyles: hasTypography(rule),
    hasColor: Object.keys(rule.colors || {}).length > 0,
    inferredType: context.type || null,
    inferredRole: context.role || null
  };
}

function buildStyle(rule) {
  const style = {};

  for (const section of [rule.layout, rule.typography, rule.colors]) {
    for (const [property, entry] of Object.entries(section || {})) {
      style[property] = entry.raw;
    }
  }

  for (const decl of rule.declarations) {
    if (
      decl.property.startsWith("background") ||
      decl.property.startsWith("border") ||
      decl.property === "opacity" ||
      decl.property === "transform" ||
      decl.property === "object-fit" ||
      decl.property === "object-position"
    ) {
      style[decl.property] = decl.value;
    }
  }

  return style;
}

function detectFrame(rules, options = {}) {
  if (isRecord(options.frame)) {
    return { ...DEFAULT_FRAME, ...options.frame };
  }

  for (const rule of rules) {
    const width = rule.layout?.width?.value;
    const height = rule.layout?.height?.value;
    if (width === 1080 && height === 1350) {
      return { width, height };
    }
  }

  return { ...DEFAULT_FRAME };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function shouldSkipRule(rule) {
  if (rule.pseudo) return true;
  if (rule.selector.includes(":root")) return true;
  return false;
}

function parseFigmaProperties(text) {
  const props = {};
  if (typeof text !== "string" || !text.trim()) return props;

  for (const chunk of text.split(";")) {
    const line = chunk.trim();
    if (!line || line.startsWith("/*")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    if (key) {
      props[key] = value;
    }
  }

  return props;
}

const FIGMA_LAYER_START_RE = /(?:^|\n)\/\*\s*([^*]+?)\s*\*\/\s*\n\s*position:/g;

function isFigmaAnnotationComment(comment) {
  const trimmed = String(comment || "").trim();
  if (!trimmed) return true;
  if (/^or \d+%$/i.test(trimmed)) return true;
  if (/^identical to box height$/i.test(trimmed)) return true;
  return false;
}

function parseFigmaElements(frameCss) {
  const starts = [];
  const layerMatches = [...frameCss.matchAll(FIGMA_LAYER_START_RE)];

  for (const match of layerMatches) {
    const comment = match[1]?.trim();
    if (!comment || isFigmaAnnotationComment(comment)) continue;
    starts.push({
      index: match.index + (match[0].startsWith("\n") ? 1 : 0),
      comment
    });
  }

  const elements = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index;
    const end = index + 1 < starts.length ? starts[index + 1].index : frameCss.length;
    const block = frameCss.slice(start, end);
    const propertyText = block
      .replace(/^\/\*[^*]*\*\/\s*/, "")
      .replace(/\/\*[^*]*\*\//g, "");

    elements.push({
      comment: starts[index].comment,
      properties: parseFigmaProperties(propertyText)
    });
  }

  return elements;
}

function toCoord(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const match = raw.trim().match(/^(-?\d*\.?\d+)(px)?$/);
  if (!match) return { value: null, unit: null, raw: raw.trim() };
  return { value: Number(match[1]), unit: match[2] || "px", raw: raw.trim() };
}

function buildBoxFromFigmaProps(properties = {}) {
  return {
    position: properties.position || null,
    x: toCoord(properties.left),
    y: toCoord(properties.top),
    right: toCoord(properties.right),
    bottom: toCoord(properties.bottom),
    width: toCoord(properties.width),
    height: toCoord(properties.height),
    display: properties.display || null,
    flexDirection: properties["flex-direction"] || null,
    alignItems: properties["align-items"] || null,
    justifyContent: properties["justify-content"] || null,
    gap: toCoord(properties.gap),
    overflow: properties.overflow || null,
    zIndex: toCoord(properties["z-index"])
  };
}

function isRootFrameProperties(properties = {}) {
  const fontSize = Number.parseFloat(properties["font-size"] || "0");
  return (
    properties.position === "relative" &&
    String(properties.width || "").trim() === "1080px" &&
    String(properties.height || "").trim() === "1350px" &&
    !fontSize
  );
}

function inferFigmaRole(element) {
  const comment = element.comment || "";
  const properties = element.properties || {};

  if (/^instagram\s+post\b/i.test(comment) || isRootFrameProperties(properties)) {
    return { role: "container", text: "", skip: false };
  }
  if (/^image\s+\d+/i.test(comment) || /url\(/i.test(properties.background || "")) {
    return { role: "image", text: "", skip: false };
  }
  if (properties.visibility === "hidden") {
    return { role: null, text: "", skip: true };
  }
  if (/^source:/i.test(comment)) {
    return { role: "source", text: comment, skip: true };
  }

  const fontSize = Number.parseFloat(properties["font-size"] || "0");
  const fontFamily = String(properties["font-family"] || "").toLowerCase();
  const color = String(properties.color || "").toUpperCase();
  const fontWeight = String(properties["font-weight"] || "");

  if (fontSize >= 120 && fontFamily.includes("instrument sans")) {
    return { role: "title", text: comment, skip: false };
  }
  if (fontSize === 44 && fontFamily.includes("instrument sans")) {
    return { role: "title", text: comment, skip: false };
  }
  if (
    fontSize === 26 &&
    fontFamily.includes("instrument sans") &&
    fontWeight === "700"
  ) {
    return { role: "label", text: comment, skip: false };
  }
  if (fontSize === 64 && fontFamily.includes("instrument serif")) {
    return { role: "quote", text: comment, skip: false };
  }
  if (fontSize >= 26 && fontSize < 120 && comment.length > 40) {
    return { role: "quote", text: comment, skip: false };
  }

  return { role: "text", text: comment, skip: false };
}

function componentizeFigmaFrame(frameCss, cardIndex) {
  const elements = parseFigmaElements(frameCss);
  const usedIds = new Set();
  const components = [];

  for (const [index, element] of elements.entries()) {
    const inferred = inferFigmaRole(element);
    if (inferred.skip) continue;

    const role = inferred.role || "element";
    const type =
      role === "image" ? "image" : role === "container" ? "box" : "text";
    let id = slugify(`card-${cardIndex}-${element.comment}`) || `card-${cardIndex}-el-${index + 1}`;

    if (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    usedIds.add(id);

    components.push({
      id,
      type,
      role,
      name: element.comment,
      cardIndex,
      selectors: [],
      baseSelector: `.card-${cardIndex}`,
      mediaQuery: null,
      box: buildBoxFromFigmaProps(element.properties),
      style: element.properties,
      text: inferred.text || "",
      hints: {
        figmaFlat: true,
        positioned: element.properties.position === "absolute",
        hasTextStyles: type === "text",
        hasColor: Boolean(element.properties.color || element.properties.background),
        inferredType: type,
        inferredRole: role
      }
    });
  }

  return components;
}

function componentizeFigmaCss(css, options = {}) {
  const frames = splitCssFrames(css);
  const allComponents = [];

  for (const frame of frames) {
    allComponents.push(...componentizeFigmaFrame(frame.css, frame.index));
  }

  return {
    version: 1,
    source: "css-componentizer",
    frame: detectFrame([], options),
    variables: {},
    components: allComponents,
    meta: {
      frameCount: frames.length,
      ruleCount: 0,
      componentCount: allComponents.length
    }
  };
}

function extractTextContent(rule) {
  for (const decl of rule.declarations) {
    if (decl.property !== "content") continue;

    const raw = decl.value.trim();
    if (!raw || raw === "none" || raw === '""' || raw === "''") {
      return "";
    }

    const unquoted = raw.replace(/^["']|["']$/g, "");
    return unquoted.replace(/\\A/g, "\n").replace(/\\n/g, "\n");
  }

  return "";
}

function buildComponent(rule, index, usedIds) {
  const type = inferComponentType(rule);
  const role = inferRole(rule, type);
  const tail = selectorTail(rule.baseSelector || rule.selector);
  let id = slugify(tail || `component-${index + 1}`) || `component-${index + 1}`;

  if (rule.mediaQuery) {
    id = `${id}-mq${index + 1}`;
  } else if (usedIds.has(id)) {
    id = `${id}-${index + 1}`;
  }
  usedIds.add(id);

  return {
    id,
    type,
    role,
    name: tail || id,
    selectors: [rule.selector],
    baseSelector: rule.baseSelector,
    mediaQuery: rule.mediaQuery,
    box: buildBox(rule.layout),
    style: buildStyle(rule),
    text: extractTextContent(rule),
    hints: componentHintsFromRule(rule, { type, role })
  };
}

/**
 * Group parsed CSS rules into logical components for LLM / Remotion mapping.
 *
 * @param {Awaited<ReturnType<typeof parseCss>>} parsed
 * @param {{ frame?: { width?: number, height?: number }, includeRoot?: boolean }} [options]
 */
export function componentizeParsedCss(parsed, options = {}) {
  if (!isParsedCss(parsed)) {
    throw new TypeError("componentizeParsedCss expects output from parseCss()");
  }

  const candidates = parsed.rules.filter((rule) => !shouldSkipRule(rule));
  const usedIds = new Set();
  const components = candidates.map((rule, index) => buildComponent(rule, index, usedIds));

  return {
    version: 1,
    source: "css-componentizer",
    frame: detectFrame(parsed.rules, options),
    variables: parsed.variables,
    components,
    meta: {
      ruleCount: parsed.meta?.ruleCount ?? parsed.rules.length,
      componentCount: components.length
    }
  };
}

/**
 * Parse CSS and componentize in one step.
 *
 * @param {string} css
 * @param {object} [options]
 */
export async function componentizeCss(css, options = {}) {
  const frames = splitCssFrames(css);
  const useFigmaPath =
    frames.length > 1 || (frames.length === 1 && isFigmaFlatCss(frames[0].css));

  if (useFigmaPath) {
    return componentizeFigmaCss(css, options);
  }

  const parsed = await parseCss(css, options);
  return componentizeParsedCss(parsed, options);
}
