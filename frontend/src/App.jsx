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
