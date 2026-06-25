import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: 'news-126',
  card: {width: 1080, height: 1350, background: '#D9DDE0'},
  layers: [
    {
      key: 'quote',
      role: 'quote',
      box: {left: 40, top: 809, width: 830, height: 427},
      textStyle: {
        fontFamily: 'sans',
        fontSize: 26,
        lineHeight: '32px',
        fontWeight: 400,
        color: '#0F0F10',
      },
      defaultText:
        'Tourism growth in 2026 signals a major shift in how Armenia is perceived internationally. What was once considered a niche destination for adventurous travelers is quickly becoming part of mainstream European travel culture. Locals, however, remain deeply suspicious of anyone calling the country a "secret spot" while simultaneously posting 47 Instagram stories about it.',
      defaultColor: '#0F0F10',
    },
    {
      key: 'label',
      role: 'label',
      box: {left: 40, top: 1285, width: 126, height: 32},
      textStyle: {
        fontFamily: 'sans',
        fontSize: 26,
        lineHeight: '32px',
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#4A7BFF',
      },
      defaultText: 'AM NEWS',
      defaultColor: '#4A7BFF',
    },
    {
      key: 'title',
      role: 'title',
      box: {left: 40, top: 40, width: 332, height: 54},
      textStyle: {
        fontFamily: 'sans',
        fontSize: 44,
        lineHeight: '54px',
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#0F0F10',
      },
      defaultText: 'Hello, WORLD',
      defaultColor: '#0F0F10',
    },
    {
      key: 'source',
      role: 'text',
      box: {left: 959, top: 1270, width: 93, height: 40},
      textStyle: {
        fontFamily: 'sans',
        fontSize: 16,
        lineHeight: '20px',
        fontWeight: 400,
        textAlign: 'right',
        color: '#000000',
      },
      defaultText: 'source: armradio.am',
      defaultColor: '#000000',
    },
  ],
  imageLayers: [{left: 40, top: 201, width: 1000, height: 543}],
};
