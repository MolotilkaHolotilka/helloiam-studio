import {zColor} from '@remotion/zod-types';
import {z} from 'zod';
import {STUDIO_IMAGE_OPTIONS} from '../../lib/asset-options';

const optionalImage = z.enum(STUDIO_IMAGE_OPTIONS).optional();

export const schema = z.object({
  engine: z.enum(['green-plate', 'armenian-food', 'wizz']),
  cardKind: z.string(),
  cardIndex: z.number().optional(),
  cardCount: z.number().optional(),
  title: z.string().optional(),
  titleAccent: z.string().optional(),
  item: z.string().optional(),
  fact: z.string().optional(),
  quote: z.string().optional(),
  body: z.string().optional(),
  text: z.string().optional(),
  subtitle: z.string().optional(),
  label: z.string().optional(),
  brandLeft: z.string().optional(),
  brandRight: z.string().optional(),
  counter: z.string().optional(),
  image: optionalImage,
  backgroundImage: optionalImage,
  background: zColor().optional(),
  titleColor: zColor().optional(),
  accentColor: zColor().optional(),
  quoteColor: zColor().optional(),
  factColor: zColor().optional(),
  schemeSecondColor: zColor().optional(),
  bodyColor: zColor().optional(),
  labelColor: zColor().optional(),
  brandColor: zColor().optional(),
  introLayout: z.string().optional(),
  cardLayout: z.string().optional(),
  imageTop: z.union([z.number(), z.string()]).optional(),
  imageHeight: z.union([z.number(), z.string()]).optional(),
  imageFocus: z.string().optional(),
  imageScale: z.union([z.number(), z.string()]).optional(),
});

export type TemplateProps = z.infer<typeof schema>;
export const DURATION = 210;
