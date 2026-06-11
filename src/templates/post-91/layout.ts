import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "intro-hero",
  card: {width: 1080, height: 1350, background: "#0F0F10"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 161, top: 285, width: 758, height: 780},
      alignItems: "center",
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#FFFFFF",
      },
      defaultText: "HELLO\nI AM\nAM\nMEANS\nARMENIA",
      defaultColor: "#FFFFFF",
    }
  ],
  imageLayers: [
    {left: -448, top: -470, width: 1977, height: 1977, objectFit: "cover"}
  ],
};
