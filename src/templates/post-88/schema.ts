import {zColor} from '@remotion/zod-types';
import {z} from 'zod';

export const schema = z.object({
  title: z.string(),
  titleColor: zColor(),
  background: zColor(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 90;
