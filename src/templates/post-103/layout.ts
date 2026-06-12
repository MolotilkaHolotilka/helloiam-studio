import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#D9DDE0"},
  layers: [
    {
      key: "body2",
      role: "text",
      box: {left: 197, top: 586, width: 687, height: 92},
      textStyle: {
        fontFamily: "sans",
        fontSize: 96,
        lineHeight: "92px",
        fontWeight: 700,
        fontStyle: "normal",
        textAlign: "center",
        color: "#420000",
      },
      defaultText: "helloiam am",
      defaultColor: "#420000",
    },
    {
      key: "body4",
      role: "text",
      box: {left: 525, top: 719, width: 288, height: 88},
      textStyle: {
        fontFamily: "serif",
        fontSize: 44,
        lineHeight: "44px",
        fontWeight: 400,
        fontStyle: "italic",
        textAlign: "center",
        color: "#420000",
      },
      defaultText: "Say Hello\nto Armenian Wine",
      defaultColor: "#420000",
    }
  ],
  imageLayers: [
    {left: 579, top: 542, width: 180, height: 180, objectFit: "cover"}
  ],
};
