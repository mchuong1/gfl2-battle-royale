import { useRef, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import type { SimulationState } from '../types';

interface BattleArenaProps {
  state: SimulationState;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

const CANVAS_SIZE = 700;

export function BattleArena({ state, canvasRef: externalRef }: BattleArenaProps) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef ?? internalRef;
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // Tracks the bot-ID fingerprint of the last preload pass so we only do
  // image loading work when the bot roster actually changes (i.e. a new
  // battle starts), not on every simulation tick.
  const lastBotFingerprintRef = useRef<string>('');
  // Smoothly interpolated camera state (zoom + world-space focus point)
  const cameraRef = useRef({ zoom: 1, cx: CANVAS_SIZE / 2, cy: CANVAS_SIZE / 2 });

  useEffect(() => {
    // Build a fingerprint that covers ID, name, and image so that a Rematch
    // with the same bot count (which reuses deterministic IDs like bot_0…)
    // still triggers a reset whenever the roster or portraits change.
    // Tick=0 catch handles a same-roster rematch where everything is identical.
    const fingerprint = state.bots.map((b) => `${b.id}|${b.name}|${b.image}`).join(',');
    if (fingerprint === lastBotFingerprintRef.current && state.tick !== 0) return;
    lastBotFingerprintRef.current = fingerprint;
    // Reset to full overview whenever a new battle starts
    cameraRef.current = { zoom: 1, cx: CANVAS_SIZE / 2, cy: CANVAS_SIZE / 2 };

    for (const bot of state.bots) {
      if (!imgCacheRef.current.has(bot.image)) {
        const img = new Image();
        img.src = bot.image;
        imgCacheRef.current.set(bot.image, img);
      }
    }
  }, [state.bots]);
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const draw = useCallback((s: SimulationState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { config, bots, zoneRadius } = s;
    const { arenaX, arenaY, arenaRadius, botRadius } = config;

    // --- Background (drawn pre-transform so it always covers the full canvas) ---
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // --- Camera: cycle between full-arena overview and spotlight on #1 bot ---
    const aliveBots = bots.filter((b) => b.alive);
    const aliveCount = aliveBots.length;
    const SPOTLIGHT_ZOOM = 4.5;
    const DELAY_TICKS = 900;      // hold wide for ~15s before first spotlight
    const CYCLE_TICKS = 540;      // total cycle ~9s at 60fps
    const SPOTLIGHT_TICKS = 200;  // spotlight phase ~3.3s, wide phase ~5.7s

    let targetZoom: number;
    let targetCx: number;
    let targetCy: number;

    // Always stay at full overview for the first 15s so the initial
    // chaos settles before we start spotlighting #1
    const cyclePhase = s.tick < DELAY_TICKS
      ? -1  // -1 = wide
      : ((s.tick - DELAY_TICKS) % CYCLE_TICKS);
    const inSpotlight = cyclePhase >= 0 && cyclePhase < SPOTLIGHT_TICKS;

    if (inSpotlight && aliveCount > 0) {
      // Zoom in on #1 (highest health)
      const leader = aliveBots.reduce((best, b) => b.health > best.health ? b : best, aliveBots[0]);
      targetZoom = SPOTLIGHT_ZOOM;
      targetCx = leader.x;
      targetCy = leader.y;
    } else {
      // Wide view: full arena overview
      targetZoom = 1;
      targetCx = arenaX;
      targetCy = arenaY;
    }

    // Lerp camera smoothly toward target each frame
    const cam = cameraRef.current;
    cam.zoom += (targetZoom - cam.zoom) * 0.05;
    cam.cx += (targetCx - cam.cx) * 0.05;
    cam.cy += (targetCy - cam.cy) * 0.05;
    const camTx = CANVAS_SIZE / 2 - cam.cx * cam.zoom;
    const camTy = CANVAS_SIZE / 2 - cam.cy * cam.zoom;
    ctx.save();
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, camTx, camTy);

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
    const showGlow = aliveCount <= 100;
    for (const bot of bots) {
      if (!bot.alive) continue;

      const { x, y } = bot;
      const isFlashing = bot.attackFlash > 0;

      // Bot glow (skipped at high bot counts for performance)
      if (showGlow) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, botRadius * 2.5);
        glow.addColorStop(0, `${bot.color}55`);
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, botRadius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Bot body (ring/background)
      ctx.beginPath();
      ctx.arc(x, y, botRadius, 0, Math.PI * 2);
      if (isFlashing) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = bot.color;
      }
      ctx.fill();

      // Portrait clipped inside circle
      const img = imgCacheRef.current.get(bot.image);
      if (!isFlashing && img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, botRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - botRadius, y - botRadius, botRadius * 2, botRadius * 2);
        ctx.restore();
      }

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

    // Restore camera transform — everything below is in screen space
    ctx.restore();

    // --- Winner banner (screen space, always centered regardless of zoom) ---
    if (s.finished && s.winnerId) {
      const winner = bots.find((b) => b.id === s.winnerId);
      if (winner) {
        const bx = CANVAS_SIZE / 2;
        const by = CANVAS_SIZE / 2;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(bx - 180, by - 40, 360, 80);
        ctx.strokeStyle = winner.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx - 180, by - 40, 360, 80);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('🏆 WINNER', bx, by - 14);
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillStyle = winner.color;
        ctx.fillText(winner.name, bx, by + 14);
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
