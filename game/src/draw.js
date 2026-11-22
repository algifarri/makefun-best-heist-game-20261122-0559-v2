// SABLE & GOLD — everything the eye sees, painted on one canvas.
// The room, the guards' vision cones (raycast so they stop at walls), the
// cameras, the lasers, the loot and the alarm meter all share one frame.
// Every shimmer uses game.time, never the wall clock, so a frozen staged
// scene renders the same pixels every time.
import { FIELD, FONT, PALETTE, TILE } from './config.js';
import { isSolidTile, tileAt, tileCentre } from './casino.js';
import { laserIsLive } from './patrol.js';
import { coinHeight } from './thief.js';

function conePoints(level, doorsOpen, x, y, facing, range, halfAngle) {
  const points = [{ x, y }];
  const steps = Math.ceil((halfAngle * 2) / 0.055);
  for (let i = 0; i <= steps; i += 1) {
    const angle = facing - halfAngle + (halfAngle * 2 * i) / steps;
    let dist = range;
    for (let d = 8; d < range; d += 6) {
      const px = x + Math.cos(angle) * d;
      const py = y + Math.sin(angle) * d;
      if (isSolidTile(tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE)), doorsOpen)) {
        dist = d;
        break;
      }
    }
    points.push({ x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist });
  }
  return points;
}

function drawCone(ctx, level, doorsOpen, x, y, facing, range, halfAngle, fill) {
  const points = conePoints(level, doorsOpen, x, y, facing, range, halfAngle);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, game) {
  const level = game.level;
  for (let row = 0; row < level.grid.length; row += 1) {
    for (let col = 0; col < level.grid[row].length; col += 1) {
      const tile = level.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (tile === ',') {
        ctx.fillStyle = PALETTE.carpet;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.carpetTrim;
        ctx.fillRect(x, y, TILE, 2);
        ctx.fillRect(x, y + TILE - 2, TILE, 2);
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // Gold flecks on the carpet, placed by a fixed hash of the tile.
  for (let row = 0; row < level.grid.length; row += 1) {
    for (let col = 0; col < level.grid[row].length; col += 1) {
      if (level.grid[row][col] !== ',') continue;
      const hash = (row * 31 + col * 17) % 7;
      if (hash !== 0) continue;
      ctx.fillStyle = 'rgba(242, 201, 76, 0.25)';
      ctx.fillRect(col * TILE + 10 + hash * 2, row * TILE + 12, 3, 3);
    }
  }
}

function drawWallsAndProps(ctx, game) {
  const level = game.level;
  for (let row = 0; row < level.grid.length; row += 1) {
    for (let col = 0; col < level.grid[row].length; col += 1) {
      const tile = level.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (tile === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 4);
      } else if (tile === 'T') {
        ctx.fillStyle = PALETTE.table;
        roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 6);
        ctx.fill();
        ctx.strokeStyle = PALETTE.tableTrim;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = PALETTE.slotGlow;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'd') {
        ctx.fillStyle = game.doorsOpen ? '#1d5c46' : '#5c1d1d';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = game.doorsOpen ? PALETTE.exit : PALETTE.gold;
        ctx.font = 'bold 15px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(game.doorsOpen ? 'OPEN' : 'KEY', x + TILE / 2, y + TILE / 2);
      } else if (tile === 'H') {
        ctx.fillStyle = PALETTE.terminal;
        roundRect(ctx, x + 4, y + 4, TILE - 8, TILE - 8, 5);
        ctx.fill();
        ctx.fillStyle = '#9be8ff';
        ctx.fillRect(x + 10, y + 10, TILE - 20, 9);
        ctx.fillStyle = '#0b2b29';
        ctx.fillRect(x + 12, y + 23, TILE - 24, 3);
        ctx.fillRect(x + 12, y + 28, TILE - 30, 3);
      } else if (tile === 'S') {
        const safe = level.safes.find((s) => s.tx === col && s.ty === row);
        ctx.fillStyle = PALETTE.safe;
        roundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 6);
        ctx.fill();
        ctx.strokeStyle = safe && safe.open ? PALETTE.exit : PALETTE.gold;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#c8c8d4';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#33333f';
        ctx.fill();
      }
    }
  }
}

