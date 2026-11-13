import type { ReactNode } from 'react';
import { gameBlockEntry } from './registry';
import { BlockFrame, useBlockSkin } from './skin/index';
import type { GameBlockConfig, GameBlockDensity, GameBlockLook } from './types';
import { GameBlockScope } from './values';

/** The newest `dataVersion` this build of viz draws. A newer one asks for an update. */
export const SUPPORTED_DATA_VERSION = 1;

export interface GameBlockViewProps {
  config: GameBlockConfig;
  /** Editor only: an editable title field. */
  titleSlot?: ReactNode;
  density?: GameBlockDensity;
}

/**
 * Renders any stored game block: looks the type up in the registry and draws
 * it inside its snapshot scope, so its gated cells join the page's one batched
 * read. An unknown type, a type with no component yet, or a newer
 * `dataVersion` draws the frame with "Update to see this block", never a crash.
 */
export function GameBlockView({ config, titleSlot, density = 'article' }: GameBlockViewProps) {
  const entry = gameBlockEntry(config.blockType);
  const Component = entry?.component;
  if (!Component || (config.dataVersion ?? 1) > SUPPORTED_DATA_VERSION) {
    return (
      <GameBlockMessage
        title={config.title || config.subject?.name || ''}
        context={config.context ?? ''}
        look={config.look}
        density={density}
        titleSlot={titleSlot}
        text="Update to see this block"
      />
    );
  }
  return (
    <GameBlockScope snapshotId={config.snapshotId ?? ''} gatedCells={config.gatedCells ?? []}>
      <Component config={config} titleSlot={titleSlot} density={density} />
    </GameBlockScope>
  );
}

/**
 * The frame with one line in place of the data: an unavailable type ("Not
 * ranked in cup competitions") or a block this build cannot draw.
 */
export function GameBlockMessage({
  title,
  context,
  text,
  look,
  density = 'article',
  titleSlot,
}: {
  title: string;
  context: string;
  text: string;
  look?: GameBlockLook;
  density?: GameBlockDensity;
  titleSlot?: ReactNode;
}) {
  const skin = useBlockSkin();
  return (
    <BlockFrame
      look={look === 'annotated' ? 'annotated' : 'editorial'}
      title={title}
      titleSlot={titleSlot}
      context={context}
      density={density}
      exportName={title}
      aside={
        <p
          data-game-block-message=""
          style={{
            margin: '12px 0 0',
            fontFamily: skin.fontSans,
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {text}
        </p>
      }
    />
  );
}
