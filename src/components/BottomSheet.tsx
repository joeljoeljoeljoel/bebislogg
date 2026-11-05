import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import './BottomSheet.css';

/** A move further than this decides between dragging the sheet and scrolling it. */
const SLOP_PX = 6;
/** Let go further down than this share of its height, the sheet closes. */
const CLOSE_SHARE = 0.25;
/** A flick faster than this, in px per ms, decides too. */
const FLICK_SPEED = 0.5;
/** How long the sheet takes to slide away, as in the CSS. */
const CLOSE_MS = 200;

interface Drag {
  x: number;
  y: number;
  /** Scrolled to the top when the finger came down */
  top: boolean;
  mode: 'wait' | 'drag' | 'scroll';
  dy: number;
  at: number;
  speed: number;
}

/**
 * Drag the sheet down to close it. It follows the finger when it is scrolled
 * to the top and the finger moves down; otherwise the content scrolls.
 */
function useDragDown(sheet: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    let g: Drag | null = null;
    let timer = 0;

    const settle = () => {
      delete el.dataset.dragging;
      el.style.removeProperty('--sheet-y');
    };
    const onStart = (e: TouchEvent) => {
      if (g?.mode === 'drag') settle();
      const t = e.touches[0];
      g =
        e.touches.length === 1
          ? { x: t.clientX, y: t.clientY, top: el.scrollTop <= 0, mode: 'wait', dy: 0, at: e.timeStamp, speed: 0 }
          : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!g || g.mode === 'scroll') return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      if (g.mode === 'wait') {
        if (Math.hypot(dx, dy) <= SLOP_PX) return;
        g.mode = g.top && dy > Math.abs(dx) ? 'drag' : 'scroll';
        if (g.mode === 'scroll') return;
        el.dataset.dragging = '';
      }
      // Instead of scrolling or bouncing
      e.preventDefault();
      g.speed = (dy - g.dy) / Math.max(1, e.timeStamp - g.at);
      g.dy = dy;
      g.at = e.timeStamp;
      el.style.setProperty('--sheet-y', `${Math.max(0, dy)}px`);
    };
    const onEnd = (e: TouchEvent) => {
      if (g?.mode === 'drag') {
        // No click on whatever the finger lets go of
        e.preventDefault();
        // A finger that stopped before letting go is not flicking.
        const speed = e.timeStamp - g.at < 100 ? g.speed : 0;
        if (speed > FLICK_SPEED || (g.dy > el.offsetHeight * CLOSE_SHARE && speed > -FLICK_SPEED)) {
          delete el.dataset.dragging;
          setClosing(true);
          const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          timer = window.setTimeout(onClose, still ? 0 : CLOSE_MS);
        } else settle();
      }
      g = null;
    };
    const onCancel = () => {
      if (g?.mode === 'drag') settle();
      g = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    // Not passive, so the drag can stop the scroll
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onCancel);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    };
  }, [sheet, onClose]);

  return closing;
}

/** A sheet from the bottom. A tap outside, Escape or dragging it down closes it. */
export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  // Only a tap that both starts and ends on the scrim closes the sheet. The
  // release of the long press that opened it must not.
  const downOnScrim = useRef(false);
  const closing = useDragDown(sheet, onClose);

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sheet-scrim"
      data-closing={closing || undefined}
      onPointerDown={(e) => (downOnScrim.current = e.target === e.currentTarget)}
      onClick={(e) => e.target === e.currentTarget && downOnScrim.current && onClose()}
    >
      <div ref={sheet} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <span className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}
