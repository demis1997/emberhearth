import { useGameStore } from './store/gameStore';
import { MainMenu } from './components/MainMenu';
import { TribesReveal } from './components/TribesReveal';
import { HeroSelect } from './components/HeroSelect';
import { TavernView } from './components/TavernView';
import { CombatView } from './components/CombatView';
import { ResultsView } from './components/ResultsView';
import {
  CollectionPage,
  HeroesPage,
  HistoryPage,
  MinionsPage,
  SettingsPage,
  StatsPage,
} from './components/Pages';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="app-root">
      {screen === 'menu' && <MainMenu />}
      {screen === 'tribes' && <TribesReveal />}
      {screen === 'heroSelect' && <HeroSelect />}
      {screen === 'recruit' && <TavernView />}
      {screen === 'combat' && <CombatView />}
      {screen === 'results' && <ResultsView />}
      {screen === 'collection' && <CollectionPage />}
      {screen === 'heroes' && <HeroesPage />}
      {screen === 'minions' && <MinionsPage />}
      {screen === 'history' && <HistoryPage />}
      {screen === 'stats' && <StatsPage />}
      {screen === 'settings' && <SettingsPage />}
    </div>
  );
}
