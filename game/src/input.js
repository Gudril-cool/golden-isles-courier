// Keyboard input: held keys become the pilot's continuous controls (pitch, bank, throttle,
// brakes), and single presses become actions (choose a mission, pause, swap camera, mute).
// The mouse joins in only as a menu pointer — the buttons on the screens are real buttons.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MUTE = 8;
export const ACTION_MISSION_1 = 16;
export const ACTION_MISSION_2 = 32;
export const ACTION_MISSION_3 = 64;
export const ACTION_MENU = 128;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE | ACTION_MENU,
  KeyC: ACTION_CAMERA,
  KeyM: ACTION_MUTE,
  Digit1: ACTION_MISSION_1,
  Digit2: ACTION_MISSION_2,
  Digit3: ACTION_MISSION_3,
};

/** Create the input reader bound to the window; call takeActions once a frame. */
export function createInput() {
  const held = new Set();
  let pendingActions = 0;

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat && KEY_ACTIONS[event.code]) pendingActions |= KEY_ACTIONS[event.code];
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  const down = (...codes) => codes.some((code) => held.has(code));

  return {
    /** The pilot's continuous controls for the flight model. */
    flightInput() {
      return {
        pitch: (down('ArrowUp') ? 1 : 0) + (down('ArrowDown') ? -1 : 0),
        bank: (down('ArrowRight', 'KeyD') ? 1 : 0) + (down('ArrowLeft', 'KeyA') ? -1 : 0),
        throttle: (down('KeyW') ? 1 : 0) + (down('KeyS') ? -1 : 0),
        brake: down('Space'),
      };
    },
    /** Discrete presses since the last call, as an ACTION_* bitmask. */
    takeActions() {
      const actions = pendingActions;
      pendingActions = 0;
      return actions;
    },
  };
}
