import { useId } from 'react';
import { MARK_HEIGHT, MARK_L, MARK_R, MARK_WIDTH } from './mark';

/**
 * The BTL wordmark: the bracket mark plus the "breaking / the lines" lockup,
 * as pure SVG (`<text>`, not HTML spans) so it composes directly inside an
 * SVG chart — the wheel's centre mark, a watermark painted behind a chart's
 * data, a panel's bottom-right signature.
 *
 * Geometry taken verbatim from the approved mock (`scratchpad/prof/wheel2.py`
 * — `wordmark_g`), which centres the lockup on a given point from a given
 * mark height. `renderWordmarkGroup` below is that same centring logic,
 * shared by {@link Wordmark} (left-aligned in its own viewBox),
 * {@link ChartWatermark} (centred, faint) and {@link PanelSignature}
 * (bottom-right, full strength) so the three never drift apart.
 */

interface WordmarkGroupProps {
  /** Centre x of the lockup. */
  cx: number;
  /** Centre y of the lockup. */
  cy: number;
  /** Mark height; the lockup's text and overall size scale from this. */
  h: number;
  /** Text fill. */
  fill: string;
  /** Mark fill. Defaults to `fill`. */
  markFill?: string;
  /** Group opacity. */
  opacity?: number;
}

/** The measured width a wordmark lockup occupies for a given mark height `h`. */
export function wordmarkWidth(h: number): number {
  const markWidth = (h * MARK_WIDTH) / MARK_HEIGHT;
  const fontSize = h * 0.43;
  const textWidth = fontSize * 4.15;
  return markWidth + h * 0.36 + textWidth;
}

/** Shared mark + "breaking / the lines" lockup, centred on `(cx, cy)`. */
function WordmarkGroup({ cx, cy, h, fill, markFill, opacity = 1 }: WordmarkGroupProps) {
  const markWidth = (h * MARK_WIDTH) / MARK_HEIGHT;
  const fontSize = h * 0.43;
  const gap = h * 0.36;
  const width = wordmarkWidth(h);
  const x0 = cx - width / 2;
  const y0 = cy - h / 2;
  const textX = x0 + markWidth + gap;
  return (
    <g aria-hidden opacity={opacity}>
      <g transform={`translate(${x0}, ${y0}) scale(${h / MARK_HEIGHT})`} fill={markFill ?? fill}>
        <path d={MARK_L} />
        <path d={MARK_R} />
      </g>
      <text
        x={textX}
        y={y0 + h * 0.44}
        fontFamily="Inter, sans-serif"
        fontWeight={600}
        fontSize={fontSize}
        letterSpacing={-fontSize * 0.03}
        fill={fill}
      >
        breaking
      </text>
      <text
        x={textX}
        y={y0 + h * 0.94}
        fontFamily="Inter, sans-serif"
        fontWeight={600}
        fontSize={fontSize}
        letterSpacing={-fontSize * 0.03}
        fill={fill}
      >
        the lines
      </text>
    </g>
  );
}

export interface WordmarkProps {
  /** Mark height in px; the whole lockup's size follows from this. */
  height: number;
  /** Text fill. Defaults to white. */
  fill?: string;
  /** Mark fill. Defaults to `fill`. */
  markFill?: string;
  /** Overall opacity. */
  opacity?: number;
}

/** The standalone BTL wordmark, sized to a given mark height. */
export function Wordmark({ height, fill = '#ffffff', markFill, opacity = 1 }: WordmarkProps) {
  const width = wordmarkWidth(height);
  const titleId = useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Breaking The Lines</title>
      <WordmarkGroup
        cx={width / 2}
        cy={height / 2}
        h={height}
        fill={fill}
        markFill={markFill}
        opacity={opacity}
      />
    </svg>
  );
}

export interface ChartWatermarkProps {
  /** Chart viewport width. */
  width: number;
  /** Chart viewport height. */
  height: number;
}

/**
 * A faint wordmark, centred behind a chart's data (spec §4.4: "a faint
 * wordmark sits behind every chart"). Fixed at opacity 0.14, as the mock.
 * Render first in a chart's SVG so the data paints over it.
 */
export function ChartWatermark({ width, height }: ChartWatermarkProps) {
  const h = Math.min(width, height) * 0.5;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      focusable="false"
    >
      <WordmarkGroup cx={width / 2} cy={height / 2} h={h} fill="#ffffff" opacity={0.14} />
    </svg>
  );
}

/** Fixed size of the panel signature (mock: `panel_mark`, viewBox `0 0 120 36`, rendered 62x19). */
const SIGNATURE_WIDTH = 62;
const SIGNATURE_HEIGHT = 19;
const SIGNATURE_VIEWBOX_WIDTH = 120;
const SIGNATURE_VIEWBOX_HEIGHT = 36;

/**
 * The full-strength BTL signature that signs every panel, bottom-right, so
 * any screenshot or crop still carries the brand (spec §4.4). Fixed size —
 * position it with the panel's own layout (e.g. a flex row ending in
 * `justify-end`), the same way the mock does.
 */
export function PanelSignature() {
  const titleId = useId();
  const h = SIGNATURE_VIEWBOX_HEIGHT * 0.72;
  return (
    <svg
      width={SIGNATURE_WIDTH}
      height={SIGNATURE_HEIGHT}
      viewBox={`0 0 ${SIGNATURE_VIEWBOX_WIDTH} ${SIGNATURE_VIEWBOX_HEIGHT}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Breaking The Lines</title>
      <WordmarkGroup
        cx={SIGNATURE_VIEWBOX_WIDTH / 2}
        cy={SIGNATURE_VIEWBOX_HEIGHT / 2}
        h={h}
        fill="#ffffff"
        markFill="#E20613"
        opacity={1}
      />
    </svg>
  );
}
