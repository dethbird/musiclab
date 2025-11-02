import React, { useState } from 'react';

function Envelope() {
  // initial envelope: one starting point at level 0.0, time 0, curve 0
  const [points, setPoints] = useState([{ level: 0.0, time: 0, curve: 0 }]);

  // add a new point (level, time, curve)
  function addPoint(p) {
    setPoints((prev) => [...prev, p]);
  }

  function removePoint(index) {
    if (index === 0) return; // never remove first point
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  // local form state for adding a point
  const [form, setForm] = useState({ level: 1.0, time: 0.1, curve: 0 });

  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Envelope</h2>
        </div>
      </div>

      <div className="content">
        {/* Curve plotting area (stub) */}
        <div className="box" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#7a7a7a' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Envelope curve preview</div>
            <div style={{ width: 420, height: 140, border: '2px dashed #dbdbdb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
              <span className="has-text-grey">(curve plot will be rendered here)</span>
            </div>
          </div>
        </div>

        {/* Points editor */}
        <div className="box">
          <h3 className="title is-6">Envelope points</h3>
          <p className="help">Add points that define the envelope. The first point starts at time 0; its time and curve are fixed at 0.</p>

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

            <div style={{ flex: '0 0 160px' }}>
              <label className="label is-small">Curve</label>
              <div className="control">
                <div className="select is-small is-fullwidth">
                  <select value={String(form.curve)} onChange={(e) => setForm((f) => ({ ...f, curve: Number(e.target.value) }))}>
                    <option value="0">linear (0)</option>
                    <option value="1">exponential (1)</option>
                    <option value="-1">logarithmic (-1)</option>
                    <option value="-99">hold (-99)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button
                className="button is-small is-primary"
                onClick={() => {
                  // add form as next point
                  const p = { level: Number(form.level), time: Number(form.time), curve: Number(form.curve) };
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
                      <td style={{ padding: '0.25rem' }}>{String(pt.curve)}</td>
                      <td style={{ padding: '0.25rem' }}>{i === 0 ? null : <button className="button is-small is-danger" onClick={() => removePoint(i)}>Remove</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Envelope;
