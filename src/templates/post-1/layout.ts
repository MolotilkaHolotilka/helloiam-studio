import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  "family": "intro-hero",
  "card": {
    "width": 1080,
    "height": 1350,
    "background": "#D9DDE0"
  },
  "layers": [
    {
      "key": "body",
      "role": "text",
      "box": {
        "left": 0,
        "top": 0,
        "width": 1080,
        "height": 1350
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 26,
        "lineHeight": "23px",
        "fontWeight": 400,
        "fontStyle": "normal",
        "textTransform": "none",
        "textAlign": "left"
      },
      "defaultText": "Zadolbalo Shablon"
    },
    {
      "key": "title",
      "role": "title",
      "box": {
        "left": 161,
        "top": 285,
        "width": 758,
        "height": 780
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 164,
        "lineHeight": "156px",
        "fontWeight": 700,
        "fontStyle": "normal",
        "textTransform": "uppercase",
        "textAlign": "center",
        "color": "#FFFFFF"
      },
      "defaultText": "HELLO\nI AM\nAM\nMEANS\nARMENIA",
      "defaultColor": "#FFFFFF"
    }
  ],
  "imageLayers": [
    {
      "left": -448,
      "top": -470,
      "width": 1977,
      "height": 1977
    }
  ]
};
