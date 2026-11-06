// Traduce teclas físicas a órdenes de conducción. WASD o flechas.
const FORWARD = ['KeyW', 'ArrowUp'];
const BACKWARD = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];
const DRIVE_CODES = new Set([...FORWARD, ...BACKWARD, ...LEFT, ...RIGHT]);

const anyHeld = (held, codes) => codes.some((code) => held.has(code));

export function driveInputFromKeys(held) {
  return {
    throttle: Number(anyHeld(held, FORWARD)) - Number(anyHeld(held, BACKWARD)),
    steer: Number(anyHeld(held, LEFT)) - Number(anyHeld(held, RIGHT)),
  };
}

// Las combinaciones del sistema (Cmd+W, Ctrl+S) no conducen. En macOS, con Cmd pulsado el navegador no avisa
// al soltar las demás teclas, así que se sueltan todas para que el rover no siga solo.
export function createKeyboard(target = window) {
  const held = new Set();
  const releaseAll = () => held.clear();

  target.addEventListener('keydown', (event) => {
    if (event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') {
      releaseAll();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || !DRIVE_CODES.has(event.code)) return;
    event.preventDefault();
    held.add(event.code);
  });
  target.addEventListener('keyup', (event) => held.delete(event.code));
  target.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', releaseAll);

  return {
    get input() {
      return driveInputFromKeys(held);
    },
  };
}
