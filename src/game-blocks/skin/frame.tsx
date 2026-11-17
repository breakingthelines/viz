import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useImageSave } from '#/components/use-image-save';
import { BtlMark } from '#/football/lib/btl-logo';
import { BtlWordmark, ProviderMark } from '#/football/lib/panel-footer';
import type { GameBlockDensity, GameBlockLook } from '../types';
import { useBlockLocked, usePlansHref } from '../values';
import { Crayon, GrainDefs, ring, seedOf } from './crayon';
import { playerHalftoneUrl, playerHeadshotUrl, resolveMediaSrc, useMediaBase } from './assets';
import {
  pairArtStatus,
  pickPairArt,
  pickPosterArt,
  useHalftone,
  useImageLoads,
  type PosterArt,
} from './halftone';
import { BlockFigure, TABULAR, useBodyFont } from './primitives';
import {
  BlockActionsContext,
  DrawnLookContext,
  LayoutContext,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
  type BlockLayout,
} from './provider';
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
  /**
   * The second player's id, for a pair of players (a comparison). With both
   * ids the poster draws the two cut-outs facing each other, and never a
   * crest; without either cut-out it draws the editorial look.
   */
  pairPersonId?: string;
}

export interface BlockHero {
  /** The figure itself, usually a `GatedValue` with a public fallback. */
  figure: ReactNode;
  /** Its short label: "key passes per 90". */
  label: string;
  /** @deprecated Not drawn: a genuine label and value pair goes in `FactRows`. */
  baseline?: ReactNode[];
  /** One line right under the hero: the season card's rate, "1.02 per 90". */
  under?: ReactNode;
}

