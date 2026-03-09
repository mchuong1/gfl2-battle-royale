import { useRef, useEffect } from 'react';
import type { SimulationState } from '../types';

interface RecordingCanvasProps {
  arenaCanvas: HTMLCanvasElement | null;
  state: SimulationState;
  /** Callback that passes the underlying canvas element once it is mounted. */
  onCanvas: (canvas: HTMLCanvasElement) => void;
}

const CANVAS_W = 1100;
const CANVAS_H = 700;
const ARENA_W = 700;
const PANEL_X = 710;
const PANEL_W = CANVAS_W - PANEL_X;

export function RecordingCanvas({ arenaCanvas, state, onCanvas }: RecordingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Notify parent about the canvas element once on mount
  useEffect(() => {
    if (canvasRef.current) onCanvas(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw composite every time the state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !arenaCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Background ---
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // --- Blit arena canvas ---
    ctx.drawImage(arenaCanvas, 0, 0, ARENA_W, CANVAS_H);

    // --- Panel separator ---
    ctx.fillStyle = 'rgba(100,160,255,0.25)';
    ctx.fillRect(ARENA_W + 4, 0, 1, CANVAS_H);

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // --- Scoreboard ---
    const aliveBots = state.bots
      .filter((b) => b.alive)
      .sort((a, b) => b.health - a.health);

    let y = 16;

    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SCOREBOARD', PANEL_X + 8, y);
    y += 20;

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#8888bb';
    ctx.fillText(
      `${aliveBots.length} / ${state.bots.length} alive  ·  tick ${state.tick}`,
      PANEL_X + 8,
      y,
    );
    y += 18;

    const maxBotRows = 20;
    for (const bot of aliveBots.slice(0, maxBotRows)) {
      const healthPct = Math.max(0, bot.health / 100);

      // Colored dot
      ctx.beginPath();
      ctx.arc(PANEL_X + 15, y + 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = bot.color;
      ctx.fill();

      // Name
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#ddddee';
      const name = bot.name.length > 15 ? bot.name.slice(0, 14) + '…' : bot.name;
      ctx.fillText(name, PANEL_X + 26, y);

      // HP bar
      const barX = PANEL_X + 26;
      const barY = y + 13;
      const barW = PANEL_W - 42;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, 4);
      const hue = healthPct * 120;
      ctx.fillStyle = `hsl(${hue}, 100%, 45%)`;
      ctx.fillRect(barX, barY, barW * healthPct, 4);

      y += 22;
      if (y > CANVAS_H - 120) break;
    }

    // --- Divider ---
    y += 6;
    ctx.fillStyle = 'rgba(100,160,255,0.2)';
    ctx.fillRect(PANEL_X + 8, y, PANEL_W - 16, 1);
    y += 10;

    // --- Event log ---
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BATTLE LOG', PANEL_X + 8, y);
    y += 15;

    const recentEvents = [...state.events].reverse().slice(0, 12);
    for (const evt of recentEvents) {
      const color =
        evt.type === 'elimination'
          ? '#ff8866'
          : evt.type === 'combat'
            ? '#99ccff'
            : '#888899';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = color;
      const text = evt.message.length > 38 ? evt.message.slice(0, 37) + '…' : evt.message;
      ctx.fillText(text, PANEL_X + 8, y);
      y += 14;
      if (y > CANVAS_H - 10) break;
    }
  }, [arenaCanvas, state]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}
