import type { GameEvent } from '../types';

interface EventLogProps {
  events: GameEvent[];
  tick: number;
  aliveCount: number;
  totalCount: number;
}

export function EventLog({ events, tick, aliveCount, totalCount }: EventLogProps) {
  const seconds = (tick / 60).toFixed(1);

  return (
    <div className="event-log">
      <div className="event-log-header">
        <h3>Battle Log</h3>
        <div className="event-stats">
          <span className="stat">⏱ {seconds}s</span>
          <span className="stat">💚 {aliveCount} alive</span>
          <span className="stat">💀 {totalCount - aliveCount} out</span>
        </div>
      </div>
      <div className="event-log-entries">
        {[...events].reverse().map((event) => (
          <div key={event.id} className={`event-entry event-${event.type}`}>
            <span className="event-time">{(event.tick / 60).toFixed(1)}s</span>
            <span className="event-message">{event.message}</span>
          </div>
        ))}
        {events.length === 0 && (
          <div className="event-entry event-info">
            <span className="event-message">Battle starting…</span>
          </div>
        )}
      </div>
    </div>
  );
}
