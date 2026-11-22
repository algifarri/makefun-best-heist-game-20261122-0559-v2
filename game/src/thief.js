// SABLE & GOLD — the thief: movement, collision and the coin toss.
// Sable walks with WASD or the arrows, sneaks with Shift, and tosses a gold
// coin with the mouse to pull a guard off his route. Walls, tables, safes,
// terminals and shut doors all stop her; carpet only slows nothing.
import { COIN_THROW_RANGE, THIEF, TILE } from './config.js';
import { isSolidTile, tileAt } from './casino.js';

export function createThief(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    invulnerable: 0,
    stepTimer: 0,
  };
}

function collides(level, doorsOpen, x, y) {
  const r = THIEF.radius;
  const points = [
    [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    [x, y - r], [x, y + r], [x - r, y], [x + r, y],
  ];
  for (const [px, py] of points) {
    const tile = tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE));
    if (isSolidTile(tile, doorsOpen)) return true;
  }
  return false;
}

/**
 * Move the thief by (dx, dy) for one step, sliding along walls: try the
 * full move, then each axis alone, so corners never trap her.
 */
export function moveThief(thief, level, doorsOpen, dx, dy) {
  if (dx === 0 && dy === 0) {
    thief.moving = false;
    return;
  }
  thief.moving = true;
  thief.facing = Math.atan2(dy, dx);
  const nx = thief.x + dx;
  const ny = thief.y + dy;
  if (!collides(level, doorsOpen, nx, ny)) {
    thief.x = nx;
    thief.y = ny;
    return;
  }
  if (!collides(level, doorsOpen, nx, thief.y)) {
    thief.x = nx;
    return;
  }
  if (!collides(level, doorsOpen, thief.x, ny)) {
    thief.y = ny;
  }
}

/** A thrown coin: it arcs to its target, lands, and rings for attention. */
export function createCoin(x, y, tx, ty) {
  return {
    x, y, fromX: x, fromY: y, toX: tx, toY: ty,
    flight: 0, flightTime: 0.45, landed: false, ring: 0, ringTime: 1.6,
  };
}

/** One fixed step of a coin's flight and ring. */
export function stepCoin(coin, dt) {
  if (!coin.landed) {
    coin.flight += dt / coin.flightTime;
    if (coin.flight >= 1) {
      coin.flight = 1;
      coin.landed = true;
      coin.ring = coin.ringTime;
      coin.x = coin.toX;
      coin.y = coin.toY;
    } else {
      coin.x = coin.fromX + (coin.toX - coin.fromX) * coin.flight;
      coin.y = coin.fromY + (coin.toY - coin.fromY) * coin.flight;
    }
  } else if (coin.ring > 0) {
    coin.ring -= dt;
  }
  return coin.landed && coin.ring <= 0;
}

/** Height of the coin above the floor mid-flight, for the arc drawing. */
export function coinHeight(coin) {
  if (coin.landed) return 0;
  return Math.sin(coin.flight * Math.PI) * 26;
}

/** True when a click target is close enough to throw a coin at. */
export function canThrowTo(thief, tx, ty) {
  return Math.hypot(tx - thief.x, ty - thief.y) <= COIN_THROW_RANGE;
}
