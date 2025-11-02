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
        />
      );
    }

    return activeTabConfig.element;
  }, [activeTab, scaleState, scalesToCompare]);

  return (
    <main className="app">
      <header className="app__header">
        <h1>MusicLab</h1>
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
