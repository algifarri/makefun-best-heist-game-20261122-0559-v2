// SABLE & GOLD — the rules: alarm, loot, keycards, safes, terminals, lives.
// One game object holds the whole run: the current floor, Sable, the guards,
// the cameras, the lasers, the alarm meter and the score. stepGame advances
// one fixed step and calls the sound cues; draw.js only reads this object.
import {
  ALARM, BEST_KEY, CAMERA, CAMERA_OFFLINE_SECONDS, COIN_NOISE_RADIUS,
  COINS_PER_LEVEL, GHOST_BONUS, GUARD, LASER, LIVES, LOOT_VALUE,
  STEP, TERMINAL_HOLD_SECONDS, THIEF, TILE,
} from './config.js';
import { LEVELS, isSolidTile, tileAt, tileCentre } from './casino.js';
import { spotStrength } from './sight.js';
import {
  alertGuardsToNoise, createCamera, createGuard, distanceToSegment,
  laserIsLive, stepCamera, stepGuard,
} from './patrol.js';
import { canThrowTo, createCoin, createThief, moveThief, stepCoin } from './thief.js';
import { makeRandom } from './random.js';

export function createGame() {
  return {
    phase: 'title',
    levelIndex: 0,
    level: LEVELS[0],
    thief: null,
    guards: [],
    cameras: [],
    coins: [],
    alarm: 0,
    maxAlarm: 0,
    lockdown: 0,
    lives: LIVES,
    score: 0,
    lootValue: 0,
    hasKeycard: false,
    doorsOpen: false,
    diamondTaken: false,
    coinsLeft: COINS_PER_LEVEL,
    time: 0,
    totalTime: 0,
    camerasOfflineUntil: -1,
    terminalProgress: 0,
    crack: null,
    message: '',
    messageTimer: 0,
    phaseTimer: 0,
    laserZapTimer: 0,
    best: 0,
    levelStartScore: 0,
  };
}

function say(game, text, seconds = 3) {
  game.message = text;
  game.messageTimer = seconds;
}

/** (Re)build the live entities for a floor, keeping score and lives. */
export function startLevel(game, index) {
  const level = LEVELS[index];
  game.levelIndex = index;
  game.level = level;
  const start = tileCentre(level.playerStart[0], level.playerStart[1]);
  game.thief = createThief(start);
  game.guards = level.guards.map((spec) => createGuard(spec));
  game.cameras = level.cameras.map((spec) => createCamera(spec));
  game.coins = [];
  game.alarm = 0;
  game.maxAlarm = 0;
  game.lockdown = 0;
  game.hasKeycard = false;
  game.doorsOpen = false;
  game.diamondTaken = false;
  game.coinsLeft = level.coins;
  game.time = 0;
  game.camerasOfflineUntil = -1;
  game.terminalProgress = 0;
  game.crack = null;
  game.levelStartScore = game.score;
  for (const loot of level.loot) loot.taken = false;
  for (const safe of level.safes) safe.open = false;
}

export function startRun(game) {
  game.score = 0;
  game.lootValue = 0;
  game.lives = LIVES;
  game.totalTime = 0;
  game.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  startLevel(game, 0);
  game.phase = 'play';
}

function nearestProp(game, tiles) {
  const thief = game.thief;
  let best = null;
  let bestDist = Infinity;
  for (const tile of tiles) {
    const centre = tileCentre(tile.tx, tile.ty);
    const dist = Math.hypot(thief.x - centre.x, thief.y - centre.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = { tile, centre, dist };
    }
  }
  return bestDist <= 56 ? best : null;
}

function freeNeighbourTile(game, tx, ty) {
  const level = game.level;
  const offsets = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dy] of offsets) {
    const tile = tileAt(level, tx + dx, ty + dy);
    if (!isSolidTile(tile, true)) return { tx: tx + dx, ty: ty + dy };
  }
  return { tx, ty };
}

function openSafe(game, safe) {
  safe.open = true;
  if (safe.contains === 'diamond') {
    const spot = freeNeighbourTile(game, safe.tx, safe.ty);
    game.level.loot.push({ kind: 'diamond', tx: spot.tx, ty: spot.ty, taken: false });
    say(game, 'The safe clicks open — the Aurum Diamond is yours!', 4);
  } else {
    game.score += LOOT_VALUE.safeGold;
    game.lootValue += LOOT_VALUE.safeGold;
    say(game, `Safe open — $${LOOT_VALUE.safeGold} in untraceable bills.`, 4);
  }
}

function beginCrack(game, safe) {
  const random = makeRandom(1000 + game.levelIndex * 10 + safe.tx * 3 + safe.ty);
  game.crack = {
    safe,
    needle: 0,
    needleDir: 1,
    tumblers: 0,
    zones: [0, 1, 2].map(() => 0.08 + random() * 0.62),
  };
  game.phase = 'crack';
}

