import { describe, expect, it } from 'vitest';
import { getStatus, lastFeedText, nextSide, timerParts } from './status';
import { at, bottle, feed, model, sleep } from './testing';
import { MIN } from './time';

describe('getStatus', () => {
  it('is none before anything is logged', () => {
    expect(getStatus(model([], '2026-10-22 12:00'))).toEqual({ kind: 'none' });
  });

  it('is none with only feeds logged', () => {
    expect(getStatus(model([feed('2026-10-22 11:00', 'V')], '2026-10-22 12:00')).kind).toBe('none');
  });

  it('is asleep while a sleep is open', () => {
    const m = model([sleep('2026-10-22 09:00', '2026-10-22 10:00'), sleep('2026-10-22 11:30', null)], '2026-10-22 12:00');
    expect(getStatus(m)).toEqual({ kind: 'asleep', since: at('2026-10-22 11:30') });
  });

  it('is awake since the latest wake-up', () => {
    const m = model([sleep('2026-10-22 11:00', '2026-10-22 11:40'), sleep('2026-10-22 09:00', '2026-10-22 10:00')], '2026-10-22 12:00');
    expect(getStatus(m)).toEqual({ kind: 'awake', since: at('2026-10-22 11:40') });
  });

  it('splits the timer into floored hours and minutes', () => {
    expect(timerParts(72 * MIN + 59_000)).toEqual({ h: 1, m: 12 });
    expect(timerParts(8 * MIN)).toEqual({ h: 0, m: 8 });
  });
});

describe('nextSide', () => {
  it('is null without feeds', () => {
    expect(nextSide(model([], '2026-10-22 12:00'))).toBeNull();
  });

  it('is the opposite of the latest breast, even within one session', () => {
    expect(nextSide(model([feed('2026-10-22 14:00', 'V')], '2026-10-22 15:00'))).toBe('H');
    const vh = [feed('2026-10-22 14:00', 'V'), feed('2026-10-22 14:20', 'H')];
    expect(nextSide(model(vh, '2026-10-22 15:00'))).toBe('V');
  });

  it('ignores bottles', () => {
    const events = [feed('2026-10-22 14:00', 'V'), bottle('2026-10-22 14:15', 60)];
    expect(nextSide(model(events, '2026-10-22 15:00'))).toBe('H');
  });
});

describe('lastFeedText', () => {
  it('describes the latest feeding, also when it joined a session', () => {
    const events = [feed('2026-10-22 14:05', 'V'), feed('2026-10-22 14:20', 'H')];
    expect(lastFeedText(model(events, '2026-10-22 16:15'))).toBe('Senast höger 14:20, för 1 h 55 min sedan');
  });

  it('includes the amount for bottles', () => {
    const events = [bottle('2026-10-22 15:00', 120)];
    expect(lastFeedText(model(events, '2026-10-22 15:30', { feedMode: 'Flaska' }))).toBe(
      'Senast flaska 120 ml 15:00, för 30 min sedan',
    );
  });

  it('uses the wording of the feeding mode when empty', () => {
    expect(lastFeedText(model([], '2026-10-22 12:00'))).toBe('Ingen amning registrerad än');
    expect(lastFeedText(model([], '2026-10-22 12:00', { feedMode: 'Flaska' }))).toBe('Ingen flaska registrerad än');
    expect(lastFeedText(model([], '2026-10-22 12:00', { feedMode: 'Båda' }))).toBe('Ingen matning registrerad än');
  });
});
