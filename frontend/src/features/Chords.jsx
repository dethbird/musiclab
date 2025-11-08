import React, { useState, useEffect, useRef } from 'react';
import PianoKeyboard from './PianoKeyboard.jsx';

// chord types with a small 'symbol' used to show an example for a given root note
const CHORD_TYPES = [
  { value: 'maj', name: 'Major', symbol: '' },
  { value: 'min', name: 'Minor', symbol: 'm' },
  { value: 'dom7', name: 'Dominant 7', symbol: '7' },
  { value: 'min7', name: 'Minor 7', symbol: 'm7' },
  { value: 'maj7', name: 'Major 7', symbol: 'maj7' },
  { value: 'sus4', name: 'Sus4', symbol: 'sus4' },
  { value: 'sus2', name: 'Sus2', symbol: 'sus2' },
  { value: 'add9', name: 'Add9', symbol: 'add9' },
  { value: 'sixth', name: '6', symbol: '6' },
  { value: 'min6', name: 'Minor 6', symbol: 'm6' },
  { value: 'dim', name: 'Diminished', symbol: 'dim' },
  { value: 'aug', name: 'Augmented', symbol: '+' }
];

function Chords({ note = 'A', octave = '4' }) {
  const [chordType, setChordType] = useState(() => {
    try {
      return localStorage.getItem('musiclab:chordType') || 'maj';
    } catch (err) {
      return 'maj';
    }
  });

  // Toggle to show/hide inline keyboards, persisted like in Pbind
  const [showKeys, setShowKeys] = useState(() => {
    try {
      const raw = localStorage.getItem('musiclab:chords:showKeys');
      if (raw == null) return true; // default on
      try { return Boolean(JSON.parse(raw)); } catch { return (raw === 'true' || raw === '1'); }
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      if (chordType) localStorage.setItem('musiclab:chordType', chordType);
      else localStorage.removeItem('musiclab:chordType');
    } catch (err) {
      // ignore
    }
  }, [chordType]);

  // persist showKeys
  useEffect(() => {
    try {
      localStorage.setItem('musiclab:chords:showKeys', JSON.stringify(showKeys));
    } catch {}
  }, [showKeys]);

  // Modal removed: we now show a per-voicing inline keyboard row.

  // Note name mapping and helper to render note+octave strings from semitone offsets.
  // Placed at component scope so the modal (outside the voicing IIFE) can access it.
  const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];

  function noteOctString(list) {
    const baseIndex = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const rootOct = Number.isFinite(Number(octave)) ? Number(Number(octave)) : 0;
    return list.map(p => {
      const total = baseIndex + p;
      const name = NOTE_NAMES[((total % 12) + 12) % 12];
      const octaveOffset = Math.floor(total / 12);
      const displayOct = rootOct + octaveOffset;
      return `${name}${displayOct}`;
    }).join('  ');
  }

  // Keep a ref map for each voicing's keyboard to allow future scrolling logic if needed.
  const keyboardRefs = useRef({});

  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Chords</h2>
        </div>
        <div className="level-right">
          <label className="checkbox is-size-7" title="Show keys for each voicing" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              style={{ marginRight: '0.35rem' }}
            />
            <span role="img" aria-label="Show keys">🎹</span>
          </label>
        </div>
      </div>

      <div className="content">
        <div className="field">
          <label className="label" htmlFor="chord-type-select">Chord Type</label>
          <div className="control">
            <div className="select is-fullwidth">
              <select
                id="chord-type-select"
                value={chordType}
                onChange={(e) => setChordType(e.target.value)}
              >
                {CHORD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{`${t.name} (${note}${t.symbol})`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          {/* chord header removed (not needed) */}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.25rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.4rem' }}>Voicing</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.4rem' }}>Notes</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.4rem' }}>MIDI</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Helpers ported from original index.html
                const chordFormulas = {
                  maj:   { name: 'Major',        symbol: '',     degrees: [0, 4, 7] },
                  min:   { name: 'Minor',        symbol: 'm',    degrees: [0, 3, 7] },
                  dom7:  { name: 'Dominant 7',   symbol: '7',    degrees: [0, 4, 7, 10] },
                  min7:  { name: 'Minor 7',      symbol: 'm7',   degrees: [0, 3, 7, 10] },
                  maj7:  { name: 'Major 7',      symbol: 'maj7', degrees: [0, 4, 7, 11] },
                  sus4:  { name: 'Sus4',         symbol: 'sus4', degrees: [0, 5, 7] },
                  sus2:  { name: 'Sus2',         symbol: 'sus2', degrees: [0, 2, 7] },
                  add9:  { name: 'Add9',         symbol: 'add9', degrees: [0, 4, 7, 14] },
                  sixth: { name: '6',            symbol: '6',    degrees: [0, 4, 7, 9] },
                  min6:  { name: 'Minor 6',      symbol: 'm6',   degrees: [0, 3, 7, 9] },
                  dim:   { name: 'Diminished',   symbol: 'dim',  degrees: [0, 3, 6] },
                  aug:   { name: 'Augmented',    symbol: '+',    degrees: [0, 4, 8] }
                };

                function ensureAscending(arr) {
                  const out = [];
                  let prev = -Infinity;
                  for (let x of arr) {
                    let v = x;
                    while (v <= prev) v += 12;
                    out.push(v);
                    prev = v;
                  }
                  return out;
                }

                function normalizeNonNegative(arr) {
                  let a = arr.slice();
                  while (Math.min(...a) < 0) a = a.map(x => x + 12);
                  return a;
                }

                function inversion(deg, k) {
                  const b = deg.slice().sort((a, b) => a - b);
                  const front = b.slice(k);
                  const back = b.slice(0, k).map(x => x + 12);
                  return ensureAscending(front.concat(back));
                }

                function drop2(deg) {
                  const c = ensureAscending(deg.slice().sort((a, b) => a - b));
                  if (c.length < 4) return null;
                  const i = c.length - 2;
                  return normalizeNonNegative(ensureAscending([c[i] - 12, ...c.filter((_, j) => j !== i)]));
                }

                function drop3(deg) {
                  const c = ensureAscending(deg.slice().sort((a, b) => a - b));
                  if (c.length < 4) return null;
                  const i = c.length - 3;
                  return normalizeNonNegative(ensureAscending([c[i] - 12, ...c.filter((_, j) => j !== i)]));
                }

                function spreadTriad(deg) {
                  if (deg.length !== 3) return null;
                  const [r, t, f] = deg.slice().sort((a, b) => a - b);
                  return ensureAscending([r, f, t + 12]);
                }

                function openTriad(deg) {
                  if (deg.length !== 3) return null;
                  const [r, t, f] = deg.slice().sort((a, b) => a - b);
                  return ensureAscending([r, t + 12, f + 12]);
                }

                

                function midiArrayFromRootOffsets(rootMidi, list) {
                  return list.map(p => rootMidi + p);
                }

                // compute voicings
                const formula = chordFormulas[chordType];
                if (!formula) return (
                  <tr><td colSpan="3" style={{ padding: '0.4rem', fontStyle: 'italic' }}>Unknown chord type.</td></tr>
                );

                const base = formula.degrees;
                const close = [
                  { name: 'Close (Root)', list: ensureAscending(base.slice().sort((a, b) => a - b)) },
                  { name: 'Close (1st inv)', list: (base.length > 2 ? inversion(base, 1) : null) },
                  { name: 'Close (2nd inv)', list: (base.length > 2 ? inversion(base, 2) : null) },
                  { name: 'Close (3rd inv)', list: (base.length > 3 ? inversion(base, 3) : null) }
                ].filter(v => v.list);

                const drops = [
                  { name: 'Drop-2 (root position)', list: drop2(base) },
                  { name: 'Drop-3 (root position)', list: drop3(base) }
                ].filter(v => v.list);

                const spreads = (base.length === 3)
                  ? [
                      { name: 'Spread Triad (R–5–10)', list: spreadTriad(base) },
                      { name: 'Open Triad (R–10–14)', list: openTriad(base) }
                    ].filter(v => v.list)
                  : [];

                const voicings = [...close, ...drops, ...spreads];

                if (voicings.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" style={{ padding: '0.4rem', fontStyle: 'italic' }}>No voicings available for this chord.</td>
                    </tr>
                  );
                }

                // compute root MIDI so we can show absolute MIDI numbers
                const baseIndex = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
                const rootOct = Number.isFinite(Number(octave)) ? Number(Number(octave)) : 0;
                const rootMidi = (rootOct + 1) * 12 + baseIndex; // C0 = 12 convention

                return voicings.map((v, idx) => {
                  const midis = midiArrayFromRootOffsets(rootMidi, v.list);
                  // Compute a compact range for keyboard clipping (pad by a 5th each side, snap to octave bounds)
                  const range = (() => {
                    const MIN = 21; // A0
                    const MAX = 108; // C8
                    if (!midis.length) return { start: MIN, end: MAX };
                    let min = Math.min(...midis);
                    let max = Math.max(...midis);
                    min = Math.max(MIN, min - 7);
                    max = Math.min(MAX, max + 7);
                    const start = Math.max(MIN, min - (min % 12));
                    const end = Math.min(MAX, max + (11 - (max % 12)));
                    return (end - start < 12) ? { start: Math.max(MIN, start - 6), end: Math.min(MAX, end + 6) } : { start, end };
                  })();
                  return (
                    <React.Fragment key={`${v.name}-${idx}`}>
                      <tr>
                        <td style={{ padding: '0.4rem', borderBottom: 'none', verticalAlign: 'top' }}>{v.name}</td>
                        <td style={{ padding: '0.4rem', borderBottom: 'none', fontFamily: 'monospace', verticalAlign: 'top' }}>{noteOctString(v.list)}</td>
                        <td style={{ padding: '0.4rem', borderBottom: 'none', fontFamily: 'monospace', verticalAlign: 'top' }}>{midis.join(', ')}</td>
                      </tr>
                      {showKeys && (
                        <tr>
                          <td colSpan={3} style={{ padding: '0.2rem 0.4rem 0.6rem', borderBottom: '1px solid #e5e5e5' }}>
                            <div style={{ border: '1px solid #e6e6e6', borderRadius: 4, padding: '0.5rem', background: '#fafafa', overflowX: 'auto' }}>
                              <PianoKeyboard
                                ref={(el) => { keyboardRefs.current[v.name] = el; }}
                                highlighted={midis}
                                startMidi={range.start}
                                endMidi={range.end}
                                hideScrollbar={false}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Chords;
