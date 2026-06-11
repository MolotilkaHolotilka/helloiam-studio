import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {buildPropsFieldsFromSpec} from './build-props-fields.mjs';
import {projectFromFamily} from './project-from-family.mjs';

function slugFromFrameId(frameId) {
  return `post-${String(frameId).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

function compositionIdFromFrameId(frameId) {
  const slug = String(frameId).replace(/[^a-z0-9]/gi, '');
  return `Post${slug}Css`;
}

function colorFieldForRole(role) {
  if (role === 'title') return 'titleColor';
  if (role === 'quote') return 'quoteColor';
  if (role === 'label') return 'labelColor';
  return null;
}

function buildSchemaFields(spec) {
  const lines = [];
  const colorFields = new Set();
  for (const layer of spec.layers) {
    const zType =
      layer.key === 'quote' || layer.key === 'body' || layer.defaultText.length > 60
        ? 'zTextarea()'
        : 'z.string()';
    lines.push(`  ${layer.key}: ${zType},`);
    const colorField = colorFieldForRole(layer.role);
    if (layer.defaultColor && colorField) {
      colorFields.add(colorField);
    }
  }
  for (const field of colorFields) {
    lines.push(`  ${field}: zColor(),`);
  }
  lines.push('  image: z.enum(STUDIO_IMAGE_OPTIONS),');
  lines.push('  background: zColor(),');
  return lines;
}

function buildDefaultProps(spec) {
  const props = {
    image: spec.family === 'intro-hero' ? 'generated/post-91-hero.png' : 'generated/post-126.png',
    background: spec.card.background,
  };
  for (const layer of spec.layers) {
    props[layer.key] = layer.defaultText;
    const colorField = colorFieldForRole(layer.role);
    if (layer.defaultColor && colorField) {
      props[colorField] = layer.defaultColor;
    }
  }
  return props;
}

export async function emitTemplate(spec, studioRoot, options = {}) {
  const dirName = slugFromFrameId(spec.frameId);
  const templateDir = path.join(studioRoot, 'src', 'templates', dirName);
  const compositionId = compositionIdFromFrameId(spec.frameId);
  const defaultProps = buildDefaultProps(spec);

  await mkdir(path.join(templateDir, 'presets'), {recursive: true});

  const layoutPayload = JSON.stringify(
    {
      family: spec.family,
      card: spec.card,
      layers: spec.layers,
      imageLayers: spec.imageLayers,
    },
    null,
    2,
  );

  const layoutTs = `import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = ${layoutPayload};
`;

  const schemaFields = buildSchemaFields(spec);
  const schemaTs = `import {zColor, zTextarea} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
${schemaFields.join('\n')}
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
`;

  const presetTs = `import React from 'react';
import {GeneratedSoftFloat} from '../../_shared/GeneratedSoftFloat';
import {LAYOUT} from '../layout';
import type {TemplateProps} from '../schema';

export const SoftFloatCard: React.FC<{
  card: TemplateProps;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = ({card, localFrame, segmentFrames, imageSrc}) => (
  <GeneratedSoftFloat
    layout={LAYOUT}
    card={card}
    localFrame={localFrame}
    segmentFrames={segmentFrames}
    imageSrc={imageSrc}
  />
);
`;

  const project = options.project || projectFromFamily(spec.family);

  const meta = {
    id: compositionId,
    project,
    name: `CSS Import — post ${spec.frameId}`,
    description: `Импортировано из Figma CSS (post ${spec.frameId}), family: ${spec.family}`,
    tag: 'Import',
    templateDir: dirName,
    preset: 'soft-float',
    durationFrames: 90,
    imported: true,
    defaultProps,
    propsFields: buildPropsFieldsFromSpec(spec),
  };

  await writeFile(path.join(templateDir, 'layout.ts'), layoutTs);
  await writeFile(path.join(templateDir, 'schema.ts'), schemaTs);
  await writeFile(path.join(templateDir, 'presets', 'soft-float.tsx'), presetTs);
  await writeFile(path.join(templateDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

  return {templateDir, dirName, compositionId, meta};
}
