import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#FFC53A"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 272, top: 285, width: 536, height: 312},
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#0F0F10",
      },
      defaultText: "HELLO\nI AM",
      defaultColor: "#0F0F10",
    }
  ],
  imageLayers: [

  ],
};
