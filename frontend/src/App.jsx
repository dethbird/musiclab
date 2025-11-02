import React, { useEffect, useMemo, useState } from 'react';
import Scales from './features/Scales.jsx';
import Chords from './features/Chords.jsx';

const TAB_DEFINITIONS = [
  { id: 'scales', label: 'Scales', element: <Scales /> },
  { id: 'chords', label: 'Chords', element: <Chords /> }
];

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('musiclab:activeTab') || TAB_DEFINITIONS[0].id;
    } catch (err) {
      return TAB_DEFINITIONS[0].id;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('musiclab:activeTab', activeTab);
    } catch (err) {
      // ignore storage errors
    }
  }, [activeTab]);

  // Note and octave selection persisted in localStorage
  const [note, setNote] = useState(() => {
    try {
      return localStorage.getItem('musiclab:note') || 'C';
    } catch (err) {
      return 'C';
    }
  });

  const [octave, setOctave] = useState(() => {
    try {
      return localStorage.getItem('musiclab:octave') || '4';
    } catch (err) {
      return '4';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('musiclab:note', note);
    } catch (err) {
      // ignore
    }
  }, [note]);

  useEffect(() => {
    try {
      localStorage.setItem('musiclab:octave', octave);
    } catch (err) {
      // ignore
    }
  }, [octave]);
  const [scaleState, setScaleState] = useState({ status: 'idle', data: null, error: null });
  const [scalesToCompare, setScalesToCompare] = useState(() => {
    try {
      const raw = localStorage.getItem('musiclab:scalesToCompare');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const arr = Array.from(scalesToCompare);
      localStorage.setItem('musiclab:scalesToCompare', JSON.stringify(arr));
    } catch (err) {
      // ignore storage errors
    }
  }, [scalesToCompare]);

  useEffect(() => {
    if (scaleState.status !== 'idle') {
      return;
    }

    setScaleState({ status: 'loading', data: null, error: null });

    fetch('/api/scales')
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        setScaleState({ status: 'success', data: payload?.scales ?? [], error: null });
      })
      .catch((error) => {
        setScaleState({ status: 'error', data: null, error: error instanceof Error ? error.message : String(error) });
      });
  }, [scaleState.status]);

  const activeContent = useMemo(() => {
    const activeTabConfig = TAB_DEFINITIONS.find((tab) => tab.id === activeTab) ?? TAB_DEFINITIONS[0];

      if (activeTabConfig.id === 'scales') {
      return (
        <Scales
          status={scaleState.status}
          scales={Array.isArray(scaleState.data) ? scaleState.data : []}
          error={scaleState.error}
          selectedToCompare={scalesToCompare}
          onToggleCompare={(scaleId) => {
            setScalesToCompare((prev) => {
              const next = new Set(prev);
              if (next.has(scaleId)) {
                next.delete(scaleId);
              } else {
                next.add(scaleId);
              }
              return next;
            });
          }}
          note={note}
          octave={octave}
        />
      );
    }

      if (activeTabConfig.id === 'chords') {
        return <Chords note={note} />;
      }

    return activeTabConfig.element;
  }, [activeTab, scaleState, scalesToCompare, note, octave]);

  return (
    <main className="app">
      <header className="app__header level">
        <div className="level-left">
          <h1>MusicLab</h1>
        </div>
        <div className="level-right">
          <div className="level-item">
            <div className="field is-grouped is-grouped-multiline" style={{ alignItems: 'center' }}>
              <div className="control" style={{ display: 'flex', flexDirection: 'column', marginRight: '0.5rem' }}>
                <label htmlFor="note-select" className="label is-small" style={{ marginBottom: '0.25rem' }}>Note</label>
                <div className="select is-small">
                  <select id="note-select" value={note} aria-label="Note name" onChange={(e) => setNote(e.target.value)}>
                    <option value="C">C</option>
                    <option value="C#">C#</option>
                    <option value="D">D</option>
                    <option value="D#">D#</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                    <option value="F#">F#</option>
                    <option value="G">G</option>
                    <option value="G#">G#</option>
                    <option value="A">A</option>
                    <option value="A#">A#</option>
                    <option value="B">B</option>
                  </select>
                </div>
              </div>
              <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="octave-select" className="label is-small" style={{ marginBottom: '0.25rem' }}>Octave</label>
                <div className="select is-small">
                  <select id="octave-select" value={octave} aria-label="Octave" onChange={(e) => setOctave(e.target.value)}>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="tabs is-centered is-medium" aria-label="Tool selection">
        <ul role="tablist">
          {TAB_DEFINITIONS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <li key={tab.id} className={isActive ? 'is-active' : ''} role="presentation">
                <a
                  href="#"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-panel`}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveTab(tab.id);
                  }}
                >
                  {tab.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        id={`${activeTab}-panel`}
        className="tab-content"
        role="region"
        aria-live="polite"
      >
        {activeContent}
      </section>
    </main>
  );
}

export default App;
