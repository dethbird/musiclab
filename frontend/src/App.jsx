import React, { useEffect, useMemo, useState } from 'react';
import Scales from './features/Scales.jsx';
import Chords from './features/Chords.jsx';
import Envelope from './features/Envelope.jsx';
import Pbind from './features/Pbind.jsx';

const TAB_DEFINITIONS = [
  { id: 'scales', label: 'Scales', element: <Scales /> },
  { id: 'chords', label: 'Chords', element: <Chords /> },
  { id: 'envelope', label: 'Envelope', element: <Envelope /> },
  { id: 'pbind', label: 'Pbind', element: <Pbind /> }
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
      const raw = localStorage.getItem('musiclab:note') || 'C';
      // normalize legacy sharps to flats (A# -> B♭, D# -> E♭)
      if (raw === 'A#') return 'B♭';
      if (raw === 'D#') return 'E♭';
      return raw;
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
  
  // Hoisted selected scale id, shared with Scales component
  const [selectedScaleId, setSelectedScaleId] = useState(() => {
    try {
      return localStorage.getItem('musiclab:selectedScale') || '';
    } catch (err) {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (selectedScaleId) {
        localStorage.setItem('musiclab:selectedScale', selectedScaleId);
      } else {
        localStorage.removeItem('musiclab:selectedScale');
      }
    } catch (err) {
      // ignore
    }
  }, [selectedScaleId]);
  // selected degree (not persisted); cleared when scale changes
  const [selectedDegree, setSelectedDegree] = useState('');
  useEffect(() => {
    // clear degree selection whenever the scale changes
    setSelectedDegree('');
  }, [selectedScaleId]);

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

  // derive selected scale object from fetched catalog (after scaleState is defined)
  const selectedScale = useMemo(() => {
    const list = Array.isArray(scaleState.data) ? scaleState.data : [];
    return list.find((s) => s.id === selectedScaleId) || null;
  }, [scaleState.data, selectedScaleId]);

  // When a scale is available and no degree has been chosen yet, default to the first degree
  useEffect(() => {
    const degrees = selectedScale && Array.isArray(selectedScale.degrees) ? selectedScale.degrees : [];
    if (selectedDegree === '' && degrees.length > 0) {
      setSelectedDegree(String(degrees[0]));
    }
    if (!selectedScale) {
      // ensure cleared if scale is unset
      if (selectedDegree !== '') setSelectedDegree('');
    }
  }, [selectedScale, selectedDegree]);

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
          selectedScaleId={selectedScaleId}
          onSelectedScaleChange={(id) => setSelectedScaleId(id)}
        />
      );
    }

      if (activeTabConfig.id === 'chords') {
        return <Chords note={note} octave={octave} />;
      }

      if (activeTabConfig.id === 'pbind') {
        return <Pbind note={note} octave={octave} selectedDegree={selectedDegree} selectedScaleId={selectedScaleId} />;
      }

    return activeTabConfig.element;
  }, [activeTab, scaleState, scalesToCompare, note, octave, selectedScaleId, selectedDegree]);

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
                <label htmlFor="note-select" className="label is-medium" style={{ marginBottom: '0.25rem', fontSize: '1.05rem' }}>Key</label>
                <div className="select is-medium">
                  <select id="note-select" value={note} aria-label="Key name" onChange={(e) => setNote(e.target.value)} style={{ fontSize: '1rem' }}>
                      <option value="C">C</option>
                      <option value="C#">C#</option>
                      <option value="D">D</option>
                      <option value="E♭">E♭</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="F#">F#</option>
                      <option value="G">G</option>
                      <option value="G#">G#</option>
                      <option value="A">A</option>
                      <option value="B♭">B♭</option>
                      <option value="B">B</option>
                    </select>
                </div>
              </div>
              <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="octave-select" className="label is-medium" style={{ marginBottom: '0.25rem', fontSize: '1.05rem' }}>Octave</label>
                <div className="select is-medium">
                  <select id="octave-select" value={octave} aria-label="Octave" onChange={(e) => setOctave(e.target.value)} style={{ fontSize: '1rem' }}>
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
              <div className="control" style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem' }}>
                <label htmlFor="scale-select-header" className="label is-medium" style={{ marginBottom: '0.25rem', fontSize: '1.05rem' }}>Scale</label>
                <div className="select is-medium">
                  <select
                    id="scale-select-header"
                    value={selectedScaleId}
                    aria-label="Selected scale"
                    onChange={(e) => setSelectedScaleId(e.target.value)}
                    style={{ fontSize: '1rem', minWidth: '200px' }}
                  >
                    <option value="">— none —</option>
                    {Array.isArray(scaleState.data) ? scaleState.data.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    )) : null}
                  </select>
                </div>
              </div>
              <div className="control" style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem' }}>
                <label htmlFor="degree-select-header" className="label is-medium" style={{ marginBottom: '0.25rem', fontSize: '1.05rem' }}>Degrees</label>
                <div className="select is-medium">
                  <select
                    id="degree-select-header"
                    value={selectedDegree}
                    aria-label="Selected degree"
                    onChange={(e) => setSelectedDegree(e.target.value)}
                    disabled={!selectedScale || !Array.isArray(selectedScale.degrees) || selectedScale.degrees.length === 0}
                    style={{ fontSize: '1rem', minWidth: '160px' }}
                  >
                    <option value="">— degree —</option>
                    {selectedScale && Array.isArray(selectedScale.degrees)
                      ? selectedScale.degrees.map((d) => {
                          // compute absolute note label and MIDI for this degree based on current note+octave
                          const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                          const baseIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
                          const semis = Number(d);
                          const total = baseIdx + semis;
                          const name = NOTE_NAMES[((total % 12) + 12) % 12];
                          const octaveOffset = Math.floor(total / 12);
                          const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : 0;
                          const displayOct = baseOct + octaveOffset;
                          // MIDI using C0 = 12 convention used elsewhere in app
                          const rootMidi = (baseOct + 1) * 12 + baseIdx;
                          const midi = rootMidi + semis;
                          const label = `${d}) ${name}${displayOct} (${midi})`;
                          return (
                            <option key={d} value={String(d)}>{label}</option>
                          );
                        })
                      : null}
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
