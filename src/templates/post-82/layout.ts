import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#D9DDE0"},
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
        color: "#4A7BFF",
      },
      defaultText: "HELLO\nI AM\nAM\nMEANS\nARMENIA",
      defaultColor: "#4A7BFF",
    }
  ],
  imageLayers: [

  ],
};
