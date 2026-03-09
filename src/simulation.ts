import type { Bot, GameEvent, SimulationState } from './types';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 700;
const ARENA_RADIUS = 300;
const ZONE_SHRINK_RATE = 0.05; // pixels per tick (at ~60fps ≈ 3px/s)
const ZONE_MIN_RADIUS = 50;
const HEALTH_DRAIN = 0.04; // per tick (at 60fps ≈ 2.4/s)
const ZONE_DAMAGE = 0.15; // extra drain when outside zone
const COMBAT_DAMAGE = 22; // HP damage to loser
const COMBAT_HEAL = 6; // HP heal to winner
const COMBAT_COOLDOWN_TICKS = 80; // ticks before a bot can fight again
const MAX_SPEED = 1.8;
const WANDER_FORCE = 0.3;

const BOT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#F0B27A', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#82E0AA', '#F1948A', '#C39BD3', '#7FB3D3', '#A9DFBF',
  '#FAD7A0', '#EDBB99', '#AED6F1', '#A2D9CE', '#D7BDE2',
];

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function getBotRadius(count: number): number {
  if (count <= 10) return 12;
  if (count <= 25) return 10;
  if (count <= 50) return 8;
  return 6;
}

function getCombatRange(botRadius: number): number {
  return botRadius * 2 + 6;
}

export function createSimulation(names: string[]): SimulationState {
  const arenaX = CANVAS_WIDTH / 2;
  const arenaY = CANVAS_HEIGHT / 2;
  const botRadius = getBotRadius(names.length);
  const combatRange = getCombatRange(botRadius);
  const spread = ARENA_RADIUS - botRadius - 20;

  const bots: Bot[] = names.map((name, i) => {
    // Spread bots around so they don't all start stacked
    const angle = (Math.PI * 2 * i) / names.length + randomInRange(-0.3, 0.3);
    const r = randomInRange(spread * 0.2, spread * 0.85);
    return {
      id: `bot_${i}`,
      name,
      x: arenaX + Math.cos(angle) * r,
      y: arenaY + Math.sin(angle) * r,
      vx: randomInRange(-1, 1),
      vy: randomInRange(-1, 1),
      health: 100,
      alive: true,
      color: BOT_COLORS[i % BOT_COLORS.length],
      combatCooldown: 0,
      eliminationOrder: 0,
      attackFlash: 0,
    };
  });

  return {
    bots,
    tick: 0,
    running: false,
    finished: false,
    winnerId: null,
    events: [],
    zoneRadius: ARENA_RADIUS,
    eliminationCount: 0,
    eventCounter: 0,
    config: {
      arenaX,
      arenaY,
      arenaRadius: ARENA_RADIUS,
      botRadius,
      combatRange,
    },
  };
}

