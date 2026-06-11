import {zColor, zTextarea} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  title: z.string(),
  quote: zTextarea(),
  label: z.string(),
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
  titleColor: zColor(),
  quoteColor: zColor(),
  labelColor: zColor(),
});

export type Post126Props = z.infer<typeof schema>;
export type TemplateProps = Post126Props;

export const post126Schema = schema;
export const DURATION = 90;
export const POST_126_DURATION = DURATION;
