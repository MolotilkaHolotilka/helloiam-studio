import React from 'react';
import {Img, interpolate} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import {
  fontFamily as instrumentSerif,
  loadFont as loadInstrumentSerif,
} from '@remotion/google-fonts/InstrumentSerif';
import type {LayoutLayer, LayoutSpec} from './layout-types';

loadInstrumentSans();
loadInstrumentSerif();

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

function resolveFontFamily(style: LayoutLayer['textStyle'], layerRole: string) {
  const family = style?.fontFamily ?? (layerRole === 'quote' ? 'serif' : 'sans');
  return family === 'serif' ? instrumentSerif : instrumentSans;
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

export const GeneratedSoftFloat: React.FC<{
  layout: LayoutSpec;
  card: Record<string, string | undefined>;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = ({layout, card, localFrame, segmentFrames, imageSrc}) => {
  const background = card.background ?? layout.card.background;

  const imageEnter = progress(localFrame, 4, 22);
  const imageScale = interpolate(localFrame, [0, segmentFrames], [1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const imageFloatY = wave(localFrame, segmentFrames, layout.family === 'intro-hero' ? 6 : 8, 0);

  return (
    <div
      style={{
        position: 'relative',
        width: layout.card.width,
        height: layout.card.height,
        overflow: 'hidden',
        background,
      }}
    >
      {layout.imageLayers.map((box, index) => {
        const phase = index * 12;
        const floatY = wave(localFrame, segmentFrames, 8, phase);
        const tilt = wave(localFrame, segmentFrames, 1.2, phase + 6);
        return (
          <div
            key={`img-${index}`}
            style={{
              position: 'absolute',
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              overflow: 'hidden',
              opacity: imageEnter,
              transform:
                layout.family === 'intro-hero'
                  ? `translateY(${imageFloatY}px) scale(${imageScale})`
                  : `translateY(${floatY}px) rotate(${index % 2 === 0 ? tilt : -tilt}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <Img
              src={imageSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: layout.family === 'intro-hero' ? 'center center' : 'center top',
              }}
            />
          </div>
        );
      })}

      {layout.layers.map((layer, index) => {
        if (layer.role === 'image') return null;

        const propKey = layer.key;
        const text = card[propKey] ?? layer.defaultText ?? '';
        const color =
          card[`${propKey}Color`] ??
          card[`${layer.role}Color`] ??
          layer.defaultColor ??
          layer.textStyle?.color ??
          '#0F0F10';

        const delay = 6 + index * 4;
        const enterOpacity = progress(localFrame, delay, delay + 16);
        const enterY = interpolate(enterOpacity, [0, 1], [18, 0]);
        const enterX = interpolate(progress(localFrame, delay, delay + 18), [0, 1], [-24, 0]);
        const floatY = wave(localFrame, segmentFrames, 2, index * 8);

        const useSlide = layer.role === 'title' && layout.family !== 'generic';
        const motion = motionStyle(
          {
            opacity: enterOpacity,
            x: useSlide ? enterX : 0,
            y: useSlide ? 0 : enterY,
          },
          floatY,
        );

        const style = layer.textStyle;

        return (
          <div
            key={layer.key}
            style={{
              position: 'absolute',
              left: layer.box.left,
              top: layer.box.top,
              width: layer.box.width,
              height: layer.box.height,
              fontFamily: resolveFontFamily(style, layer.role),
              fontWeight: style?.fontWeight ?? 400,
              fontSize: style?.fontSize ?? 26,
              lineHeight: style?.lineHeight ?? '32px',
              fontStyle: style?.fontStyle ?? 'normal',
              textTransform:
                style?.textTransform ??
                (layer.role === 'title' && layout.family === 'intro-hero' ? 'uppercase' : 'none'),
              textAlign: style?.textAlign ?? 'left',
              whiteSpace: 'pre-line',
              color,
              display: layer.role === 'label' ? 'flex' : undefined,
              alignItems: layer.role === 'label' ? 'flex-end' : undefined,
              ...motion,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
};
