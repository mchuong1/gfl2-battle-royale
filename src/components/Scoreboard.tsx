import type { Bot } from '../types';

const SCOREBOARD_ALIVE_LIMIT = 30;
const SCOREBOARD_DEAD_LIMIT = 30;

interface ScoreboardProps {
  bots: Bot[];
  tick: number;
}

export function Scoreboard({ bots, tick }: ScoreboardProps) {
  const alive = bots.filter((b) => b.alive).sort((a, b) => b.health - a.health);
  const dead = bots.filter((b) => !b.alive).sort((a, b) => b.eliminationOrder - a.eliminationOrder);

  const shownAlive = alive.slice(0, SCOREBOARD_ALIVE_LIMIT);
  const shownDead = dead.slice(0, SCOREBOARD_DEAD_LIMIT);
  const sorted = [...shownAlive, ...shownDead];
  const hiddenAlive = alive.length - shownAlive.length;
  const hiddenDead = dead.length - shownDead.length;

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
            <img
              className="scoreboard-portrait"
              src={bot.image}
              alt={bot.name}
              style={{ borderColor: bot.color }}
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
        {(hiddenAlive > 0 || hiddenDead > 0) && (
          <div className="scoreboard-overflow">
            {hiddenAlive > 0 && <span>+{hiddenAlive} more alive</span>}
            {hiddenDead > 0 && <span>+{hiddenDead} more eliminated</span>}
          </div>
        )}
      </div>
    </div>
  );
}
