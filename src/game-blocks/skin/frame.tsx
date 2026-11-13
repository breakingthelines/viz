import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useImageSave } from '#/components/use-image-save';
import { BtlWordmark, ProviderMark } from '#/football/lib/panel-footer';
import type { GameBlockDensity, GameBlockLook } from '../types';
import { useBlockLocked, usePlansHref } from '../values';
import { Crayon, GrainDefs, arc, head, ring, seedOf, type Pt } from './crayon';
import { playerHalftoneUrl, playerHeadshotUrl, resolveMediaSrc, useMediaBase } from './assets';
import { pickPosterArt, useHalftone, useImageLoads, type PosterArt } from './halftone';
import { BlockFigure, BlockBaseline, TABULAR, useBodyFont } from './primitives';
import { LayoutContext, useBlockLayout, useBlockSkin, type BlockLayout } from './provider';
import { DEFAULT_BLOCK_SKIN, skinCssVars, type BlockSkinTokens } from './tokens';

/** Container width below which a block stacks into one column. */
export const NARROW_BELOW = 560;

export interface BlockMedia {
  kind: 'person' | 'crest' | 'pair';
  /** Headshot for a person, crest for a team. */
  src?: string;
  /** A person's club crest: the poster's fallback when the headshot is unusable. */
  crestSrc?: string;
  /** The second image of a pair (a comparison or a match). */
  pairSrc?: string;
  /**
   * A player's canonical id. The poster builds the pre-rendered halftone's
   * address from it, and the headshot's when `src` is empty.
   */
  personId?: string;
}

export interface BlockHero {
  /** The figure itself, usually a `GatedValue` with a public fallback. */
  figure: ReactNode;
  /** Its short label: "key passes per 90". */
  label: string;
  /** Short figures after it: "94th", "Median 1.40". Never a sentence. */
  baseline?: ReactNode[];
}

export interface BlockFrameProps {
  /**
   * Author option. Default editorial. A poster with no usable headshot or
   * crest draws as editorial.
   */
  look?: GameBlockLook;
  /** One plain line: "Arsenal, 2025/26". */
  context: string;
  /** The subject's name by default; the author's own words when edited. */
  title: string;
  /** Editor only: replaces the title with an editable field. */
  titleSlot?: ReactNode;
  /** Optional author or Regista line. Nothing is drawn when empty. */
  subheading?: string;
  media?: BlockMedia;
  /** The highlighted figure. Lists and tables leave it out. */
  hero?: BlockHero;
  /** Shown once a cell resolves locked: "{lockedNote} are for Pro readers. See plans". */
  lockedNote?: string;
  density: GameBlockDensity;
  /** Save image file name, without extension. */
  exportName: string;
  /** A licensed provider whose mark the licence requires. API-Football has none. */
  provider?: 'statsbomb';
  /**
   * Annotated look: a CSS selector, inside the block's visual, for the element
   * the crayon loop rings. With no target the loop rings the hero figure.
   */
  annotate?: { target?: string };
  /** Supporting rows beside the hero (left column on wide layouts). */
  aside?: ReactNode;
  /** The block's visual: a wheel, a chart, a table. */
  children?: ReactNode;
}

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'breaking-the-lines'
  );
}

function cssId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * The frame every game block renders in, in the author's chosen look. It owns
 * the title, context, subheading, the hero figure's placement, the locked
 * note, the colophon (BTL mark and wordmark bottom left; a licensed provider's
 * mark bottom right when one is required) and the Save image action, which
 * appears on hover or focus and is never part of the saved image.
 */
