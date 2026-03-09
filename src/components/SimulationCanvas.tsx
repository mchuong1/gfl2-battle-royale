import { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useSimulationStore } from '../store/simulationStore';
import { updateBots, getWinner, isSimulationOver, ARENA_WIDTH, ARENA_HEIGHT, Bot } from '../simulation/engine';

interface SimulationCanvasProps {
  onExportReady: (stage: Konva.Stage) => void;
}

export default function SimulationCanvas({ onExportReady }: SimulationCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const animRef = useRef<Konva.Animation | null>(null);
  const botsRef = useRef<Bot[]>([]);
  const botNodesRef = useRef<Map<number, { body: Konva.Circle; range: Konva.Circle; healthBar: Konva.Rect }>>(new Map());
  const statusRef = useRef<string>('idle');

  const { bots, status, setWinner, setStatus, setBots } = useSimulationStore();

  // Sync bots from store into ref on initial load / reset
  useEffect(() => {
    botsRef.current = bots.map(b => ({ ...b }));
  }, [bots]);

  // Sync status into ref so animation loop can read it without stale closures
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initialize konva nodes whenever bots change (reset/start)
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    // Destroy old nodes
    botNodesRef.current.forEach(nodes => {
      nodes.range.destroy();
      nodes.body.destroy();
      nodes.healthBar.destroy();
    });
    botNodesRef.current.clear();

    // Create new nodes for each bot
    for (const bot of botsRef.current) {
      const range = new Konva.Circle({
        x: bot.x,
        y: bot.y,
        radius: bot.combatRadius,
        stroke: bot.color,
        strokeWidth: 1.5,
        opacity: 0.35,
        listening: false,
      });

      const body = new Konva.Circle({
        x: bot.x,
        y: bot.y,
        radius: bot.radius,
        fill: bot.color,
        listening: false,
      });

      const healthBar = new Konva.Rect({
        x: bot.x - bot.radius,
        y: bot.y - bot.radius - 6,
        width: bot.radius * 2,
        height: 4,
        fill: '#2ecc71',
        listening: false,
        cornerRadius: 2,
      });

      layer.add(range);
      layer.add(body);
      layer.add(healthBar);
      botNodesRef.current.set(bot.id, { body, range, healthBar });
    }

    layer.batchDraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bots]);

  // Expose stage to parent for export
  useEffect(() => {
    if (stageRef.current) {
      onExportReady(stageRef.current);
    }
  }, [onExportReady]);

  const startAnimation = useCallback(() => {
    if (animRef.current) animRef.current.stop();

    const layer = layerRef.current;
    if (!layer) return;

    animRef.current = new Konva.Animation((frame) => {
      if (!frame) return;
      if (statusRef.current !== 'running') return;

      const dt = Math.min(frame.timeDiff / 1000, 0.05); // cap at 50ms

      updateBots(botsRef.current, dt);

      // Update konva nodes
      for (const bot of botsRef.current) {
        const nodes = botNodesRef.current.get(bot.id);
        if (!nodes) continue;

        if (!bot.alive) {
          nodes.body.visible(false);
          nodes.range.visible(false);
          nodes.healthBar.visible(false);
          continue;
        }

        nodes.body.x(bot.x);
        nodes.body.y(bot.y);
        nodes.range.x(bot.x);
        nodes.range.y(bot.y);

        // Health bar
        const healthFraction = bot.health / bot.maxHealth;
        nodes.healthBar.x(bot.x - bot.radius);
        nodes.healthBar.y(bot.y - bot.radius - 6);
        nodes.healthBar.width(bot.radius * 2 * healthFraction);
        const hue = healthFraction > 0.5 ? '#2ecc71' : healthFraction > 0.25 ? '#f39c12' : '#e74c3c';
        nodes.healthBar.fill(hue);
      }

      // Check win condition
      if (isSimulationOver(botsRef.current)) {
        const winner = getWinner(botsRef.current);
        setWinner(winner);
        setStatus('finished');
        setBots([...botsRef.current]);
        animRef.current?.stop();
      }
    }, layer);

    animRef.current.start();
  }, [setWinner, setStatus, setBots]);

  // Start/stop animation based on status
  useEffect(() => {
    if (status === 'running') {
      startAnimation();
    } else {
      animRef.current?.stop();
    }

    return () => {
      animRef.current?.stop();
    };
  }, [status, startAnimation]);

  return (
    <Stage
      ref={stageRef}
      width={ARENA_WIDTH}
      height={ARENA_HEIGHT}
      style={{ border: '2px solid #333', borderRadius: '4px' }}
    >
      <Layer>
        {/* Arena background */}
        <Rect
          x={0}
          y={0}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          fill="#1a1a2e"
          listening={false}
        />
        {/* Arena border accent */}
        <Rect
          x={2}
          y={2}
          width={ARENA_WIDTH - 4}
          height={ARENA_HEIGHT - 4}
          stroke="#16213e"
          strokeWidth={4}
          fill="transparent"
          listening={false}
        />
      </Layer>
      <Layer ref={layerRef} />
      {status === 'finished' && (
        <Layer>
          <Rect
            x={ARENA_WIDTH / 2 - 160}
            y={ARENA_HEIGHT / 2 - 40}
            width={320}
            height={80}
            fill="rgba(0,0,0,0.75)"
            cornerRadius={8}
            listening={false}
          />
          <Text
            x={ARENA_WIDTH / 2 - 150}
            y={ARENA_HEIGHT / 2 - 20}
            width={300}
            text="SIMULATION OVER"
            fontSize={24}
            fontStyle="bold"
            fill="#f39c12"
            align="center"
            listening={false}
          />
        </Layer>
      )}
    </Stage>
  );
}
