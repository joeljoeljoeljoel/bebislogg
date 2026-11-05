import { Activity, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import { BottomSheet } from './components/BottomSheet';
import { type Tab, TabBar } from './components/TabBar';
import { UndoBar } from './components/UndoBar';
import { DiaryScreen } from './screens/diary/DiaryScreen';
import { installGuide } from './pwa/install';
import { InsightsScreen } from './screens/insights/InsightsScreen';
import { InstallGuide } from './screens/InstallGuide';
import { Intro } from './screens/Intro';
import { NowScreen } from './screens/now/NowScreen';
import { BvcSheet } from './sheets/BvcSheet';
import { EditSheet } from './sheets/EditSheet';
import { SettingsSheet } from './sheets/SettingsSheet';
import { useNow } from './state/clock';
import { draftTitle } from './state/draft';
import { useStore } from './state/store';
import { useUI } from './state/ui';
import { useThemeSync } from './theme/theme';

export function App() {
  const { settings } = useStore();
  const ui = useUI();
  const now = useNow();
  useThemeSync(settings, now);
  const [tab, setTab] = useState<Tab>('nu');
  const [guide] = useState(installGuide);
  const sheet = ui.sheet;
  const screens = useRef<HTMLElement>(null);

  // A tab always opens at the top. Each screen scrolls by itself, and a
  // hidden one would otherwise come back where it was left.
  const toTop = (behavior: ScrollBehavior) => {
    for (const el of screens.current?.children ?? []) el.scrollTo({ top: 0, behavior });
  };
  useLayoutEffect(() => toTop('instant'), [tab]);
  const selectTab = (next: Tab) => (next === tab ? toTop('smooth') : setTab(next));

  if (guide) {
    return (
      <div className="app">
        <InstallGuide platform={guide} />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Hidden tabs keep their state, e.g. which dygn are expanded in Dagbok. */}
      <main ref={screens} className="screen">
        <Activity mode={tab === 'nu' ? 'visible' : 'hidden'}>
          <NowScreen now={now} />
        </Activity>
        <Activity mode={tab === 'dagbok' ? 'visible' : 'hidden'}>
          <DiaryScreen now={now} />
        </Activity>
        <Activity mode={tab === 'insikter' ? 'visible' : 'hidden'}>
          <InsightsScreen now={now} />
        </Activity>
      </main>
      {tab !== 'nu' && <UndoBar placement="tab" />}
      <TabBar tab={tab} onChange={selectTab} />
      {sheet && (
        <BottomSheet
          label={
            sheet.kind === 'draft'
              ? draftTitle(sheet.draft)
              : sheet.kind === 'bvc'
                ? 'Sammanfattning till BVC'
                : 'Inställningar'
          }
          onClose={ui.closeSheet}
        >
          {sheet.kind === 'draft' && <EditSheet key={sheet.draft.id ?? sheet.draft.kind} initial={sheet.draft} />}
          {sheet.kind === 'settings' && <SettingsSheet />}
          {sheet.kind === 'bvc' && <BvcSheet now={now} />}
        </BottomSheet>
      )}
      {!settings.setupDone && <Intro />}
    </div>
  );
}
