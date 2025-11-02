import React, { useMemo, useState } from 'react';
import Scales from './features/Scales.jsx';
import Chords from './features/Chords.jsx';

const TAB_DEFINITIONS = [
  { id: 'scales', label: 'Scales', element: <Scales /> },
  { id: 'chords', label: 'Chords', element: <Chords /> }
];

function App() {
  const [activeTab, setActiveTab] = useState(TAB_DEFINITIONS[0].id);

  const activeContent = useMemo(() => {
    return TAB_DEFINITIONS.find((tab) => tab.id === activeTab)?.element ?? TAB_DEFINITIONS[0].element;
  }, [activeTab]);

  return (
    <main className="app">
      <header className="app__header">
        <h1>MusicLab</h1>
      </header>

      <nav className="tab-menu" aria-label="Tool selection">
        {TAB_DEFINITIONS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              className={`tab-menu__item${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="tab-content" role="region" aria-live="polite">
        {activeContent}
      </section>
    </main>
  );
}

export default App;
