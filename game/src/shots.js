// SABLE & GOLD — staged frames for the screenshots.
// ?shot=start  title card over floor one, guards mid-patrol
// ?shot=play   mid-heist on floor two: Sable by the gold, a cone sweeping in,
//              the laser live, the alarm a third full
// ?shot=alarm  lockdown on floor three: alarm near full, red cones, a guard
//              closing in while Sable runs for the vault door
// ?shot=win    the victory card over floor three, Diamond in hand
// Every staged scene is built from fixed numbers only, so the same shot
// renders the same pixels on any machine. `?shot=` also freezes the clock.
import { tileCentre } from './casino.js';
import { createCamera, createGuard } from './patrol.js';
import { createThief } from './thief.js';
import { startLevel } from './heist.js';

function placeThief(game, tx, ty, facing) {
  const pos = tileCentre(tx, ty);
  game.thief = createThief(pos);
  game.thief.facing = facing;
  game.thief.sneaking = true;
}

function moveGuardTo(game, index, tx, ty, facing) {
  const guard = game.guards[index];
  const pos = tileCentre(tx, ty);
  guard.x = pos.x;
  guard.y = pos.y;
  guard.facing = facing;
}

function takeLoot(game, kind) {
  for (const loot of game.level.loot) {
    if (loot.kind === kind && !loot.taken) {
      loot.taken = true;
      return;
    }
  }
}

export function stageShot(game, name) {
  if (name === 'start') {
    startLevel(game, 0);
    game.phase = 'title';
    game.time = 0.4;
    game.best = 2450;
    moveGuardTo(game, 0, 10, 5, 0);
    moveGuardTo(game, 1, 26, 9, Math.PI / 2);
    return true;
  }
  if (name === 'play') {
    startLevel(game, 1);
    game.phase = 'play';
    game.time = 26.5;
    placeThief(game, 23, 9, -Math.PI / 2);
    game.thief.sneaking = true;
    moveGuardTo(game, 0, 8, 8, Math.PI / 4);
    moveGuardTo(game, 1, 22, 6, Math.PI / 2);
    moveGuardTo(game, 2, 24, 10, -Math.PI / 2);
    game.cameras[0].facing = 0.5;
    game.cameras[1].facing = Math.PI / 2 + 0.4;
    takeLoot(game, 'chip');
    takeLoot(game, 'chip');
    takeLoot(game, 'gold');
    game.score = 300;
    game.lootValue = 300;
    game.alarm = 34;
    game.maxAlarm = 34;
    game.coinsLeft = 2;
    return true;
  }
  if (name === 'alarm') {
    startLevel(game, 2);
    game.phase = 'play';
    game.time = 41.0;
    placeThief(game, 15, 13, Math.PI);
    moveGuardTo(game, 0, 18, 13, Math.PI);
    moveGuardTo(game, 1, 14, 9, Math.PI / 2);
    moveGuardTo(game, 3, 24, 10, -Math.PI / 2);
    game.guards[0].state = 'chase';
    game.guards[1].state = 'chase';
    takeLoot(game, 'chip');
    takeLoot(game, 'gold');
    game.hasKeycard = true;
    game.doorsOpen = true;
    game.score = 450;
    game.lootValue = 450;
    game.alarm = 92;
    game.maxAlarm = 92;
    game.lockdown = 4.2;
    game.coinsLeft = 1;
    return true;
  }
  if (name === 'win') {
    startLevel(game, 2);
    game.phase = 'win';
    game.time = 0;
    game.score = 3750;
    game.lootValue = 2600;
    game.totalTime = 186;
    game.best = 3750;
    game.diamondTaken = true;
    game.level.safes[0].open = true;
    placeThief(game, 28, 15, -Math.PI / 2);
    moveGuardTo(game, 0, 10, 15, 0);
    moveGuardTo(game, 1, 16, 4, Math.PI / 2);
    return true;
  }
  return false;
}
