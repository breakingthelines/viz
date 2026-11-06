import { forwardRef, type ReactNode, useRef } from 'react';
import { useImageSave } from '#/components/use-image-save';
import { Wordmark } from './wordmark';

/**
 * The shared social-card shell every profile panel exports through (spec
 * §4.1, §4.4, `board_social` — `scratchpad/prof/build.py:372-388`): a
 * fixed-aspect frame carrying a header (photo, title, subtitle, a
 * full-strength wordmark top right), an optional context line, the panel's
 * own content, a divider, and a footer.
 *
 * Laid out at HALF of `board_social`'s own numbers (that board ships at
 * 1080x1350; this frame is captured at `scale: 2` to reach the same output
 * size — see `useSocialFrameExport` below), so every measurement here is the
 * mock's divided by two: 32px padding (64), a 52px round photo (104), a
 * 26px/700 title (52), an 11px muted subtitle (22), a 20px-tall wordmark
 * (40, inside the mock's own 64px-tall mark group) and a 9px muted footer
 * (18). There is no frame-level watermark: a card that wants the faint
 * mark behind its chart draws `ChartWatermark` inside its own `children`.
 *
 * Captured through the existing `useImageSave` (`#/components/use-image-save`),
 * giving the 1080 x 1350 export every panel shares. `format` is a
 * forward-looking knob for a future size (e.g. a square card); only
 * `'1080x1350'` ships now.
 */

/** The frame's CSS-px size, exported so a test can capture at this exact size without duplicating the number. */
export const FRAME_WIDTH = 540;
export const FRAME_HEIGHT = 675;

const MUTED = '#a29e9e';
const LIGHT = '#d9d6d6';

export interface SocialFrameProps {
  /** The panel's own title (spec §4.4: the panel title). */
  title: string;
  /** "<player>, <team>, <season>". */
  subtitle: string;
  /** Optional header image (e.g. a player photo). */
  imageUrl?: string;
  /** Optional context line (e.g. "Eredivisie 2026-27, per 90, ranked against 57 midfielders"). */
  context?: string;
  /** Footer text. Defaults to "breakingthelines.com". */
  footer?: string;
  /** The panel's own content (wheel, bars, table, …), laid out to the frame's content area. */
  children: ReactNode;
  /** Export size. Only one ships now. */
  format?: '1080x1350';
}

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'breaking-the-lines'
  );
}

export interface UseSocialFrameExportResult {
  /** Ref to pass to the exported `SocialFrame` element. */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Call to capture and deliver the frame as a 1080x1350 PNG. */
  save: () => Promise<void>;
  /** Renders the touch-path overlay when a save is in progress; always safe to render. */
  overlay: ReactNode;
  /** True while a capture is in flight. */
  saving: boolean;
}

/**
 * Pairs a `SocialFrame` with the capture it exports through, so a panel's
 * share button needs only `const { ref, save, overlay } = useSocialFrameExport(fileName)`
 * and `<SocialFrame ref={ref} .../>`.
 */
export function useSocialFrameExport(fileName: string): UseSocialFrameExportResult {
  const ref = useRef<HTMLDivElement>(null);
  const { save: saveImage, overlay, saving } = useImageSave();
  const save = async () => {
    await saveImage(ref.current, {
      fileName: slugify(fileName),
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      scale: 2,
    });
  };
  return { ref, save, overlay, saving };
}

/**
 * `forwardRef`, not a plain `ref` prop: the peer range is `^18 || ^19`, and a
 * plain `ref` prop only forwards automatically on React 19. On React 18 it
 * is silently dropped — `useSocialFrameExport`'s `ref.current` stays `null`
 * and `save()` no-ops with no error.
 */
export const SocialFrame = forwardRef<HTMLDivElement, SocialFrameProps>(function SocialFrame(
  { title, subtitle, imageUrl, context, footer = 'breakingthelines.com', children },
  ref
) {
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${title}, ${subtitle}`}
      style={{
        position: 'relative',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        background: '#0d0d0d',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        fontVariantNumeric: 'tabular-nums',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 32,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{subtitle}</div>
          </div>
        </div>
        <Wordmark height={20} markFill="#E20613" />
      </div>

      {context && <div style={{ fontSize: 10, color: LIGHT }}>{context}</div>}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>{children}</div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          paddingTop: 9,
        }}
      >
        <span style={{ fontSize: 9, color: MUTED }}>{footer}</span>
      </div>
    </div>
  );
});
