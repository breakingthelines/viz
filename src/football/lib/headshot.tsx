import { useId, useState } from 'react';
import { monogram } from '#/football/lib/player-name';
import { finite, finitePositive } from '#/football/lib/finite';

/**
 * A circular player headshot for the SVG football blocks, with a robust monogram
 * fallback. The photo is clipped to a disc over a team-colour backing and ringed
 * so a transparent or part-loaded image still reads. When no `imageUrl` is given
 * — or the supplied one fails to load (a 404, a dead CDN link) — it falls back to
 * the same backing disc carrying the player's initials, so a missing photo never
 * leaves a blank marker.
 *
 * Hosts increasingly feed real headshot URLs that mostly resolve but won't exist
 * for every player; the `onError` swap is what makes that degrade gracefully
 * rather than showing an empty ring.
 */
export interface SvgHeadshotProps {
  /** Disc centre x, in the parent SVG's user units. */
  cx: number;
  /** Disc centre y, in the parent SVG's user units. */
  cy: number;
  /** Disc radius. */
  r: number;
  /** Player display name — drives the monogram fallback. */
  name: string;
  /** Headshot URL. Absent or failed → monogram fallback. */
  imageUrl?: string;
  /** Team-colour backing + (by default) ring colour. */
  color: string;
  /** Ring stroke colour. Defaults to {@link SvgHeadshotProps.color}. */
  ringColor?: string;
  /** Ring stroke width. */
  ringWidth?: number;
  /** Ring stroke opacity. */
  ringOpacity?: number;
  /** Backing-disc fill opacity (behind the photo and the monogram). */
  backingOpacity?: number;
  /** Monogram text fill. Defaults to white. */
  monogramFill?: string;
  /** Monogram font size as a fraction of the radius. */
  monogramSizeRatio?: number;
  /** Optional stroke on the *fallback* monogram disc (some blocks hairline it). */
  fallbackStroke?: string;
  /** Stroke width for the fallback monogram disc. Defaults to 0.3. */
  fallbackStrokeWidth?: number;
  /** Forwarded to the rendered nodes (e.g. to disable pointer events). */
  pointerEvents?: 'none' | 'auto';
}

export function SvgHeadshot({
  cx: cxRaw,
  cy: cyRaw,
  r: rRaw,
  name,
  imageUrl,
  color,
  ringColor,
  ringWidth = 0.6,
  ringOpacity = 0.95,
  backingOpacity = 1,
  monogramFill = 'white',
  monogramSizeRatio = 0.85,
  fallbackStroke,
  fallbackStrokeWidth = 0.3,
  pointerEvents = 'none',
}: SvgHeadshotProps) {
  const clipId = useId();
  const [failed, setFailed] = useState(false);
  const showPhoto = typeof imageUrl === 'string' && imageUrl.length > 0 && !failed;
  const stroke = ringColor ?? color;
  // Backstop: a consumer that hands us a coord/radius derived from sparse data
  // could pass NaN/undefined; collapse to safe finite values so the rendered
  // `<circle>`/`<image>` never emit an invalid attribute.
  const cx = finite(cxRaw);
  const cy = finite(cyRaw);
  const r = finitePositive(rRaw, 1);
  const style = pointerEvents === 'none' ? { pointerEvents: 'none' as const } : undefined;

  if (showPhoto) {
    return (
      <g style={style}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={backingOpacity} />
        <image
          href={imageUrl}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          // Deliberately NO `crossOrigin` here — this is a plain on-screen
          // render, and canvas-tainting rules (what `crossOrigin` is for)
          // only matter when pixels get read back out via a canvas; drawing a
          // cross-origin image straight to the page needs no CORS grant at
          // all, exactly like a normal `<img>`. An earlier version of this
          // component set `crossOrigin="anonymous"` unconditionally so the
          // save-as-image canvas capture wouldn't taint — but that made EVERY
          // on-screen headshot (the vast majority of renders, which never get
          // exported) depend on the CDN returning a matching
          // Access-Control-Allow-Origin for the viewer's exact origin. That
          // isn't guaranteed for every request (a stale pre-CORS edge-cache
          // copy, a not-yet-allowlisted origin, an older hotlink baked into
          // already-published content) — a miss doesn't error visibly, it
          // just silently swaps in the monogram fallback below, which is
          // very plausibly why headshots were reported "not loading" on some
          // devices/networks and not others. The export path no longer needs
          // this attribute either: `captureElementToPng` (viz `utils/export.ts`)
          // pre-inlines every SVG `<image>` href as a same-origin `data:` URI
          // via its OWN independent CORS-safe fetch before rasterising, so it
          // never depends on this live element's crossOrigin at all. See
          // {@link Crest} for the sibling primitive, which still needs
          // `crossOrigin` (its plain `<img>` export path doesn't get the same
          // pre-inlining) — do not "fix" that one to match this without
          // re-verifying its export path first.
          // Missing/404 photo → fall back to the monogram disc below.
          onError={() => setFailed(true)}
          style={style}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={ringWidth}
          strokeOpacity={ringOpacity}
        />
      </g>
    );
  }

  return (
    <g style={style}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={backingOpacity}
        stroke={fallbackStroke ?? 'none'}
        strokeWidth={fallbackStroke ? fallbackStrokeWidth : undefined}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={r * monogramSizeRatio}
        fontWeight="bold"
        fill={monogramFill}
      >
        {monogram(name)}
      </text>
    </g>
  );
}
