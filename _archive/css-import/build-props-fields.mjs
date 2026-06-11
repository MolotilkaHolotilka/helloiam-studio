const FIXED_LABELS = {
  title: 'Title',
  quote: 'Quote',
  label: 'Label',
  body: 'Body',
  image: 'Image',
  background: 'Background',
  titleColor: 'Title color',
  quoteColor: 'Quote color',
  labelColor: 'Label color',
};

/** @param {string} key */
export function labelForKey(key) {
  if (FIXED_LABELS[key]) return FIXED_LABELS[key];
  const bodyNum = key.match(/^body(\d+)$/);
  if (bodyNum) return `Body ${bodyNum[1]}`;
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

/** @param {{ key: string; defaultText?: string }} layer */
function fieldTypeForLayer(layer) {
  if (
    layer.key === 'quote' ||
    layer.key === 'body' ||
    (layer.defaultText && layer.defaultText.length > 60)
  ) {
    return 'textarea';
  }
  return 'string';
}

/** @param {'title' | 'quote' | 'label' | 'text' | 'image'} role */
function colorFieldForRole(role) {
  if (role === 'title') return 'titleColor';
  if (role === 'quote') return 'quoteColor';
  if (role === 'label') return 'labelColor';
  return null;
}

/**
 * Build propsFields from a CSS import spec (mirrors buildSchemaFields in emit-template.mjs).
 * @param {{ layers: Array<{ key: string; role: string; defaultText?: string; defaultColor?: string }> }} spec
 */
export function buildPropsFieldsFromSpec(spec) {
  const fields = [];
  const colorFields = new Set();

  for (const layer of spec.layers) {
    fields.push({
      key: layer.key,
      type: fieldTypeForLayer(layer),
      label: labelForKey(layer.key),
    });
    const colorField = colorFieldForRole(layer.role);
    if (layer.defaultColor && colorField) {
      colorFields.add(colorField);
    }
  }

  for (const field of colorFields) {
    fields.push({key: field, type: 'color', label: labelForKey(field)});
  }

  fields.push({key: 'image', type: 'image', label: labelForKey('image')});
  fields.push({key: 'background', type: 'color', label: labelForKey('background')});

  return fields;
}
