import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

export const schema = z.object({
  image: z.enum(STUDIO_IMAGE_OPTIONS),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
