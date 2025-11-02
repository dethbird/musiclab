import React, { useMemo, useState, useRef } from 'react';

function Scales({ status, scales = [], error, selectedToCompare, onToggleCompare }) {
  const [selectedScaleId, setSelectedScaleId] = useState('');
  const selectRef = useRef(null);

  const selectedScale = useMemo(() => {
    return scales.find((scale) => scale.id === selectedScaleId) ?? null;
  }, [selectedScaleId, scales]);

  const compareCount = selectedToCompare ? selectedToCompare.size : 0;
  const isSelectedForCompare = selectedScale ? selectedToCompare?.has(selectedScale.id) : false;
  const compareButtonClasses = isSelectedForCompare
    ? 'button is-small is-danger scale-compare-btn'
    : 'button is-small is-primary scale-compare-btn';

  return (
    <section className="tool-panel">
      <h2 className="title is-3">Scales</h2>

      <p className="subtitle is-6 has-text-info">
        Scales to compare: <strong>{compareCount}</strong>
      </p>

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
            <div className="box scale-box">
              <div className="scale-box__header">
                <h3 className="title is-5">{selectedScale.name}</h3>
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
                    <i className="fa-solid fa-layer-group" />
                  </span>
                </button>
              </div>
              <p><strong>ID:</strong> {selectedScale.id}</p>
              <p><strong>Size:</strong> {selectedScale.size}</p>
              <p className="subtitle is-6">Semitone span</p>
              <div className="tags are-medium">
                {(() => {
                  const degrees = Array.isArray(selectedScale.degrees) ? selectedScale.degrees : [];
                  if (degrees.length === 0) {
                    return <span className="tag is-light">—</span>;
                  }
                  const degreeSet = new Set(degrees);
                  const maxSemitone = Math.max(...degrees);
                  return Array.from({ length: maxSemitone + 1 }, (_, value) => {
                    const isActive = degreeSet.has(value);
                    const tagClass = isActive ? 'tag is-info' : 'tag is-light';

                    return (
                      <span key={value} className={tagClass}>
                        {value}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
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
