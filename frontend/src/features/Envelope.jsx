import React, { useMemo, useState, useEffect } from 'react';
import EnvelopePlot from './EnvelopePlot';

function Envelope() {
  // localStorage key for persisting points
  const STORAGE_KEY = 'musiclab:envelope:points';

  // initial envelope: load from localStorage if present, otherwise one starting point
  const [points, setPoints] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // basic validation: ensure entries have level/time/curve
          const clean = parsed.map((p) => ({
            level: Number(p.level) || 0,
            time: Number(p.time) || 0,
            curve: Number(p.curve) || 0,
          }));
          return clean;
        }
      }
    } catch (e) {
      // ignore parse errors and fall back to default
    }
    return [{ level: 0.0, time: 0, curve: 0 }];
  });

  // persist points to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch (e) {
      // ignore quota errors
    }
  }, [points]);

  // add a new point (level, time, curve)
  function addPoint(p) {
    setPoints((prev) => [...prev, p]);
  }

  function removePoint(index) {
    if (index === 0) return; // never remove first point
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function movePointUp(index) {
    // do not allow moving into index 0 (start point must remain first)
    if (index <= 1) return;
    setPoints((prev) => {
      const copy = prev.slice();
      const j = index - 1;
      const tmp = copy[j];
      copy[j] = copy[index];
      copy[index] = tmp;
      return copy;
    });
  }

  function movePointDown(index) {
    setPoints((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = prev.slice();
      const j = index + 1;
      const tmp = copy[j];
      copy[j] = copy[index];
      copy[index] = tmp;
      return copy;
    });
  }

  // curve presets (map to numeric curve values we will export for SC)
  const CURVE_PRESETS = {
    hold: -99,
    linear: 0,
    exponential: 1,
    logarithmic: -1,
    sine: 0.5,
    squared: 2,
    cubed: 3,
    welch: 4,
  };

  // local form state for adding a point
  const [form, setForm] = useState({ level: 1.0, time: 0.1, curve: 'linear', customCurve: 0 });

  // Storage modal state
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [storageText, setStorageText] = useState('');
  const [storageError, setStorageError] = useState('');

  function openStorageModal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setStorageText(JSON.stringify(JSON.parse(raw), null, 2));
        } catch (e) {
          setStorageText(raw);
        }
      } else {
        setStorageText(JSON.stringify(points, null, 2));
      }
    } catch (e) {
      setStorageText(JSON.stringify(points, null, 2));
    }
    setStorageError('');
    setIsStorageModalOpen(true);
  }

  function saveStorageModal() {
    setStorageError('');
    let parsed;
    try {
      parsed = JSON.parse(storageText);
    } catch (e) {
      setStorageError('Invalid JSON. Please fix and try again.');
      return;
    }
    if (!Array.isArray(parsed)) {
      setStorageError('JSON must be an array of points: [{ level, time, curve }, ...]');
      return;
    }
    // Basic cleaning and enforce first-point rules
    let cleaned = parsed.map((p) => ({
      level: Number(p?.level) || 0,
      time: Number(p?.time) || 0,
      curve: Number(p?.curve) || 0,
    }));
    if (cleaned.length === 0) {
      cleaned = [{ level: 0.0, time: 0, curve: 0 }];
    }
    cleaned[0] = { level: Number(cleaned[0].level) || 0, time: 0, curve: 0 };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e) {
      // even if storage fails, still update in-memory points
    }
    setPoints(cleaned);
    setIsStorageModalOpen(false);
  }

  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Envelope</h2>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button
              type="button"
              className="button is-small"
              onClick={openStorageModal}
              disabled={points.length <= 1}
              title={points.length <= 1 ? 'Add at least one point to enable' : 'Export/Import from localStorage'}
            >
              <span className="icon is-small" style={{ marginRight: 6 }}>
                <i className="fas fa-database" aria-hidden="true"></i>
              </span>
              <span>Export / Import</span>
            </button>
          </div>
        </div>
      </div>

      <div className="content">
        {/* Curve plotting area */}
        <div className="box" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#7a7a7a' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Envelope curve preview</div>
              <div style={{ width: 520, height: 180, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
              <EnvelopePlot points={points} width={520} height={180} />
            </div>
          </div>
        </div>

        {/* Points editor */}
        <div className="box">
          <div>
            <h3 className="title is-6" style={{ margin: 0 }}>Envelope points</h3>
            <p className="help" style={{ marginTop: '0.25rem' }}>Add points that define the envelope. The first point starts at time 0; its time and curve are fixed at 0.</p>
          </div>

          {/* First point (start) - level editable, time and curve disabled */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Start level</label>
              <div className="control">
                <input
                  className="input is-small"
                  type="number"
                  step="0.01"
                  value={String(points[0].level)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPoints((prev) => { const copy = prev.slice(); copy[0] = { ...copy[0], level: Number.isFinite(v) ? v : 0 }; return copy; });
                  }}
                />
              </div>
            </div>

            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Time (s)</label>
              <div className="control">
                <input className="input is-small" type="number" value={0} disabled />
              </div>
            </div>

            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Curve</label>
              <div className="control">
                <input className="input is-small" type="number" value={0} disabled />
              </div>
            </div>
          </div>

          {/* Add point form (enabled for subsequent points) */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Level</label>
              <div className="control">
                <input
                  className="input is-small"
                  type="number"
                  step="0.01"
                  value={String(form.level)}
                  onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Time (s)</label>
              <div className="control">
                <input
                  className="input is-small"
                  type="number"
                  step="0.01"
                  value={String(form.time)}
                  onChange={(e) => setForm((f) => ({ ...f, time: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div style={{ flex: '0 0 240px' }}>
              <label className="label is-small">Curve</label>
              <div className="control" style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: '1 1 auto' }}>
                  <div className="select is-small is-fullwidth">
                    <select value={String(form.curve)} onChange={(e) => setForm((f) => ({ ...f, curve: e.target.value }))}>
                      {Object.keys(CURVE_PRESETS).map((k) => (
                        <option key={k} value={k}>{k} ({String(CURVE_PRESETS[k])})</option>
                      ))}
                      <option value="custom">custom</option>
                    </select>
                  </div>
                </div>

                {form.curve === 'custom' ? (
                  <div style={{ width: 90 }}>
                    <input
                      className="input is-small"
                      type="number"
                      step="0.01"
                      value={String(form.customCurve)}
                      onChange={(e) => setForm((f) => ({ ...f, customCurve: Number(e.target.value) }))}
                      title="Enter a numeric curve value for SuperCollider exports"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button
                className="button is-small is-primary"
                onClick={() => {
                  // prepare numeric values and validate
                  const level = Number(form.level);
                  const time = Number(form.time);
                  if (!Number.isFinite(level)) {
                    window.alert('Level must be a number');
                    return;
                  }
                  if (!Number.isFinite(time) || time < 0) {
                    window.alert('Time must be a non-negative number');
                    return;
                  }

                  let curveVal;
                  if (form.curve === 'custom') {
                    curveVal = Number(form.customCurve);
                  } else if (form.curve && Object.prototype.hasOwnProperty.call(CURVE_PRESETS, form.curve)) {
                    curveVal = CURVE_PRESETS[form.curve];
                  } else {
                    curveVal = Number(form.curve);
                  }
                  if (!Number.isFinite(curveVal)) curveVal = 0;

                  // add form as next point
                  const p = { level, time, curve: curveVal };
                  addPoint(p);
                }}
              >Add point</button>
            </div>
          </div>

          {/* Existing points list */}
                <div style={{ marginTop: '1rem' }}>
            {points.length === 0 ? (
              <p className="has-text-grey">No points yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Index</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Level</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}>Curve</th>
                    <th style={{ textAlign: 'left', padding: '0.25rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((pt, i) => (
                    <tr key={i}>
                      <td style={{ padding: '0.25rem' }}>{i}</td>
                          <td style={{ padding: '0.25rem' }}>{String(pt.level)}</td>
                          <td style={{ padding: '0.25rem' }}>{String(pt.time)}</td>
                          <td style={{ padding: '0.25rem' }}>
                            {/** Show preset name when it matches a known preset value, otherwise show numeric */}
                            {(() => {
                              const presetName = Object.keys(CURVE_PRESETS).find((k) => CURVE_PRESETS[k] === pt.curve);
                              return presetName ? `${presetName} (${String(pt.curve)})` : String(pt.curve);
                            })()}
                          </td>
                      <td style={{ padding: '0.25rem' }}>{i === 0 ? null : (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          {/* Up / Down icons for reordering (UI-only) */}
                          <button
                            className="button is-small"
                            aria-label={`Move point ${i} up`}
                            title="Move up"
                            type="button"
                            onClick={() => movePointUp(i)}
                            disabled={i <= 1}
                          >
                            <span className="icon is-small">
                              <i className="fas fa-arrow-up" aria-hidden="true"></i>
                            </span>
                          </button>

                          <button
                            className="button is-small"
                            aria-label={`Move point ${i} down`}
                            title="Move down"
                            type="button"
                            onClick={() => movePointDown(i)}
                            disabled={i === points.length - 1}
                          >
                            <span className="icon is-small">
                              <i className="fas fa-arrow-down" aria-hidden="true"></i>
                            </span>
                          </button>

                          {/* Remove (trash) */}
                          <button
                            className="button is-small is-danger"
                            onClick={() => removePoint(i)}
                            aria-label={`Remove point ${i}`}
                            title="Remove point"
                            type="button"
                          >
                            <span className="icon is-small">
                              <i className="fas fa-trash-alt" aria-hidden="true"></i>
                            </span>
                          </button>
                        </div>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

              {/* Derived arrays for SuperCollider-style export */}
              <div style={{ marginTop: '1rem' }}>
                <h4 className="title is-6">Derived arrays (SuperCollider)</h4>
                <p className="help">These arrays are generated from the points above: levels, times (durations between points), and curves (per-segment).</p>
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', background: '#fafafa', padding: '0.75rem', borderRadius: 6, border: '1px solid #eee' }}>
                  {(() => {
                    const levels = points.map((p) => Number(p.level));
                    const times = points.slice(1).map((p) => Number(p.time));
                    const curves = points.slice(1).map((p) => Number(p.curve));
                    const total = times.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
                    const totalDisplay = Number(total.toFixed(3));
                    return (
                      <div>
                        <div><strong>levels</strong> = {JSON.stringify(levels)}</div>
                        <div>
                          <strong>times</strong> = {JSON.stringify(times)}{' '}
                          <span style={{ color: '#7a7a7a' }}>// {totalDisplay}s total</span>
                        </div>
                        <div><strong>curves</strong> = {JSON.stringify(curves)}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
        </div>
      </div>
      {/* Storage modal */}
      <div className={`modal ${isStorageModalOpen ? 'is-active' : ''}`} role="dialog" aria-modal={isStorageModalOpen}>
        <div className="modal-background" onClick={() => setIsStorageModalOpen(false)} />
        <div className="modal-card" style={{ maxWidth: '900px', width: 'min(900px, 96vw)' }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Envelope storage (local)</p>
            <button className="delete" aria-label="close" onClick={() => setIsStorageModalOpen(false)} />
          </header>
          <section className="modal-card-body">
            <div className="content">
              <p className="help">JSON stored under <code>{STORAGE_KEY}</code>. Edit, paste, or copy it here. Save will replace the stored value and update the editor.</p>
              <textarea
                className="textarea"
                rows={14}
                style={{ fontFamily: 'monospace' }}
                value={storageText}
                onChange={(e) => setStorageText(e.target.value)}
              />
              {storageError ? (
                <p className="has-text-danger" style={{ marginTop: '0.5rem' }}>{storageError}</p>
              ) : null}
            </div>
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end' }}>
            <button className="button" onClick={() => setIsStorageModalOpen(false)}>Cancel</button>
            <button className="button is-primary" onClick={saveStorageModal}>Save</button>
          </footer>
        </div>
      </div>
    </section>
  );
}

export default Envelope;
