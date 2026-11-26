export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MUTE = 8;
export const ACTION_MISSION_1 = 16;
export const ACTION_MISSION_2 = 32;
export const ACTION_MISSION_3 = 64;
export const ACTION_MENU = 128;
export const ACTION_MISSION_4 = 256;
export const ACTION_DROP = 512;
export const ACTION_MISSION_5 = 1024;
export const ACTION_PLANE_PREV = 2048;
export const ACTION_PLANE_NEXT = 4096;
export const ACTION_WEATHER = 8192;
export const ACTION_MISSION_6 = 16384;
export const ACTION_MISSION_7 = 32768;
export const ACTION_MISSION_8 = 65536;
export const ACTION_MISSION_9 = 131072;
export const ACTION_MISSION_10 = 262144;
export const ACTION_MISSION_11 = 524288;
export const ACTION_MISSION_12 = 1048576;
export const ACTION_MISSION_13 = 2097152;
export const ACTION_DIVERT = 4194304;
export const ACTION_PRESS_ON = 8388608;
export const MISSION_ACTIONS = [
  ACTION_MISSION_1, ACTION_MISSION_2, ACTION_MISSION_3, ACTION_MISSION_4, ACTION_MISSION_5,
  ACTION_MISSION_6, ACTION_MISSION_7, ACTION_MISSION_8, ACTION_MISSION_9, ACTION_MISSION_10,
  ACTION_MISSION_11, ACTION_MISSION_12, ACTION_MISSION_13,
];
const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE | ACTION_MENU,
  KeyC: ACTION_CAMERA,
  KeyM: ACTION_MUTE,
  KeyB: ACTION_DROP,
  KeyT: ACTION_WEATHER,
  KeyX: ACTION_DIVERT,
  KeyV: ACTION_PRESS_ON,
  ArrowLeft: ACTION_PLANE_PREV,
  ArrowRight: ACTION_PLANE_NEXT,
  Digit1: ACTION_MISSION_1,
  Digit2: ACTION_MISSION_2,
  Digit3: ACTION_MISSION_3,
  Digit4: ACTION_MISSION_4,
  Digit5: ACTION_MISSION_5,
  Digit6: ACTION_MISSION_6,
  Digit7: ACTION_MISSION_7,
  Digit8: ACTION_MISSION_8,
  Digit9: ACTION_MISSION_9,
  Digit0: ACTION_MISSION_10,
  KeyQ: ACTION_MISSION_11,
  KeyW: ACTION_MISSION_12,
  KeyE: ACTION_MISSION_13,
};
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
    flightInput() {
      return {
        pitch: (down('ArrowUp') ? 1 : 0) + (down('ArrowDown') ? -1 : 0),
        bank: (down('ArrowRight', 'KeyD') ? 1 : 0) + (down('ArrowLeft', 'KeyA') ? -1 : 0),
        throttle: (down('KeyW') ? 1 : 0) + (down('KeyS') ? -1 : 0),
        brake: down('Space'),
      };
    },
    takeActions() {
      const actions = pendingActions;
      pendingActions = 0;
      return actions;
    },
  };
}
