import type { PitchCoordinates } from '#/football/types';

/**
 * StatsBomb coordinate system:
 * - x: 0-120 (yard-based)
 * - y: 0-80 (yard-based)
 * - Origin at bottom-left, attacking right
 */
export function fromStatsBomb(x: number, y: number): PitchCoordinates {
  return {
    x: (x / 120) * 100,
    y: (y / 80) * 100,
  };
}

/**
 * Opta coordinate system:
 * - x: 0-100
 * - y: 0-100
 * - Already normalized
 */
export function fromOpta(x: number, y: number): PitchCoordinates {
  return { x, y };
}

/**
 * Wyscout coordinate system:
 * - x: 0-100
 * - y: 0-100
 * - Origin at top-left (y inverted)
 */
export function fromWyscout(x: number, y: number): PitchCoordinates {
  return {
    x,
    y: 100 - y,
  };
}

/**
 * Convert to SVG viewBox coordinates (0 0 100 100)
 */
export function toSvgCoords(coords: PitchCoordinates): { x: number; y: number } {
  return {
    x: coords.x,
    y: coords.y,
  };
}

/**
 * Convert to half-pitch coordinates (for shot maps)
 * Only shows the attacking half (x: 50-100 mapped to 0-100)
 */
export function toHalfPitchCoords(coords: PitchCoordinates): PitchCoordinates {
  return {
    x: (coords.x - 50) * 2,
    y: coords.y,
  };
}

/**
 * Mirror coordinates (for viewing from other side)
 */
export function mirrorCoords(coords: PitchCoordinates): PitchCoordinates {
  return {
    x: 100 - coords.x,
    y: 100 - coords.y,
  };
}

/**
 * Calculate distance between two points (in normalized units)
 */
export function distance(a: PitchCoordinates, b: PitchCoordinates): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points (in radians)
 */
export function angle(from: PitchCoordinates, to: PitchCoordinates): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
