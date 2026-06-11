import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#000000"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 161, top: 285, width: 758, height: 780},
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#D61E23",
      },
      defaultText: "HELLO\nI AM\nAM\nMEANS\nARMENIA",
      defaultColor: "#D61E23",
    }
  ],
  imageLayers: [
    {left: 0, top: 0, width: 1350, height: 1350, objectFit: "cover"}
  ],
};
