import '../index.css';
import React from 'react';
import {Composition} from 'remotion';
import {GALLERY_COMPOSITIONS} from './composition-manifest';

type GalleryProps = Record<string, unknown>;
const GalleryComposition = Composition as React.ComponentType<any>;

export const GalleryRoot: React.FC = () => {
  return (
    <>
      {GALLERY_COMPOSITIONS.map((entry) => (
        <GalleryComposition
          key={entry.id}
          id={entry.id}
          component={entry.Component}
          durationInFrames={entry.duration}
          fps={30}
          width={1080}
          height={1350}
          schema={entry.schema}
          defaultProps={entry.defaultProps as GalleryProps}
        />
      ))}
    </>
  );
};
