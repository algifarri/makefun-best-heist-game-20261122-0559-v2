// SABLE & GOLD — the floor men and the cameras.
// Guards walk their patrol loop, turn to investigate a thrown coin, and
// chase the thief while the alarm is at lockdown. Cameras sweep their arc
// and stare while their feed is looped by a hacked terminal.
import { CAMERA, GUARD } from './config.js';
import { tileCentre } from './casino.js';

export function createGuard(spec) {
  const points = spec.path.map(([tx, ty]) => tileCentre(tx, ty));
  return {
    id: spec.id,
    path: points,
    target: 1,
    x: points[0].x,
    y: points[0].y,
    facing: 0,
    state: 'patrol',
    lookTimer: 0,
    investigate: null,
    speed: GUARD.patrolSpeed,
    seenTimer: 0,
  };
}

export function createCamera(spec) {
  const base = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }[spec.dir];
  const pos = tileCentre(spec.tx, spec.ty);
  return {
    tx: spec.tx,
    ty: spec.ty,
    x: pos.x,
    y: pos.y,
    base,
    facing: base,
    sweep: 0,
    sweepDir: 1,
  };
}

function moveTowards(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
  entity.facing = Math.atan2(dy, dx);
  return dist - step < 1;
}

/** One fixed step of a guard's brain. Returns 'caught' when it grabs the thief. */
export function stepGuard(guard, game, dt) {
  const thief = game.thief;
  const distToThief = Math.hypot(thief.x - guard.x, thief.y - guard.y);
  if (distToThief < 26) return 'caught';

  if (game.lockdown > 0) {
    guard.state = 'chase';
    guard.speed = GUARD.chaseSpeed;
    moveTowards(guard, thief.x, thief.y, guard.speed, dt);
    return null;
  }

  if (guard.state === 'chase') {
    guard.state = 'patrol';
    guard.speed = GUARD.patrolSpeed;
  }

  if (guard.state === 'investigate' && guard.investigate) {
    const arrived = moveTowards(guard, guard.investigate.x, guard.investigate.y, GUARD.investigateSpeed, dt);
    if (arrived) {
      guard.lookTimer -= dt;
      guard.facing += GUARD.turnSpeed * dt * 0.6;
      if (guard.lookTimer <= 0) {
        guard.state = 'patrol';
        guard.investigate = null;
        guard.speed = GUARD.patrolSpeed;
      }
    }
    return null;
  }

  const goal = guard.path[guard.target];
  const arrived = moveTowards(guard, goal.x, goal.y, guard.speed, dt);
  if (arrived) {
    guard.target = (guard.target + 1) % guard.path.length;
  }
  return null;
}

/** Send every guard in earshot to look at a noise point. */
export function alertGuardsToNoise(game, x, y, radius) {
  for (const guard of game.guards) {
    if (guard.state === 'chase') continue;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist <= radius) {
      guard.state = 'investigate';
      guard.investigate = { x, y };
      guard.lookTimer = GUARD.lookTime;
      guard.speed = GUARD.investigateSpeed;
    }
  }
}

/** One fixed step of a camera's sweep; frozen while its feed is looped. */
export function stepCamera(camera, offline, dt) {
  if (offline) return;
  camera.sweep += camera.sweepDir * CAMERA.sweepSpeed * dt;
  if (camera.sweep > CAMERA.sweepArc) {
    camera.sweep = CAMERA.sweepArc;
    camera.sweepDir = -1;
  } else if (camera.sweep < -CAMERA.sweepArc) {
    camera.sweep = -CAMERA.sweepArc;
    camera.sweepDir = 1;
  }
  camera.facing = camera.base + camera.sweep;
}

/** Distance from a point to a segment, for laser crossing checks. */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** True while a laser beam is live at this moment in the level. */
export function laserIsLive(laser, time) {
  const phase = ((time + laser.phase) % laser.period) / laser.period;
  return phase < 0.55;
}
