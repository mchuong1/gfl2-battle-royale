import { useRef, useEffect, useCallback } from 'react';
import type { SimulationState } from '../types';

interface BattleArenaProps {
  state: SimulationState;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

const CANVAS_SIZE = 700;

export function BattleArena({ state, canvasRef: externalRef }: BattleArenaProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef ?? internalRef;

  const draw = useCallback((s: SimulationState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { config, bots, zoneRadius } = s;
    const { arenaX, arenaY, arenaRadius, botRadius } = config;

    // --- Background ---
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // --- Outer dark area (outside arena) ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.arc(arenaX, arenaY, arenaRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.restore();

    // --- Arena floor ---
    const arenaGrad = ctx.createRadialGradient(arenaX, arenaY, 0, arenaX, arenaY, arenaRadius);
    arenaGrad.addColorStop(0, '#1a1a2e');
    arenaGrad.addColorStop(0.7, '#16213e');
    arenaGrad.addColorStop(1, '#0f3460');
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaRadius, 0, Math.PI * 2);
    ctx.fillStyle = arenaGrad;
    ctx.fill();

    // --- Grid pattern on arena ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < CANVAS_SIZE; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, CANVAS_SIZE);
      ctx.stroke();
    }
    for (let gy = 0; gy < CANVAS_SIZE; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CANVAS_SIZE, gy);
      ctx.stroke();
    }
    ctx.restore();

    // --- Arena border ---
    ctx.beginPath();
    ctx.arc(arenaX, arenaY, arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,160,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // --- Shrinking zone ---
    if (zoneRadius < arenaRadius) {
      // Danger zone fill (between zone and arena)
      ctx.save();
      ctx.beginPath();
      ctx.arc(arenaX, arenaY, arenaRadius, 0, Math.PI * 2);
      ctx.arc(arenaX, arenaY, zoneRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(255,80,80,0.18)';
      ctx.fill();
      ctx.restore();

      // Zone border (animated pulse)
      const pulse = 0.6 + 0.4 * Math.sin(s.tick * 0.12);
      ctx.beginPath();
      ctx.arc(arenaX, arenaY, zoneRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,80,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // --- Bots ---
    for (const bot of bots) {
      if (!bot.alive) continue;

      const { x, y } = bot;
      const isFlashing = bot.attackFlash > 0;

      // Bot glow
      const glow = ctx.createRadialGradient(x, y, 0, x, y, botRadius * 2.5);
      glow.addColorStop(0, `${bot.color}55`);
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, botRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Bot body
      ctx.beginPath();
      ctx.arc(x, y, botRadius, 0, Math.PI * 2);

      if (isFlashing) {
        // White flash on attack
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = bot.color;
      }
      ctx.fill();

      // Bot border
      ctx.strokeStyle = isFlashing ? '#ffff00' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isFlashing ? 2.5 : 1.5;
      ctx.stroke();

      // --- Health bar ---
      const barWidth = botRadius * 2.5;
      const barHeight = 4;
      const barX = x - barWidth / 2;
      const barY = y - botRadius - 10;
      const healthPct = bot.health / 100;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

      // Health fill
      const hue = healthPct * 120; // green (120) → red (0)
      ctx.fillStyle = `hsl(${hue}, 100%, 45%)`;
      ctx.fillRect(barX, barY, barWidth * Math.max(0, healthPct), barHeight);

      // --- Name label ---
      const fontSize = Math.max(9, Math.min(13, botRadius + 1));
      ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Text shadow
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(bot.name, x + 1, barY - 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(bot.name, x, barY - 3);
    }

    // --- Eliminated overlays (faded) ---
    for (const bot of bots) {
      if (bot.alive) continue;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(bot.x, bot.y, config.botRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#666666';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // --- Winner banner ---
    if (s.finished && s.winnerId) {
      const winner = bots.find((b) => b.id === s.winnerId);
      if (winner) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(arenaX - 180, arenaY - 40, 360, 80);
        ctx.strokeStyle = winner.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(arenaX - 180, arenaY - 40, 360, 80);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🏆 WINNER', arenaX, arenaY - 14);
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = winner.color;
        ctx.fillText(winner.name, arenaX, arenaY + 14);
        ctx.restore();
      }
    }
  }, []);

  useEffect(() => {
    draw(state);
  }, [state, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="battle-canvas"
    />
  );
}
