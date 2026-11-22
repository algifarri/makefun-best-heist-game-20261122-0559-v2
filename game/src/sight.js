// SABLE & GOLD — seeing: vision cones and line of sight.
// A watcher sees the thief when the thief is inside the cone (range and
// angle) and no wall, table, safe, terminal or shut door stands between.
import { TILE } from './config.js';
import { blocksSight, tileAt } from './casino.js';

/** Angle of the vector from (ax, ay) to (bx, by). */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest absolute difference between two angles, in radians. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * True when the segment from (ax, ay) to (bx, by) crosses no sight-blocking
 * tile. Samples every 6 pixels, which is finer than a tile.
 */
export function hasLineOfSight(level, doorsOpen, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const x = ax + (dx * i) / steps;
    const y = ay + (dy * i) / steps;
    const tile = tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
    if (blocksSight(tile, doorsOpen)) return false;
  }
  return true;
}

/**
 * How strongly a watcher at (wx, wy) facing `facing` with `range` and
 * `halfAngle` spots the thief at (px, py): 0 when unseen, up to 1 when the
 * thief fills the middle of the cone at point-blank range.
 */
export function spotStrength(level, doorsOpen, wx, wy, facing, range, halfAngle, px, py) {
  const dx = px - wx;
  const dy = py - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist > 4 && angleDiff(angleTo(wx, wy, px, py), facing) > halfAngle) return 0;
  if (!hasLineOfSight(level, doorsOpen, wx, wy, px, py)) return 0;
  return 1 - dist / range;
}
