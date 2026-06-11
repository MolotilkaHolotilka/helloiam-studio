import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import {
  fontFamily as instrumentSerif,
  loadFont as loadInstrumentSerif,
} from '@remotion/google-fonts/InstrumentSerif';
import type {RubricCardSlot} from './types';

loadInstrumentSans();
loadInstrumentSerif();

type CardSlot = RubricCardSlot;

const cardBase: React.CSSProperties = {
  position: 'relative',
  width: 1080,
  height: 1350,
  overflow: 'hidden',
};

const LAYER_IMAGE = 1;
const LAYER_TEXT = 2;
const LAYER_CHROME = 3;

function mediaSource(image?: unknown): string | null {
  if (typeof image !== 'string' || !image) return null;
  if (/^(https?:|data:|file:)/.test(image)) return image;
  if (image.startsWith('/')) return image;
  return staticFile(image.replace(/^public[\\/]/, '').replace(/\\/g, '/'));
}

function isVideoSource(source: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(source);
}

function Media({src, style}: {src: string; style: React.CSSProperties}) {
  if (isVideoSource(src)) {
    return <Video src={src} muted loop style={style} />;
  }
  return <Img src={src} style={style} />;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function motion(localFrame: number, delay = 0, y = 36): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [y, 0])}px)`,
  };
}

function slideX(localFrame: number, delay = 0, x = 40): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `translateX(${interpolate(progress, [0, 1], [x, 0])}px)`,
  };
}

function fadeScale(localFrame: number, delay = 0, from = 0.92): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `scale(${interpolate(progress, [0, 1], [from, 1])})`,
  };
}

function useCardTransition(localFrame: number) {
  return interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function CardHeader({
  title,
  titleAccent,
  titleColor,
  accentColor,
  localFrame,
}: {
  title: string;
  titleAccent: string;
  titleColor: string;
  accentColor: string;
  localFrame: number;
}) {
  const headerLine: React.CSSProperties = {
    fontFamily: instrumentSans,
    fontWeight: 700,
    fontSize: 44,
    lineHeight: '54px',
    textTransform: 'uppercase',
    whiteSpace: 'pre-line',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 40,
        width: 298,
        height: 108,
        zIndex: LAYER_CHROME,
        ...slideX(localFrame, 0, -30),
      }}
    >
      <div style={{...headerLine, color: titleColor, whiteSpace: 'nowrap'}}>
        {title}
      </div>
      {titleAccent ? (
        <div style={{...headerLine, color: accentColor}}>{titleAccent}</div>
      ) : null}
    </div>
  );
}

function CardLabel({
  label,
  labelColor,
  localFrame,
}: {
  label: string;
  labelColor: string;
  localFrame: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 1285,
        width: 248,
        height: 32,
        fontFamily: instrumentSans,
        fontWeight: 700,
        fontSize: 26,
        lineHeight: '32px',
        display: 'flex',
        alignItems: 'flex-end',
        textTransform: 'uppercase',
        color: labelColor,
        zIndex: LAYER_CHROME,
        ...motion(localFrame, 22, 14),
      }}
    >
      {label}
    </div>
  );
}

export function WizzHeadlineCard({
  card,
  localFrame,
  segmentFrames,
}: {
  card: CardSlot;
  localFrame: number;
  segmentFrames: number;
}) {
  const cardOpacity = useCardTransition(localFrame);
  const image = mediaSource(card.image);
  const float = interpolate(localFrame, [0, segmentFrames], [-4, 4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tilt = interpolate(localFrame, [0, segmentFrames], [-0.8, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const title = asText(card.title, 'HELLO,');
  const titleAccent = asText(card.titleAccent, 'I AM');
  const quote = asText(card.quote, '');
  const label = asText(card.label, 'AM NEWS');
  const background = asText(card.background, '#d9dde0');
  const quoteColor = asText(card.quoteColor, '#d61e23');
  const titleColor = asText(card.titleColor, '#0f0f10');
  const accentColor = asText(card.accentColor, '#d61e23');
  const labelColor = asText(card.labelColor, '#000000');
  const imageTop = asNumber(card.imageTop, 406);
  const imageHeight = asNumber(card.imageHeight, 829);

  return (
    <div style={{...cardBase, background, opacity: cardOpacity}}>
      <CardHeader
        title={title}
        titleAccent={titleAccent}
        titleColor={titleColor}
        accentColor={accentColor}
        localFrame={localFrame}
      />

      {image ? (
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: imageTop,
            width: 1024,
            height: imageHeight,
            overflow: 'hidden',
            zIndex: LAYER_IMAGE,
            ...fadeScale(localFrame, 4, 0.94),
          }}
        >
          <Media
            src={image}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transform: `translateY(${float}px) rotate(${tilt}deg)`,
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 194,
          width: 830,
          zIndex: LAYER_TEXT,
          fontFamily: instrumentSerif,
          fontWeight: 400,
          fontSize: 40,
          lineHeight: '48px',
          color: quoteColor,
          whiteSpace: 'pre-line',
          ...motion(localFrame, 8, 24),
        }}
      >
        {quote}
      </div>

      <CardLabel label={label} labelColor={labelColor} localFrame={localFrame} />
    </div>
  );
}

export function WizzBodyCard({
  card,
  localFrame,
  segmentFrames,
}: {
  card: CardSlot;
  localFrame: number;
  segmentFrames: number;
}) {
  const cardOpacity = useCardTransition(localFrame);
  const image = mediaSource(card.image);
  const float = interpolate(localFrame, [0, segmentFrames], [-4, 4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tilt = interpolate(localFrame, [0, segmentFrames], [-0.8, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const title = asText(card.title, 'HELLO,');
  const titleAccent = asText(card.titleAccent, 'I AM');
  const body = asText(card.body, asText(card.quote, ''));
  const label = asText(card.label, 'AM NEWS');
  const background = asText(card.background, '#d9dde0');
  const bodyColor = asText(card.bodyColor, '#0f0f10');
  const titleColor = asText(card.titleColor, '#0f0f10');
  const accentColor = asText(card.accentColor, '#d61e23');
  const labelColor = asText(card.labelColor, '#000000');
  const imageHeight = asNumber(card.imageHeight, 556);
  const imageFocus = asText(card.imageFocus, '50% 30%');
  const imageScale = asNumber(card.imageScale, 1.12);

  return (
    <div style={{...cardBase, background, opacity: cardOpacity}}>
      <CardHeader
        title={title}
        titleAccent={titleAccent}
        titleColor={titleColor}
        accentColor={accentColor}
        localFrame={localFrame}
      />

      {image ? (
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 201,
            width: 1000,
            height: imageHeight,
            overflow: 'hidden',
            zIndex: LAYER_IMAGE,
            ...fadeScale(localFrame, 4, 0.94),
          }}
        >
          <Media
            src={image}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: imageFocus,
              transform: `scale(${imageScale}) translateY(${float}px) rotate(${tilt}deg)`,
              transformOrigin: 'center top',
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 809,
          width: 830,
          zIndex: LAYER_TEXT,
          fontFamily: instrumentSans,
          fontWeight: 400,
          fontSize: 26,
          lineHeight: '36px',
          color: bodyColor,
          whiteSpace: 'pre-line',
          ...motion(localFrame, 14, 24),
        }}
      >
        {body}
      </div>

      <CardLabel label={label} labelColor={labelColor} localFrame={localFrame} />
    </div>
  );
}

export function pickWizzCard(card: CardSlot) {
  if (card.cardLayout === 'body-below') return WizzBodyCard;
  return WizzHeadlineCard;
}

type TemplateRenderProps = {
  card1?: CardSlot;
  card2?: CardSlot;
  card3?: CardSlot;
  workflow?: {cardCount?: number; durationPerCardFrames?: number};
};

function cardSlots(props: TemplateRenderProps): CardSlot[] {
  const slots = [props.card1, props.card2, props.card3];
  const requested = props.workflow?.cardCount || slots.filter(Boolean).length || 3;
  return slots.slice(0, requested).map((card) => card || {});
}

export const WizzLondonYerevanTemplate: React.FC<TemplateRenderProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const cards = cardSlots(props);
  const cardCount = cards.length;
  const durationPerCardFromWorkflow = Number(props.workflow?.durationPerCardFrames);
  const segmentFrames =
    Number.isFinite(durationPerCardFromWorkflow) && durationPerCardFromWorkflow > 0
      ? durationPerCardFromWorkflow
      : Math.max(1, Math.floor(durationInFrames / cardCount));
  const activeIndex = Math.min(cardCount - 1, Math.floor(frame / segmentFrames));
  const localFrame = frame - activeIndex * segmentFrames;
  const activeCard = cards[activeIndex] || {};
  const ActiveCard = pickWizzCard(activeCard);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        background: '#f0f0f0',
        justifyContent: 'center',
      }}
    >
      <ActiveCard
        card={activeCard}
        localFrame={localFrame}
        segmentFrames={segmentFrames}
      />
    </AbsoluteFill>
  );
};

export const Template = WizzLondonYerevanTemplate;
