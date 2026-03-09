import { useState, useCallback } from 'react';
import Konva from 'konva';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';

export default function App() {
  const [stage, setStage] = useState<Konva.Stage | null>(null);

  const handleExportReady = useCallback((s: Konva.Stage) => {
    setStage(s);
  }, []);

  return (
    <div className="app">
      <h1 className="title">⚔️ GFL2 Battle Royale</h1>
      <p className="subtitle">Top-down bot battle simulator</p>
      <div className="layout">
        <SimulationCanvas onExportReady={handleExportReady} />
        <Controls stage={stage} />
      </div>
    </div>
  );
}
