import React from 'react';

// Render an 88-key piano (MIDI 21..108) and highlight any MIDI numbers in `highlighted`.
// This is a lightweight, self-contained visual — sizes are inline for simplicity.
function PianoKeyboard({ highlighted = [], startMidi = 21, endMidi = 108 }) {
  const sharps = new Set([1, 3, 6, 8, 10]);
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Build list of white keys (non-sharp) in range
  const whiteKeys = [];
  for (let m = startMidi; m <= endMidi; m++) {
    const idx = m % 12;
    if (!sharps.has(idx)) whiteKeys.push(m);
  }

  const whiteWidth = 28; // px
  const whiteHeight = 140;
  const blackWidth = 18;
  const blackHeight = 92;

  // Helper to format label using natural names (convert sharps to flats visually if desired)
  function nameFor(midi) {
    const idx = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1; // C0=12 -> 0
    // Optionally show flats for some names
    const map = { 3: 'E♭', 10: 'B♭' };
    const base = map[idx] ?? NOTE_NAMES[idx];
    return `${base}${octave}`;
  }

  const containerStyle = {
    position: 'relative',
    width: whiteKeys.length * whiteWidth,
    height: whiteHeight + 24,
    userSelect: 'none'
  };

  const highlightedSet = new Set(highlighted.map(Number));

  return (
    <div style={containerStyle} aria-hidden={false}>
      {/* white keys */}
      <div style={{ display: 'flex' }}>
        {whiteKeys.map((m, i) => {
          const isActive = highlightedSet.has(m);
          return (
            <div
              key={m}
              style={{
                width: whiteWidth,
                height: whiteHeight,
                border: '1px solid #222',
                boxSizing: 'border-box',
                background: isActive ? '#ffd27f' : '#fff',
                position: 'relative'
              }}
            />
          );
        })}
      </div>

      {/* black keys positioned absolutely over white keys */}
      {whiteKeys.map((m, i) => {
        const blackMidi = m + 1; // the following semitone may be black
        const idx = ((blackMidi % 12) + 12) % 12;
        if (!sharps.has(idx)) return null;
        const left = i * whiteWidth + whiteWidth - blackWidth / 2;
        const isActive = highlightedSet.has(blackMidi);
        return (
          <div
            key={`b${blackMidi}`}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: blackWidth,
              height: blackHeight,
              // make active black keys much lighter and more saturated
              // lighter blue with higher lightness so it reads as a highlighted black key
              background: isActive ? 'hsl(210 85% 62%)' : '#000',
              border: isActive ? '1px solid hsl(210 75% 48%)' : '1px solid rgba(0,0,0,0.6)',
              borderRadius: '0 0 3px 3px',
              boxShadow: isActive ? '0 6px 18px rgba(33,150,243,0.28)' : '0 2px 4px rgba(0,0,0,0.4)',
              transition: 'background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
              transform: isActive ? 'translateY(-2px)' : 'none'
            }}
          />
        );
      })}

      {/* optional labels row */}
      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        {whiteKeys.map((m) => (
          <div key={`l${m}`} style={{ width: whiteWidth, textAlign: 'center', fontSize: 10, color: '#333' }}>{nameFor(m)}</div>
        ))}
      </div>
    </div>
  );
}

export default PianoKeyboard;
