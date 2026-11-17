import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { DropHalfBottom, Moon, Sun, Trash } from '@phosphor-icons/react';
import type { DiaryEntry } from '../../domain/diary';
import { toApp } from '../../screen';

/** Where the swipe snaps: closed, or open with the delete button showing. */
const OPEN_DX = -88;
/** A horizontal move further than this starts a swipe instead of a tap. */
const SLOP_PX = 6;

interface SwipeState {
  id: string;
  dx: number;
  /** Following the finger, so no transition */
  drag: boolean;
}

/** Swipe left to reveal "Ta bort"; a tap opens the row, or closes an open swipe. */
export function useSwipe(onTap: (id: string) => void) {
  const [state, setState] = useState<SwipeState | null>(null);
  const gesture = useRef<{
    id: string;
    x: number;
    y: number;
    dx0: number;
    moved: boolean;
    /** Moved up or down first: a scroll, not a swipe */
    scrolling: boolean;
    closedOther: boolean;
  } | null>(null);

  // The list must not scroll while a row follows the finger. Not passive, and
  // there from the start, so the browser waits for it.
  useEffect(() => {
    const hold = (e: TouchEvent) => gesture.current?.moved && e.preventDefault();
    document.addEventListener('touchmove', hold, { passive: false });
    return () => document.removeEventListener('touchmove', hold);
  }, []);

  const handlers = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      const closedOther = state !== null && state.id !== id;
      if (closedOther) setState(null);
      gesture.current = {
        id,
        x: e.clientX,
        y: e.clientY,
        dx0: state?.id === id ? state.dx : 0,
        moved: false,
        scrolling: false,
        closedOther,
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g || g.id !== id) return;
      const [dx, dy] = toApp(e.clientX - g.x, e.clientY - g.y);
      if (!g.moved && !g.scrolling) {
        if (Math.abs(dy) > SLOP_PX && Math.abs(dy) >= Math.abs(dx)) g.scrolling = true;
        else if (Math.abs(dx) > SLOP_PX) {
          g.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
      }
      if (g.moved) setState({ id, dx: Math.max(OPEN_DX, Math.min(0, g.dx0 + dx)), drag: true });
    },
    onPointerUp: () => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.id !== id) return;
      if (!g.moved) {
        // A tap closes an open swipe; otherwise it opens the row.
        if (g.dx0 < 0) setState(null);
        else if (!g.closedOther) onTap(id);
        return;
      }
      setState((s) => (s && s.dx < OPEN_DX / 2 ? { id, dx: OPEN_DX, drag: false } : null));
    },
    onPointerCancel: () => {
      gesture.current = null;
      setState(null);
    },
  });

  return { state, handlers, close: () => setState(null), onTap };
}

const ICONS = {
  sleep: <Moon size={17} weight="fill" />,
  vitd: <Sun size={17} weight="fill" />,
  bottle: <DropHalfBottom size={17} weight="fill" />,
};

export function DiaryRow({
  entry,
  swipe,
  onDelete,
}: {
  entry: DiaryEntry;
  swipe: ReturnType<typeof useSwipe>;
  onDelete: (id: string) => void;
}) {
  const e = entry.event;
  const s = swipe.state?.id === e.id ? swipe.state : null;
  const revealed = s !== null && s.dx < 0;

  return (
    <div className="drow">
      <button
        type="button"
        className="drow-delete"
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
        onClick={() => {
          swipe.close();
          onDelete(e.id);
        }}
      >
        <Trash size={20} />
        Ta bort
      </button>
      <div
        className="drow-main"
        data-type={e.type}
        role="button"
        tabIndex={0}
        style={{
          minHeight: entry.height,
          transform: s ? `translateX(${s.dx}px)` : undefined,
          transition: s?.drag ? 'none' : undefined,
        }}
        onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), swipe.onTap(e.id))}
        {...swipe.handlers(e.id)}
      >
        <span className="drow-icon">{e.type === 'feed' ? e.side : ICONS[e.type]}</span>
        <span className="drow-text">
          <span className="drow-time">{entry.time}</span>
          <span className="drow-sub">{entry.sub}</span>
        </span>
        {entry.right && <span className="drow-right">{entry.right}</span>}
      </div>
    </div>
  );
}
