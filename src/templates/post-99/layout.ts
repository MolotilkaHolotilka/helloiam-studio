import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#D79689"},
  layers: [
    {
      key: "body2",
      role: "text",
      box: {left: 196, top: 632, width: 687, height: 92},
      textStyle: {
        fontFamily: "sans",
        fontSize: 96,
        lineHeight: "92px",
        fontWeight: 700,
        fontStyle: "normal",
        textAlign: "center",
        color: "#0F0F10",
      },
      defaultText: "helloiam am",
      defaultColor: "#0F0F10",
    }
  ],
  imageLayers: [
    {left: 578, top: 588, width: 180, height: 180, objectFit: "cover"}
  ],
};
