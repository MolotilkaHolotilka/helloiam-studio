export type LayoutBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LayoutTextStyle = {
  fontFamily: 'sans' | 'serif';
  fontSize: number;
  lineHeight: string;
  fontWeight: number;
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'uppercase' | 'none';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
};

export type LayoutLayer = {
  key: string;
  role: 'title' | 'quote' | 'label' | 'text' | 'image';
  box: LayoutBox;
  textStyle?: LayoutTextStyle;
  defaultText?: string;
  defaultColor?: string;
  imageIndex?: number;
};

export type LayoutSpec = {
  family: 'news-126' | 'intro-hero' | 'generic';
  card: {width: number; height: number; background: string};
  layers: LayoutLayer[];
  imageLayers: LayoutBox[];
};
