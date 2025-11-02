import React, { useState, useEffect } from 'react';

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

function Chords({ note = 'A' }) {
  const [chordType, setChordType] = useState(() => {
    try {
      return localStorage.getItem('musiclab:chordType') || 'maj';
    } catch (err) {
      return 'maj';
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

  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Chords</h2>
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

        <p>Chord voicings laboratory coming soon.</p>
      </div>
    </section>
  );
}

export default Chords;
