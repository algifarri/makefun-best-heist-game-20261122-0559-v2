// SABLE & GOLD — the three casino floors.
// Every floor is one 32x18 tile room the thief crosses in a single frame:
// guards with vision cones, sweeping cameras, timed laser beams, a loot
// target, keycard doors, hack terminals and safes to crack.
//
// Tile legend:
//   # wall (solid)   . floor   , carpet floor   T table / slot machine (solid)
//   d locked door (solid until the keycard is lifted)   H hack terminal (solid)
//   S safe (solid; crack it to open)   P thief start   E exit elevator
//   D the Aurum Diamond   G gold bar   C chip stack   K keycard
import { COLS, ROWS } from './config.js';

export const TILE_WALL = '#';
export const TILE_DOOR = 'd';
export const TILE_TABLE = 'T';
export const TILE_TERMINAL = 'H';
export const TILE_SAFE = 'S';

/** Tiles the thief and the guards can never walk through. */
export function isSolidTile(tile, doorsOpen) {
  if (tile === TILE_WALL || tile === TILE_TABLE || tile === TILE_TERMINAL || tile === TILE_SAFE) return true;
  if (tile === TILE_DOOR) return !doorsOpen;
  return false;
}

/** Tiles that block a line of sight. Doors block sight while shut. */
export function blocksSight(tile, doorsOpen) {
  return isSolidTile(tile, doorsOpen);
}

function blankGrid() {
  const grid = [];
  for (let row = 0; row < ROWS; row += 1) {
    const line = [];
    for (let col = 0; col < COLS; col += 1) {
      line.push(row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1 ? '#' : '.');
    }
    grid.push(line);
  }
  return grid;
}

function rect(grid, x, y, w, h, tile) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) grid[row][col] = tile;
  }
}

function buildLevel(spec) {
  const grid = blankGrid();
  for (const [x, y, w, h] of spec.carpet ?? []) rect(grid, x, y, w, h, ',');
  for (const [x, y, w, h] of spec.walls ?? []) rect(grid, x, y, w, h, '#');
  for (const [x, y, w, h] of spec.tables ?? []) rect(grid, x, y, w, h, 'T');
  for (const [tx, ty] of spec.doors ?? []) grid[ty][tx] = 'd';
  for (const [tx, ty] of spec.terminals ?? []) grid[ty][tx] = 'H';
  for (const [tx, ty] of spec.safes ?? []) grid[ty][tx] = 'S';
  const loot = [];
  for (const [kind, tx, ty] of spec.loot ?? []) {
    grid[ty][tx] = kind === 'diamond' ? 'D' : kind === 'gold' ? 'G' : kind === 'chip' ? 'C' : 'K';
    loot.push({ kind, tx, ty, taken: false });
  }
  return {
    name: spec.name,
    sub: spec.sub,
    grid: grid.map((line) => line.join('')),
    loot,
    doors: (spec.doors ?? []).map(([tx, ty]) => ({ tx, ty })),
    safes: (spec.safes ?? []).map(([tx, ty], index) => ({
      tx,
      ty,
      contains: spec.safes[index][2],
      open: false,
    })),
    terminals: (spec.terminals ?? []).map(([tx, ty]) => ({ tx, ty })),
    guards: (spec.guards ?? []).map((path, index) => ({ id: index, path })),
    cameras: spec.cameras ?? [],
    lasers: spec.lasers ?? [],
    playerStart: spec.player,
    exit: spec.exit,
    coins: spec.coins,
  };
}

