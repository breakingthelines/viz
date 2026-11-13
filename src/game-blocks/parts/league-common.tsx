import type { ReactNode } from 'react';
import { TABULAR, useBlockLayout, useBlockSkin } from '../skin/index';

/** A terse label under a table: "6 of 20", "Median 1.40". Never a sentence. */
export function TableNote({ children }: { children: ReactNode }) {
  const skin = useBlockSkin();
  const { look } = useBlockLayout();
  return (
    <p
      style={{
        ...TABULAR,
        margin: '8px 0 0',
        fontFamily: look === 'editorial' ? skin.fontSerif : skin.fontSans,
        fontSize: look === 'editorial' ? 15 : 13,
        color: 'var(--btl-block-ink-3)',
      }}
    >
      {children}
    </p>
  );
}