function drawLoot(ctx, game) {
  const t = game.time;
  for (const loot of game.level.loot) {
    if (loot.taken) continue;
    const centre = tileCentre(loot.tx, loot.ty);
    const bob = Math.sin(t * 2.4 + loot.tx + loot.ty) * 2;
    if (loot.kind === 'chip') {
      ctx.fillStyle = PALETTE.chipRed;
      ctx.beginPath();
      ctx.ellipse(centre.x, centre.y + bob, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.chipBlue;
      ctx.beginPath();
      ctx.ellipse(centre.x, centre.y + bob - 5, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centre.x, centre.y + bob - 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (loot.kind === 'gold') {
      ctx.fillStyle = PALETTE.goldDark;
      ctx.fillRect(centre.x - 14, centre.y + bob - 6, 28, 13);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(centre.x - 12, centre.y + bob - 8);
      ctx.lineTo(centre.x + 12, centre.y + bob - 8);
      ctx.lineTo(centre.x + 8, centre.y + bob + 5);
      ctx.lineTo(centre.x - 8, centre.y + bob + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(centre.x - 8, centre.y + bob - 7, 6, 3);
    } else if (loot.kind === 'diamond') {
      const glow = 30 + Math.sin(t * 3) * 7;
      const gradient = ctx.createRadialGradient(centre.x, centre.y + bob, 2, centre.x, centre.y + bob, glow);
      gradient.addColorStop(0, 'rgba(155, 232, 255, 0.85)');
      gradient.addColorStop(1, 'rgba(155, 232, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y + bob, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(centre.x, centre.y + bob - 15);
      ctx.lineTo(centre.x + 12, centre.y + bob - 2);
      ctx.lineTo(centre.x, centre.y + bob + 13);
      ctx.lineTo(centre.x - 12, centre.y + bob - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(centre.x - 1, centre.y + bob - 8, 2, 5);
    } else if (loot.kind === 'keycard') {
      ctx.save();
      ctx.translate(centre.x, centre.y + bob);
      ctx.rotate(Math.sin(t * 1.8) * 0.25);
      ctx.fillStyle = PALETTE.gold;
      roundRect(ctx, -11, -7, 22, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#5c1d1d';
      ctx.fillRect(-8, -4, 8, 3);
      ctx.fillRect(-8, 1, 12, 2);
      ctx.restore();
    }
  }
}

function drawExit(ctx, game) {
  const exit = tileCentre(game.level.exit[0], game.level.exit[1]);
  const open = game.diamondTaken;
  const pulse = open ? 0.65 + Math.sin(game.time * 4) * 0.35 : 0.25;
  ctx.fillStyle = open ? `rgba(61, 220, 132, ${pulse})` : 'rgba(139, 147, 163, 0.2)';
  ctx.fillRect(exit.x - 19, exit.y - 19, 38, 38);
  ctx.strokeStyle = open ? PALETTE.exit : '#6a6478';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x - 19, exit.y - 19, 38, 38);
  ctx.fillStyle = open ? '#0b3d20' : '#8b93a3';
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'LIFT' : 'LOCKED', exit.x, exit.y - 1);
}

function drawLasers(ctx, game) {
  for (const laser of game.level.lasers) {
    const a = tileCentre(laser.x1, laser.y1);
    const b = tileCentre(laser.x2, laser.y2);
    const live = laserIsLive(laser, game.time);
    ctx.strokeStyle = live ? PALETTE.laser : PALETTE.laserDim;
    ctx.lineWidth = live ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (live) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a3a46';
    ctx.fillRect(a.x - 6, a.y - 6, 12, 12);
    ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
    ctx.fillStyle = live ? PALETTE.laser : '#7a2a26';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, game) {
  for (const guard of game.guards) {
    const hot = guard.state === 'chase' || game.lockdown > 0;
    drawCone(
      ctx, game.level, game.doorsOpen, guard.x, guard.y, guard.facing,
      235, 0.52, hot ? PALETTE.coneHot : PALETTE.cone,
    );
  }
  for (const guard of game.guards) {
    const hot = guard.state === 'chase' || game.lockdown > 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hot ? PALETTE.alarmHigh : PALETTE.guardTrim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Cap brim points where he looks.
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.facing) * 8, guard.y + Math.sin(guard.facing) * 8);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 17, guard.y + Math.sin(guard.facing) * 17);
    ctx.stroke();
    ctx.fillStyle = '#f5edd8';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (hot) {
      ctx.fillStyle = PALETTE.alarmHigh;
      ctx.font = 'bold 22px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('!', guard.x, guard.y - 16);
    } else if (guard.state === 'investigate') {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 20px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('?', guard.x, guard.y - 16);
    }
  }
}

function drawCameras(ctx, game) {
  const offline = game.time < game.camerasOfflineUntil;
  for (const camera of game.cameras) {
    drawCone(
      ctx, game.level, game.doorsOpen, camera.x, camera.y, camera.facing,
      265, 0.46, offline ? PALETTE.coneOff : 'rgba(155, 232, 255, 0.24)',
    );
  }
  for (const camera of game.cameras) {
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = offline ? '#5a6272' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = offline ? '#5a6272' : '#9be8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.facing) * 16, camera.y + Math.sin(camera.facing) * 16);
    ctx.stroke();
  }
}

function drawCoins(ctx, game) {
  for (const coin of game.coins) {
    const h = coinHeight(coin);
    if (coin.landed && coin.ring > 0) {
      const progress = 1 - coin.ring / coin.ringTime;
      ctx.strokeStyle = `rgba(242, 201, 76, ${0.8 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 10 + progress * 150, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y + 3, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y - h, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawThief(ctx, game) {
  const thief = game.thief;
  if (!thief) return;
  const blink = thief.invulnerable > 0 && Math.floor(game.time * 8) % 2 === 0;
  if (blink) return;
  const radius = thief.sneaking ? 12 : 14;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Sable's gold mask stripe, pointing where she moves.
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(thief.x + Math.cos(thief.facing) * 4, thief.y + Math.sin(thief.facing) * 4);
  ctx.lineTo(thief.x + Math.cos(thief.facing) * (radius + 3), thief.y + Math.sin(thief.facing) * (radius + 3));
  ctx.stroke();
  ctx.fillStyle = '#f5edd8';
  ctx.beginPath();
  ctx.arc(thief.x - 4, thief.y - 2, 2, 0, Math.PI * 2);
  ctx.arc(thief.x + 4, thief.y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function alarmColour(value) {
  if (value < 40) return PALETTE.alarmLow;
  if (value < 75) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawHud(ctx, game) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, FIELD.width, 46);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 17px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SABLE & GOLD', 14, 24);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px ' + FONT;
  ctx.fillText(game.level.name, 168, 24);

  // Alarm meter.
  const meterX = 470;
  const meterW = 230;
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = 'bold 12px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, 15);
  ctx.fillStyle = '#2a2338';
  roundRect(ctx, meterX, 22, meterW, 14, 7);
  ctx.fill();
  const alarmW = Math.max(0, Math.min(1, game.alarm / 100)) * meterW;
  ctx.fillStyle = alarmColour(game.alarm);
  if (alarmW > 0) {
    roundRect(ctx, meterX, 22, alarmW, 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = game.alarm >= 80 ? PALETTE.alarmHigh : '#4a4360';
  ctx.lineWidth = game.alarm >= 80 ? 2 : 1;
  roundRect(ctx, meterX, 22, meterW, 14, 7);
  ctx.stroke();
  if (game.lockdown > 0) {
    ctx.fillStyle = PALETTE.alarmHigh;
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText('LOCKDOWN ' + Math.ceil(game.lockdown) + 's', meterX + meterW + 10, 29);
  }

  // Loot, lives, coins, keycard, clock.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText('$' + game.score.toLocaleString('en-US'), 1180, 18);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px ' + FONT;
  const hearts = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
  ctx.fillStyle = PALETTE.alarmHigh;
  ctx.fillText(hearts, 1180, 36);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.textAlign = 'left';
  ctx.fillText('◉ ' + game.coinsLeft + ' coins', 950, 29);
  if (game.hasKeycard) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(872, 20, 16, 10);
    ctx.fillStyle = '#5c1d1d';
    ctx.fillRect(875, 23, 6, 2);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.fillText('KEY', 892, 29);
  }
  const clock = Math.floor(game.time);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.textAlign = 'right';
  ctx.fillText(Math.floor(clock / 60) + ':' + String(clock % 60).padStart(2, '0'), 1240, 29);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, 46, FIELD.width, 2);
}

function drawHint(ctx, game) {
  ctx.fillStyle = 'rgba(18, 13, 29, 0.85)';
  ctx.fillRect(0, FIELD.height - 26, FIELD.width, 26);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '12px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let hint = 'WASD / arrows move · Shift sneak · Click toss a coin · E use safe / terminal · P pause · M mute';
  if (game.phase === 'crack') hint = 'Press E when the needle is in the green · Esc steps back';
  if (game.camerasOfflineUntil > game.time) {
    hint = `Cameras looped — ${Math.ceil(game.camerasOfflineUntil - game.time)}s left · ` + hint;
  }
  ctx.fillText(hint, FIELD.width / 2, FIELD.height - 13);
}

function drawToast(ctx, game) {
  if (game.messageTimer <= 0 || !game.message) return;
  ctx.font = 'bold 15px ' + FONT;
  const w = ctx.measureText(game.message).width + 28;
  ctx.fillStyle = 'rgba(18, 13, 29, 0.9)';
  roundRect(ctx, (FIELD.width - w) / 2, 58, w, 30, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.message, FIELD.width / 2, 74);
}

function drawTerminalProgress(ctx, game) {
  if (game.terminalProgress <= 0) return;
  const thief = game.thief;
  ctx.strokeStyle = 'rgba(155, 232, 255, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 24, -Math.PI / 2, -Math.PI / 2 + game.terminalProgress * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9be8ff';
  ctx.font = 'bold 11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('HACKING…', thief.x, thief.y - 32);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 8, 20, 0.92)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 300, 130, 680, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 56px ' + FONT;
  ctx.fillText('SABLE & GOLD', FIELD.width / 2, 205);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '22px ' + FONT;
  ctx.fillText('The Aurum Casino Heist', FIELD.width / 2, 248);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('Sable slips into the Aurum Casino after midnight. Lift the chips,', FIELD.width / 2, 292);
  ctx.fillText('crack the safe, take the Diamond — and reach the lift unseen.', FIELD.width / 2, 314);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText('WASD move · Shift sneak · Click toss a coin · E crack & hack · P pause', FIELD.width / 2, 362);
  ctx.fillText('Guards and cameras raise the ALARM. Lasers bite. At 100% — lockdown.', FIELD.width / 2, 388);
  const blink = Math.floor(game.time * 1.6) % 2 === 0;
  if (blink) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('Press Enter or click to start', FIELD.width / 2, 448);
  }
  if (game.best > 0) {
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = '14px ' + FONT;
    ctx.fillText('Best take: $' + game.best.toLocaleString('en-US'), FIELD.width / 2, 500);
  }
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '12px ' + FONT;
  ctx.fillText('An original game — no borrowed art, sound or names.', FIELD.width / 2, 540);
}

function drawCrack(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const crack = game.crack;
  panel(ctx, 410, 220, 460, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px ' + FONT;
  ctx.fillText('CRACK THE SAFE', FIELD.width / 2, 262);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '15px ' + FONT;
  ctx.fillText('Press E when the needle is inside the green.', FIELD.width / 2, 292);
  // Tumbler pips.
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(FIELD.width / 2 - 40 + i * 40, 330, 11, 0, Math.PI * 2);
    ctx.fillStyle = i < crack.tumblers ? PALETTE.exit : '#3a3348';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Needle bar.
  const barX = 470;
  const barW = 340;
  const barY = 380;
  ctx.fillStyle = '#2a2338';
  roundRect(ctx, barX, barY, barW, 22, 8);
  ctx.fill();
  const zone = crack.zones[crack.tumblers];
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(barX + zone * barW, barY, 0.22 * barW, 22);
  const needleX = barX + crack.needle * barW;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(needleX - 2, barY - 6, 4, 34);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px ' + FONT;
  ctx.fillText('Tumbler ' + (crack.tumblers + 1) + ' of 3 — Esc steps back', FIELD.width / 2, 440);
}

function drawLevelClear(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 380, 230, 520, 260);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.exit;
  ctx.font = 'bold 34px ' + FONT;
  ctx.fillText('LEVEL CLEAR', FIELD.width / 2, 290);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '16px ' + FONT;
  const bonus = game.clearBonus ?? { timeBonus: 0, ghost: 0 };
  ctx.fillText(`Time bonus  +$${bonus.timeBonus}`, FIELD.width / 2, 335);
  if (bonus.ghost > 0) ctx.fillText(`Ghost bonus  +$${bonus.ghost}  (never over 50 alarm)`, FIELD.width / 2, 362);
  ctx.fillText('Take so far: $' + game.score.toLocaleString('en-US'), FIELD.width / 2, 395);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '14px ' + FONT;
  ctx.fillText('Next floor…', FIELD.width / 2, 440);
}

function drawCaught(ctx, game) {
  ctx.fillStyle = `rgba(180, 20, 20, ${0.25 + Math.sin(game.time * 10) * 0.08})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('CAUGHT!', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '16px ' + FONT;
  ctx.fillText('The floor men have you. ' + game.lives + (game.lives === 1 ? ' life' : ' lives') + ' left.', FIELD.width / 2, FIELD.height / 2 + 30);
}

function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.85)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 330, 220, 620, 280);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.alarmHigh;
  ctx.font = 'bold 38px ' + FONT;
  ctx.fillText('THE HOUSE WINS', FIELD.width / 2, 285);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px ' + FONT;
  ctx.fillText('Sable is escorted out into the dawn. Take: $' + game.score.toLocaleString('en-US'), FIELD.width / 2, 335);
  ctx.fillText('Best take: $' + game.best.toLocaleString('en-US'), FIELD.width / 2, 365);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText('Press R to try again', FIELD.width / 2, 420);
}

function drawWin(ctx, game) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 300, 180, 680, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.diamond;
  ctx.font = 'bold 36px ' + FONT;
  ctx.fillText('THE DIAMOND IS YOURS', FIELD.width / 2, 245);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px ' + FONT;
  ctx.fillText('Three floors, one Diamond, no alarms that mattered.', FIELD.width / 2, 290);
  ctx.fillText('Final take: $' + game.score.toLocaleString('en-US') + ' in ' + Math.floor(game.totalTime) + 's', FIELD.width / 2, 325);
  ctx.fillText('Best take: $' + game.best.toLocaleString('en-US'), FIELD.width / 2, 355);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 17px ' + FONT;
  ctx.fillText('Press R to run it again', FIELD.width / 2, 420);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '13px ' + FONT;
  ctx.fillText('Sable & Gold — an original game.', FIELD.width / 2, 470);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 6, 16, 0.65)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 40px ' + FONT;
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2);
  ctx.fillStyle = PALETTE.hudMuted;
  ctx.font = '15px ' + FONT;
  ctx.fillText('Press P to keep stealing', FIELD.width / 2, FIELD.height / 2 + 34);
}

