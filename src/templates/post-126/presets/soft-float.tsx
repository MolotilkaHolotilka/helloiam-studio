import React from 'react';
import {Post126Card} from '../Post126Card';
import type {Post126Props} from '../schema';

export const SoftFloatCard: React.FC<{
  card: Post126Props;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = (props) => <Post126Card {...props} />;
