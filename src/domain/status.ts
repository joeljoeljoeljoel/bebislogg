import type { Side } from './types';
import type { Model } from './model';
import { MIN, dur, hm } from './time';
import { sideName } from './wording';

export type Status = { kind: 'none' } | { kind: 'asleep' | 'awake'; since: number };

/** Asleep if a sleep is open, otherwise awake since the latest wake-up. */
export function getStatus(m: Model): Status {
  if (m.openSleep) return { kind: 'asleep', since: m.openSleep.start };
  let lastEnd: number | null = null;
  for (const s of m.sleeps) if (s.end !== null && (lastEnd === null || s.end > lastEnd)) lastEnd = s.end;
  return lastEnd === null ? { kind: 'none' } : { kind: 'awake', since: lastEnd };
}

/** Timer parts in whole elapsed minutes (floored, so it ticks like a clock). */
export function timerParts(ms: number): { h: number; m: number } {
  const total = Math.max(0, Math.floor(ms / MIN));
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** Suggested side: always the opposite of the most recently used breast. */
export function nextSide(m: Model): Side | null {
  const last = m.feeds.at(-1);
  if (!last) return null;
  return last.side === 'V' ? 'H' : 'V';
}

/** "Senast höger 14:20, för 1 h 55 min sedan": the very latest, also within a session */
export function lastFeedText(m: Model): string {
  const last = m.meals.at(-1);
  if (!last) return `Ingen ${m.words.one} registrerad än`;
  const what = last.type === 'bottle' ? `flaska ${last.ml} ml` : sideName(last.side);
  return `Senast ${what} ${hm(last.t)}, för ${dur(m.now - last.t)} sedan`;
}
