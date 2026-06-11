import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  "family": "news-126",
  "card": {
    "width": 1080,
    "height": 1350,
    "background": "#D9DDE0"
  },
  "layers": [
    {
      "key": "quote",
      "role": "quote",
      "box": {
        "left": 40,
        "top": 194,
        "width": 830,
        "height": 212
      },
      "textStyle": {
        "fontFamily": "serif",
        "fontSize": 64,
        "lineHeight": "56px",
        "fontWeight": 400,
        "fontStyle": "normal",
        "textTransform": "none",
        "textAlign": "left",
        "color": "#D61E23"
      },
      "defaultText": "Armenia welcomed 172,705 international visitors in April 2026",
      "defaultColor": "#D61E23"
    },
    {
      "key": "label",
      "role": "label",
      "box": {
        "left": 40,
        "top": 1285,
        "width": 126,
        "height": 32
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 26,
        "lineHeight": "32px",
        "fontWeight": 700,
        "fontStyle": "normal",
        "textTransform": "uppercase",
        "textAlign": "left",
        "color": "#4A7BFF"
      },
      "defaultText": "AM NEWS",
      "defaultColor": "#4A7BFF"
    },
    {
      "key": "title",
      "role": "title",
      "box": {
        "left": 40,
        "top": 40,
        "width": 332,
        "height": 54
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 44,
        "lineHeight": "54px",
        "fontWeight": 700,
        "fontStyle": "normal",
        "textTransform": "uppercase",
        "textAlign": "left",
        "color": "#0F0F10"
      },
      "defaultText": "Hello, WORLD",
      "defaultColor": "#0F0F10"
    }
  ],
  "imageLayers": [
    {
      "left": 28,
      "top": 406,
      "width": 1024,
      "height": 829
    },
    {
      "left": 28,
      "top": 406,
      "width": 1024,
      "height": 829
    }
  ]
};
