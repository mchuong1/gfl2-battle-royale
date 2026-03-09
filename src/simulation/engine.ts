export interface Bot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  color: string;
  radius: number;
  combatRadius: number;
  alive: boolean;
}

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const BOT_RADIUS = 14;
const COMBAT_RADIUS = 36;
const BOT_SPEED = 80; // pixels per second
const HEALTH_DRAIN_RATE = 2; // health per second (passive)
const MAX_HEALTH = 100;

const BOT_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff5722', '#607d8b', '#795548', '#9e9e9e', '#ff9800',
];

function randomColor(index: number): string {
  return BOT_COLORS[index % BOT_COLORS.length];
}

function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function createBots(count: number): Bot[] {
  const bots: Bot[] = [];
  for (let i = 0; i < count; i++) {
    const angle = randomAngle();
    bots.push({
      id: i,
      x: COMBAT_RADIUS + Math.random() * (ARENA_WIDTH - COMBAT_RADIUS * 2),
      y: COMBAT_RADIUS + Math.random() * (ARENA_HEIGHT - COMBAT_RADIUS * 2),
      vx: Math.cos(angle) * BOT_SPEED,
      vy: Math.sin(angle) * BOT_SPEED,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      color: randomColor(i),
      radius: BOT_RADIUS,
      combatRadius: COMBAT_RADIUS,
      alive: true,
    });
  }
  return bots;
}

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function updateBots(bots: Bot[], dtSeconds: number): void {
  const aliveBots = bots.filter(b => b.alive);

  for (const bot of aliveBots) {
    // Passive health drain
    bot.health -= HEALTH_DRAIN_RATE * dtSeconds;

    // Random direction change (~2% chance per frame)
    if (Math.random() < 0.02) {
      const angle = randomAngle();
      bot.vx = Math.cos(angle) * BOT_SPEED;
      bot.vy = Math.sin(angle) * BOT_SPEED;
    }

    // Move bot
    bot.x += bot.vx * dtSeconds;
    bot.y += bot.vy * dtSeconds;

    // Bounce off walls
    if (bot.x - bot.radius < 0) {
      bot.x = bot.radius;
      bot.vx = Math.abs(bot.vx);
    } else if (bot.x + bot.radius > ARENA_WIDTH) {
      bot.x = ARENA_WIDTH - bot.radius;
      bot.vx = -Math.abs(bot.vx);
    }
    if (bot.y - bot.radius < 0) {
      bot.y = bot.radius;
      bot.vy = Math.abs(bot.vy);
    } else if (bot.y + bot.radius > ARENA_HEIGHT) {
      bot.y = ARENA_HEIGHT - bot.radius;
      bot.vy = -Math.abs(bot.vy);
    }
  }

  // Combat: check overlapping combat ranges
  for (let i = 0; i < aliveBots.length; i++) {
    for (let j = i + 1; j < aliveBots.length; j++) {
      const a = aliveBots[i];
      const b = aliveBots[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const combatDist = a.combatRadius + b.combatRadius;

      if (dist < combatDist) {
        const damageToB = rollDice() * dtSeconds * 10;
        const damageToA = rollDice() * dtSeconds * 10;
        a.health -= damageToA;
        b.health -= damageToB;
      }
    }
  }

  // Mark dead bots
  for (const bot of bots) {
    if (bot.health <= 0) {
      bot.health = 0;
      bot.alive = false;
    }
  }
}

export function getWinner(bots: Bot[]): Bot | null {
  const alive = bots.filter(b => b.alive);
  if (alive.length === 1) return alive[0];
  return null;
}

export function isSimulationOver(bots: Bot[]): boolean {
  return bots.filter(b => b.alive).length <= 1;
}

export { ARENA_WIDTH, ARENA_HEIGHT };
