import React from 'react';
import {GeneratedSoftFloat} from '../../_shared/GeneratedSoftFloat';
import {LAYOUT} from '../layout';
import type {TemplateProps} from '../schema';

export const SoftFloatCard: React.FC<{
  card: TemplateProps;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
  videoSrc?: string;
}> = ({card, localFrame, segmentFrames, imageSrc, videoSrc}) => (
  <GeneratedSoftFloat
    layout={LAYOUT}
    card={card}
    localFrame={localFrame}
    segmentFrames={segmentFrames}
    imageSrc={imageSrc}
    videoSrc={videoSrc}
  />
);
