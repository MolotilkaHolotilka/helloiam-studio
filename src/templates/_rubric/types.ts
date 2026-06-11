export type RubricCardSlot = {
  title?: string;
  titleAccent?: string;
  quote?: string;
  body?: string;
  text?: string;
  subtitle?: string;
  label?: string;
  brandLeft?: string;
  brandRight?: string;
  counter?: string;
  image?: string;
  backgroundImage?: string;
  background?: string;
  titleColor?: string;
  accentColor?: string;
  quoteColor?: string;
  bodyColor?: string;
  labelColor?: string;
  brandColor?: string;
  introLayout?: string;
  cardLayout?: string;
  imageTop?: number | string;
  imageHeight?: number | string;
  imageFocus?: string;
  imageScale?: number | string;
};

export type RubricEngine = 'green-plate' | 'armenian-food' | 'wizz';

export type RubricCardProps = RubricCardSlot & {
  engine: RubricEngine;
  cardKind: string;
  cardIndex?: number;
  cardCount?: number;
};