function stepCrack(game, input, sound, dt) {
  const crack = game.crack;
  crack.needle += crack.needleDir * (1.5 + crack.tumblers * 0.55) * dt;
  if (crack.needle >= 1) { crack.needle = 1; crack.needleDir = -1; }
  if (crack.needle <= 0) { crack.needle = 0; crack.needleDir = 1; }
  if (input.cancel) {
    game.crack = null;
    game.phase = 'play';
    say(game, 'You step back from the safe.', 2);
    return;
  }
  if (input.interactPressed) {
    const zone = crack.zones[crack.tumblers];
    if (crack.needle >= zone && crack.needle <= zone + 0.22) {
      crack.tumblers += 1;
      sound.tumbler();
      if (crack.tumblers >= 3) {
        const safe = crack.safe;
        game.crack = null;
        game.phase = 'play';
        openSafe(game, safe);
        sound.gold();
      }
    } else {
      game.alarm = Math.min(100, game.alarm + 12);
      sound.laser();
      say(game, 'Wrong tumbler — the safe rattles. Alarm +12.', 2.5);
    }
  }
}

function collectLoot(game, sound) {
  const thief = game.thief;
  for (const loot of game.level.loot) {
    if (loot.taken) continue;
    const centre = tileCentre(loot.tx, loot.ty);
    if (Math.hypot(thief.x - centre.x, thief.y - centre.y) > 24) continue;
    loot.taken = true;
    if (loot.kind === 'diamond') {
      game.diamondTaken = true;
      game.score += LOOT_VALUE.diamond;
      game.lootValue += LOOT_VALUE.diamond;
      sound.diamond();
      say(game, 'AURUM DIAMOND secured — get to the lift!', 4);
    } else if (loot.kind === 'gold') {
      game.score += LOOT_VALUE.gold;
      game.lootValue += LOOT_VALUE.gold;
      sound.gold();
    } else if (loot.kind === 'chip') {
      game.score += LOOT_VALUE.chip;
      game.lootValue += LOOT_VALUE.chip;
      sound.pickup();
    } else if (loot.kind === 'keycard') {
      game.hasKeycard = true;
      game.doorsOpen = true;
      sound.keycard();
      sound.door();
      say(game, 'Keycard lifted — the vault door swings open.', 3);
    }
  }
}

function stepDetection(game, sound, dt) {
  const thief = game.thief;
  const sneakFactor = thief.sneaking ? 0.45 : 1;
  let seen = 0;
  for (const guard of game.guards) {
    const strength = spotStrength(
      game.level, game.doorsOpen, guard.x, guard.y, guard.facing,
      GUARD.viewRange, GUARD.viewHalfAngle, thief.x, thief.y,
    );
    seen = Math.max(seen, strength);
  }
  if (game.time < game.camerasOfflineUntil) {
    // Cameras looped: their cones are dead.
  } else {
    for (const camera of game.cameras) {
      const strength = spotStrength(
        game.level, game.doorsOpen, camera.x, camera.y, camera.facing,
        CAMERA.range, CAMERA.halfAngle, thief.x, thief.y,
      );
      seen = Math.max(seen, strength * 0.8);
    }
  }
  if (seen > 0) {
    game.alarm = Math.min(100, game.alarm + GUARD.detectRate * seen * sneakFactor * dt);
  } else if (game.lockdown <= 0) {
    game.alarm = Math.max(0, game.alarm - ALARM.decayPerSecond * dt);
  }
  game.maxAlarm = Math.max(game.maxAlarm, game.alarm);

  if (game.alarm >= 100 && game.lockdown <= 0) {
    game.lockdown = ALARM.lockdownSeconds;
    sound.alarm();
    say(game, 'LOCKDOWN! The floor men are coming for you!', 3);
  }
  if (game.lockdown > 0) {
    game.lockdown -= dt;
    if (game.lockdown <= 0) {
      game.alarm = ALARM.lockdownReset;
      say(game, 'The lockdown eases — move while they regroup.', 3);
    }
  }
}

function stepLasers(game, sound, dt) {
  const thief = game.thief;
  for (const laser of game.level.lasers) {
    if (!laserIsLive(laser, game.time)) continue;
    const a = tileCentre(laser.x1, laser.y1);
    const b = tileCentre(laser.x2, laser.y2);
    if (distanceToSegment(thief.x, thief.y, a.x, a.y, b.x, b.y) < THIEF.radius + LASER.beamWidth + 4) {
      game.alarm = Math.min(100, game.alarm + LASER.alarmPerSecond * dt);
      game.maxAlarm = Math.max(game.maxAlarm, game.alarm);
      game.laserZapTimer -= dt;
      if (game.laserZapTimer <= 0) {
        sound.laser();
        game.laserZapTimer = 0.5;
      }
    }
  }
}

function caught(game, sound) {
  game.lives -= 1;
  sound.caught();
  if (game.lives <= 0) {
    game.phase = 'gameover';
    game.phaseTimer = 0;
    if (game.score > game.best) {
      game.best = game.score;
      localStorage.setItem(BEST_KEY, String(game.best));
    }
    return;
  }
  game.phase = 'caught';
  game.phaseTimer = 1.6;
  say(game, `Caught! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`, 2);
}

