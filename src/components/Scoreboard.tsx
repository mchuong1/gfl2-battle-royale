import type { Bot } from '../types';

interface ScoreboardProps {
  bots: Bot[];
  tick: number;
}

export function Scoreboard({ bots, tick }: ScoreboardProps) {
  const sorted = [...bots].sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.alive && b.alive) return b.health - a.health;
    return b.eliminationOrder - a.eliminationOrder;
  });

  const seconds = (tick / 60).toFixed(1);

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <h3>Scoreboard</h3>
        <span className="scoreboard-time">⏱ {seconds}s</span>
      </div>
      <div className="scoreboard-list">
        {sorted.map((bot) => (
          <div
            key={bot.id}
            className={`scoreboard-row ${bot.alive ? 'alive' : 'dead'}`}
          >
            <span
              className="scoreboard-dot"
              style={{ backgroundColor: bot.color }}
            />
            <span className="scoreboard-name">{bot.name}</span>
            {bot.alive ? (
              <div className="scoreboard-hp-bar-wrap">
                <div
                  className="scoreboard-hp-bar"
                  style={{
                    width: `${Math.max(0, bot.health)}%`,
                    backgroundColor: `hsl(${(bot.health / 100) * 120}, 100%, 40%)`,
                  }}
                />
                <span className="scoreboard-hp-text">
                  {Math.max(0, Math.ceil(bot.health))}
                </span>
              </div>
            ) : (
              <span className="scoreboard-dead-label">
                #{bot.eliminationOrder} out
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