export function BlockFrame(props: BlockFrameProps) {
  const { look: asked = 'editorial', density, exportName } = props;
  const skin = useBlockSkin();
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const narrow = density !== 'article' || width < NARROW_BELOW;
  const art = usePosterArt(asked === 'poster' ? props.media : undefined, narrow, density, skin);
  const look: GameBlockLook = asked === 'poster' && art.status === 'none' ? 'editorial' : asked;
  const layout = useMemo<BlockLayout>(() => ({ look, density, narrow }), [look, density, narrow]);
  const uid = cssId(useId());
  const ids = { crayon: `btl-crayon-${uid}`, paper: `btl-paper-${uid}` };

  const { save, overlay, saving } = useImageSave();
  const [hover, setHover] = useState(false);
  const onSave = useCallback(async () => {
    const el = ref.current;
    if (!el || saving) return;
    const prev = el.style.padding;
    el.style.padding = '28px 28px 22px';
    try {
      await save(el, { fileName: slugify(exportName), backgroundColor: skin.surface });
    } finally {
      el.style.padding = prev;
    }
  }, [ref, save, saving, exportName, skin.surface]);

  const root: CSSProperties = {
    ...(skinCssVars(skin) as CSSProperties),
    position: 'relative',
    margin: 0,
    // No box: the block sits on the host's page. The saved image paints the
    // surface behind it.
    color: 'var(--btl-block-ink-1)',
    fontFamily: 'var(--btl-block-font)',
    WebkitFontSmoothing: 'antialiased',
  };

  return (
    <LayoutContext.Provider value={layout}>
      <div
        ref={ref}
        role="figure"
        aria-label={props.title}
        data-game-block-look={look}
        data-game-block-look-fallback={look !== asked ? asked : undefined}
        data-game-block-density={density}
        style={root}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <GrainDefs crayon={ids.crayon} paper={ids.paper} />
        {look === 'poster' ? (
          <PosterBody {...props} art={art} paperId={ids.paper} />
        ) : look === 'annotated' ? (
          <AnnotatedBody {...props} crayonId={ids.crayon} width={width} />
        ) : (
          <EditorialBody {...props} />
        )}
        <LockedNote lockedNote={props.lockedNote} />
        <Colophon provider={props.provider} />
        {density !== 'tile' ? <SaveAction visible={hover} busy={saving} onSave={onSave} /> : null}
      </div>
      {overlay}
    </LayoutContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Shared parts
// ---------------------------------------------------------------------------

function LockedNote({ lockedNote }: { lockedNote?: string }) {
  const locked = useBlockLocked();
  const href = usePlansHref();
  const font = useBodyFont();
  const { look } = useBlockLayout();
  if (!locked || !lockedNote) return null;
  return (
    <p
      data-block-locked-note=""
      style={{
        margin: '14px 0 0',
        fontFamily: font,
        fontSize: look === 'editorial' ? 15 : 13,
        lineHeight: 1.5,
        color: 'var(--btl-block-ink-3)',
      }}
    >
      {lockedNote} are for Pro readers.{' '}
      <a
        href={href}
        style={{ color: 'var(--btl-block-ink-1)', fontWeight: 600, textDecoration: 'none' }}
      >
        See plans
      </a>
    </p>
  );
}

function Colophon({ provider }: { provider?: 'statsbomb' }) {
  return (
    <footer
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--btl-block-line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <BtlWordmark />
      {provider ? <ProviderMark provider={provider} /> : null}
    </footer>
  );
}

function SaveAction({
  visible,
  busy,
  onSave,
}: {
  visible: boolean;
  busy: boolean;
  onSave: () => void;
}) {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches);
  }, []);
  return (
    <button
      type="button"
      data-export-ignore="true"
      onClick={onSave}
      disabled={busy}
      aria-label="Save image"
      title="Save image"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        border: 0,
        background: 'transparent',
        color: 'var(--btl-block-ink-3)',
        cursor: busy ? 'default' : 'pointer',
        opacity: visible || touch ? 1 : 0,
        transition: 'opacity 120ms ease',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 2.5v7M8 9.5 5.2 6.7M8 9.5l2.8-2.8M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Subheading({ text, font, size }: { text?: string; font: string; size: number }) {
  if (!text) return null;
  return (
    <p
      style={{
        margin: '6px 0 0',
        fontFamily: font,
        fontSize: size,
        lineHeight: 1.35,
        color: 'var(--btl-block-ink-2)',
      }}
    >
      {text}
    </p>
  );
}

function Columns({
  narrow,
  left,
  right,
  template,
  rightStyle,
  gap = 24,
  align = 'start',
}: {
  narrow: boolean;
  left: ReactNode;
  right: ReactNode;
  template: string;
  rightStyle?: CSSProperties;
  gap?: number;
  align?: CSSProperties['alignItems'];
}) {
  if (!right) return <>{left}</>;
  if (narrow) {
    return (
      <>
        {left}
        <div style={{ marginTop: 10 }}>{right}</div>
      </>
    );
  }
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: template, columnGap: gap, alignItems: align }}
    >
      <div style={{ minWidth: 0 }}>{left}</div>
      <div style={{ minWidth: 0, ...rightStyle }}>{right}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editorial: a newspaper stat panel. No rule or box above, a bold run-in name
// with the context after it, the figure on the words' baseline, the visual
// beside the text.
// ---------------------------------------------------------------------------

