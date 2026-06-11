import {zColor, zTextarea} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  title: zTextarea(),
  label: z.string(),
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
  titleColor: zColor(),
  labelColor: zColor(),
});

export type Post58Props = z.infer<typeof schema>;
export type TemplateProps = Post58Props;

export const post58Schema = schema;
export const DURATION = 90;
export const POST_58_DURATION = DURATION;
