import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#000000"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 161, top: 597, width: 758, height: 468},
      alignItems: "flex-end",
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#FFC53A",
      },
      defaultText: "AM\nMEANS\nARMENIA",
      defaultColor: "#FFC53A",
    }
  ],
  imageLayers: [
    {left: -670, top: 0, width: 2419, height: 1350, objectFit: "cover"}
  ],
};