function EditorialBody(p: BlockFrameProps) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const small = p.density !== 'article';
  const size = small ? 22 : narrow ? 24 : 26;
  const text = (
    <div>
      <p style={{ margin: 0, fontFamily: skin.fontSerif, fontSize: size, lineHeight: 1.05 }}>
        <strong style={{ fontWeight: 700 }}>{p.titleSlot ?? p.title}</strong>{' '}
        <span
          style={{
            fontSize: size * 0.64,
            color: 'var(--btl-block-ink-3)',
            whiteSpace: 'nowrap',
          }}
        >
          {p.context}
        </span>
      </p>
      <Subheading text={p.subheading} font={skin.fontSerif} size={17} />
      {p.hero ? (
        <div style={{ marginTop: narrow ? 4 : 6 }}>
          <BlockFigure figure={p.hero.figure} label={p.hero.label} baseline={p.hero.baseline} />
        </div>
      ) : null}
      {p.aside ? <div style={{ marginTop: 12 }}>{p.aside}</div> : null}
    </div>
  );
  return (
    <div style={{ paddingTop: 2 }}>
      <Columns
        narrow={narrow}
        left={text}
        right={p.children}
        template="300px minmax(0, 1fr)"
        gap={4}
        rightStyle={{ marginTop: -14, marginRight: -12 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotated: plain data in Inter, and one crayon layer over it, at most two
// marks, anchored to the highlighted stat.
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number };

function AnnotatedBody(p: BlockFrameProps & { crayonId: string; width: number }) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const bodyRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<{ label?: Box; hero?: Box; target?: Box } | null>(null);
  const target = p.annotate?.target;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const root = bodyRef.current;
      if (!root || cancelled) return;
      const o = root.getBoundingClientRect();
      const rel = (el: Element | null | undefined): Box | undefined => {
        if (!el) return undefined;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return undefined;
        return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
      };
      setBoxes({
        label: rel(root.querySelector('[data-block-anchor="hero-label"]')),
        hero: rel(root.querySelector('[data-block-anchor="hero"]')),
        target: target ? rel(visualRef.current?.querySelector(target)) : undefined,
      });
    };
    const fonts = typeof document !== 'undefined' ? document.fonts?.ready : undefined;
    void (fonts ?? Promise.resolve()).then(() => {
      timer = setTimeout(measure, 60);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [target, p.width, narrow]);

  const seed = seedOf(`${p.title}|${target ?? ''}`);
  let marks: ReactNode = null;
  if (boxes) {
    const color = skin.doodle;
    const c = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];
    if (boxes.target) {
      const t = boxes.target;
      const [cx, cy] = c(t);
      const r = Math.max(t.w, t.h) * 0.6 + 6;
      const loop = ring(cx, cy, r, r * 0.92, 2.6, Math.PI * 2.15, 30, 0.2);
      let arrow: Pt[] | null = null;
      if (boxes.label) {
        const L = boxes.label;
        const from: Pt = narrow ? [L.x + 14, L.y + L.h + 10] : [L.x + L.w + 12, L.y + L.h * 0.75];
        const dx = from[0] - cx;
        const dy = from[1] - cy;
        const dl = Math.hypot(dx, dy) || 1;
        const to: Pt = [cx + (dx / dl) * (r + 4), cy + (dy / dl) * (r + 4)];
        if (Math.hypot(to[0] - from[0], to[1] - from[1]) > 24)
          arrow = arc(from, to, narrow ? 0.18 : -0.22);
      }
      marks = (
        <>
          <Crayon pts={loop} color={color} seed={seed % 97} w={4.4} filter={p.crayonId} />
          {arrow ? (
            <>
              <Crayon
                pts={arrow}
                color={color}
                seed={(seed % 89) + 1}
                w={3.6}
                filter={p.crayonId}
              />
              {head(arrow).map((h, i) => (
                <Crayon
                  key={i}
                  pts={h}
                  color={color}
                  seed={(seed % 83) + 11 + i}
                  w={3.6}
                  filter={p.crayonId}
                />
              ))}
            </>
          ) : null}
        </>
      );
    } else if (boxes.hero) {
      const f = boxes.hero;
      const [cx, cy] = c(f);
      const loop = ring(
        cx + 2,
        cy + 2,
        f.w * 0.6 + 6,
        f.h * 0.56 + 2,
        3.6,
        Math.PI * 2.1,
        28,
        -0.06
      );
      marks = <Crayon pts={loop} color={color} seed={seed % 97} w={4.4} filter={p.crayonId} />;
    }
  }

  const small = p.density !== 'article';
  const text = (
    <div>
      {p.hero ? (
        <BlockFigure figure={p.hero.figure} label={p.hero.label} baseline={p.hero.baseline} />
      ) : null}
      {p.aside ? <div style={{ marginTop: 14 }}>{p.aside}</div> : null}
    </div>
  );
  return (
    <div ref={bodyRef} style={{ position: 'relative' }}>
      <header>
        <h3
          style={{
            margin: 0,
            fontFamily: skin.fontSans,
            fontWeight: 650,
            fontSize: small ? 20 : narrow ? 22 : 24,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
            color: 'var(--btl-block-ink-1)',
          }}
        >
          {p.titleSlot ?? p.title}
        </h3>
        <p
          style={{
            margin: '4px 0 0',
            fontFamily: skin.fontSans,
            fontSize: 13.5,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {p.context}
        </p>
        <Subheading text={p.subheading} font={skin.fontSans} size={15} />
      </header>
      <div style={{ marginTop: narrow ? 18 : 6 }}>
        <Columns
          narrow={narrow}
          left={text}
          right={p.children ? <div ref={visualRef}>{p.children}</div> : null}
          template="minmax(0, 1fr) 330px"
          align="center"
        />
      </div>
      {marks ? (
        <svg
          aria-hidden
          focusable="false"
          data-block-marks=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {marks}
        </svg>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster: a halftone cut-out on flat colour wedges, the hero number in the
// condensed face crossing the diagonal. Falls back to the crest, large in the
// cut-out position, when there is no usable photo, and to the editorial look
// when there is no crest either.
// ---------------------------------------------------------------------------

function posterHeight(density: GameBlockDensity | undefined, narrow: boolean): number {
  return density !== 'article' ? 230 : narrow ? 300 : 340;
}

function cutOutHeight(density: GameBlockDensity | undefined, narrow: boolean): number {
  return posterHeight(density, narrow) * (narrow ? 1.02 : 1.08);
}

function devicePixelRatio(): number {
  return typeof window === 'undefined' ? 2 : Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}

function usePosterArt(
  media: BlockMedia | undefined,
  narrow: boolean,
  density: GameBlockDensity | undefined,
  skin: BlockSkinTokens
): PosterArt {
  const mediaBase = useMediaBase();
  const person = media?.kind === 'person' ? media : undefined;
  const id = person?.personId;
  // The pre-rendered halftone is drawn in the default inks; a skin that
  // changes them keeps computing its own.
  const defaultInks =
    skin.halftoneInk === DEFAULT_BLOCK_SKIN.halftoneInk &&
    skin.halftonePaper === DEFAULT_BLOCK_SKIN.halftonePaper;
  const pre = id && defaultInks ? playerHalftoneUrl(mediaBase, id) : undefined;
  const preLoads = useImageLoads(pre);
  const photo =
    resolveMediaSrc(person?.src, mediaBase) ?? (id ? playerHeadshotUrl(mediaBase, id) : undefined);
  const crest = resolveMediaSrc(person ? person.crestSrc : media?.src, mediaBase);
  // Only compute a halftone here once the CDN has none.
  const cut = useHalftone(pre && preLoads !== 'none' ? undefined : photo, {
    scale: 4,
    pitch: narrow ? 4.6 : 5.2,
    ink: skin.halftoneInk,
    paper: skin.halftonePaper,
    targetPx: Math.round(cutOutHeight(density, narrow) * devicePixelRatio()),
  });
  const crestLoads = useImageLoads(crest);
  const cutState = pre && preLoads === 'working' ? { status: 'working' as const, url: null } : cut;
  return pickPosterArt({ src: pre, status: preLoads }, cutState, {
    src: crest,
    status: crestLoads,
  });
}

function wedges(s: BlockSkinTokens, W: number, H: number): [string, string][] {
  return [
    [s.posterOrange, `0,0 ${W},0 ${W},${H} 0,${H}`],
    [s.posterMaroon, `0,0 150,0 360,${H} 0,${H}`],
    [s.posterPink, `380,0 560,0 ${W},${H * 0.62} ${W},${H} 470,${H}`],
    [s.posterBlue, `360,${H} 420,${H * 0.55} 470,${H}`],
  ];
}

function PosterBody(p: BlockFrameProps & { art: PosterArt; paperId: string }) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const small = p.density !== 'article';
  const height = posterHeight(p.density, narrow);
  const numberSize = small ? 96 : narrow ? 128 : 190;
  const art = p.art;
  const W = 680;
  const cutH = height * (narrow ? 1.02 : 1.08);
  const hasFigure = !!p.hero;

  let image: ReactNode = null;
  if (art.status === 'ready' && art.kind === 'halftone') {
    image = (
      <img
        src={art.src}
        alt=""
        data-poster-media="halftone"
        crossOrigin={art.src.startsWith('data:') ? undefined : 'anonymous'}
        style={{
          position: 'absolute',
          bottom: 0,
          right: narrow ? -46 : -8,
          height: cutH,
          width: cutH,
          objectFit: 'cover',
        }}
      />
    );
  } else if (art.status === 'ready' && art.kind === 'crest') {
    // The crest leads: large, flat, where the cut-out stands, clear of the
    // title and the diagonal.
    const size = height * (narrow ? 0.46 : 0.66);
    image = (
      <img
        src={art.src}
        alt=""
        data-poster-media="crest"
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          top: height * (narrow ? 0.34 : 0.1),
          right: narrow ? 14 : 44,
          height: size,
          width: size,
          objectFit: 'contain',
        }}
      />
    );
  }

  const panelH = hasFigure ? height + numberSize * 0.28 : height;
  return (
    <div>
      <div style={{ position: 'relative', height: panelH }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            height,
            overflow: 'hidden',
            borderRadius: 'var(--btl-block-radius)',
            clipPath: `polygon(0 0, 100% 0, 100% ${narrow ? 84 : 80}%, 0 100%)`,
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${height}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            aria-hidden
            focusable="false"
          >
            {wedges(skin, W, height).map(([fill, pts], i) => (
              <polygon key={i} points={pts} fill={fill} />
            ))}
          </svg>
          {image}
          {art.status === 'ready' && art.kind === 'halftone' ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: skin.posterMustard,
                mixBlendMode: 'multiply',
                clipPath: narrow
                  ? 'polygon(78% 62%, 100% 48%, 100% 100%, 70% 100%)'
                  : 'polygon(84% 58%, 100% 46%, 100% 100%, 78% 100%)',
              }}
            />
          ) : null}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              mixBlendMode: 'multiply',
              opacity: 0.35,
            }}
            aria-hidden
            focusable="false"
          >
            <rect width="100%" height="100%" filter={`url(#${p.paperId})`} />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: narrow ? 16 : 28,
              top: narrow ? 18 : 26,
              maxWidth: narrow ? 210 : 320,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: skin.fontSans,
                fontWeight: 700,
                fontSize: small ? 20 : narrow ? 23 : 28,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                color: 'var(--btl-block-ink-1)',
              }}
            >
              {p.titleSlot ?? p.title}
            </h3>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: skin.fontSans,
                fontSize: 13,
                lineHeight: 1.35,
                color: 'var(--btl-block-ink-1)',
                opacity: 0.88,
              }}
            >
              {p.context}
            </p>
            {p.subheading ? (
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: skin.fontSans,
                  fontSize: 14,
                  lineHeight: 1.35,
                  color: 'var(--btl-block-ink-1)',
                }}
              >
                {p.subheading}
              </p>
            ) : null}
          </div>
        </div>
        {hasFigure ? (
          <div
            data-block-anchor="hero"
            style={{
              ...TABULAR,
              position: 'absolute',
              left: narrow ? 12 : 22,
              top: height - numberSize * 0.72,
              fontFamily: skin.fontCondensed,
              fontWeight: 700,
              fontSize: numberSize,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              color: 'var(--btl-block-ink-1)',
              whiteSpace: 'nowrap',
            }}
          >
            {p.hero!.figure}
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: narrow ? 22 : 14 }}>
        <Columns
          narrow={narrow}
          left={
            <div style={{ paddingLeft: narrow ? 0 : 28 }}>
              {p.hero ? (
                <>
                  <p
                    data-block-anchor="hero-label"
                    style={{
                      margin: 0,
                      fontFamily: skin.fontSans,
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1.4,
                      color: 'var(--btl-block-ink-1)',
                    }}
                  >
                    {p.hero.label.charAt(0).toUpperCase() + p.hero.label.slice(1)}
                  </p>
                  {p.hero.baseline?.length ? <BlockBaseline items={p.hero.baseline} /> : null}
                </>
              ) : null}
              {p.aside ? <div style={{ marginTop: 14 }}>{p.aside}</div> : null}
            </div>
          }
          right={p.children}
          template="minmax(0, 1fr) 330px"
          gap={28}
          align="center"
        />
      </div>
    </div>
  );
}
