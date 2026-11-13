import { useEffect, useState } from 'react';

/**
 * Halftone cut-out of a headshot, computed in the browser for the poster look.
 *
 * 1. Key out the studio background: flood fill from the top and side edges,
 *    pure white only (a tinted white shirt stays).
 * 2. Greyscale with auto levels over the kept pixels.
 * 3. Ink dots on a 45 degree lattice, radius from darkness, over paper, then
 *    clipped to the feathered silhouette.
 *
 * Resolves `null` when the image cannot be read (no CORS, a broken URL, a
 * photo with no background to key out), so the poster falls back to the crest
 * or the number alone. An image pipeline that stores the cut-out next to the
 * headshot replaces this later.
 */
export interface HalftoneOptions {
  scale?: number;
  pitch?: number;
  ink: string;
  paper: string;
  gamma?: number;
}

/** Share of the image that must key out as background for a usable cut-out. */
const MIN_BACKGROUND = 0.08;

export function halftone(src: string, opts: HalftoneOptions): Promise<string | null> {
  const { scale = 4, pitch = 5, ink, paper, gamma = 0.75 } = opts;
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        resolve(draw(img, { scale, pitch, ink, paper, gamma }));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function draw(img: HTMLImageElement, o: Required<HalftoneOptions>): string | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(img, 0, 0);
  // Throws on a tainted canvas (no CORS): caught by the caller.
  const d = x.getImageData(0, 0, w, h).data;
  const bg = new Uint8Array(w * h);
  const isBg = (i: number) => {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const a = d[i * 4 + 3];
    if (a < 20) return true;
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= 247 && mx - mn < 8;
  };
  const stack: number[] = [];
  for (let px = 0; px < w; px++) stack.push(px);
  for (let py = 0; py < h; py++) stack.push(py * w, py * w + w - 1);
  let keyed = 0;
  while (stack.length) {
    const i = stack.pop()!;
    if (bg[i] || !isBg(i)) continue;
    bg[i] = 1;
    keyed++;
    const px = i % w;
    const py = (i / w) | 0;
    if (px > 0) stack.push(i - 1);
    if (px < w - 1) stack.push(i + 1);
    if (py > 0) stack.push(i - w);
    if (py < h - 1) stack.push(i + w);
  }
  if (keyed / (w * h) < MIN_BACKGROUND) return null;

  const L = new Float32Array(w * h);
  const hist: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const l = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2];
    L[i] = l;
    if (!bg[i]) hist.push(l);
  }
  hist.sort((a, b) => a - b);
  const lo = hist[Math.floor(hist.length * 0.03)] ?? 0;
  const hi = hist[Math.floor(hist.length * 0.985)] ?? 255;
  const span = Math.max(1, hi - lo);
  const level = (l: number) => Math.min(1, Math.max(0, (l - lo) / span)) ** o.gamma;
  const sample = (sx: number, sy: number) => {
    const ix = Math.min(w - 1, Math.max(0, Math.round(sx)));
    const iy = Math.min(h - 1, Math.max(0, Math.round(sy)));
    return level(L[iy * w + ix]);
  };

  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const mx = m.getContext('2d');
  if (!mx) return null;
  const md = mx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) md.data[i * 4 + 3] = bg[i] ? 0 : 255;
  mx.putImageData(md, 0, 0);

  const W = w * o.scale;
  const H = h * o.scale;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ox = out.getContext('2d');
  if (!ox) return null;
  ox.fillStyle = o.paper;
  ox.fillRect(0, 0, W, H);
  ox.fillStyle = o.ink;
  const cos = Math.SQRT1_2;
  const sin = Math.SQRT1_2;
  const R = Math.hypot(W, H);
  for (let u = -R; u < R; u += o.pitch) {
    for (let v = -R; v < R; v += o.pitch) {
      const px = W / 2 + u * cos - v * sin;
      const py = H / 2 + u * sin + v * cos;
      if (px < -o.pitch || py < -o.pitch || px > W + o.pitch || py > H + o.pitch) continue;
      const dark = 1 - sample(px / o.scale, py / o.scale);
      const r = (o.pitch / 2) * Math.sqrt(dark) * 1.12;
      if (r < 0.35) continue;
      ox.beginPath();
      ox.arc(px, py, r, 0, Math.PI * 2);
      ox.fill();
    }
  }
  ox.globalCompositeOperation = 'destination-in';
  ox.imageSmoothingEnabled = true;
  ox.filter = 'blur(1.2px)';
  ox.drawImage(m, 0, 0, W, H);
  return out.toDataURL('image/png');
}

/**
 * The cut-out for `src`. `status` is `working` while it computes, `ready` with
 * a data URL, or `none` when there is no photo or it cannot be used.
 */
export function useHalftone(
  src: string | undefined,
  opts: HalftoneOptions
): { status: 'working' | 'ready' | 'none'; url: string | null } {
  const [state, setState] = useState<{
    for: string | undefined;
    url: string | null;
    done: boolean;
  }>({ for: undefined, url: null, done: false });
  const { scale, pitch, ink, paper, gamma } = opts;
  useEffect(() => {
    if (!src) return;
    let live = true;
    void halftone(src, { scale, pitch, ink, paper, gamma }).then((u) => {
      if (live) setState({ for: src, url: u, done: true });
    });
    return () => {
      live = false;
    };
  }, [src, scale, pitch, ink, paper, gamma]);
  if (!src) return { status: 'none', url: null };
  if (state.for !== src || !state.done) return { status: 'working', url: null };
  return state.url ? { status: 'ready', url: state.url } : { status: 'none', url: null };
}
