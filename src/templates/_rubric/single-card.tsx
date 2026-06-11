import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FOOD_CARD_COMPONENTS} from './armenian-food';
import {Card1Hello, Card2Quote, Card3Brand, pickGreenPlateCard} from './green-plate';
import {pickWizzCard} from './wizz';
import type {RubricCardProps, RubricCardSlot} from './types';

function asSlot(props: RubricCardProps, imageSrc: string): RubricCardSlot {
  return {
    ...props,
    image: props.image || imageSrc,
  };
}

export const RubricSingleCard: React.FC<{
  card: RubricCardProps;
  localFrame: number;
  segmentFrames: number;
  imageSrc: string;
}> = ({card, localFrame, segmentFrames, imageSrc}) => {
  const slot = asSlot(card, imageSrc);
  const engine = card.engine;
  const cardIndex = Number(card.cardIndex ?? 0);
  const cardCount = Number(card.cardCount ?? 1);

  if (engine === 'green-plate') {
    const Active =
      card.cardKind === 'hello'
        ? Card1Hello
        : card.cardKind === 'quote'
          ? Card2Quote
          : card.cardKind === 'brand'
            ? Card3Brand
            : pickGreenPlateCard(cardIndex, cardCount, slot);
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#eef1f4'}}>
        <Active card={slot} localFrame={localFrame} segmentFrames={segmentFrames} />
      </AbsoluteFill>
    );
  }

  if (engine === 'armenian-food') {
    const idx = Math.max(0, Math.min(5, cardIndex));
    const Active = FOOD_CARD_COMPONENTS[idx] || FOOD_CARD_COMPONENTS[0];
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#eef1f4'}}>
        <div style={{transform: 'scale(1.8)', transformOrigin: 'center'}}>
          <Active card={slot} localFrame={localFrame} />
        </div>
      </AbsoluteFill>
    );
  }

  if (engine === 'wizz') {
    const Active =
      card.cardKind === 'body-below' ? pickWizzCard({cardLayout: 'body-below'}) : pickWizzCard(slot);
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#eef1f4'}}>
        <Active card={slot} localFrame={localFrame} segmentFrames={segmentFrames} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: '#d9dde0'}}>
      <div>Неизвестный движок: {engine}</div>
    </AbsoluteFill>
  );
};
