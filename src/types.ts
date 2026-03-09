export interface Bot {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  alive: boolean;
  color: string;
  combatCooldown: number;
  eliminationOrder: number; // 0 = still alive, 1 = first out, etc.
  attackFlash: number; // ticks of visual flash remaining
}

export interface GameEvent {
  id: number;
  tick: number;
  type: 'combat' | 'elimination' | 'info';
  message: string;
}

export interface SimulationConfig {
  arenaX: number;
  arenaY: number;
  arenaRadius: number;
  botRadius: number;
  combatRange: number;
}

export interface SimulationState {
  bots: Bot[];
  tick: number;
  running: boolean;
  finished: boolean;
  winnerId: string | null;
  events: GameEvent[];
  zoneRadius: number;
  config: SimulationConfig;
  eliminationCount: number;
  eventCounter: number;
}
