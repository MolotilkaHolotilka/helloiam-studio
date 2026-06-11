import '../index.css';
import React from 'react';
import {Composition} from 'remotion';
import {GALLERY_COMPOSITIONS} from './composition-manifest';
import {ManualCompositions} from './manual-compositions';

export const GalleryRoot: React.FC = () => {
  return (
    <>
      <ManualCompositions />
      {GALLERY_COMPOSITIONS.map((entry) => (
        <Composition
          key={entry.id}
          id={entry.id}
          component={entry.Component}
          durationInFrames={entry.duration}
          fps={30}
          width={1080}
          height={1350}
          schema={entry.schema}
          defaultProps={entry.defaultProps}
        />
      ))}
    </>
  );
};
