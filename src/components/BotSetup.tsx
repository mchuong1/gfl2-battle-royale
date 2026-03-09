import { useState } from 'react';
import type { KeyboardEvent } from 'react';

const DEFAULT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
const MIN_BOTS = 2;
const MAX_BOTS = 100;

interface BotSetupProps {
  onStart: (names: string[]) => void;
}

export function BotSetup({ onStart }: BotSetupProps) {
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [inputVal, setInputVal] = useState('');

  const addName = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || names.length >= MAX_BOTS) return;
    setNames((prev) => [...prev, trimmed]);
    setInputVal('');
  };

  const removeName = (idx: number) => {
    setNames((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addName();
  };

  const updateName = (idx: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === idx ? value : n)));
  };

  const canStart = names.length >= MIN_BOTS && names.every((n) => n.trim().length > 0);

  const addRandomBots = (count: number) => {
    const randomNames = [
      'Shadow', 'Viper', 'Nova', 'Blaze', 'Storm', 'Raven', 'Ghost',
      'Titan', 'Cipher', 'Nexus', 'Frost', 'Ember', 'Dusk', 'Surge',
      'Phantom', 'Wraith', 'Cobra', 'Falcon', 'Wolf', 'Hawk',
      'Pyro', 'Ice', 'Thunder', 'Steel', 'Void', 'Chaos', 'Omega',
      'Alpha', 'Delta', 'Sigma', 'Kira', 'Lena', 'Mira', 'Nina',
      'Odin', 'Petra', 'Quinn', 'Rex', 'Sable', 'Tess', 'Uma',
      'Vale', 'Wren', 'Xena', 'Yuki', 'Zara', 'Ash', 'Bay',
      'Cruz', 'Drew', 'Erin', 'Finn', 'Gale', 'Haze', 'Iris',
      'Jade', 'Knox', 'Lane', 'Mars', 'Nash', 'Onyx', 'Pike',
    ];
    const available = randomNames.filter((n) => !names.includes(n));
    const slots = Math.min(count, MAX_BOTS - names.length);
    const fromPool = available.slice(0, slots);
    // If the named pool is exhausted, fill remaining slots with numbered bots
    const remaining = slots - fromPool.length;
    const numbered: string[] = [];
    if (remaining > 0) {
      const existingSet = new Set([...names, ...fromPool]);
      let n = 1;
      while (numbered.length < remaining) {
        const candidate = `Bot-${n++}`;
        if (!existingSet.has(candidate)) numbered.push(candidate);
      }
    }
    setNames((prev) => [...prev, ...fromPool, ...numbered]);
  };

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h1 className="setup-title">⚔️ GFL2 Battle Royale</h1>
        <p className="setup-subtitle">
          Enter {MIN_BOTS}–{MAX_BOTS} combatants. Last one standing wins!
        </p>
      </div>

      <div className="setup-card">
        <div className="setup-actions">
          <button
            className="btn btn-secondary"
            onClick={() => addRandomBots(5)}
            disabled={names.length >= MAX_BOTS}
          >
            + 5 Random
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => addRandomBots(10)}
            disabled={names.length >= MAX_BOTS}
          >
            + 10 Random
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setNames([])}
            disabled={names.length === 0}
          >
            Clear All
          </button>
          <span className="bot-count">
            {names.length} / {MAX_BOTS} combatants
          </span>
        </div>

        <div className="name-input-row">
          <input
            type="text"
            className="name-input"
            placeholder="Enter combatant name…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={20}
            disabled={names.length >= MAX_BOTS}
          />
          <button
            className="btn btn-primary"
            onClick={addName}
            disabled={!inputVal.trim() || names.length >= MAX_BOTS}
          >
            Add
          </button>
        </div>

        <div className="names-list">
          {names.map((name, idx) => (
            <div key={idx} className="name-tag">
              <span className="name-tag-number">{idx + 1}</span>
              <input
                className="name-tag-input"
                value={name}
                onChange={(e) => updateName(idx, e.target.value)}
                maxLength={20}
              />
              <button
                className="name-tag-remove"
                onClick={() => removeName(idx)}
                aria-label={`Remove ${name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {names.length < MIN_BOTS && (
          <p className="setup-warning">
            Need at least {MIN_BOTS} combatants to start.
          </p>
        )}

        <button
          className="btn btn-start"
          onClick={() => onStart(names.map((n) => n.trim()).filter(Boolean))}
          disabled={!canStart}
        >
          🚀 Start Battle!
        </button>
      </div>
    </div>
  );
}
