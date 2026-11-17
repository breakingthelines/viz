/**
 * The block skin's tokens: the only place a game block's colours, fonts and
 * radii are decided. Block components read them through `useBlockSkin()` or
 * the `--btl-block-*` custom properties the frame sets; they never write a
 * colour of their own (a unit test fails on a colour literal outside this
 * folder).
 *
 * Fonts are the Typekit kit's (lemonde-journal, helvetica-neue-lt-pro,
 * helvetica-neue-lt-pro-cond) and the design system's Inter. Hosts load them;
 * the stacks fall back to the platform sans or serif.
 */

export interface BlockSkinTokens {
  /** The ground every look draws on, and the saved image's background. */
  surface: string;
  /** Text, strongest to faintest. */
  ink1: string;
  ink2: string;
  ink3: string;
  ink4: string;
  /** Hairline under the first row of a table. */
  lineStrong: string;
  /** Hairline between rows and above the footer. */
  line: string;
  /** Empty part of a scale. */
  track: string;
  /** The subject's fill at full strength (the percentile ramp's red). */
  subject: string;
  /** A comparison player's ring. */
  comparator: string;
  /** Median tick. */
  tick: string;
  /** The calm dashed rule a locked or pending cell draws. */
  locked: string;
  /** The BTL mark's red. */
  brand: string;
  /** Crayon marks on the annotated look (mag-doodle salmon, lifted for a dark page). */
  doodle: string;
  /** Booking cards, drawn only as cards. */
  cardYellow: string;
  cardRed: string;
  /** Match sides on a timeline strip: home above the line, away below. */
  sideHome: string;
  sideAway: string;
  /** Poster flat colour fields, sampled from the article hero art. */
  posterPink: string;
  posterOrange: string;
  posterMaroon: string;
  posterBlue: string;
  posterMustard: string;
  /** Halftone dots and paper. */
  halftoneInk: string;
  halftonePaper: string;
  radius: string;
  /** Inter, the design-system sans. */
  fontSans: string;
  /** Le Monde Journal, the editorial face. */
  fontSerif: string;
  /** Helvetica Neue condensed, the poster number. */
  fontCondensed: string;
}

export const DEFAULT_BLOCK_SKIN: BlockSkinTokens = {
  surface: '#0d0d0d',
  ink1: '#ffffff',
  ink2: 'rgba(255, 255, 255, 0.78)',
  ink3: 'rgba(255, 255, 255, 0.56)',
  ink4: 'rgba(255, 255, 255, 0.4)',
  lineStrong: 'rgba(255, 255, 255, 0.22)',
  line: 'rgba(255, 255, 255, 0.09)',
  track: 'rgba(255, 255, 255, 0.12)',
  subject: '#eb0000',
  comparator: '#ffffff',
  tick: '#ffffff',
  locked: 'rgba(255, 255, 255, 0.45)',
  brand: '#E20613',
  doodle: 'rgb(250, 128, 114)',
  cardYellow: '#f2c230',
  cardRed: '#eb0000',
  sideHome: '#eb0000',
  sideAway: '#0091eb',
  posterPink: '#e9418f',
  posterOrange: '#e5512f',
  posterMaroon: '#4a1d2a',
  posterBlue: '#3d43c9',
  posterMustard: '#cfa52b',
  halftoneInk: '#121212',
  halftonePaper: '#efece4',
  radius: '0px',
  fontSans: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSerif: "'lemonde-journal', 'le-monde-livre-std', Georgia, serif",
  fontCondensed: "'helvetica-neue-lt-pro-cond', 'helvetica-neue-lt-pro', Inter, sans-serif",
};

/**
 * The size scale every block shares (style.md, Typography and Alignment), at
 * the two widths a block is drawn: wide (the 680 article column) and narrow
 * (a phone, a chat, a tile). Sizes in px.
 */
export interface BlockScaleTokens {
  /** The title: Le Monde Journal bold (editorial), Inter bold (annotated, poster x1.25). */
  title: number;
  /** The hero figure, and its unit word after it. */
  hero: number;
  heroUnit: number;
  /** A name or a value in words: the serif in editorial, Inter elsewhere. */
  word: number;
  wordSans: number;
  /** A label, a section heading, a quiet line. Inter, ink 3. */
  label: number;
  /** A number: Inter semibold, tabular lining figures. */
  number: number;
  /** A small aside: a club in a leaderboard, an xG. */
  small: number;
  /** Table row height. */
  row: number;
  /** The one label column. */
  labelCol: number;
  /** Title to body, and section to section. */
  titleGap: number;
  sectionGap: number;
  /** The subject picture beside the title: a headshot, a crest or the BTL mark. */
  headshot: number;
  crest: number;
}

export const BLOCK_SCALE: { wide: BlockScaleTokens; narrow: BlockScaleTokens } = {
  wide: {
    title: 30,
    hero: 96,
    heroUnit: 30,
    word: 19,
    wordSans: 16,
    label: 14,
    number: 16,
    small: 13,
    row: 38,
    labelCol: 104,
    titleGap: 22,
    sectionGap: 28,
    headshot: 40,
    crest: 36,
  },
  narrow: {
    title: 24,
    hero: 72,
    heroUnit: 24,
    word: 17,
    wordSans: 15,
    label: 13,
    number: 15,
    small: 12,
    row: 34,
    labelCol: 78,
    titleGap: 18,
    sectionGap: 24,
    headshot: 32,
    crest: 28,
  },
};

/** The CSS custom properties the frame sets from the tokens (contract section 4.1). */
export function skinCssVars(t: BlockSkinTokens): Record<string, string> {
  return {
    '--btl-block-surface': t.surface,
    '--btl-block-ink-1': t.ink1,
    '--btl-block-ink-2': t.ink2,
    '--btl-block-ink-3': t.ink3,
    '--btl-block-ink-4': t.ink4,
    '--btl-block-line': t.line,
    '--btl-block-line-strong': t.lineStrong,
    '--btl-block-track': t.track,
    '--btl-block-subject': t.subject,
    '--btl-block-comparator': t.comparator,
    '--btl-block-tick': t.tick,
    '--btl-block-locked': t.locked,
    '--btl-block-card-yellow': t.cardYellow,
    '--btl-block-card-red': t.cardRed,
    '--btl-block-side-home': t.sideHome,
    '--btl-block-side-away': t.sideAway,
    '--btl-block-radius': t.radius,
    '--btl-block-font': t.fontSans,
    '--btl-block-font-serif': t.fontSerif,
    '--btl-block-font-condensed': t.fontCondensed,
  };
}
