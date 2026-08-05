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
import type {Post126CardData} from './Post126Card';

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

const PLACEHOLDER = staticFile('generated/post-126.png');

function clamped(frame: number, input: number[], output: number[]) {
  return interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function enterFly(
  frame: number,
  delay: number,
  axis: 'x' | 'y',
  from: number,
  duration = 22,
) {
  const p = clamped(frame, [delay, delay + duration], [0, 1]);
  const offset = interpolate(p, [0, 1], [from, 0]);
  return {
    opacity: p,
    x: axis === 'x' ? offset : 0,
    y: axis === 'y' ? offset : 0,
  };
}

function drift(frame: number, duration: number, amplitude: number, phase: number, axis: 'x' | 'y') {
  const mid = duration / 2;
  const value = clamped(frame + phase, [0, mid, duration], [-amplitude, amplitude, -amplitude]);
  return axis === 'x' ? {x: value, y: 0} : {x: 0, y: value};
}

function motionStyle(
  enter: {opacity: number; x?: number; y?: number; scale?: number},
  driftX = 0,
  driftY = 0,
): React.CSSProperties {
  const x = (enter.x ?? 0) + driftX;
  const y = (enter.y ?? 0) + driftY;
  const scale = enter.scale ?? 1;
  return {
    opacity: enter.opacity,
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  };
}

export const Post126CardSlideFly: React.FC<{
  card: Post126CardData;
  localFrame: number;
  segmentFrames: number;
  imageSrc?: string;
}> = ({card, localFrame, segmentFrames, imageSrc = PLACEHOLDER}) => {
  const title = card.title ?? 'Hello, WORLD';
  const quote =
    card.quote ?? 'Armenia welcomed 172,705 international visitors in April 2026';
  const label = card.label ?? 'AM NEWS';
  const background = card.background ?? '#D9DDE0';
  const titleColor = card.titleColor ?? '#0F0F10';
  const quoteColor = card.quoteColor ?? '#D61E23';
  const labelColor = card.labelColor ?? '#4A7BFF';

  const titleEnter = enterFly(localFrame, 0, 'x', -96);
  const quoteEnter = enterFly(localFrame, 8, 'x', 72);
  const imageEnter = {
    opacity: clamped(localFrame, [4, 24], [0, 1]),
    x: 0,
    y: interpolate(clamped(localFrame, [4, 24], [0, 1]), [0, 1], [140, 0]),
    scale: interpolate(clamped(localFrame, [4, 24], [0, 1]), [0, 1], [0.88, 1]),
  };
  const labelEnter = enterFly(localFrame, 16, 'y', 48);

  const titleDrift = drift(localFrame, segmentFrames, 6, 0, 'x');
  const quoteDrift = drift(localFrame, segmentFrames, 5, 10, 'x');
  const labelDrift = drift(localFrame, segmentFrames, 4, 18, 'y');
  const imageDrift = drift(localFrame, segmentFrames, 12, 0, 'y');

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
      <div style={{...IMAGE_BOX, ...motionStyle(imageEnter, 0, imageDrift.y)}}>
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
          ...motionStyle(quoteEnter, quoteDrift.x, quoteDrift.y),
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
          ...motionStyle(labelEnter, labelDrift.x, labelDrift.y),
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
          ...motionStyle(titleEnter, titleDrift.x, titleDrift.y),
        }}
      >
        {title}
      </div>
    </div>
  );
};
