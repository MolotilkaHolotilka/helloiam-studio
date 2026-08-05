import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#D61E23"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 243, top: 597, width: 595, height: 312},
      alignItems: "flex-start",
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#FFC53A",
      },
      defaultText: "AM\nMEANS",
      defaultColor: "#FFC53A",
    }
  ],
  imageLayers: [

  ],
};