export interface BlockFrameProps {
  /**
   * Author option. Default editorial. A poster with no usable headshot or
   * crest draws as editorial.
   */
  look?: GameBlockLook;
  /**
   * One plain line: "Arsenal, 2025/26". Kept in the data and the alt text;
   * never drawn (style.md: no scope line under a title).
   */
  context?: string;
  /** The subject's name by default; the author's own words when edited. */
  title: string;
  /** Editor only: replaces the title with an editable field. */
  titleSlot?: ReactNode;
  /**
   * The title on a narrow block, when it differs: club short forms ("Man
   * United v Aston Villa"). Only for a default title; an author's stays.
   */
  titleNarrow?: string;
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
  /**
   * Editorial and annotated looks draw the subject picture from `media` left
   * of the title (`TitleArt`). False leaves it out; league blocks keep their
   * crests in the rows instead.
   */
  titleArt?: boolean;
  /** @deprecated Every block with `media` draws its title art now. */
  titleFace?: boolean;
  /** Wide editorial and annotated: title and hero on the left (280px), the body on the right. */
  split?: boolean;
  /**
   * The season card's approved poster: the taller art and the larger
   * condensed figure. Other posters use the block style's sizes.
   */
  posterCard?: boolean;
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

/** Resolves after the next two animation frames: a state change has painted. */
function nextPaint(): Promise<void> {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve();
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
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
  const [capturing, setCapturing] = useState(false);
  const layout = useMemo<BlockLayout>(
    () => ({ look, density, narrow, capturing }),
    [look, density, narrow, capturing]
  );
  const onLookDrawn = useContext(DrawnLookContext);
  const actions = useContext(BlockActionsContext);
  useEffect(() => {
    onLookDrawn?.(look);
  }, [onLookDrawn, look]);
  const uid = cssId(useId());
  const ids = { crayon: `btl-crayon-${uid}`, paper: `btl-paper-${uid}` };

  const { save, overlay, saving } = useImageSave();
  const [hover, setHover] = useState(false);
  const onSave = useCallback(async () => {
    const el = ref.current;
    if (!el || saving) return;
    const prev = el.style.padding;
    el.style.padding = '28px 28px 22px';
    // Blocks draw their still picture for the file; wait for it to paint.
    setCapturing(true);
    await nextPaint();
    try {
      await save(el, { fileName: slugify(exportName), backgroundColor: skin.surface });
    } finally {
      el.style.padding = prev;
      setCapturing(false);
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
        {look === 'poster' && art.status === 'ready' && art.kind === 'pair' ? (
          <PairPosterBody {...props} art={art} paperId={ids.paper} />
        ) : look === 'poster' ? (
          <PosterBody {...props} art={art} paperId={ids.paper} />
        ) : look === 'annotated' ? (
          <AnnotatedBody {...props} crayonId={ids.crayon} width={width} />
        ) : (
          <EditorialBody {...props} />
        )}
        <LockedNote lockedNote={props.lockedNote} />
        <Colophon provider={props.provider} />
        {density !== 'tile' && actions === 'frame' ? (
          <SaveAction visible={hover} busy={saving} onSave={onSave} />
        ) : null}
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
        marginTop: 24,
        paddingTop: 12,
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

function shownTitle(p: BlockFrameProps, narrow: boolean): string {
  return narrow && p.titleNarrow ? p.titleNarrow : p.title;
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

interface TitlePicture {
  kind: 'headshot' | 'crest';
  src: string | undefined;
}

/** The pictures a block's media puts beside its title: one, or two for a pair. */
function titlePictures(media: BlockMedia | undefined, mediaBase: string): TitlePicture[] {
  if (!media) return [];
  const headshot = (src: string | undefined, id: string | undefined): TitlePicture => ({
    kind: 'headshot',
    src: resolveMediaSrc(src, mediaBase) ?? (id ? playerHeadshotUrl(mediaBase, id) : undefined),
  });
  if (media.kind === 'person') return [headshot(media.src, media.personId)];
  if (media.kind === 'crest')
    return [{ kind: 'crest', src: resolveMediaSrc(media.src, mediaBase) }];
  if (media.personId || media.pairPersonId) {
    return [headshot(media.src, media.personId), headshot(media.pairSrc, media.pairPersonId)];
  }
  return [media.src, media.pairSrc]
    .filter((s): s is string => !!s)
    .map((s) => ({ kind: 'crest' as const, src: resolveMediaSrc(s, mediaBase) }));
}

/** One picture beside the title, or the BTL mark when it does not load. */
function TitlePic({ pic }: { pic: TitlePicture }) {
  const scale = useBlockScale();
  const loads = useImageLoads(pic.src);
  const size = pic.kind === 'headshot' ? scale.headshot : scale.crest;
  if (pic.src && loads === 'ok') {
    return (
      <img
        src={pic.src}
        alt=""
        data-title-face={pic.kind}
        crossOrigin={pic.src.startsWith('data:') ? undefined : 'anonymous'}
        style={{
          display: 'block',
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: pic.kind === 'crest' ? 0 : '50%',
          objectFit: pic.kind === 'crest' ? 'contain' : 'cover',
          objectPosition: 'top',
          background: pic.kind === 'crest' ? 'transparent' : 'var(--btl-block-track)',
        }}
      />
    );
  }
  return <TitleMark />;
}

function TitleMark() {
  const scale = useBlockScale();
  const box = scale.crest;
  return (
    <span
      data-title-face="mark"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: box,
        height: box,
        flexShrink: 0,
      }}
    >
      <BtlMark style={{ width: Math.round(box * 0.62), height: Math.round(box * 0.62) }} />
    </span>
  );
}

/**
 * The subject picture left of the title (style.md, Subject picture): a round
 * headshot for a player, the crest for a club, both for a pair, 12px from
 * the title. The BTL mark stands in for a picture that does not load. Blocks
 * with no subject picture (league tables, fixtures, rankings) pass no media.
 */
export function TitleArt({ media }: { media: BlockMedia | undefined }) {
  const mediaBase = useMediaBase();
  const pics = titlePictures(media, mediaBase);
  if (!media) return null;
  return (
    <span data-title-art="" style={{ display: 'flex', flex: 'none', gap: 6, alignItems: 'center' }}>
      {pics.length === 0 ? <TitleMark /> : pics.map((pic, i) => <TitlePic key={i} pic={pic} />)}
    </span>
  );
}

/** The title line: the picture, then the entity name alone. */
function TitleLine({ p, sans }: { p: BlockFrameProps; sans: boolean }) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const showArt = p.titleArt !== false && !!p.media;
  const heading = (
    <h3
      data-block-title=""
      style={{
        margin: 0,
        minWidth: 0,
        fontFamily: sans ? skin.fontSans : skin.fontSerif,
        fontWeight: 700,
        fontSize: scale.title,
        lineHeight: 1.08,
        letterSpacing: sans ? '-0.01em' : '-0.005em',
        color: 'var(--btl-block-ink-1)',
      }}
    >
      {p.titleSlot ?? shownTitle(p, narrow)}
    </h3>
  );
  return (
    <header>
      {showArt ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TitleArt media={p.media} />
          {heading}
        </div>
      ) : (
        heading
      )}
      <Subheading
        text={p.subheading}
        font={sans ? skin.fontSans : skin.fontSerif}
        size={sans ? 15 : 17}
      />
    </header>
  );
}

/**
 * Title, hero and body for the editorial and annotated looks: the title line,
 * the hero figure with its unit word, then the body 22px under (18px narrow).
 * `split` puts the title and hero on the left (280px) of a wide block.
 */
function StackBody({ p, sans }: { p: BlockFrameProps; sans: boolean }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  const head = (
    <>
      <TitleLine p={p} sans={sans} />
      {p.hero ? (
        <div style={{ marginTop: 14 }}>
          <BlockFigure figure={p.hero.figure} label={p.hero.label} />
          {p.hero.under ? <div style={{ marginTop: 14 }}>{p.hero.under}</div> : null}
        </div>
      ) : null}
    </>
  );
  const body = (
    <>
      {p.aside ? <div data-block-aside="">{p.aside}</div> : null}
      {p.children ? (
        <div style={{ marginTop: p.aside ? scale.sectionGap : 0 }}>{p.children}</div>
      ) : null}
    </>
  );
  const hasBody = !!(p.aside || p.children);
  if (p.split && !narrow) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0, 1fr)',
          columnGap: 40,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>{head}</div>
        <div style={{ minWidth: 0, paddingTop: 8 }}>{body}</div>
      </div>
    );
  }
  return (
    <div>
      {head}
      {hasBody ? <div style={{ marginTop: scale.titleGap }}>{body}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editorial: the serif title and names, Inter labels and numbers, no art.
// ---------------------------------------------------------------------------

function EditorialBody(p: BlockFrameProps) {
  return <StackBody p={p} sans={false} />;
}

// ---------------------------------------------------------------------------
// Annotated: Inter throughout, and one crayon loop on the single most telling
// figure: the block's `annotate.target`, else the hero.
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number };

function AnnotatedBody(p: BlockFrameProps & { crayonId: string; width: number }) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const target = p.annotate?.target;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const root = bodyRef.current;
      if (!root || cancelled) return;
      const o = root.getBoundingClientRect();
      const el =
        (target ? root.querySelector(target) : null) ??
        root.querySelector('[data-block-anchor="hero"]');
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return setBox(null);
      setBox({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });
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
  if (box) {
    const pad = 10;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const loop = ring(cx, cy, box.w / 2 + pad, box.h / 2 + pad, 2.6, Math.PI * 2.12, 30, -0.06);
    marks = <Crayon pts={loop} color={skin.doodle} seed={seed % 97} w={4} filter={p.crayonId} />;
  }

  return (
    <div ref={bodyRef} style={{ position: 'relative' }}>
      <StackBody p={p} sans />
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

function pixelRatio(): number {
  return typeof window === 'undefined' ? 2 : Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}

interface CutOptions {
  narrow: boolean;
  density: GameBlockDensity | undefined;
  skin: BlockSkinTokens;
}

/**
 * One player's cut-out: the pre-rendered halftone from the CDN, else one
 * computed here from the headshot. Never a crest.
 */
function usePersonCut(
  id: string | undefined,
  src: string | undefined,
  { narrow, density, skin }: CutOptions
): {
  pre: { src: string | undefined; status: 'working' | 'ok' | 'none' };
  cut: ReturnType<typeof useHalftone>;
} {
  const mediaBase = useMediaBase();
  // The pre-rendered halftone is drawn in the default inks; a skin that
  // changes them keeps computing its own.
  const defaultInks =
    skin.halftoneInk === DEFAULT_BLOCK_SKIN.halftoneInk &&
    skin.halftonePaper === DEFAULT_BLOCK_SKIN.halftonePaper;
  const pre = id && defaultInks ? playerHalftoneUrl(mediaBase, id) : undefined;
  const preLoads = useImageLoads(pre);
  const photo =
    resolveMediaSrc(src, mediaBase) ?? (id ? playerHeadshotUrl(mediaBase, id) : undefined);
  // Only compute a halftone here once the CDN has none.
  const cut = useHalftone(pre && preLoads !== 'none' ? undefined : photo, {
    scale: 4,
    pitch: narrow ? 4.6 : 5.2,
    ink: skin.halftoneInk,
    paper: skin.halftonePaper,
    targetPx: Math.round(cutOutHeight(density, narrow) * pixelRatio()),
  });
  const cutState: ReturnType<typeof useHalftone> =
    pre && preLoads === 'working' ? { status: 'working', url: null } : cut;
  return { pre: { src: pre, status: preLoads }, cut: cutState };
}

const NO_CREST = { src: undefined, status: 'none' } as const;

function usePosterArt(
  media: BlockMedia | undefined,
  narrow: boolean,
  density: GameBlockDensity | undefined,
  skin: BlockSkinTokens
): PosterArt {
  const mediaBase = useMediaBase();
  const players = media?.kind === 'pair' && !!media.personId && !!media.pairPersonId;
  const person = media?.kind === 'person' ? media : undefined;
  const opts = { narrow, density, skin };
  // Hooks run in the same order for every kind: the first cut-out, the
  // second (a pair of players only) and the crest.
  const first = usePersonCut(
    person?.personId ?? (players ? media!.personId : undefined),
    person ? person.src : players ? media!.src : undefined,
    opts
  );
  const second = usePersonCut(
    players ? media!.pairPersonId : undefined,
    players ? media!.pairSrc : undefined,
    opts
  );
  // A pair of players never falls back to a crest: the headshot is not one.
  const crest = players
    ? undefined
    : resolveMediaSrc(person ? person.crestSrc : media?.src, mediaBase);
  const crestLoads = useImageLoads(crest);
  // A match: the away crest beside the home one.
  const away =
    media?.kind === 'pair' && !players ? resolveMediaSrc(media.pairSrc, mediaBase) : undefined;
  const awayLoads = useImageLoads(away);
  if (!media) return { status: 'none' };
  if (players) {
    return pickPairArt(
      pickPosterArt(first.pre, first.cut, NO_CREST),
      pickPosterArt(second.pre, second.cut, NO_CREST)
    );
  }
  const cut = person ? first.cut : { status: 'none' as const, url: null };
  const pre = person ? first.pre : NO_CREST;
  const art = pickPosterArt(pre, cut, { src: crest, status: crestLoads });
  if (art.status === 'ready' && art.kind === 'crest' && away) {
    if (awayLoads === 'working') return { status: 'working' };
    if (awayLoads === 'ok') return { ...art, pairSrc: away };
  }
  return art;
}

/**
 * Whether two players can have a poster, before any halftone is computed:
 * each has a pre-rendered halftone or a headshot. A comparison reads it to
 * draw its duel, or its wheel when either player has no picture.
 */
export function usePairArtStatus(media: BlockMedia | undefined): 'working' | 'ok' | 'none' {
  const mediaBase = useMediaBase();
  const ids = media?.kind === 'pair' ? [media.personId, media.pairPersonId] : [];
  const srcs = media?.kind === 'pair' ? [media.src, media.pairSrc] : [];
  const pre = (i: number) => (ids[i] ? playerHalftoneUrl(mediaBase, ids[i]!) : undefined);
  const photo = (i: number) =>
    resolveMediaSrc(srcs[i], mediaBase) ??
    (ids[i] ? playerHeadshotUrl(mediaBase, ids[i]!) : undefined);
  const preA = useImageLoads(pre(0));
  const preB = useImageLoads(pre(1));
  const photoA = useImageLoads(preA === 'none' ? photo(0) : undefined);
  const photoB = useImageLoads(preB === 'none' ? photo(1) : undefined);
  if (!ids[0] || !ids[1]) return 'none';
  return pairArtStatus({ pre: preA, photo: photoA }, { pre: preB, photo: photoB });
}

/**
 * Whether one player can have a poster cut-out, before any halftone is
 * computed: a pre-rendered halftone or a headshot. A crest does not count.
 * The season card reads it to draw its wheel when there is none.
 */
export function usePersonArtStatus(media: BlockMedia | undefined): 'working' | 'ok' | 'none' {
  const mediaBase = useMediaBase();
  const id = media?.kind === 'person' ? media.personId : undefined;
  const src = media?.kind === 'person' ? media.src : undefined;
  const pre = useImageLoads(id ? playerHalftoneUrl(mediaBase, id) : undefined);
  const photo = useImageLoads(
    pre === 'none'
      ? (resolveMediaSrc(src, mediaBase) ?? (id ? playerHeadshotUrl(mediaBase, id) : undefined))
      : undefined
  );
  if (!id && !src) return 'none';
  if (pre === 'ok') return 'ok';
  if (pre === 'working') return 'working';
  return photo;
}

// The duel: two cut-outs facing each other across the poster wedges, the
// title centred above them, the block's figures under the poster.
function pairWedges(s: BlockSkinTokens, H: number): [string, string][] {
  return [
    [s.posterOrange, `0,0 100,0 100,${H} 0,${H}`],
    [s.posterBlue, `52,0 100,0 100,${H} 40,${H}`],
    [s.posterMaroon, `49,0 55,0 43,${H} 37,${H}`],
    [s.posterPink, `0,${H * 0.62} 22,${H} 0,${H}`],
    [s.posterMustard, `100,0 100,${H * 0.3} 82,0`],
  ];
}

function PairPosterBody(
  p: BlockFrameProps & {
    art: { status: 'ready'; kind: 'pair'; src: string; pairSrc: string };
    paperId: string;
  }
) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const small = p.density !== 'article';
  const height = small ? (narrow ? 236 : 260) : narrow ? 260 : 300;
  const cut = height * (narrow ? 0.74 : 0.78);
  const side = narrow ? -6 : 18;
  const img = (src: string, right: boolean) => (
    <img
      src={src}
      alt=""
      data-poster-media="halftone"
      crossOrigin={src.startsWith('data:') ? undefined : 'anonymous'}
      style={{
        position: 'absolute',
        bottom: 0,
        [right ? 'right' : 'left']: side,
        height: cut,
        width: cut,
        objectFit: 'cover',
        transform: right ? 'scaleX(-1)' : undefined,
      }}
    />
  );
  return (
    <div data-poster-pair="">
      <div
        style={{
          position: 'relative',
          height,
          overflow: 'hidden',
          borderRadius: 'var(--btl-block-radius)',
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 ${narrow ? 88 : 86}%)`,
        }}
      >
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          aria-hidden
          focusable="false"
        >
          {pairWedges(skin, height).map(([fill, pts], i) => (
            <polygon key={i} points={pts} fill={fill} />
          ))}
        </svg>
        {img(p.art.src, false)}
        {img(p.art.pairSrc, true)}
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
            left: 0,
            right: 0,
            top: narrow ? 16 : 22,
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: skin.fontSans,
              fontWeight: 700,
              fontSize: narrow ? 22 : 28,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: 'var(--btl-block-ink-1)',
            }}
          >
            {p.titleSlot ?? shownTitle(p, narrow)}
          </h3>
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
      {p.children ? <div style={{ marginTop: narrow ? 6 : 4 }}>{p.children}</div> : null}
    </div>
  );
}

function wedges(s: BlockSkinTokens, W: number, H: number): [string, string][] {
  return [
    [s.posterOrange, `0,0 ${W},0 ${W},${H} 0,${H}`],
    [s.posterMaroon, `0,0 150,0 360,${H} 0,${H}`],
    [s.posterPink, `380,0 560,0 ${W},${H * 0.62} ${W},${H} 470,${H}`],
    [s.posterBlue, `360,${H} 420,${H * 0.55} 470,${H}`],
  ];
}

/**
 * A crest on the poster: the same halftone as a player cut-out, computed here
 * (style.md, Poster crests), straight on the colour fields with no disc. The
 * tone weighs the darkest channel, so flat colours print as dots; the dot
 * count follows the drawn size, about one dot per 2px. The flat crest stands
 * in while the halftone computes or when it cannot be made.
 */
function PosterCrest({ src, size, style }: { src: string; size: number; style: CSSProperties }) {
  const skin = useBlockSkin();
  const ht = useHalftone(src, {
    tone: 'flat',
    dots: Math.round(size / (size < 100 ? 2 : 2.3)),
    targetPx: Math.round(size * pixelRatio()),
    ink: skin.halftoneInk,
    paper: skin.halftonePaper,
  });
  const url = ht.status === 'ready' && ht.url ? ht.url : src;
  return (
    <img
      src={url}
      alt=""
      data-poster-media={ht.status === 'ready' ? 'crest-halftone' : 'crest'}
      crossOrigin={url.startsWith('data:') ? undefined : 'anonymous'}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        objectFit: 'contain',
        opacity: ht.status === 'working' ? 0 : 1,
        ...style,
      }}
    />
  );
}

function PosterBody(p: BlockFrameProps & { art: PosterArt; paperId: string }) {
  const narrow = useBlockLayout().narrow;
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const small = p.density !== 'article';
  const hasFigure = !!p.hero;
  // The season card's poster keeps its approved height and figure; other
  // posters are the block style's 300 (216 narrow) with the figure at 1.55x
  // the hero size.
  const height = p.posterCard ? posterHeight(p.density, narrow) : small || narrow ? 216 : 300;
  const numberSize = p.posterCard
    ? small
      ? 96
      : narrow
        ? 128
        : 190
    : Math.round(scale.hero * 1.55);
  const art = p.art;
  const W = 680;
  const cutH = height * (narrow ? 1.02 : 1.08);

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
    if (art.pairSrc) {
      // A match: home under the title on the maroon field, away on the right.
      const size = narrow ? 92 : 118;
      image = (
        <>
          <PosterCrest
            src={art.src}
            size={size}
            style={{ left: narrow ? 18 : 28, top: height * (narrow ? 0.43 : 0.36) }}
          />
          <PosterCrest
            src={art.pairSrc}
            size={size}
            style={{ right: narrow ? 22 : 64, top: (height - size) / 2 }}
          />
        </>
      );
    } else {
      const size = narrow ? 112 : 168;
      image = (
        <PosterCrest
          src={art.src}
          size={size}
          style={{ right: narrow ? 24 : 56, top: (height - size) / 2 - 6 }}
        />
      );
    }
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
            clipPath: `polygon(0 0, 100% 0, 100% ${narrow ? 84 : 86}%, 0 100%)`,
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
              left: narrow ? 18 : 28,
              top: narrow ? 18 : 26,
              right: narrow ? '36%' : '40%',
            }}
          >
            <h3
              data-block-title=""
              style={{
                margin: 0,
                fontFamily: skin.fontSans,
                fontWeight: 700,
                fontSize: Math.round(scale.title * 1.25),
                lineHeight: 1.02,
                letterSpacing: '-0.01em',
                color: 'var(--btl-block-ink-1)',
              }}
            >
              {p.titleSlot ?? shownTitle(p, narrow)}
            </h3>
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
      {p.posterCard && p.hero && p.children && !narrow ? (
        // The season card: the hero's words on the left, its bars on the right.
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 330px',
            columnGap: 28,
            alignItems: 'center',
          }}
        >
          <div style={{ minWidth: 0, paddingLeft: 28 }}>
            <PosterHeroLabel label={p.hero.label} />
            {p.hero.under ? <div style={{ marginTop: 6 }}>{p.hero.under}</div> : null}
            {p.aside ? <div style={{ marginTop: 14 }}>{p.aside}</div> : null}
          </div>
          <div style={{ minWidth: 0 }}>{p.children}</div>
        </div>
      ) : (
        <PosterStack p={p} />
      )}
    </div>
  );
}

function PosterHeroLabel({ label, marginTop = 0 }: { label: string; marginTop?: number }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  return (
    <p
      data-block-anchor="hero-label"
      style={{
        margin: `${marginTop}px 0 0`,
        fontFamily: skin.fontSans,
        fontWeight: 600,
        fontSize: scale.wordSans,
        lineHeight: 1.4,
        color: 'var(--btl-block-ink-1)',
      }}
    >
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </p>
  );
}

/** The body under the art: the editorial body, set in Inter. */
function PosterStack({ p }: { p: BlockFrameProps }) {
  const narrow = useBlockLayout().narrow;
  const scale = useBlockScale();
  return (
    <>
      {p.hero ? <PosterHeroLabel label={p.hero.label} marginTop={narrow ? 22 : 14} /> : null}
      {p.hero?.under ? <div style={{ marginTop: 6 }}>{p.hero.under}</div> : null}
      {p.aside || p.children ? (
        <div style={{ marginTop: scale.titleGap }}>
          {p.aside ? <div data-block-aside="">{p.aside}</div> : null}
          {p.children ? (
            <div style={{ marginTop: p.aside ? scale.sectionGap : 0 }}>{p.children}</div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
