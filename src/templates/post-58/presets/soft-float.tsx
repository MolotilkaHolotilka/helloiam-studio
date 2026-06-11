import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import type {Post58Props} from '../schema';
import {POST_58_LAYOUT} from '../layout';

loadInstrumentSans();

const PLACEHOLDER = staticFile('generated/post-126.png');

export type Post58CardData = Post58Props;

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

export const SoftFloatCard: React.FC<{
  card: Post58CardData;
  localFrame: number;
  segmentFrames: number;
  imageSrc?: string;
}> = ({card, localFrame, segmentFrames, imageSrc = PLACEHOLDER}) => {
  const title = card.title ?? 'Hello, I Am\nLAVASH';
  const label = card.label ?? 'AM FOOD';
  const background = card.background ?? POST_58_LAYOUT.card.background;
  const titleColor = card.titleColor ?? '#0F0F10';
  const labelColor = card.labelColor ?? '#000000';

  const imageScale = interpolate(localFrame, [0, segmentFrames], [1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const imageFloatY = wave(localFrame, segmentFrames, 6, 0);
  const titleSlide = progress(localFrame, 0, 18);
  const titleX = interpolate(titleSlide, [0, 1], [-48, 0]);
  const titleOpacity = titleSlide;
  const labelRise = progress(localFrame, 14, 30);
  const labelY = interpolate(labelRise, [0, 1], [18, 0]);
  const labelOpacity = labelRise;
  const imageEnter = progress(localFrame, 4, 22);

  const {image, title: titleBox, label: labelBox, titleStyle, labelStyle} = POST_58_LAYOUT;

  return (
    <div
      style={{
        position: 'relative',
        width: POST_58_LAYOUT.card.width,
        height: POST_58_LAYOUT.card.height,
        overflow: 'hidden',
        background,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: image.left,
          top: image.top,
          width: image.width,
          height: image.height,
          opacity: imageEnter,
          transform: `translateY(${imageFloatY}px)`,
        }}
      >
        <Img
          src={imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            transform: `scale(${imageScale})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: titleBox.left,
          top: titleBox.top,
          width: titleBox.width,
          height: titleBox.height,
          fontFamily: instrumentSans,
          fontWeight: titleStyle.fontWeight,
          fontSize: titleStyle.fontSize,
          lineHeight: titleStyle.lineHeight,
          textTransform: 'uppercase',
          whiteSpace: 'pre-line',
          color: titleColor,
          opacity: titleOpacity,
          transform: `translateX(${titleX}px)`,
        }}
      >
        {title}
      </div>

      <div
        style={{
          position: 'absolute',
          left: labelBox.left,
          top: labelBox.top,
          width: labelBox.width,
          height: labelBox.height,
          fontFamily: instrumentSans,
          fontWeight: labelStyle.fontWeight,
          fontSize: labelStyle.fontSize,
          lineHeight: labelStyle.lineHeight,
          display: 'flex',
          alignItems: 'flex-end',
          textTransform: 'uppercase',
          color: labelColor,
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
        }}
      >
        {label}
      </div>
    </div>
  );
};
