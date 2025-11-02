import React, { useMemo, useState } from 'react';

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
                      <td style={{ padding: '0.25rem' }}>{i === 0 ? null : <button className="button is-small is-danger" onClick={() => removePoint(i)}>Remove</button>}</td>
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
    </section>
  );
}

export default Envelope;
