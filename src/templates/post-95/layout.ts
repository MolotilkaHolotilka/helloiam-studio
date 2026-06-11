import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "generic",
  card: {width: 1080, height: 1350, background: "#000000"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 272, top: 285, width: 536, height: 468},
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        textAlign: "center",
        color: "#FFFFFF",
      },
      defaultText: "HELLO\nI AM\nAM",
      defaultColor: "#FFFFFF",
    }
  ],
  imageLayers: [
    {left: -804, top: -150, width: 2688, height: 1500, opacity: 0.6, objectFit: "cover"}
  ],
};
