import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { BotSetup } from './components/BotSetup';
import { BattleArena } from './components/BattleArena';
import { EventLog } from './components/EventLog';
import { Scoreboard } from './components/Scoreboard';
import { createSimulation, stepSimulation } from './simulation';
import type { SimulationState } from './types';

type Phase = 'setup' | 'battle';

const TICK_MS = 1000 / 60; // ~60fps

function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const activeRef = useRef<boolean>(false);

  // Animation loop – lives entirely in an effect so no ref is mutated during render
  useEffect(() => {
    if (phase !== 'battle') return;

    activeRef.current = true;

    const loop: FrameRequestCallback = (now) => {
      if (!activeRef.current) return;
      if (now - lastTickRef.current >= TICK_MS) {
        lastTickRef.current = now;
        if (stateRef.current) {
          const next = stepSimulation(stateRef.current);
          stateRef.current = next;
          setSimState({ ...next });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      activeRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase]);

  const handleStart = useCallback((names: string[]) => {
    // Stop any existing loop before switching phase
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const initial = createSimulation(names);
    const running = { ...initial, running: true };
    stateRef.current = running;
    setSimState(running);
    setPhase('battle');
  }, []);

  const handlePause = useCallback(() => {
    if (!stateRef.current) return;
    const toggled = { ...stateRef.current, running: !stateRef.current.running };
    stateRef.current = toggled;
    setSimState(toggled);
  }, []);

  const handleReset = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stateRef.current = null;
    setSimState(null);
    setPhase('setup');
  }, []);

  const handleRestart = useCallback(() => {
    if (!stateRef.current) return;
    const names = stateRef.current.bots.map((b) => b.name);
    handleStart(names);
  }, [handleStart]);

  if (phase === 'setup') {
    return <BotSetup onStart={handleStart} />;
  }

  if (!simState) return null;

  const aliveCount = simState.bots.filter((b) => b.alive).length;
  const totalCount = simState.bots.length;

  return (
    <div className="battle-layout">
      <div className="battle-main">
        <div className="battle-header">
          <h1 className="battle-title">⚔️ GFL2 Battle Royale</h1>
          <div className="battle-controls">
            {!simState.finished && (
              <button
                className={`btn ${simState.running ? 'btn-warning' : 'btn-primary'}`}
                onClick={handlePause}
              >
                {simState.running ? '⏸ Pause' : '▶ Resume'}
              </button>
            )}
            {simState.finished && (
              <button className="btn btn-primary" onClick={handleRestart}>
                🔄 Rematch
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleReset}>
              🏠 New Setup
            </button>
          </div>
        </div>

        <div className="battle-content">
          <BattleArena state={simState} />
          <div className="battle-sidebar">
            <Scoreboard bots={simState.bots} tick={simState.tick} />
            <EventLog
              events={simState.events}
              tick={simState.tick}
              aliveCount={aliveCount}
              totalCount={totalCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
