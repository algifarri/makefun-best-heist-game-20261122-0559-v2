// SABLE & GOLD — tuning numbers and colours in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  catchRadius: 20,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 175,
  investigateSpeed: 125,
  viewRange: 235,
  viewHalfAngle: 0.52,
  detectRate: 58,
  turnSpeed: 2.6,
  lookTime: 2.2,
};

export const CAMERA = {
  range: 265,
  halfAngle: 0.46,
  detectRate: 46,
  sweepSpeed: 0.55,
  sweepArc: 0.85,
};

export const LASER = {
  beamWidth: 5,
  alarmPerSecond: 55,
  graceSeconds: 0.25,
};

export const ALARM = {
  decayPerSecond: 7,
  lockdownSeconds: 6,
  lockdownReset: 55,
  ghostCeiling: 50,
};

export const LIVES = 3;
export const COINS_PER_LEVEL = 3;
export const COIN_NOISE_RADIUS = 170;
export const COIN_THROW_RANGE = 430;

export const LOOT_VALUE = { chip: 50, gold: 200, diamond: 1000, safeGold: 400 };
export const GHOST_BONUS = 300;
export const CAMERA_OFFLINE_SECONDS = 12;
export const TERMINAL_HOLD_SECONDS = 1.5;

export const PALETTE = {
  floorA: '#2c2044',
  floorB: '#34264f',
  carpet: '#57264a',
  carpetTrim: '#7a3466',
  wall: '#1c162e',
  wallTop: '#4a3670',
  table: '#1d5c46',
  tableTrim: '#2f8f6d',
  slot: '#3a2a12',
  slotGlow: '#ffd166',
  gold: '#f2c94c',
  goldDark: '#b8860b',
  chipRed: '#e5534b',
  chipBlue: '#4fc3f7',
  diamond: '#9be8ff',
  thief: '#1c1a22',
  thiefTrim: '#f2c94c',
  guard: '#2c3550',
  guardTrim: '#8b93a3',
  cone: 'rgba(242, 201, 76, 0.26)',
  coneHot: 'rgba(229, 83, 75, 0.32)',
  coneOff: 'rgba(139, 147, 163, 0.10)',
  laser: '#ff3b30',
  laserDim: 'rgba(255, 59, 48, 0.25)',
  hud: '#120d1d',
  hudText: '#f5edd8',
  hudMuted: '#a89ec4',
  alarmLow: '#3ddc84',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
  exit: '#3ddc84',
  safe: '#4a4a58',
  terminal: '#1f6f6b',
  text: '#f5edd8',
};

/** System font stack only — no webfont is ever fetched. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Best score key for this browser only. */
export const BEST_KEY = 'sable-and-gold.best';
