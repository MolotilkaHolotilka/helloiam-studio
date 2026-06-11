import React from 'react';
import {AbsoluteFill, Composition, staticFile, useCurrentFrame} from 'remotion';
import {Post126CardSlideFly} from '../templates/post-126/Post126CardSlideFly';
import {POST_126_DURATION, post126Schema, type Post126Props} from '../templates/post-126/schema';

const Post126SlideFly: React.FC<Post126Props> = (props) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#c8ccd0'}}>
      <Post126CardSlideFly
        card={props}
        localFrame={frame}
        segmentFrames={POST_126_DURATION}
        imageSrc={staticFile(props.image)}
      />
    </AbsoluteFill>
  );
};

export const ManualCompositions: React.FC = () => (
  <Composition
    id="Post126SlideFly"
    component={Post126SlideFly}
    durationInFrames={POST_126_DURATION}
    fps={30}
    width={1080}
    height={1350}
    schema={post126Schema}
    defaultProps={{
      title: 'Hello, WORLD',
      quote: 'Armenia welcomed 172,705 international visitors in April 2026',
      label: 'AM NEWS',
      image: 'generated/post-126.png',
      background: '#D9DDE0',
      titleColor: '#0F0F10',
      quoteColor: '#D61E23',
      labelColor: '#4A7BFF',
    }}
  />
);
