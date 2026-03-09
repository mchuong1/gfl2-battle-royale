import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { BotSetup } from './components/BotSetup';
import { BattleArena } from './components/BattleArena';
import { RecordingCanvas } from './components/RecordingCanvas';
import { EventLog } from './components/EventLog';
import { Scoreboard } from './components/Scoreboard';
import { createSimulation, stepSimulation } from './simulation';
import { useRecorder } from './hooks/useRecorder';
import type { BotConfig, SimulationState } from './types';

type Phase = 'setup' | 'battle';

const TICK_MS = 1000 / 60; // ~60fps

function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const activeRef = useRef<boolean>(false);

  // Recording
  const arenaCanvasRef = useRef<HTMLCanvasElement>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, isReady, startRecording, stopRecording, scheduleStop, downloadRecording, resetReady } =
    useRecorder();

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

  // Start recording 200 ms after entering battle phase (allows canvas to mount)
  useEffect(() => {
    if (phase !== 'battle') return;
    const timer = setTimeout(() => {
      if (recordingCanvasRef.current) {
        startRecording(recordingCanvasRef.current);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [phase, startRecording]);

  // Schedule the stop 2.5 s after the battle finishes (captures winner banner)
  useEffect(() => {
    if (simState?.finished) {
      scheduleStop(2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simState?.finished]);

  const handleStart = useCallback(
    (bots: BotConfig[]) => {
      // Stop any in-progress recording from a previous battle
      stopRecording();
      resetReady();

      // Stop any existing RAF loop before switching phase
      activeRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const initial = createSimulation(bots);
      const running = { ...initial, running: true };
      stateRef.current = running;
      setSimState(running);
      setPhase('battle');
    },
    [stopRecording, resetReady],
  );

  const handlePause = useCallback(() => {
    if (!stateRef.current) return;
    const toggled = { ...stateRef.current, running: !stateRef.current.running };
    stateRef.current = toggled;
    setSimState(toggled);
  }, []);

  const handleReset = useCallback(() => {
    stopRecording();
    resetReady();
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stateRef.current = null;
    setSimState(null);
    setPhase('setup');
  }, [stopRecording, resetReady]);

  const handleRestart = useCallback(() => {
    if (!stateRef.current) return;
    const bots: BotConfig[] = stateRef.current.bots.map((b) => ({ name: b.name, image: b.image }));
    handleStart(bots);
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
          <div className="battle-title-row">
            <h1 className="battle-title">⚔️ GFL2 Battle Royale</h1>
            {isRecording && <span className="rec-badge">● REC</span>}
          </div>
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
            {isReady && (
              <button className="btn btn-export" onClick={downloadRecording}>
                💾 Export Video
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleReset}>
              🏠 New Setup
            </button>
          </div>
        </div>

        <div className="battle-content">
          <BattleArena state={simState} canvasRef={arenaCanvasRef} />
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
      <RecordingCanvas
        arenaCanvas={arenaCanvasRef.current}
        state={simState}
        onCanvas={(canvas) => { recordingCanvasRef.current = canvas; }}
      />
    </div>
  );
}

export default App;
