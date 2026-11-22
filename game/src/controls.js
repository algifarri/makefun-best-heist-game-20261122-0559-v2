// SABLE & GOLD — keyboard and mouse, turned into one input object a frame.
// Held keys stay true; pressed-this-frame keys are edge flags the rules
// consume once (E to crack, click to toss a coin, P to pause, R to retry).
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false, interact: false,
    interactPressed: false, confirm: false, restart: false, cancel: false,
    click: null,
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'interact',
};

/** Wire the window's keyboard and the canvas mouse into `input`. */
export function bindInput(input, canvas, hooks) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const held = KEYMAP[event.code];
    if (held) {
      input[held] = true;
      if (held === 'interact') input.interactPressed = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      input.confirm = true;
      if (event.code === 'Space') input.interactPressed = true;
      event.preventDefault();
    } else if (event.code === 'KeyR') {
      input.restart = true;
    } else if (event.code === 'Escape') {
      input.cancel = true;
    } else if (event.code === 'KeyP') {
      hooks.onPause();
    } else if (event.code === 'KeyM') {
      hooks.onMute();
    }
  });
  window.addEventListener('keyup', (event) => {
    const held = KEYMAP[event.code];
    if (held) input[held] = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    input.confirm = true;
  });
  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.sneak = false;
    input.interact = false;
  });
}

/** Clear the edge flags after the rules have read them for this frame. */
export function clearEdgeFlags(input) {
  input.interactPressed = false;
  input.confirm = false;
  input.restart = false;
  input.cancel = false;
  input.click = null;
}