export function stepSimulation(state: SimulationState): SimulationState {
  if (!state.running || state.finished) return state;

  const { config } = state;
  const tick = state.tick + 1;
  const newZoneRadius = Math.max(ZONE_MIN_RADIUS, state.zoneRadius - ZONE_SHRINK_RATE);
  const newEvents: GameEvent[] = [];
  let eventCounter = state.eventCounter;
  let eliminationCount = state.eliminationCount;

  // Deep copy bots
  const bots: Bot[] = state.bots.map((b) => ({ ...b }));

  // --- Movement & passive effects ---
  for (const bot of bots) {
    if (!bot.alive) continue;

    // Passive health drain
    bot.health -= HEALTH_DRAIN;

    // Reduce flash timer
    if (bot.attackFlash > 0) bot.attackFlash--;

    // Reduce combat cooldown
    if (bot.combatCooldown > 0) bot.combatCooldown--;

    const dx = bot.x - config.arenaX;
    const dy = bot.y - config.arenaY;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Zone damage if outside shrinking zone
    if (distFromCenter + config.botRadius > newZoneRadius) {
      bot.health -= ZONE_DAMAGE;
    }

    // Random wander force
    bot.vx += randomInRange(-WANDER_FORCE, WANDER_FORCE);
    bot.vy += randomInRange(-WANDER_FORCE, WANDER_FORCE);

    // Steer away from zone edge
    const margin = 50;
    if (distFromCenter > newZoneRadius - margin) {
      const nx = dx / (distFromCenter || 1);
      const ny = dy / (distFromCenter || 1);
      const force = ((distFromCenter - (newZoneRadius - margin)) / margin) * 1.0;
      bot.vx -= nx * force;
      bot.vy -= ny * force;
    }

    // Clamp speed
    const speed = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
    if (speed > MAX_SPEED) {
      bot.vx = (bot.vx / speed) * MAX_SPEED;
      bot.vy = (bot.vy / speed) * MAX_SPEED;
    }

    // Apply movement
    bot.x += bot.vx;
    bot.y += bot.vy;

    // Bounce off hard arena boundary
    const ndx = bot.x - config.arenaX;
    const ndy = bot.y - config.arenaY;
    const nd = Math.sqrt(ndx * ndx + ndy * ndy);
    if (nd + config.botRadius > config.arenaRadius) {
      const nx = ndx / (nd || 1);
      const ny = ndy / (nd || 1);
      bot.x = config.arenaX + nx * (config.arenaRadius - config.botRadius - 1);
      bot.y = config.arenaY + ny * (config.arenaRadius - config.botRadius - 1);
      const dot = bot.vx * nx + bot.vy * ny;
      bot.vx -= 2 * dot * nx;
      bot.vy -= 2 * dot * ny;
    }
  }

  // --- Combat detection ---
  const aliveBots = bots.filter((b) => b.alive);
  for (let i = 0; i < aliveBots.length; i++) {
    for (let j = i + 1; j < aliveBots.length; j++) {
      const a = aliveBots[i];
      const b = aliveBots[j];

      if (a.combatCooldown > 0 || b.combatCooldown > 0) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < config.combatRange) {
        // Dice roll
        const rollA = Math.floor(Math.random() * 6) + 1;
        const rollB = Math.floor(Math.random() * 6) + 1;

        if (rollA === rollB) {
          // Tie: small push apart, minor damage to both
          a.health -= 3;
          b.health -= 3;
        } else {
          const winner = rollA > rollB ? a : b;
          const loser = rollA > rollB ? b : a;
          const wRoll = rollA > rollB ? rollA : rollB;
          const lRoll = rollA > rollB ? rollB : rollA;

          loser.health -= COMBAT_DAMAGE;
          winner.health = Math.min(100, winner.health + COMBAT_HEAL);
          winner.attackFlash = 12;

          newEvents.push({
            id: ++eventCounter,
            tick,
            type: 'combat',
            message: `⚔️ ${winner.name} [🎲${wRoll}] hit ${loser.name} [🎲${lRoll}]${loser.health <= 0 ? ' — ELIMINATED!' : ''}`,
          });
        }

        // Push bots apart
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = config.combatRange - dist;
          a.x += (nx * overlap) / 2;
          a.y += (ny * overlap) / 2;
          b.x -= (nx * overlap) / 2;
          b.y -= (ny * overlap) / 2;
        }

        a.combatCooldown = COMBAT_COOLDOWN_TICKS;
        b.combatCooldown = COMBAT_COOLDOWN_TICKS;
      }
    }
  }

  // --- Eliminate dead bots ---
  for (const bot of bots) {
    if (bot.alive && bot.health <= 0) {
      bot.alive = false;
      bot.health = 0;
      eliminationCount++;
      bot.eliminationOrder = eliminationCount;

      newEvents.push({
        id: ++eventCounter,
        tick,
        type: 'elimination',
        message: `💀 ${bot.name} has been eliminated! (#${eliminationCount} out)`,
      });
    }
  }

  // --- Check for winner ---
  const stillAlive = bots.filter((b) => b.alive);
  let winnerId: string | null = null;
  let finished = false;

  if (stillAlive.length <= 1) {
    finished = true;
    if (stillAlive.length === 1) {
      winnerId = stillAlive[0].id;
      newEvents.push({
        id: ++eventCounter,
        tick,
        type: 'info',
        message: `🏆 ${stillAlive[0].name} wins the Battle Royale!`,
      });
    } else {
      newEvents.push({
        id: ++eventCounter,
        tick,
        type: 'info',
        message: '🤝 Draw! Everyone was eliminated simultaneously!',
      });
    }
  }

  const allEvents = [...state.events, ...newEvents].slice(-60);

  return {
    ...state,
    bots,
    tick,
    zoneRadius: newZoneRadius,
    running: !finished,
    finished,
    winnerId,
    events: allEvents,
    eliminationCount,
    eventCounter,
  };
}
