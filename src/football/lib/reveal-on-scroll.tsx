import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Scroll-triggered reveal for the StatsBomb blocks (review #3, item 2).
 *
 * Each animatable block's entrance should play when the block scrolls INTO the
 * viewport, not on mount — so the reveal greets the reader as they reach it.
 *
 * CRITICAL SAFETY — the reveal is a pure ENHANCEMENT over already-visible
 * content, never a visibility gate. This is the deliberate inverse of the #28
 * blank-block bug (where content was gated on an entrance animation and a dropped
 * tick left the block blank). Two things guarantee the content is always visible
 * regardless of whether the in-view trigger ever fires:
 *
 *   1. The wrapper renders its children unconditionally and applies NO opacity/
 *      transform gate to them — the inner block content keeps its own
 *      `initial={false}` (it paints its resting state on the first frame).
 *   2. The wrapper's own motion uses `initial={false}`, so on first paint it is
 *      at its RESTING (fully visible) state. Only once the block enters the
 *      viewport does `animate` switch to a keyframe array that STARTS hidden and
 *      ends at rest — playing the reveal. If the IntersectionObserver never fires
 *      (no support, SSR, a test that doesn't scroll, reduced-motion), `animate`
 *      stays `false` and the content simply remains visible at rest.
 *
 * So the worst case is "the reveal flourish doesn't play", never "the block is
 * blank".
 */

/**
 * Observe `ref` and report whether it has entered the viewport at least once.
 * Latches `true` on first intersection (a one-shot reveal, like framer's
 * `viewport={{ once: true }}`). Returns `false` until then.
 *
 * Degrades safe: if `IntersectionObserver` is unavailable (older runtime, SSR,
 * some test environments) it never flips to `true` — callers MUST treat the
 * not-yet-/never-in-view state as "show the content at rest", which the
 * {@link RevealOnScroll} wrapper does.
 */
export function useInViewOnce(
  ref: React.RefObject<Element | null>,
  { amount = 0.25, rootMargin = '0px 0px -10% 0px' }: { amount?: number; rootMargin?: string } = {}
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: amount, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, amount, rootMargin, inView]);

  return inView;
}

export interface RevealOnScrollProps {
  /** The block content to reveal. Always rendered; never visibility-gated. */
  children: ReactNode;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Vertical rise distance for the reveal, in px. Defaults to 10. */
  rise?: number;
  /** Reveal duration in seconds. Defaults to 0.5. */
  duration?: number;
}

/**
 * Wraps a block's visual so its entrance plays on scroll-in. See the module
 * doc-comment for the safety contract: content is ALWAYS visible; the reveal is a
 * one-shot enhancement that only plays once the wrapper enters the viewport.
 *
 * Implementation: `initial={false}` pins the first paint to the resting state
 * (opacity 1, no offset). While off-screen `animate={false}` (no animation, stays
 * at rest). On first in-view, `animate` becomes a keyframe array
 * `{ opacity: [0, 1], y: [rise, 0] }` — the reveal. Reduced-motion (or no
 * IntersectionObserver) ⇒ it never animates and the content just shows at rest.
 */
export function RevealOnScroll({
  children,
  className,
  rise = 10,
  duration = 0.5,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInViewOnce(ref);
  const reduceMotion = useReducedMotion();
  const play = inView && !reduceMotion;

  return (
    <motion.div
      ref={ref}
      className={className}
      // First paint is the resting state (visible) — content never depends on the
      // reveal firing.
      initial={false}
      // Only animate once in view; the keyframe array starts hidden and ends at
      // rest, so the reveal plays then. Off-screen / reduced-motion ⇒ no animation
      // and the content stays visible at rest.
      animate={play ? { opacity: [0, 1], y: [rise, 0] } : false}
      transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
