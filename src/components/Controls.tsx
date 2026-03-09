import { useRef, useState, useCallback } from 'react';
import Konva from 'konva';
import { useSimulationStore } from '../store/simulationStore';
import { createBots } from '../simulation/engine';

interface ControlsProps {
  stage: Konva.Stage | null;
}

export default function Controls({ stage }: ControlsProps) {
  const { botCount, status, winner, setBotCount, setStatus, setBots, reset } = useSimulationStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const handleStart = useCallback(() => {
    if (status === 'idle') {
      setBots(createBots(botCount));
    }
    setStatus('running');
  }, [status, botCount, setBots, setStatus]);

  const handlePause = useCallback(() => {
    setStatus('paused');
  }, [setStatus]);

  const handleReset = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    reset();
  }, [reset]);

  const handleExport = useCallback(() => {
    if (!stage) return;

    const stageCanvas = stage.container().querySelector('canvas');
    if (!stageCanvas) return;

    const stream = stageCanvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'battle-royale.webm';
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    if (status !== 'running') {
      setBots(createBots(botCount));
      setStatus('running');
    }
  }, [stage, status, botCount, setBots, setStatus]);

  const handleStopExport = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return (
    <div className="controls">
      <div className="control-row">
        <label htmlFor="bot-count">
          Bots: <strong>{botCount}</strong>
        </label>
        <input
          id="bot-count"
          type="range"
          min={2}
          max={100}
          value={botCount}
          onChange={(e) => setBotCount(Number(e.target.value))}
          disabled={status === 'running'}
        />
      </div>

      <div className="control-row buttons">
        {status !== 'running' ? (
          <button className="btn btn-start" onClick={handleStart} disabled={status === 'finished'}>
            {status === 'idle' ? 'Start' : 'Resume'}
          </button>
        ) : (
          <button className="btn btn-pause" onClick={handlePause}>
            Pause
          </button>
        )}
        <button className="btn btn-reset" onClick={handleReset}>
          Reset
        </button>
        {!isRecording ? (
          <button className="btn btn-export" onClick={handleExport} title="Record and download as .webm video">
            Export Video
          </button>
        ) : (
          <button className="btn btn-export-stop" onClick={handleStopExport}>
            Stop &amp; Save
          </button>
        )}
      </div>

      {winner && (
        <div className="winner-banner" style={{ backgroundColor: winner.color }}>
          🏆 Bot #{winner.id + 1} Wins!
        </div>
      )}
      {status === 'finished' && !winner && (
        <div className="winner-banner draw">
          💀 All bots eliminated — Draw!
        </div>
      )}
    </div>
  );
}
