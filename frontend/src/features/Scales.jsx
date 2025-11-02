import React, { useMemo, useState } from 'react';

function Scales({ status, scales = [], error, selectedToCompare, onToggleCompare }) {
  const [selectedScaleId, setSelectedScaleId] = useState('');

  const selectedScale = useMemo(() => {
    return scales.find((scale) => scale.id === selectedScaleId) ?? null;
  }, [selectedScaleId, scales]);

  const compareCount = selectedToCompare ? selectedToCompare.size : 0;
  const isSelectedForCompare = selectedScale ? selectedToCompare?.has(selectedScale.id) : false;

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
            <div className="box">
              <h3 className="title is-5">{selectedScale.name}</h3>
              <p><strong>ID:</strong> {selectedScale.id}</p>
              <p><strong>Size:</strong> {selectedScale.size}</p>
              <div className="block">
                <button
                  type="button"
                  className={`button is-small ${isSelectedForCompare ? 'is-warning' : 'is-primary'}`}
                  onClick={() => onToggleCompare?.(selectedScale.id)}
                >
                  {isSelectedForCompare ? 'Remove from compare' : 'Add to compare'}
                </button>
              </div>
              <p className="subtitle is-6">Semitone span</p>
              <div className="tags are-medium">
                {Array.from({ length: Math.max(...selectedScale.degrees) + 1 }, (_, value) => {
                  const isActive = selectedScale.degrees.includes(value);
                  const tagClass = isActive ? 'tag is-info' : 'tag is-light';

                  return (
                    <span key={value} className={tagClass}>
                      {value}
                    </span>
                  );
                })}
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
