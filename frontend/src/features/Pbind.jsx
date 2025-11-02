import React from 'react';

function Pbind() {
  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Pbind</h2>
        </div>
      </div>

      <div className="content">
        {/* Intro / plan */}
        <div className="box">
          <p className="help" style={{ marginBottom: '0.5rem' }}>
            Build bar-aware play points and auto-fill gaps with Rest(). We\'ll expand points (duration + repeat)
            into a timeline and emit SuperCollider Pbind arrays (\\dur and pitch stream with Rest()).
          </p>
          <ul style={{ marginLeft: '1rem', listStyle: 'disc' }}>
            <li>Global: time signature and bars</li>
            <li>Points: startBeat, duration (fractions OK), repeat, pitch (optional)</li>
            <li>Export: Pbind preview (\\dur + \\midinote/\\degree)</li>
          </ul>
        </div>

        {/* Controls stub */}
        <div className="box">
          <h3 className="title is-6">Timeline settings</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label className="label is-small">Beats per bar</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} defaultValue={4} disabled />
              </div>
            </div>
            <div>
              <label className="label is-small">Beat unit</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} defaultValue={4} disabled />
              </div>
            </div>
            <div>
              <label className="label is-small">Bars</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} defaultValue={1} disabled />
              </div>
            </div>
          </div>
        </div>

        {/* Add-point stub */}
        <div className="box">
          <h3 className="title is-6">Add point</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label is-small">Start beat</label>
              <input className="input is-small" type="text" placeholder="e.g. 1 or 3/2" disabled />
            </div>
            <div>
              <label className="label is-small">Duration</label>
              <input className="input is-small" type="text" placeholder="e.g. 1/3, 1/4" disabled />
            </div>
            <div>
              <label className="label is-small">Repeat</label>
              <input className="input is-small" type="number" min={1} defaultValue={1} disabled />
            </div>
            <div>
              <label className="label is-small">Pitch (midinote)</label>
              <input className="input is-small" type="number" placeholder="optional" disabled />
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button className="button is-primary is-small" disabled>Add</button>
            </div>
          </div>
        </div>

        {/* Lists / preview stub */}
        <div className="box">
          <h3 className="title is-6">Points</h3>
          <p className="has-text-grey">No points yet. (stub)</p>
        </div>

        <div className="box">
          <h3 className="title is-6">Pbind preview</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>Pbind(\n  \\midinote, Pseq([Rest()], 1),\n  \\dur, Pseq([1], 1)\n)</pre>
        </div>
      </div>
    </section>
  );
}

export default Pbind;
