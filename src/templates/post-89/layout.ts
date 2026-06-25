import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "intro-hero",
  card: {width: 1080, height: 1350, background: "#000000"},
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
        color: "#FFC53A",
      },
      defaultText: "HELLO\nI AM\nAM\nMEANS\nARMENIA",
      defaultColor: "#FFC53A",
    }
  ],
  imageLayers: [
    {left: -448, top: -313, width: 1977, height: 1977, objectFit: "cover"}
  ],
};
