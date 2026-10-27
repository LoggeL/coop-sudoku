import { useGame } from './lib/store.ts';
import { Lobby } from './components/Lobby.tsx';
import { GameScreen } from './components/game/GameScreen.tsx';
import { ConnectionBanner, Toaster } from './components/ui/Overlays.tsx';
import { Logo } from './components/ui/primitives.tsx';

export function App() {
  const ready = useGame((s) => s.ready);
  const inRoom = useGame((s) => s.room !== null);

  return (
    <>
      {!ready ? (
        <div className="grid min-h-dvh place-items-center">
          <div className="animate-pulse">
            <Logo size={56} />
          </div>
        </div>
      ) : inRoom ? (
        <GameScreen />
      ) : (
        <Lobby />
      )}
      <Toaster />
      <ConnectionBanner />
    </>
  );
}