/** Draw the whole frame. Assumes the canvas is FIELD.width x FIELD.height. */
export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx, game);
  drawExit(ctx, game);
  drawLoot(ctx, game);
  drawWallsAndProps(ctx, game);
  drawLasers(ctx, game);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawCoins(ctx, game);
  drawThief(ctx, game);
  drawTerminalProgress(ctx, game);
  drawHud(ctx, game);
  drawHint(ctx, game);
  drawToast(ctx, game);

  // Alarm vignette: the room itself turns red as the meter climbs.
  if (game.alarm >= 60 && game.phase === 'play') {
    const strength = (game.alarm - 60) / 100;
    const gradient = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
    );
    gradient.addColorStop(0, 'rgba(229, 83, 75, 0)');
    gradient.addColorStop(1, `rgba(229, 83, 75, ${strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  if (game.phase === 'title') drawTitle(ctx, game);
  else if (game.phase === 'crack') drawCrack(ctx, game);
  else if (game.phase === 'levelclear') drawLevelClear(ctx, game);
  else if (game.phase === 'caught') drawCaught(ctx, game);
  else if (game.phase === 'gameover') drawGameOver(ctx, game);
  else if (game.phase === 'win') drawWin(ctx, game);
  else if (game.phase === 'paused') drawPaused(ctx);
}
