import type {LayoutSpec} from '../_shared/layout-types';

export const LAYOUT: LayoutSpec = {
  family: "intro-hero",
  card: {width: 1080, height: 1350, background: "#D61E23"},
  layers: [
    {
      key: "title",
      role: "title",
      box: {left: 40, top: 40, width: 605, height: 624},
      textStyle: {
        fontFamily: "sans",
        fontSize: 164,
        lineHeight: "156px",
        fontWeight: 700,
        textTransform: "uppercase",
        color: "#FFFFFF",
      },
      defaultText: "HELLO,\nI AM\nGREEN\nPLATE",
      defaultColor: "#FFFFFF",
    },
    {
      key: "label",
      role: "label",
      box: {left: 40, top: 1285, width: 124, height: 32},
      alignItems: "flex-end",
      textStyle: {
        fontFamily: "sans",
        fontSize: 26,
        lineHeight: "32px",
        fontWeight: 700,
        textTransform: "uppercase",
        color: "#000000",
      },
      defaultText: "AM FOOD",
      defaultColor: "#000000",
    }
  ],
  imageLayers: [
    {left: -269, top: 0, width: 1698, height: 1698, objectFit: "cover"}
  ],
};
