import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import {
  fontFamily as instrumentSerif,
  loadFont as loadInstrumentSerif,
} from '@remotion/google-fonts/InstrumentSerif';

loadInstrumentSans();
loadInstrumentSerif();

const CARD: React.CSSProperties = {
  position: 'relative',
  width: 1080,
  height: 1350,
  overflow: 'hidden',
};

const IMAGE_BOX: React.CSSProperties = {
  position: 'absolute',
  width: 1024,
  height: 829,
  left: 28,
  top: 406,
};

export const POST_126_PLACEHOLDER = staticFile('generated/post-126.png');

export type Post126CardData = {
  title?: string;
  fact?: string;
  quote?: string;
  label?: string;
  image?: string;
  background?: string;
  titleColor?: string;
  quoteColor?: string;
  labelColor?: string;
};

function progress(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function wave(frame: number, duration: number, amplitude: number, phase = 0) {
  const mid = duration / 2;
  return interpolate(frame + phase, [0, mid, duration], [-amplitude, amplitude, -amplitude], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function enterRise(frame: number, delay: number, distance = 22) {
  const p = progress(frame, delay, delay + 16);
  return {
    opacity: p,
    y: interpolate(p, [0, 1], [distance, 0]),
  };
}

function enterSlide(frame: number, delay: number, distance = -24) {
  const p = progress(frame, delay, delay + 18);
  return {
    opacity: p,
    x: interpolate(p, [0, 1], [distance, 0]),
  };
}

function enterScale(frame: number, delay: number, from = 0.96) {
  const p = progress(frame, delay, delay + 20);
  return {
    opacity: p,
    scale: interpolate(p, [0, 1], [from, 1]),
  };
}

function motionStyle(
  enter: {opacity: number; x?: number; y?: number; scale?: number},
  floatY = 0,
): React.CSSProperties {
  const x = enter.x ?? 0;
  const y = (enter.y ?? 0) + floatY;
  const scale = enter.scale ?? 1;
  return {
    opacity: enter.opacity,
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  };
}

export const Post126Card: React.FC<{
  card: Post126CardData;
  localFrame: number;
  segmentFrames: number;
  imageSrc?: string;
}> = ({card, localFrame, segmentFrames, imageSrc = POST_126_PLACEHOLDER}) => {
  const title = card.title ?? 'Hello, WORLD';
  const quote =
    card.fact ?? card.quote ?? 'Armenia welcomed 172,705 international visitors in April 2026';
  const label = card.label ?? 'AM NEWS';
  const background = card.background ?? '#D9DDE0';
  const titleColor = card.titleColor ?? '#0F0F10';
  const quoteColor = card.quoteColor ?? '#D61E23';
  const labelColor = card.labelColor ?? '#4A7BFF';

  const titleEnter = enterSlide(localFrame, 0, -24);
  const quoteEnter = enterRise(localFrame, 6, 20);
  const imageEnter = enterScale(localFrame, 4, 0.96);
  const labelEnter = enterRise(localFrame, 18, 14);

  const titleFloat = wave(localFrame, segmentFrames, 2, 0);
  const quoteFloat = wave(localFrame, segmentFrames, 3, 8);
  const labelFloat = wave(localFrame, segmentFrames, 2, 20);

  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
  };

  return (
    <div style={{...CARD, background}}>
      <div style={{...IMAGE_BOX, ...motionStyle(imageEnter)}}>
        <Img src={imageSrc} style={imageStyle} />
      </div>

      <div
        style={{
          position: 'absolute',
          width: 830,
          height: 212,
          left: 40,
          top: 194,
          fontFamily: instrumentSerif,
          fontStyle: 'normal',
          fontWeight: 400,
          fontSize: 64,
          lineHeight: '56px',
          color: quoteColor,
          ...motionStyle(quoteEnter, quoteFloat),
        }}
      >
        {quote}
      </div>

      <div
        style={{
          position: 'absolute',
          width: 126,
          height: 32,
          left: 40,
          top: 1285,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 26,
          lineHeight: '32px',
          display: 'flex',
          alignItems: 'flex-end',
          textTransform: 'uppercase',
          color: labelColor,
          ...motionStyle(labelEnter, labelFloat),
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: 'absolute',
          width: 332,
          height: 54,
          left: 40,
          top: 40,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 44,
          lineHeight: '54px',
          textTransform: 'uppercase',
          color: titleColor,
          ...motionStyle(titleEnter, titleFloat),
        }}
      >
        {title}
      </div>
    </div>
  );
};
