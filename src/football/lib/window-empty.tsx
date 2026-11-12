import type { ReactNode } from 'react';
import { cn } from '#/lib/utils';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import type { MinuteWindow } from '#/football/lib/selection';

export interface WindowEmptyProps {
  /** Panel title, as the block shows it. */
  title: ReactNode;
  /** Plural noun for the block's items, e.g. "goals". */
  noun: string;
  /** The window that matched nothing. */
  window: MinuteWindow;
  className?: string;
  wordmark?: ReactNode;
  builderControls?: ReactNode;
}

/**
 * The panel a single-item block (Goal Sequence, The Moment) shows when its
 * `window` matches none of its items. The block keeps its frame instead of
 * disappearing, so a host scrubbing a minute range doesn't make it jump in and
 * out of the layout.
 */
export function WindowEmpty({
  title,
  noun,
  window,
  className,
  wordmark,
  builderControls,
}: WindowEmptyProps) {
  return (
    <div
      data-slot="window-empty"
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-white">
        {title}
      </div>
      <p role="status" className="py-10 text-center text-[12px] text-white/60">
        No {noun} between <span className="tabular-nums">{window.from}&apos;</span> and{' '}
        <span className="tabular-nums">{window.to}&apos;</span>
      </p>
      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </div>
  );
}
