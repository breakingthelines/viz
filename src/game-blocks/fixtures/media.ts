/**
 * Story images. Not real people: a drawn bust on a white studio background,
 * so the poster's in-browser halftone has something to key out, and a plain
 * placeholder crest for the crest fallback.
 */

let bust: string | null = null;

/** A white-background bust, drawn once, as a PNG data URL. */
export function syntheticHeadshot(): string {
  if (bust) return bust;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 150;
  c.height = 150;
  const x = c.getContext('2d');
  if (!x) return '';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 150, 150);
  x.fillStyle = '#9a9a9a';
  x.beginPath();
  x.ellipse(75, 160, 62, 46, 0, Math.PI, 0);
  x.fill();
  x.fillStyle = '#5c5c5c';
  x.fillRect(64, 92, 22, 26);
  x.fillStyle = '#6e6e6e';
  x.beginPath();
  x.ellipse(75, 66, 30, 36, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#2a2a2a';
  x.beginPath();
  x.ellipse(75, 42, 31, 16, 0, Math.PI, 0);
  x.fill();
  x.fillStyle = '#8a8a8a';
  x.beginPath();
  x.ellipse(66, 66, 9, 14, 0, 0, Math.PI * 2);
  x.fill();
  bust = c.toDataURL('image/png');
  return bust;
}

/** A placeholder crest (not a real club's). */
export const EXAMPLE_CREST =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path d="M50 4 94 18v38c0 30-20 50-44 60C26 106 6 86 6 56V18z" fill="#f3f1ec" stroke="#121212" stroke-width="5"/><path d="M50 22v76M26 46h48" stroke="#121212" stroke-width="7"/></svg>'
  );