/** Guard patrols are lists of tile waypoints, walked in order and back. */
export const LEVELS = [
  buildLevel({
    name: '1 · Casino Floor',
    sub: 'Lift the chips, slip past the floor men, crack the vault door.',
    carpet: [[2, 2, 14, 4], [3, 12, 14, 3]],
    walls: [[22, 1, 1, 8], [22, 10, 1, 7]],
    tables: [[4, 3, 3, 2], [10, 3, 3, 2], [3, 12, 2, 2], [13, 12, 3, 2], [8, 9, 4, 1], [30, 2, 1, 4], [30, 9, 1, 4]],
    doors: [[22, 9]],
    terminals: [[2, 8]],
    loot: [
      ['chip', 8, 2], ['chip', 16, 2], ['chip', 6, 10], ['chip', 18, 14],
      ['gold', 12, 6], ['gold', 26, 12],
      ['keycard', 6, 14],
      ['diamond', 27, 3],
    ],
    guards: [
      [[5, 5], [16, 5], [16, 14], [5, 14]],
      [[24, 4], [29, 4], [29, 14], [24, 14]],
    ],
    cameras: [
      { tx: 26, ty: 0, dir: 'S' },
      { tx: 22, ty: 5, dir: 'E' },
    ],
    lasers: [{ x1: 24, y1: 13, x2: 29, y2: 13, period: 3.0, phase: 0 }],
    player: [2, 15],
    exit: [29, 15],
    coins: 3,
  }),
  buildLevel({
    name: '2 · Vault Corridor',
    sub: 'The corridor is watched twice over — time the lasers, mind the safe.',
    carpet: [[2, 2, 11, 4], [17, 11, 12, 4]],
    walls: [[15, 1, 1, 8], [15, 10, 1, 7]],
    tables: [[5, 6, 3, 2], [8, 12, 2, 2], [20, 2, 3, 1], [25, 11, 3, 1], [29, 2, 1, 3], [29, 12, 1, 3]],
    doors: [[15, 9]],
    terminals: [[13, 15]],
    safes: [[27, 6, 'safeGold']],
    loot: [
      ['chip', 6, 8], ['chip', 12, 12], ['chip', 20, 10], ['chip', 26, 14],
      ['gold', 8, 15], ['gold', 24, 8],
      ['keycard', 4, 4],
      ['diamond', 28, 2],
    ],
    guards: [
      [[4, 3], [11, 3], [11, 14], [4, 14]],
      [[18, 4], [28, 4], [28, 13], [18, 13]],
      [[24, 6], [24, 12]],
    ],
    cameras: [
      { tx: 10, ty: 0, dir: 'S' },
      { tx: 20, ty: 0, dir: 'S' },
      { tx: 31, ty: 9, dir: 'W' },
    ],
    lasers: [
      { x1: 18, y1: 2, x2: 18, y2: 7, period: 2.0, phase: 0 },
      { x1: 20, y1: 12, x2: 28, y2: 12, period: 2.6, phase: 1.0 },
    ],
    player: [2, 2],
    exit: [28, 16],
    coins: 3,
  }),
  buildLevel({
    name: '3 · The Aurum Vault',
    sub: 'The Diamond sleeps in the safe. Crack it, then run for the lift.',
    carpet: [[2, 2, 10, 4], [20, 12, 10, 4]],
    walls: [
      [13, 6, 7, 1],
      [13, 11, 3, 1], [17, 11, 3, 1],
      [13, 7, 1, 4], [19, 7, 1, 4],
    ],
    tables: [[5, 5, 3, 2], [24, 4, 3, 2], [5, 12, 3, 2], [30, 13, 1, 3]],
    doors: [[16, 11]],
    terminals: [[29, 3]],
    safes: [[16, 8, 'diamond']],
    loot: [
      ['chip', 4, 6], ['chip', 9, 15], ['chip', 22, 15], ['chip', 27, 8],
      ['gold', 7, 14], ['gold', 27, 5],
      ['keycard', 3, 3],
    ],
    guards: [
      [[3, 15], [28, 15], [28, 3], [3, 3]],
      [[11, 4], [21, 4], [21, 13], [11, 13]],
      [[5, 8], [10, 8]],
      [[24, 6], [24, 12]],
    ],
    cameras: [
      { tx: 16, ty: 0, dir: 'S' },
      { tx: 0, ty: 9, dir: 'E' },
      { tx: 31, ty: 9, dir: 'W' },
    ],
    lasers: [
      { x1: 12, y1: 4, x2: 12, y2: 13, period: 2.2, phase: 0 },
      { x1: 6, y1: 14, x2: 26, y2: 14, period: 3.0, phase: 0.5 },
    ],
    player: [2, 16],
    exit: [29, 16],
    coins: 3,
  }),
];

/** Tile character at a tile coordinate (out of bounds reads as wall). */
export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

/** Pixel centre of a tile. */
export function tileCentre(tx, ty) {
  return { x: tx * 40 + 20, y: ty * 40 + 20 };
}
