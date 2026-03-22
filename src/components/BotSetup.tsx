import { useState, useRef, useEffect } from 'react';
import type { BotConfig } from '../types';
import { imageFiles } from 'virtual:public-images';

interface SelectedBot extends BotConfig {
  id: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Character catalogue – derived at build time from filenames in public/images/.
// To add a character, drop its image into that folder; no code changes needed.
// ---------------------------------------------------------------------------
interface CharacterEntry {
  name: string;
  image: string;
}

function filenameToEntry(filename: string): CharacterEntry {
  // Strip prefix/suffix and _(GFL2) tag, convert remaining underscores to spaces
  const base = filename
    .replace(/^256px-/, '')
    .replace(/_S\.png$/, '')
    .replace(/_\(GFL2\)$/, '')
    .replace(/_/g, ' ');
  return { name: base, image: `/images/${filename}` };
}

const CHARACTER_LIST: CharacterEntry[] = imageFiles.map(filenameToEntry);

// ---------------------------------------------------------------------------
const MIN_BOTS = 2;
const MAX_BOTS = 500;

interface BotSetupProps {
  onStart: (bots: BotConfig[]) => void;
}

export function BotSetup({ onStart }: BotSetupProps) {
  const [selected, setSelected] = useState<SelectedBot[]>([]);
  const [search, setSearch] = useState('');
  // swapIdx: index in `selected` whose portrait is being swapped; null = picker closed
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const swapPanelRef = useRef<HTMLDivElement>(null);

  // Close swap picker on outside click
  useEffect(() => {
    if (swapIdx === null) return;
    const handle = (e: MouseEvent) => {
      if (swapPanelRef.current && !swapPanelRef.current.contains(e.target as Node)) {
        setSwapIdx(null);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [swapIdx]);

  const filteredChars = CHARACTER_LIST.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCount = selected.reduce((sum, b) => sum + b.count, 0);

  const addCharacter = (char: CharacterEntry) => {
    if (totalCount >= MAX_BOTS) return;
    setSelected((prev) => [...prev, { id: crypto.randomUUID(), name: char.name, image: char.image, count: 1 }]);
  };

  const removeSelected = (idx: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
    if (swapIdx === idx) setSwapIdx(null);
  };

  const updateName = (idx: number, value: string) => {
    setSelected((prev) => prev.map((b, i) => (i === idx ? { ...b, name: value } : b)));
  };

  const updateCount = (idx: number, delta: number) => {
    setSelected((prev) => {
      const totalOthers = prev.reduce((sum, b, i) => (i === idx ? sum : sum + b.count), 0);
      return prev.map((b, i) =>
        i === idx
          ? { ...b, count: Math.max(1, Math.min(b.count + delta, MAX_BOTS - totalOthers)) }
          : b,
      );
    });
  };

  const swapImage = (selectedIdx: number, newChar: CharacterEntry) => {
    setSelected((prev) =>
      prev.map((b, i) => (i === selectedIdx ? { ...b, image: newChar.image } : b)),
    );
    setSwapIdx(null);
  };

  const addRandom = (count: number) => {
    setSelected((prev) => {
      const currentTotal = prev.reduce((sum, b) => sum + b.count, 0);
      const slots = Math.min(count, MAX_BOTS - currentTotal);
      if (slots <= 0) return prev;
      const pool = [...CHARACTER_LIST];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picks = pool.slice(0, slots);
      return [...prev, ...picks.map((c) => ({ id: crypto.randomUUID(), name: c.name, image: c.image, count: 1 }))];
    });
  };

  const canStart = totalCount >= MIN_BOTS && selected.every((b) => b.name.trim().length > 0);

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h1 className="setup-title">⚔️ GFL2 Battle Royale</h1>
        <p className="setup-subtitle">
          Pick {MIN_BOTS}–{MAX_BOTS} combatants. Last one standing wins!
        </p>
      </div>

      <div className="setup-card setup-card--picker">
        {/* ── LEFT: Character grid ────────────────────────────────── */}
        <div className="picker-panel">
          <div className="picker-panel-header">
            <span className="picker-panel-title">Characters ({CHARACTER_LIST.length})</span>
            <input
              className="picker-search"
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="char-grid">
            {filteredChars.map((char) => (
              <button
                key={char.image}
                className="char-card"
                onClick={() => addCharacter(char)}
                disabled={totalCount >= MAX_BOTS}
                title={`Add ${char.name}`}
              >
                <img
                  className="char-card-img"
                  src={char.image}
                  alt={char.name}
                  loading="lazy"
                />
                <span className="char-card-name">{char.name}</span>
              </button>
            ))}
            {filteredChars.length === 0 && (
              <p className="picker-empty">No characters match "{search}"</p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Selected list ─────────────────────────────────── */}
        <div className="selected-panel">
          <div className="selected-panel-header">
            <span className="selected-panel-title">
              Selected — {totalCount} / {MAX_BOTS}
            </span>
            <div className="selected-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => addRandom(5)}
                disabled={totalCount >= MAX_BOTS}
              >
                +5 Rand
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => addRandom(10)}
                disabled={totalCount >= MAX_BOTS}
              >
                +10 Rand
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { setSelected([]); setSwapIdx(null); }}
                disabled={selected.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="selected-list">
            {selected.length === 0 && (
              <p className="selected-empty">← Click a character to add them</p>
            )}
            {selected.map((bot, idx) => (
              <div key={bot.id} className="selected-row">
                <span className="selected-row-num">{idx + 1}</span>
                {/* Portrait – click to open swap picker */}
                <div className="selected-portrait-wrap">
                  <button
                    className="selected-portrait-btn"
                    onClick={() => setSwapIdx(swapIdx === idx ? null : idx)}
                    title="Click to change portrait"
                  >
                    <img
                      className="selected-portrait"
                      src={bot.image}
                      alt={bot.name}
                    />
                    <span className="selected-portrait-overlay">↺</span>
                  </button>
                  {/* Inline swap picker */}
                  {swapIdx === idx && (
                    <div className="swap-picker" ref={swapPanelRef}>
                      <p className="swap-picker-title">Choose portrait</p>
                      <div className="swap-grid">
                        {CHARACTER_LIST.map((char) => (
                          <button
                            key={char.image}
                            className={`swap-card ${bot.image === char.image ? 'swap-card--active' : ''}`}
                            onClick={() => swapImage(idx, char)}
                            title={char.name}
                          >
                            <img src={char.image} alt={char.name} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  className="selected-name-input"
                  value={bot.name}
                  onChange={(e) => updateName(idx, e.target.value)}
                  maxLength={30}
                  placeholder="Name…"
                />
                <div className="count-stepper">
                  <button
                    className="count-stepper-btn"
                    onClick={() => updateCount(idx, -1)}
                    disabled={bot.count <= 1}
                    aria-label="Decrease count"
                  >−</button>
                  <span className="count-stepper-value">{bot.count}</span>
                  <button
                    className="count-stepper-btn"
                    onClick={() => updateCount(idx, 1)}
                    disabled={totalCount >= MAX_BOTS}
                    aria-label="Increase count"
                  >+</button>
                </div>
                <button
                  className="selected-remove"
                  onClick={() => removeSelected(idx)}
                  aria-label={`Remove ${bot.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {selected.length < MIN_BOTS && selected.length > 0 && (
            <p className="setup-warning">Need at least {MIN_BOTS} combatants to start.</p>
          )}

          <button
            className="btn btn-start"
            onClick={() => onStart(selected.flatMap(({ count, name, image }) => Array.from({ length: count }, () => ({ name: name.trim(), image }))))}
            disabled={!canStart}
          >
            🚀 Start Battle!
          </button>
        </div>
      </div>
    </div>
  );
}