function levelClear(game, sound) {
  const timeBonus = Math.max(0, 400 - Math.floor(game.time) * 4);
  const ghost = game.maxAlarm <= ALARM.ghostCeiling ? GHOST_BONUS : 0;
  game.score += timeBonus + ghost;
  game.totalTime += game.time;
  sound.win();
  if (game.levelIndex >= LEVELS.length - 1) {
    game.phase = 'win';
    game.phaseTimer = 0;
    if (game.score > game.best) {
      game.best = game.score;
      localStorage.setItem(BEST_KEY, String(game.best));
    }
    return;
  }
  game.phase = 'levelclear';
  game.phaseTimer = 2.4;
  game.clearBonus = { timeBonus, ghost };
}

/** One fixed step. `input` carries the frame's keys, mouse and edge flags. */
export function stepGame(game, input, sound, dt = STEP) {
  if (game.messageTimer > 0) game.messageTimer -= dt;

  if (game.phase === 'title') {
    if (input.confirm) startRun(game);
    return;
  }
  if (game.phase === 'gameover' || game.phase === 'win') {
    if (input.confirm || input.restart) startRun(game);
    return;
  }
  if (game.phase === 'caught') {
    game.phaseTimer -= dt;
    if (game.phaseTimer <= 0) {
      startLevel(game, game.levelIndex);
      game.phase = 'play';
      game.thief.invulnerable = 2;
    }
    return;
  }
  if (game.phase === 'levelclear') {
    game.phaseTimer -= dt;
    if (game.phaseTimer <= 0) startLevel(game, game.levelIndex + 1);
    return;
  }
  if (game.phase === 'crack') {
    stepCrack(game, input, sound, dt);
    return;
  }
  if (game.phase !== 'play') return;

  game.time += dt;
  const thief = game.thief;
  if (thief.invulnerable > 0) thief.invulnerable -= dt;

  // Movement: sneak with Shift, sprint never — a thief does not run.
  thief.sneaking = input.sneak;
  const speed = thief.sneaking ? THIEF.walkSpeed * 0.5 : THIEF.walkSpeed;
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  moveThief(thief, game.level, game.doorsOpen, dx * speed * dt, dy * speed * dt);
  if (thief.moving) {
    thief.stepTimer -= dt;
    if (thief.stepTimer <= 0) {
      sound.step();
      thief.stepTimer = thief.sneaking ? 0.5 : 0.32;
    }
  }

  // Coin toss: click inside range, while coins remain.
  if (input.click && game.coinsLeft > 0 && canThrowTo(thief, input.click.x, input.click.y)) {
    game.coins.push(createCoin(thief.x, thief.y, input.click.x, input.click.y));
    game.coinsLeft -= 1;
    sound.coin();
  }

  // Thrown coins ring and pull guards over.
  for (let i = game.coins.length - 1; i >= 0; i -= 1) {
    const coin = game.coins[i];
    const wasLanded = coin.landed;
    const done = stepCoin(coin, dt);
    if (coin.landed && !wasLanded) alertGuardsToNoise(game, coin.x, coin.y, COIN_NOISE_RADIUS);
    if (done) game.coins.splice(i, 1);
  }

  // Guards and cameras.
  for (const guard of game.guards) {
    if (stepGuard(guard, game, dt) === 'caught' && thief.invulnerable <= 0) {
      caught(game, sound);
      return;
    }
  }
  const camerasOff = game.time < game.camerasOfflineUntil;
  for (const camera of game.cameras) stepCamera(camera, camerasOff, dt);

  stepDetection(game, sound, dt);
  stepLasers(game, sound, dt);
  collectLoot(game, sound);

  // Hack terminal: stand close and hold E.
  const terminal = nearestProp(game, game.level.terminals);
  if (terminal && input.interact) {
    game.terminalProgress += dt / TERMINAL_HOLD_SECONDS;
    if (game.terminalProgress >= 1) {
      game.terminalProgress = 0;
      game.camerasOfflineUntil = game.time + CAMERA_OFFLINE_SECONDS;
      sound.hack();
      say(game, `Cameras looped for ${CAMERA_OFFLINE_SECONDS} seconds — move!`, 3);
    }
  } else {
    game.terminalProgress = Math.max(0, game.terminalProgress - dt);
  }

  // Safe: press E beside it to start cracking tumblers.
  if (input.interactPressed) {
    const safe = nearestProp(game, game.level.safes.filter((s) => !s.open));
    if (safe) {
      beginCrack(game, safe.tile);
      sound.click();
    }
  }

  // Exit: the lift only runs once the Diamond is in hand.
  const exit = tileCentre(game.level.exit[0], game.level.exit[1]);
  if (game.diamondTaken && Math.hypot(thief.x - exit.x, thief.y - exit.y) < 26) {
    game.phase = 'levelclear';
    game.phaseTimer = 0;
    levelClear(game, sound);
  }
}

/** Pause toggle, handled by main.js on the P key so it works from any phase. */
export function togglePause(game) {
  if (game.phase === 'play') game.phase = 'paused';
  else if (game.phase === 'paused') game.phase = 'play';
}
