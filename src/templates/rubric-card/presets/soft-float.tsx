import React from 'react';
import {RubricSingleCard} from '../../_rubric/single-card';
import type {TemplateProps} from '../schema';

export const SoftFloatCard: React.FC<{
  card: TemplateProps;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = ({card, localFrame, segmentFrames, imageSrc}) => (
  <RubricSingleCard
    card={card as TemplateProps & {engine: 'green-plate' | 'armenian-food' | 'wizz'}}
    localFrame={localFrame}
    segmentFrames={segmentFrames}
    imageSrc={imageSrc}
  />
);
