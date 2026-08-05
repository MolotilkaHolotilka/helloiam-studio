import React from 'react';
import {Img, Video, interpolate} from 'remotion';
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

function titleStackLines(text: string): string[] {
  if (text.includes('\n')) return text.split('\n');
  return [text];
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

function parseTitleLineColors(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

export const GeneratedSoftFloat: React.FC<{
  layout: LayoutSpec;
  card: Record<string, string | undefined> & {
    __staticStill?: boolean | string;
    __textOverlayOnly?: boolean | string;
  };
  localFrame: number;
  segmentFrames: number;
  imageSrc?: string;
  videoSrc?: string;
}> = ({layout, card, localFrame, segmentFrames, imageSrc, videoSrc}) => {
  const background = card.background ?? layout.card.background;
  const staticStill = card.__staticStill === true || card.__staticStill === 'true';
  const textOverlayOnly = card.__textOverlayOnly === true || card.__textOverlayOnly === 'true';

  if (layout.family === 'brand-row') {
    const brandLeft = card.brandLeft ?? 'helloiam';
    const brandRight = card.brandRight ?? 'am';
    const brandColor = card.brandColor ?? '#0F0F10';
    const rowEnter = staticStill ? 1 : progress(localFrame, 6, 22);
    const floatY = staticStill ? 0 : wave(localFrame, segmentFrames, 3, 0);
    return (
      <div
        style={{
          position: 'relative',
          width: layout.card.width,
          height: layout.card.height,
          overflow: 'hidden',
          background: textOverlayOnly ? 'transparent' : background,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 588,
            left: 0,
            width: layout.card.width,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            fontFamily: instrumentSans,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 0.958,
            color: brandColor,
            opacity: rowEnter,
            transform: `translateY(${floatY}px)`,
          }}
        >
          <span>{brandLeft}</span>
          {imageSrc ? (
            <Img
              src={imageSrc}
              style={{width: 180, height: 180, objectFit: 'contain'}}
            />
          ) : null}
          <span>{brandRight}</span>
        </div>
      </div>
    );
  }

  const imageEnter = staticStill ? 1 : progress(localFrame, 4, 22);
  const imageScale = staticStill ? 1 : interpolate(localFrame, [0, segmentFrames], [1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const imageFloatY = staticStill ? 0 : wave(localFrame, segmentFrames, layout.family === 'intro-hero' ? 6 : 8, 0);

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
      {!textOverlayOnly && (videoSrc || imageSrc) && layout.imageLayers.map((box, index) => {
        const stillSrc = imageSrc ?? '';
        const phase = index * 12;
        const floatY = staticStill ? 0 : wave(localFrame, segmentFrames, 8, phase);
        const tilt = staticStill ? 0 : wave(localFrame, segmentFrames, 1.2, phase + 6);
        const isIntroHero = layout.family === 'intro-hero';
        const isNews126 = layout.family === 'news-126';
        const objectFit = box.objectFit ?? (isIntroHero ? 'contain' : 'cover');
        const baseOpacity = box.opacity ?? 1;
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
              opacity: baseOpacity * imageEnter,
              transform: isIntroHero
                ? `translateY(${imageFloatY}px)`
                : isNews126
                  ? undefined
                  : `translateY(${floatY}px) rotate(${index % 2 === 0 ? tilt : -tilt}deg)`,
            }}
          >
            {videoSrc ? (
              <Video
                src={videoSrc}
                muted
                loop
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit,
                  objectPosition: objectFit === 'contain' ? 'center center' : 'center top',
                  transform: isIntroHero ? `scale(${imageScale})` : undefined,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <Img
                src={stillSrc}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit,
                  objectPosition: objectFit === 'contain' ? 'center center' : 'center top',
                  transform: isIntroHero ? `scale(${imageScale})` : undefined,
                  transformOrigin: 'center center',
                }}
              />
            )}
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
        const enterOpacity = staticStill ? 1 : progress(localFrame, delay, delay + 16);
        const enterY = staticStill ? 0 : interpolate(enterOpacity, [0, 1], [18, 0]);
        const enterX = staticStill ? 0 : interpolate(progress(localFrame, delay, delay + 18), [0, 1], [-24, 0]);
        const floatY = staticStill ? 0 : wave(localFrame, segmentFrames, 2, index * 8);

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

        const hasTitleAccent = Boolean((card.item ?? card.titleAccent)?.trim());
        const isIntroTitleSplit =
          layout.family === 'intro-hero' && layer.key === 'title' && hasTitleAccent;
        const isTitleStack =
          layer.role === 'title' &&
          (layer.alignItems === 'center' || layer.alignItems === 'flex-end');
        const titleAccent = (card.item ?? card.titleAccent) ?? '';
        const accentColor = card.accentColor ?? card.titleAccentColor ?? '#D61E23';
        // Per-line colors: "titleLineColors" is a comma-separated list of hex values
        const titleLineColors = isTitleStack
          ? parseTitleLineColors(card.titleLineColors)
          : null;

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
              whiteSpace: isTitleStack ? undefined : 'pre-line',
              color: isIntroTitleSplit ? undefined : color,
              display: isTitleStack || layer.role === 'label' ? 'flex' : undefined,
              flexDirection: isTitleStack || isIntroTitleSplit ? 'column' : undefined,
              justifyContent: isTitleStack
                ? layer.alignItems === 'flex-end'
                  ? 'flex-end'
                  : 'center'
                : undefined,
              alignItems: isTitleStack
                ? 'center'
                : layer.alignItems ?? (layer.role === 'label' ? 'flex-end' : undefined),
              ...motion,
            }}
          >
            {isIntroTitleSplit ? (
              <>
                <div style={{color}}>{text}</div>
                <div style={{color: accentColor}}>{titleAccent}</div>
              </>
            ) : isTitleStack ? (
              titleStackLines(text).map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  style={{
                    whiteSpace: 'nowrap',
                    color: titleLineColors?.[lineIndex] ?? color,
                  }}
                >
                  {line}
                </div>
              ))
            ) : (
              text
            )}
          </div>
        );
      })}
    </div>
  );
};
