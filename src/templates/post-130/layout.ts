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
        "top": 809,
        "width": 830,
        "height": 440
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 26,
        "lineHeight": "32px",
        "fontWeight": 400,
        "fontStyle": "normal",
        "textTransform": "none",
        "color": "#0F0F10"
      },
      "defaultText": "Travel platforms and international media increasingly describe Armenia as Europe’s next rising tourism star. Visitors are drawn by the country’s mix of ancient history, dramatic landscapes, Soviet-modernist aesthetics and famously overwhelming hospitality. Unfortunately for tourists, “light local dinner” in Armenia still translates to approximately 14 dishes, emotional toasts and a grandmother personally monitoring whether you finished your food.",
      "defaultColor": "#0F0F10"
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
        "color": "#0F0F10"
      },
      "defaultText": "Hello, WORLD",
      "defaultColor": "#0F0F10"
    },
    {
      "key": "source",
      "role": "text",
      "box": {
        "left": 959,
        "top": 1270,
        "width": 93,
        "height": 40
      },
      "textStyle": {
        "fontFamily": "sans",
        "fontSize": 16,
        "lineHeight": "20px",
        "fontWeight": 400,
        "fontStyle": "normal",
        "textTransform": "none",
        "textAlign": "right",
        "color": "#000000"
      },
      "defaultText": "source: armradio.am",
      "defaultColor": "#000000"
    }
  ],
  "imageLayers": [
    {
      "left": 40,
      "top": 201,
      "width": 1000,
      "height": 556
    }
  ]
};
