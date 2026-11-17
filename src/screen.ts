// How the app sits on a phone's screen: no zoom, and always upright.

/** Degrees the app is turned clockwise to stay upright: 0, 90 or -90 */
let turn = 0;

/**
 * Stops pinch zoom. The viewport tag and touch-action in base.css do it in
 * most browsers; iOS ignores the tag, so also stop its gesture events.
 */
export function preventZoom() {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
}

/**
 * Android keeps the installed app in portrait from the manifest, but iOS
 * cannot lock a web app. So on a phone turned sideways the app turns back
 * the other way (App.css).
 */
export function keepUpright() {
  const update = () => {
    // 90 when the phone is turned anticlockwise, -90 (or 270) clockwise.
    // window.orientation is what iOS has always had.
    const legacy = (window as { orientation?: number }).orientation;
    const angle = typeof legacy === 'number' ? legacy : (screen.orientation?.angle ?? 0);
    const phone = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 600;
    turn = !phone || angle % 180 === 0 ? 0 : angle === 90 ? -90 : 90;
    if (turn) document.documentElement.dataset.turn = String(turn);
    else delete document.documentElement.dataset.turn;
  };
  update();
  window.addEventListener('orientationchange', update);
  screen.orientation?.addEventListener('change', update);
}

/** A finger's move on the screen, in the app's own directions */
export function toApp(dx: number, dy: number): [number, number] {
  return turn === -90 ? [-dy, dx] : turn === 90 ? [dy, -dx] : [dx, dy];
}
