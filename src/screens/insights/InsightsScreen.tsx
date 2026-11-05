import { useMemo, useState } from 'react';
import { ClipboardText } from '@phosphor-icons/react';
import { BarChart } from '../../charts/BarChart';
import { Balance } from '../../charts/Balance';
import { C, ChartCard, type LegendItem } from '../../charts/ChartCard';
import { LineChart } from '../../charts/LineChart';
import { Scatter } from '../../charts/Scatter';
import { SleepMap } from '../../charts/SleepMap';
import {
  type Period,
  balanceWeeks,
  feedIntervalsIn,
  hasChartData,
  periodDays,
  sleepMapRows,
  wakeWindowsIn,
} from '../../domain/charts';
import { insights } from '../../domain/insights';
import { median } from '../../domain/time';
import { cap } from '../../domain/wording';
import { Seg } from '../../components/Seg';
import { useStore } from '../../state/store';
import { useModel } from '../../state/useModel';
import { useUI } from '../../state/ui';
import { ClockCard } from './ClockCard';
import { VitdCard } from './VitdCard';
import { WeekTable } from './WeekTable';
import './Insights.css';

const PERIODS: [Period, string][] = [
  [7, '7 dagar'],
  [28, '4 veckor'],
];

/** The week table, insight cards, then the charts. */
export function InsightsScreen({ now }: { now: number }) {
  const m = useModel(now);
  const { settings } = useStore();
  const ui = useUI();
  const [period, setPeriod] = useState<Period>(7);
  const cards = useMemo(() => insights(m), [m]);
  const { one, many } = m.words;
  // The app does not know the baby's gender, so questions use the name.
  const name = settings.name.trim() || 'bebisen';

  const feedLegend: LegendItem[] = [
    ...(m.useBreast ? [{ label: 'Amning', color: C.feed }] : []),
    ...(m.useBottle ? [{ label: 'Flaska', color: C.bottle }] : []),
  ];
  const sameSession =
    m.mode === 'Amning'
      ? 'Båda brösten inom 30 min räknas som ett tillfälle'
      : m.mode === 'Flaska'
        ? 'Flaskor inom 30 min räknas som ett tillfälle'
        : 'Bröst och flaska inom 30 min räknas som ett tillfälle';

  const charts = useMemo(() => {
    if (!hasChartData(m)) return null;
    const days = periodDays(m, period);
    const windows = wakeWindowsIn(m, period);
    return { days, windows, intervals: feedIntervalsIn(m, period), rows: sleepMapRows(m, period), weeks: balanceWeeks(m, period) };
  }, [m, period]);

  return (
    <div className="scroll-screen insights">
      <div className="insights-head">
        <h2>Insikter</h2>
        <Seg label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <WeekTable m={m} />

      <button type="button" className="btn btn-secondary btn-block insights-bvc" onClick={() => ui.openSheet({ kind: 'bvc' })}>
        <ClipboardText size={18} />
        Sammanfattning till BVC
      </button>

      {cards.map((c) => (
        <div key={c.kicker} className="card insight" data-available={c.available}>
          <span className="card-kicker">{c.kicker}</span>
          <span className="insight-text">{c.text}</span>
        </div>
      ))}

      <VitdCard m={m} period={period} />

      {!charts && <div className="card insights-empty">Graferna fylls på när det finns några dygns data.</div>}

      {charts && (
        <>
          <ClockCard m={m} period={period} feedLegend={feedLegend} />
          <ChartCard
            title="Sömnkarta"
            question="Ett dygn per rad, 18–18, nyast överst"
            legend={[{ label: 'Sömn', color: C.sleep }, ...feedLegend]}
          >
            <SleepMap rows={charts.rows} now={m.now} compact={period === 28} />
          </ChartCard>
          <ChartCard title="Längsta sömnpass per natt" question="Blir nätterna mer sammanhängande?">
            <LineChart days={charts.days} />
          </ChartCard>
          <ChartCard
            title="Sömn per dygn"
            question="Flyttas sömnen från dag till natt?"
            legend={[
              { label: 'Natt', color: C.sleep },
              { label: 'Dag', color: C.sleepDay },
            ]}
          >
            <BarChart days={charts.days} mode="sleep" />
          </ChartCard>
          <ChartCard
            title={`${cap(many)} per dygn`}
            question={`Hur ofta äter ${name}? ${sameSession}`}
            legend={feedLegend.length > 1 ? feedLegend : []}
          >
            <BarChart days={charts.days} mode="feeds" />
          </ChartCard>
          {m.useBottle && (
            <ChartCard title="Flaskmängd per dygn" question="Milliliter totalt per dygn">
              <BarChart days={charts.days} mode="ml" />
            </ChartCard>
          )}
          <ChartCard
            title="Vakenfönster"
            question={`Hur länge orkar ${name} vara vaken, och när?`}
            legend={[{ label: 'Vakenfönster', color: C.awake }]}
          >
            <Scatter
              points={charts.windows}
              maxMinutes={150}
              color={C.awake}
              median={median(charts.windows.map((w) => w.len))}
            />
          </ChartCard>
          <ChartCard
            title={m.words.interval}
            question={`Tid till nästa ${one}, per klockslag`}
            legend={[{ label: cap(one), color: m.mode === 'Flaska' ? C.bottle : C.feed }]}
          >
            <Scatter points={charts.intervals} maxMinutes={300} color={m.mode === 'Flaska' ? C.bottle : C.feed} />
          </ChartCard>
          {m.useBreast && charts.weeks.length > 0 && (
            <ChartCard title="Bröstbalans" question="Används båda brösten ungefär lika mycket?">
              <Balance weeks={charts.weeks} />
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
