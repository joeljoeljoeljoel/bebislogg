import type { Meal, Sleep } from '../domain/types';
import { type NightConfig, dygnEnd } from '../domain/days';
import { DAY, MIN, hm, pad } from '../domain/time';
import { clockAngle as angle, dygnArc } from './clock';
import './charts.css';

interface Props {
  now: number;
  sleeps: Sleep[];
  meals: Meal[];
  night: NightConfig;
  /** Small: the one on Nu, without labels */
  small?: boolean;
  /** Start of a finished dygn to show instead of the last 24 hours */
  dygn?: number;
}

/** Half the break in the ring where a shown dygn begins and ends, in degrees */
const SEAM_GAP = 2.5;

/**
 * The last 24 hours on a 24-hour face: sleep as arcs, feedings as dots, the
 * night shaded, a hand for now. A whole dygn has no hand; the ring breaks
 * where it begins and ends instead.
 */
export function DayClock({ now, sleeps, meals, night, small = false, dygn }: Props) {
  const size = small ? 108 : 300;
  const c = size / 2;
  const sw = small ? 8 : 14;
  const R = c - (small ? sw / 2 + 3 : sw / 2 + 24);
  const RO = R + sw / 2;

  const pt = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
  };
  const arc = (a0: number, a1: number, r: number) => {
    let d = a1 - a0;
    if (d < 0) d += 360;
    const [x0, y0] = pt(a0, r);
    if (d > 359.5) {
      const [x1, y1] = pt(a0 + 180, r);
      return `M${x0} ${y0}A${r} ${r} 0 1 1 ${x1} ${y1}A${r} ${r} 0 1 1 ${x0} ${y0}`;
    }
    const [x1, y1] = pt(a0 + d, r);
    return `M${x0} ${y0}A${r} ${r} 0 ${d > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };

  const n0 = (night.start / 1440) * 360;
  let nd = ((night.end - night.start) / 1440) * 360;
  if (nd < 0) nd += 360;
  const [w0x, w0y] = pt(n0, RO);
  const [w1x, w1y] = pt(n0 + nd, RO);

  const live = dygn === undefined;
  const from = live ? now - DAY + 3 * MIN : dygn;
  const to = live ? now : dygnEnd(dygn);
  // A feeding exactly at the end of a dygn belongs to the next one.
  const shown = (t: number) => t >= from && (live ? t <= to : t < to);
  const seam = live ? 0 : angle(dygn);
  const [hx, hy] = pt(angle(now), RO + (small ? 2 : 5));
  // The mark across the break, with the time inside the ring
  const [s0x, s0y] = pt(seam, R - sw / 2 - 5);
  const [s1x, s1y] = pt(seam, RO + 5);
  const [slx, sly] = pt(seam, R - sw / 2 - 24);

  return (
    <svg className="dayclock" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {nd > 0 && (
        <path
          className="dc-night"
          d={`M${c} ${c}L${w0x} ${w0y}A${RO} ${RO} 0 ${nd > 180 ? 1 : 0} 1 ${w1x} ${w1y}Z`}
        />
      )}
      {live ? (
        <circle className="dc-ring" cx={c} cy={c} r={R} strokeWidth={sw} />
      ) : (
        <path className="dc-ring" d={arc(seam + SEAM_GAP, seam - SEAM_GAP, R)} strokeWidth={sw} />
      )}
      {sleeps.map((s) => {
        const a = Math.max(s.start, from);
        const b = Math.min(s.end ?? now, to);
        if (b - a < 2 * MIN) return null;
        const span = live ? [angle(a), angle(b)] : dygnArc(a, b, from, to, SEAM_GAP);
        if (!span) return null;
        return <path key={s.id} className="dc-sleep" d={arc(span[0], span[1], R)} strokeWidth={sw} />;
      })}
      {!live && <line className="dc-seam" x1={s0x} y1={s0y} x2={s1x} y2={s1y} />}
      {meals.map((m) => {
        if (!shown(m.t)) return null;
        const kind = m.type === 'bottle' ? 'bottle' : 'feed';
        if (small) {
          const [x, y] = pt(angle(m.t), R);
          return <circle key={m.id} className={`dc-dot dc-${kind}`} cx={x} cy={y} r={3.2} />;
        }
        const [x, y] = pt(angle(m.t), RO + 12);
        return (
          <g key={m.id} className={`dc-mark dc-${kind}`}>
            <circle cx={x} cy={y} r={8} />
            <text x={x} y={y + 3.5}>
              {m.type === 'feed' ? m.side : 'F'}
            </text>
          </g>
        );
      })}
      {!small &&
        Array.from({ length: 24 }, (_, h) => {
          // The time of the break takes the place of an hour label close to it.
          const label = h % 6 === 0 && (live || Math.abs(((h * 15 - seam + 540) % 360) - 180) >= 20);
          if (label) {
            const [x, y] = pt(h * 15, R - sw / 2 - 13);
            return (
              <text key={h} className="dc-label" x={x} y={y + 4}>
                {pad(h)}
              </text>
            );
          }
          // A tick for every other hour, longer every three hours
          const [x0, y0] = pt(h * 15, R - sw / 2 - 2);
          const [x1, y1] = pt(h * 15, R - sw / 2 - (h % 3 === 0 ? 9 : 6));
          return <line key={h} className="dc-tick" x1={x0} y1={y0} x2={x1} y2={y1} />;
        })}
      {live ? (
        <>
          <line className="dc-hand" x1={c} y1={c} x2={hx} y2={hy} strokeWidth={small ? 1.5 : 2} />
          <circle className="dc-hub" cx={c} cy={c} r={small ? 2.5 : 3.5} />
        </>
      ) : (
        <text className="dc-seam-label" x={slx} y={sly + 4}>
          {hm(dygn)}
        </text>
      )}
    </svg>
  );
}
