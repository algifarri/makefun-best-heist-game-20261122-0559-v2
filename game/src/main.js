// SABLE & GOLD — boot and the frame loop.
// A fixed-step loop (60 updates a second, capped catch-up) drives the rules;
// the renderer paints the current state every animation frame. With
// ?shot=<name> in the URL the game stages one frozen scene instead of
// playing, so screenshots are exact renders of the game's own code.
import { FIELD, STEP } from './config.js';
import { createGame, startLevel, startRun, stepGame, togglePause } from './heist.js';
import { drawGame } from './draw.js';
import { bindInput, clearEdgeFlags, createInput } from './controls.js';
import { createSound } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const sound = createSound();
const game = createGame();
const input = createInput();
let frozen = false;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  startLevel(game, 0);
  game.best = Number(localStorage.getItem('sable-and-gold.best') ?? 0) || 0;
  frozen = stageShot(game, shot);
  if (!frozen) {
    game.phase = 'title';
  }
} else {
  startLevel(game, 0);
  game.best = Number(localStorage.getItem('sable-and-gold.best') ?? 0) || 0;
  game.phase = 'title';
}

bindInput(input, canvas, {
  onPause() {
    togglePause(game);
  },
  onMute() {
    const muted = sound.toggleMute();
    status.textContent = muted ? 'Sound off.' : 'Sound on.';
  },
});

function announce() {
  const lines = [];
  lines.push(game.level.name);
  lines.push('Alarm ' + Math.round(game.alarm) + ' percent.');
  lines.push('Take $' + game.score + '.');
  lines.push(game.lives + (game.lives === 1 ? ' life' : ' lives') + ' left.');
  if (game.phase === 'title') lines.push('Press Enter to start.');
  status.textContent = lines.join(' ');
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!frozen) {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      stepGame(game, input, sound, STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    clearEdgeFlags(input);
  }
  drawGame(ctx, game);
  announce();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
