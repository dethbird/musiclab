import React, { useMemo, useState, useRef, useEffect } from 'react';

function Scales({ status, scales = [], error, selectedToCompare, onToggleCompare, note = 'C', octave = '4' }) {
  const [selectedScaleId, setSelectedScaleId] = useState(() => {
    try {
      return localStorage.getItem('musiclab:selectedScale') || '';
    } catch (err) {
      return '';
    }
  });
  // persist selected scale id to localStorage so selection survives reloads
  useEffect(() => {
    try {
      if (selectedScaleId) {
        localStorage.setItem('musiclab:selectedScale', selectedScaleId);
      } else {
        localStorage.removeItem('musiclab:selectedScale');
      }
    } catch (err) {
      // ignore storage errors
    }
  }, [selectedScaleId]);
  const selectRef = useRef(null);

  const selectedScale = useMemo(() => {
    return scales.find((scale) => scale.id === selectedScaleId) ?? null;
  }, [selectedScaleId, scales]);

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseNoteIndex = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;

  const getNoteLabel = (semitone) => {
    const total = baseNoteIndex + semitone;
    const name = NOTE_NAMES[total % 12];
    const octaveOffset = Math.floor(total / 12);
    const displayOctave = Number.isFinite(Number(octave)) ? String(Number(octave) + octaveOffset) : octave;
    return `${name}${displayOctave}`;
  };

  const compareCount = selectedToCompare ? selectedToCompare.size : 0;
  const isSelectedForCompare = selectedScale ? selectedToCompare?.has(selectedScale.id) : false;
  const compareButtonClasses = isSelectedForCompare
    ? 'button is-small is-danger scale-compare-btn'
    : 'button is-small is-primary scale-compare-btn';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const comparedScales = useMemo(() => {
    if (!selectedToCompare || selectedToCompare.size === 0) return [];

    return Array.from(selectedToCompare)
      .map((id) => scales.find((s) => s.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedToCompare, scales]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen]);

  return (
    <section className="tool-panel">
          <div className="level">
            <div className="level-left">
              <h2 className="title is-3">Scales</h2>
            </div>
            <div className="level-right">
              <div className="level-item">
                <button
                  type="button"
                  className="button is-white is-small"
                  onClick={() => setIsModalOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isModalOpen}
                >
                  <span className="subtitle is-6 has-text-info" style={{ margin: 0 }}>
                    Scales to compare: <strong>{compareCount}</strong>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal showing selected scales for comparison */}
          <div className={`modal ${isModalOpen ? 'is-active' : ''}`} role="dialog" aria-modal={isModalOpen}>
            <div className="modal-background" onClick={() => setIsModalOpen(false)} />
            <div className="modal-card" style={{ maxWidth: '1100px', width: 'min(1100px, 96vw)' }}>
              <header className="modal-card-head">
                <p className="modal-card-title">Compare scales ({compareCount})</p>
                <button className="delete" aria-label="close" onClick={() => setIsModalOpen(false)} />
              </header>
              <section className="modal-card-body">
                {compareCount === 0 && (
                  <div className="content">
                    <p>No scales selected for comparison.</p>
                  </div>
                )}

            {compareCount > 0 && (
              <div className="content">
                <div className="box">
                  {/* Render compared scales (sorted alphabetically) */}
                  {comparedScales.map((scale) => {
                    const degrees = Array.isArray(scale.degrees) ? scale.degrees : [];
                    const degreeSet = new Set(degrees);
                    const maxSemitone = degrees.length === 0 ? 0 : Math.max(...degrees);
                    // Pad semitone display to at least one octave (12 semitones) so rows align
                    const modalWrapAt = Math.max(11, maxSemitone);

                    return (
                      <div key={scale.id} className="columns is-vcentered is-mobile" style={{ marginBottom: '0.75rem' }}>
                        <div className="column is-narrow" style={{ flex: '0 0 40%', display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="button is-small is-danger is-outlined"
                            onClick={() => onToggleCompare?.(scale.id)}
                            title={`Remove ${scale.name} from compare`}
                            aria-label={`Remove ${scale.name} from compare`}
                            style={{ marginRight: '0.5rem' }}
                          >
                            <span className="icon is-small">
                              <i className="fa-solid fa-minus" />
                            </span>
                          </button>

                          <strong>{scale.name}</strong> <span className="has-text-grey" style={{ marginLeft: '0.5rem' }}>({scale.size})</span>
                        </div>
                        <div className="column">
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {Array.from({ length: modalWrapAt + 1 }, (_, value) => {
                              const isActive = degreeSet.has(value);
                              const tagClass = isActive ? 'tag is-info' : 'tag is-light';
                              return (
                                <div key={value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span className={tagClass} style={{ display: 'inline-block', minWidth: '2.5rem', textAlign: 'center' }}>
                                    {value}
                                  </span>
                                  <span className="is-size-7 has-text-grey" style={{ marginTop: '0.125rem' }}>{getNoteLabel(value)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
              </section>
              <footer className="modal-card-foot" style={{ justifyContent: 'flex-end' }}>
                <button className="button" onClick={() => setIsModalOpen(false)}>Close</button>
              </footer>
            </div>
          </div>

      {status === 'loading' && (
        <div className="block has-text-centered">
          <button className="button is-loading is-white" type="button" disabled>
            Loading scale catalog…
          </button>
        </div>
      )}

      {status === 'error' && (
        <article className="message is-danger" role="alert">
          <div className="message-body">Unable to load scales: {error}</div>
        </article>
      )}

      {status === 'success' && (
        <div className="content">
          <div className="field">
            <label className="label" htmlFor="scale-select">
              Select a scale
            </label>
            <div className="control">
              <div className="select is-fullwidth">
                <select
                  id="scale-select"
                  ref={selectRef}
                  value={selectedScaleId}
                  onChange={(event) => setSelectedScaleId(event.target.value)}
                >
                  <option value="">— choose —</option>
                  {scales.map((scale) => (
                    <option key={scale.id} value={scale.id}>
                      {scale.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedScale && (
            (() => {
              const degrees = Array.isArray(selectedScale.degrees) ? selectedScale.degrees : [];
              const degreeSet = new Set(degrees);
              const degreeCount = degrees.length;
              const maxSemitone = degrees.length === 0 ? 0 : Math.max(...degrees);
              const wrapAt = Math.max(11, maxSemitone);

              return (
                <div className="box scale-box">
                  <div className="scale-box__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                      <h3 className="title is-5" style={{ margin: 0 }}>
                        {selectedScale.name}{' '}
                        <span className="is-size-7 has-text-grey" style={{ marginLeft: '0.5rem' }}>({selectedScale.id})</span>
                      </h3>
                      <span className="has-text-grey is-size-7">Semitone span: <strong>{degreeCount}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        className={compareButtonClasses}
                        onClick={() => {
                          // Toggle compare membership then return focus to the select so arrow keys work.
                          onToggleCompare?.(selectedScale.id);
                          // Delay focus to allow React state updates / re-renders to settle.
                          setTimeout(() => selectRef.current?.focus(), 0);
                        }}
                        title={isSelectedForCompare ? 'Remove from compare' : 'Add to compare'}
                        aria-pressed={isSelectedForCompare}
                      >
                        <span className="icon">
                          <i className="fa-solid fa-code-compare" />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="tags are-medium" style={{ marginTop: '1.5rem' }}>
                    {Array.from({ length: wrapAt + 1 }, (_, value) => {
                      const isActive = degreeSet.has(value);
                      const tagClass = isActive ? 'tag is-info' : 'tag is-light';

                      return (
                        <div key={value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '0.25rem' }}>
                          <span className={tagClass} style={{ display: 'inline-block' }}>{value}</span>
                          <span className="is-size-7 has-text-grey" style={{ marginTop: '0.125rem' }}>{getNoteLabel(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {status === 'idle' && (
        <p className="has-text-grey">Preparing to load scales…</p>
      )}
    </section>
  );
}

export default Scales;
