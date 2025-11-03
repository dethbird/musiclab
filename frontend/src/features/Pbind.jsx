import React, { useEffect, useMemo, useState } from 'react';
import { Fr, toNumber } from '../lib/fraction.js';
import { buildTimeline, toPbind, fracToScLiteral } from './pbind/buildTimeline.js';

function Pbind({ note = 'C', octave = '4', selectedDegree = '' }) {
  const STORAGE_KEY_POINTS = 'musiclab:pbind:points';
  const STORAGE_KEY_SETTINGS = 'musiclab:pbind:settings';
  const STORAGE_KEY_FORM = 'musiclab:pbind:form';
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [beatUnit, setBeatUnit] = useState(4);
  const [bars, setBars] = useState(1);

  const [points, setPoints] = useState([]);

  const [form, setForm] = useState({ startBeat: '0', duration: '1', repeat: 1, pitch: '' });

  // Drive pitch by main app's selectedDegree, note, and octave
  useEffect(() => {
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const baseIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : 0;
    const sd = Number(selectedDegree);
    if (!Number.isFinite(sd)) {
      // if no valid degree, do not force a pitch value
      return;
    }
    const rootMidi = (baseOct + 1) * 12 + baseIdx; // C0 = 12
    const midi = rootMidi + sd;
    const midiStr = String(midi);
    setForm((f) => (f.pitch === midiStr ? f : { ...f, pitch: midiStr }));
  }, [note, octave, selectedDegree]);

  // Storage modal state
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [storageText, setStorageText] = useState('');
  const [storageError, setStorageError] = useState('');

  function openStorageModal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POINTS);
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
      setStorageError('JSON must be an array of points: [{ startBeat, duration, repeat, pitch }, ...]');
      return;
    }
    // Clean and coerce shape
    const cleaned = parsed
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        startBeat: String(p.startBeat ?? '0'),
        duration: String(p.duration ?? '1'),
        repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
        pitch: (p.pitch == null || !Number.isFinite(Number(p.pitch))) ? 60 : Number(p.pitch),
      }));
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(cleaned));
    } catch (e) {
      // ignore storage failures
    }
    setPoints(cleaned);
    setIsStorageModalOpen(false);
  }

  function addPoint() {
    try {
      // Validate fraction-like inputs by constructing fractions (throws on invalid)
      Fr(form.startBeat);
      Fr(form.duration);
    } catch (e) {
      window.alert('Please enter valid startBeat and duration (e.g., 1, 0.5, 1/3)');
      return;
    }
    const repeat = Math.max(1, Number(form.repeat) | 0);
    const pitchVal = form.pitch === '' ? 60 : Number(form.pitch);
    if (form.pitch !== '' && !Number.isFinite(pitchVal)) {
      window.alert('Pitch must be a number (midinote) or left blank');
      return;
    }
    setPoints((prev) => [
      ...prev,
      { startBeat: form.startBeat, duration: form.duration, repeat, pitch: pitchVal },
    ]);
  }

  function removePoint(i) {
    setPoints((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Load saved points on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POINTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Basic shape validation; coerce minimal fields
          const cleaned = parsed
            .filter((p) => p && typeof p === 'object')
            .map((p) => ({
              startBeat: String(p.startBeat ?? '0'),
              duration: String(p.duration ?? '1'),
              repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
              pitch: (p.pitch == null || !Number.isFinite(Number(p.pitch))) ? 60 : Number(p.pitch),
            }));
          setPoints(cleaned);
        }
      }
    } catch {}
  }, []);

  // Load saved settings and form on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          const bpb = Math.max(1, Number(s.beatsPerBar ?? 4) | 0);
          const bu = Math.max(1, Number(s.beatUnit ?? 4) | 0);
          const bs = Math.max(1, Number(s.bars ?? 1) | 0);
          setBeatsPerBar(bpb);
          setBeatUnit(bu);
          setBars(bs);
        }
      }
    } catch {}
    try {
      const rawF = localStorage.getItem(STORAGE_KEY_FORM);
      if (rawF) {
        const f = JSON.parse(rawF);
        if (f && typeof f === 'object') {
          setForm({
            startBeat: String(f.startBeat ?? '0'),
            duration: String(f.duration ?? '1'),
            repeat: Math.max(1, Number(f.repeat ?? 1) | 0),
            // keep pitch as string to reflect user input; allow ''
            pitch: f.pitch === '' || f.pitch == null ? '' : String(f.pitch),
          });
        }
      }
    } catch {}
  }, []);

  // Persist points on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(points));
    } catch {}
  }, [points]);

  // Persist settings on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SETTINGS,
        JSON.stringify({ beatsPerBar, beatUnit, bars })
      );
    } catch {}
  }, [beatsPerBar, beatUnit, bars]);

  // Persist form on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_FORM,
        JSON.stringify(form)
      );
    } catch {}
  }, [form]);

  const timeline = useMemo(() => {
    return buildTimeline({ timeSig: { beatsPerBar, beatUnit }, bars, points });
  }, [beatsPerBar, beatUnit, bars, points]);
  return (
    <section className="tool-panel">
      <div className="level">
        <div className="level-left">
          <h2 className="title is-3">Pbind</h2>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button
              type="button"
              className="button is-small"
              onClick={openStorageModal}
              disabled={points.length < 1}
              title={points.length < 1 ? 'Add at least one point to enable' : 'Export/Import Pbind points'}
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
        {/* Tiny bar timeline */}
        <div className="box">
          <h3 className="title is-6" style={{ marginBottom: '0.5rem' }}>Timeline</h3>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '24px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fafafa',
              overflow: 'hidden',
            }}
          >
            {/* Beat grid */}
            {Array.from({ length: Math.max(0, beatsPerBar * bars - 1) }).map((_, i) => (
              <div
                key={`beat-${i}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${((i + 1) / (beatsPerBar * bars)) * 100}%`,
                  width: '1px',
                  background: (i + 1) % beatsPerBar === 0 ? '#bbb' : '#e3e3e3',
                }}
              />
            ))}

            {/* Segments */}
            <div style={{ display: 'flex', height: '100%', width: '100%' }}>
              {(() => {
                let noteCount = 0;
                return timeline.chunks.map((c, idx) => {
                  const widthPct = (timeline.durs[idx] / (timeline.totalBeats || 1)) * 100;
                  const isNote = !c.rest && Number.isFinite(c.pitch);
                  const hue = isNote ? ((Math.round(c.pitch) % 12) * 30) : 0;
                  const bg = isNote ? `hsl(${hue}, 70%, 60%)` : '#dcdcdc';
                  const showLabel = isNote && widthPct >= 6;
                  const label = isNote ? String(++noteCount) : '';
                  return (
                    <div
                      key={idx}
                      title={isNote ? `note #${noteCount} (pitch ${c.pitch}), dur: ${String(c.dur)}` : `rest, dur: ${String(c.dur)}`}
                      style={{
                        position: 'relative',
                        width: `${widthPct}%`,
                        height: '100%',
                        background: bg,
                        borderRight: '1px solid rgba(255,255,255,0.9)',
                      }}
                    >
                      {showLabel && (
                        <span
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '10px',
                            lineHeight: 1,
                            color: '#fff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.65)',
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="box">
          <h3 className="title is-6">Timeline settings</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label className="label is-small">Beats per bar</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} value={beatsPerBar}
                       onChange={(e) => setBeatsPerBar(Math.max(1, Number(e.target.value) | 0))} />
              </div>
            </div>
            <div>
              <label className="label is-small">Beat unit</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} value={beatUnit}
                       onChange={(e) => setBeatUnit(Math.max(1, Number(e.target.value) | 0))} />
              </div>
            </div>
            <div>
              <label className="label is-small">Bars</label>
              <div className="control">
                <input className="input is-small" type="number" min={1} value={bars}
                       onChange={(e) => setBars(Math.max(1, Number(e.target.value) | 0))} />
              </div>
            </div>
          </div>
        </div>

        {/* Add-point */}
        <div className="box">
          <h3 className="title is-6">Add point</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label is-small">Start beat</label>
              <input className="input is-small" type="text" placeholder="e.g. 1 or 3/2"
                     value={form.startBeat}
                     onChange={(e) => setForm((f) => ({ ...f, startBeat: e.target.value }))}
              />
            </div>
            <div>
              <label className="label is-small">Duration</label>
              <input className="input is-small" type="text" placeholder="e.g. 1/3, 1/4"
                     value={form.duration}
                     onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              />
            </div>
            <div>
              <label className="label is-small">Repeat</label>
              <input className="input is-small" type="number" min={1}
                     value={form.repeat}
                     onChange={(e) => setForm((f) => ({ ...f, repeat: Math.max(1, Number(e.target.value) | 0) }))}
              />
            </div>
            <div>
              <label className="label is-small">Pitch (midinote)</label>
    <input className="input is-small" type="number" placeholder="optional"
      value={form.pitch}
      onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))}
    />
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button className="button is-primary is-small" onClick={addPoint}>Add</button>
            </div>
          </div>
        </div>

        {/* Points list */}
        <div className="box">
          <h3 className="title is-6">Points</h3>
          {points.length === 0 ? (
            <p className="has-text-grey">No points yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Start</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Duration</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Repeat</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Pitch</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {points
                  .map((p, idx) => ({ p, idx }))
                  .sort((a, b) => {
                    const sa = toNumber(Fr(a.p.startBeat));
                    const sb = toNumber(Fr(b.p.startBeat));
                    if (sa !== sb) return sa - sb;
                    // tie-breakers to keep consistent order
                    const da = toNumber(Fr(a.p.duration));
                    const db = toNumber(Fr(b.p.duration));
                    if (da !== db) return da - db;
                    return a.idx - b.idx;
                  })
                  .map(({ p, idx }, row) => (
                    <tr key={`${idx}-${String(p.startBeat)}-${String(p.duration)}`}>
                      <td style={{ padding: '0.25rem' }}>{row}</td>
                      <td style={{ padding: '0.25rem' }}>{String(p.startBeat)}</td>
                      <td style={{ padding: '0.25rem' }}>{String(p.duration)}</td>
                      <td style={{ padding: '0.25rem' }}>{String(p.repeat)}</td>
                      <td style={{ padding: '0.25rem' }}>{p.pitch == null ? '—' : String(p.pitch)}</td>
                      <td style={{ padding: '0.25rem' }}>
                        <button className="button is-small is-danger" onClick={() => removePoint(idx)}>Remove</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="box">
          <h3 className="title is-6">Pbind preview</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <div><strong>Total beats:</strong> {timeline.totalBeats}</div>
            <div>
              <strong>dur</strong> = [
              {(Array.isArray(timeline.dursFr) && timeline.dursFr.length > 0)
                ? timeline.dursFr.map((f) => fracToScLiteral(f)).join(', ')
                : timeline.durs.map((n) => Number(n.toFixed?.(6) ?? n).toString()).join(', ')}
              ]
            </div>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{toPbind(timeline)}</pre>
        </div>
      </div>
      {/* Storage modal */}
      <div className={`modal ${isStorageModalOpen ? 'is-active' : ''}`} role="dialog" aria-modal={isStorageModalOpen}>
        <div className="modal-background" onClick={() => setIsStorageModalOpen(false)} />
        <div className="modal-card" style={{ maxWidth: '900px', width: 'min(900px, 96vw)' }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Pbind points (local storage)</p>
            <button className="delete" aria-label="close" onClick={() => setIsStorageModalOpen(false)} />
          </header>
          <section className="modal-card-body">
            <div className="content">
              <p className="help">JSON stored under <code>{STORAGE_KEY_POINTS}</code>. Edit, paste, or copy it here. Save will replace the stored value and update the editor.</p>
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

export default Pbind;
