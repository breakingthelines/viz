import { type ReactNode, useRef } from 'react';
import { useImageSave } from '#/components/use-image-save';
import { ChartWatermark, PanelSignature } from './wordmark';

/**
 * The shared social-card shell every profile panel exports through (spec
 * §4.1, §4.4): a fixed-aspect frame carrying a title, a subtitle, an
 * optional context line, the panel's own content, a faint watermark behind
 * it, the full-strength signature bottom-right, and a footer.
 *
 * Laid out at 540 x 675 CSS px and captured at `scale: 2` through the
 * existing `useImageSave` (`#/components/use-image-save`), giving the
 * 1080 x 1350 export every panel shares. `format` is a forward-looking knob
 * for a future size (e.g. a square card); only `'1080x1350'` ships now.
 */

const FRAME_WIDTH = 540;
const FRAME_HEIGHT = 675;

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
  /** File name (without extension) used when saving. Defaults to a slug of `title`. */
  fileName?: string;
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

export function SocialFrame({
  title,
  subtitle,
  imageUrl,
  context,
  footer = 'breakingthelines.com',
  children,
  ref,
}: SocialFrameProps & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${title}, ${subtitle}`}
      style={{
        position: 'relative',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        background: '#151515',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: 28,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ChartWatermark width={FRAME_WIDTH} height={FRAME_HEIGHT} />
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#a29e9e' }}>{subtitle}</div>
        </div>
      </div>

      {context && (
        <div style={{ position: 'relative', fontSize: 12, color: '#a29e9e', marginTop: 10 }}>
          {context}
        </div>
      )}

      <div style={{ position: 'relative', flex: 1, marginTop: 16, display: 'flex', minHeight: 0 }}>
        {children}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <span style={{ fontSize: 11, color: '#a29e9e' }}>{footer}</span>
        <PanelSignature />
      </div>
    </div>
  );
}
