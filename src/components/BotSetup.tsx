import { useState, useRef, useEffect } from 'react';
import type { BotConfig } from '../types';

// ---------------------------------------------------------------------------
// Character catalogue – derived from filenames in public/images/
// ---------------------------------------------------------------------------
const RAW_FILENAMES = [
  '256px-Alva_S.png', '256px-Andoris_S.png', '256px-Balthilde_S.png',
  '256px-Basti_S.png', '256px-Belka_S.png', '256px-Centaureissi_(GFL2)_S.png',
  '256px-Cheeta_S.png', '256px-Cheyanne_S.png', '256px-Colphne_S.png',
  '256px-Daiyan_(GFL2)_S.png', '256px-Dushevnaya_(GFL2)_S.png', '256px-Faye_S.png',
  '256px-Florence_(GFL2)_S.png', '256px-Groza_S.png', '256px-Harpsy_S.png',
  '256px-Helen_S.png', '256px-Jiangyu_(GFL2)_S.png', '256px-Klukai_S.png',
  '256px-Krolik_S.png', '256px-Ksenia_(GFL2)_S.png', '256px-Lainie_S.png',
  '256px-Lenna_S.png', '256px-Leva_S.png', '256px-Lewis_(GFL2)_S.png',
  '256px-Lind_(GFL2)_S.png', '256px-Littara_S.png', '256px-Liushih_S.png',
  '256px-Loreley_S.png', '256px-Lotta_S.png', '256px-Makiatto_S.png',
  '256px-Mechty_S.png', '256px-Mosin-Nagant_(GFL2)_S.png', '256px-Nagant_S.png',
  '256px-Nemesis_S.png', '256px-Nikketa_S.png', '256px-Papasha_S.png',
  '256px-Peri_S.png', '256px-Peritya_S.png', '256px-Phaetusa_S.png',
  '256px-Qiongjiu_S.png', '256px-Qiuhua_S.png', '256px-Robella_S.png',
  '256px-Sabrina_S.png', '256px-Sakura_(GFL2)_S.png', '256px-Sextans_ELMO_S.png',
  '256px-Sharkry_S.png', '256px-Springfield_(GFL2)_S.png', '256px-Suomi_(GFL2)_S.png',
  '256px-Tololo_S.png', '256px-Ullrid_S.png', '256px-Vector_(GFL2)_S.png',
  '256px-Vepley_S.png', '256px-Voymastina_S.png', '256px-Yoohee_S.png',
  '256px-Zhaohui_S.png',
];

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

const CHARACTER_LIST: CharacterEntry[] = RAW_FILENAMES.map(filenameToEntry);

// ---------------------------------------------------------------------------
const MIN_BOTS = 2;
const MAX_BOTS = 100;

interface BotSetupProps {
  onStart: (bots: BotConfig[]) => void;
}

export function BotSetup({ onStart }: BotSetupProps) {
  const [selected, setSelected] = useState<BotConfig[]>([]);
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

  const addCharacter = (char: CharacterEntry) => {
    if (selected.length >= MAX_BOTS) return;
    setSelected((prev) => [...prev, { name: char.name, image: char.image }]);
  };

  const removeSelected = (idx: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
    if (swapIdx === idx) setSwapIdx(null);
  };

  const updateName = (idx: number, value: string) => {
    setSelected((prev) => prev.map((b, i) => (i === idx ? { ...b, name: value } : b)));
  };

  const swapImage = (selectedIdx: number, newChar: CharacterEntry) => {
    setSelected((prev) =>
      prev.map((b, i) => (i === selectedIdx ? { ...b, image: newChar.image } : b)),
    );
    setSwapIdx(null);
  };

  const addRandom = (count: number) => {
    const slots = Math.min(count, MAX_BOTS - selected.length);
    if (slots <= 0) return;
    const shuffled = [...CHARACTER_LIST].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, slots);
    setSelected((prev) => [...prev, ...picks.map((c) => ({ name: c.name, image: c.image }))]);
  };

  const canStart = selected.length >= MIN_BOTS && selected.every((b) => b.name.trim().length > 0);

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
                disabled={selected.length >= MAX_BOTS}
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
              Selected — {selected.length} / {MAX_BOTS}
            </span>
            <div className="selected-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => addRandom(5)}
                disabled={selected.length >= MAX_BOTS}
              >
                +5 Rand
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => addRandom(10)}
                disabled={selected.length >= MAX_BOTS}
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
              <div key={idx} className="selected-row">
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
            onClick={() => onStart(selected.map((b) => ({ ...b, name: b.name.trim() })))}
            disabled={!canStart}
          >
            🚀 Start Battle!
          </button>
        </div>
      </div>
    </div>
  );
}
