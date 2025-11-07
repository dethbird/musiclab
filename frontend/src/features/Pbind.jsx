import React, { useEffect, useMemo, useState } from 'react';
import { Fr, toNumber } from '../lib/fraction.js';
import { buildTimeline, toPbind, fracToScLiteral } from './pbind/buildTimeline.js';

function Pbind({
  note = 'C',
  octave = '4',
  selectedDegree = '',
  selectedScaleId = '',
  // shared state updaters to keep selectors in sync with header
  onNoteChange,
  onOctaveChange,
  onSelectedScaleChange,
  onSelectedDegreeChange,
  // scale catalog and selectedScale to render options
  scales = [],
  selectedScale = null,
}) {
  const STORAGE_KEY_POINTS = 'musiclab:pbind:points';
  const STORAGE_KEY_SETTINGS = 'musiclab:pbind:settings';
  const STORAGE_KEY_FORM = 'musiclab:pbind:form';
  const STORAGE_KEY_PREVIEW = 'musiclab:pbind:previewOptions';
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [beatUnit, setBeatUnit] = useState(4);
  const [bars, setBars] = useState(1);

  const [points, setPoints] = useState([]);

  const [form, setForm] = useState({ startBeat: '0', duration: '1', legato: '1', amp: '1', repeat: 1 });
  // Modal-local draft state for a single point (to enable multi-note editing later)
  const [draftPoint, setDraftPoint] = useState(null);

  // Output preferences
  const [compressOutput, setCompressOutput] = useState(true);
  const [loopCount, setLoopCount] = useState(''); // blank => inf
  const [instrument, setInstrument] = useState(''); // blank => \\default (handled in toPbind)

  // No midinote: we store degree & octave per point, while scale/root are provided by global state

  // Storage modal state
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [storageText, setStorageText] = useState('');
  const [storageError, setStorageError] = useState('');
  // Add-point modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
  setStorageError('JSON must be an array of points: [{ startBeat, duration, repeat, notes: [{ legato, amp, scale, root, degree, octave }] }, ...]');
      return;
    }
    // Clean and coerce shape for new schema with notes[]
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const rootIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const currentScale = selectedScaleId || 'none';
    const toNote = (n) => ({
      legato: (Number.isFinite(Number(n?.legato)) ? Number(n.legato) : 1),
      amp: (Number.isFinite(Number(n?.amp)) ? Number(n.amp) : 1),
      scale: typeof n?.scale === 'string' ? n.scale : currentScale,
      root: Number.isFinite(Number(n?.root)) ? Number(n.root) : rootIdx,
      degree: Number.isFinite(Number(n?.degree)) ? Number(n.degree) : (Number.isFinite(Number(selectedDegree)) ? Number(selectedDegree) : null),
      octave: Number.isFinite(Number(n?.octave)) ? Number(n.octave) : (Number.isFinite(Number(octave)) ? Number(octave) : null),
    });
    const cleaned = parsed
      .filter((p) => p && typeof p === 'object')
      .map((p) => {
        const base = {
          startBeat: String(p.startBeat ?? '0'),
          duration: String(p.duration ?? '1'),
          repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
        };
        const notes = Array.isArray(p.notes) && p.notes.length > 0 ? p.notes.map(toNote) : [toNote(p)];
        return { ...base, notes };
      });
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(cleaned));
    } catch (e) {
      // ignore storage failures
    }
    setPoints(cleaned);
    setIsStorageModalOpen(false);
  }

  function addPoint() {
    const dp = draftPoint;
    if (!dp) return false;
    try {
      // Validate fraction-like inputs by constructing fractions (throws on invalid)
      Fr(dp.startBeat);
      Fr(dp.duration);
    } catch (e) {
      window.alert('Please enter valid startBeat and duration (e.g., 1, 0.5, 1/3)');
      return false;
    }
    const repeat = Math.max(1, Number(dp.repeat) | 0);
    const sanitizedNotes = (Array.isArray(dp.notes) && dp.notes.length > 0 ? dp.notes : [{}]).map((n) => {
      const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
      const rootIdx = Number.isFinite(Number(n?.root)) ? ((Number(n.root) % 12) + 12) % 12 : (NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0);
      const scaleId = typeof n?.scale === 'string' ? n.scale : (selectedScaleId || 'none');
      const leg = Number.isFinite(Number(n?.legato)) ? Number(n.legato) : 1;
      const ampVal = Number.isFinite(Number(n?.amp)) ? Number(n.amp) : 1;
      const deg = Number.isFinite(Number(n?.degree)) ? Number(n.degree) : (Number.isFinite(Number(selectedDegree)) ? Number(selectedDegree) : null);
      const oct = Number.isFinite(Number(n?.octave)) ? Number(n.octave) : (Number.isFinite(Number(octave)) ? Number(octave) : null);
      return { legato: leg, amp: ampVal, scale: scaleId, root: rootIdx, degree: deg, octave: oct };
    });
    setPoints((prev) => [
      ...prev,
      {
        startBeat: String(dp.startBeat),
        duration: String(dp.duration),
        repeat,
        notes: sanitizedNotes,
      },
    ]);
    return true;
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
          // Basic shape validation; coerce minimal fields to new schema
          const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
          const defaultRoot = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
          const toNote = (n) => ({
            legato: (Number.isFinite(Number(n?.legato)) ? Number(n.legato) : 1),
            amp: (Number.isFinite(Number(n?.amp)) ? Number(n.amp) : 1),
            scale: typeof n?.scale === 'string' ? n.scale : (selectedScaleId || 'none'),
            root: Number.isFinite(Number(n?.root)) ? Number(n.root) : defaultRoot,
            degree: Number.isFinite(Number(n?.degree)) ? Number(n.degree) : (Number.isFinite(Number(selectedDegree)) ? Number(selectedDegree) : null),
            octave: Number.isFinite(Number(n?.octave)) ? Number(n.octave) : (Number.isFinite(Number(octave)) ? Number(octave) : null),
          });
          const cleaned = parsed
            .filter((p) => p && typeof p === 'object')
            .map((p) => {
              const base = {
                startBeat: String(p.startBeat ?? '0'),
                duration: String(p.duration ?? '1'),
                repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
              };
              const notes = Array.isArray(p.notes) && p.notes.length > 0 ? p.notes.map(toNote) : [toNote(p)];
              return { ...base, notes };
            });
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
            legato: String(f.legato ?? '1'),
            amp: String(f.amp ?? '1'),
            repeat: Math.max(1, Number(f.repeat ?? 1) | 0),
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

  // Load preview options on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREVIEW);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          if (typeof o.compressOutput === 'boolean') setCompressOutput(o.compressOutput);
          if (Object.prototype.hasOwnProperty.call(o, 'loopCount')) setLoopCount(String(o.loopCount ?? ''));
          if (typeof o.instrument === 'string') setInstrument(o.instrument);
        }
      }
    } catch {}
  }, []);

  // Persist preview options on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_PREVIEW,
        JSON.stringify({ compressOutput, loopCount, instrument })
      );
    } catch {}
  }, [compressOutput, loopCount, instrument]);

  // Close Add modal on Escape key
  useEffect(() => {
    if (!isAddModalOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setIsAddModalOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddModalOpen]);

  // Initialize modal draft state when opening the Add-point modal
  useEffect(() => {
    if (!isAddModalOpen) return;
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const rootIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const scaleId = selectedScaleId || 'none';
    const sd = Number(selectedDegree);
    const degreeVal = Number.isFinite(sd) ? sd : null;
    const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : null;
    setDraftPoint({
      startBeat: String(form.startBeat ?? '0'),
      duration: String(form.duration ?? '1'),
      repeat: Math.max(1, Number(form.repeat ?? 1) | 0),
      notes: [
        {
          legato: String(form.legato ?? '1'),
          amp: String(form.amp ?? '1'),
          scale: scaleId,
          root: rootIdx,
          degree: degreeVal,
          octave: baseOct,
        },
      ],
    });
  }, [isAddModalOpen]);

  // Initialize modal draft state when opening the Add-point modal
  useEffect(() => {
    if (!isAddModalOpen) return;
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const rootIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const scaleId = selectedScaleId || 'none';
    const sd = Number(selectedDegree);
    const degreeVal = Number.isFinite(sd) ? sd : null;
    const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : null;
    setDraftPoint({
      startBeat: String(form.startBeat ?? '0'),
      duration: String(form.duration ?? '1'),
      repeat: Math.max(1, Number(form.repeat ?? 1) | 0),
      notes: [
        {
          legato: String(form.legato ?? '1'),
          amp: String(form.amp ?? '1'),
          scale: scaleId,
          root: rootIdx,
          degree: degreeVal,
          octave: baseOct,
        },
      ],
    });
  }, [isAddModalOpen]);

  const timeline = useMemo(() => {
    return buildTimeline({ timeSig: { beatsPerBar, beatUnit }, bars, points });
  }, [beatsPerBar, beatUnit, bars, points]);
  const preview = useMemo(() => {
    return toPbind(timeline, { compress: compressOutput, loopCount: loopCount, instrument });
  }, [timeline, compressOutput, loopCount, instrument]);
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
        {/* Timeline settings moved above the timeline */}
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
                  const isNote = !c.rest && (c.degree != null);
                  const degForHue = Number.isFinite(Number(c.degree)) ? Number(c.degree) : 0;
                  const hue = isNote ? ((Math.round(degForHue) % 12) * 30) : 0;
                  const bg = isNote ? `hsl(${hue}, 70%, 60%)` : '#dcdcdc';
                  const showLabel = isNote && widthPct >= 6;
                  const label = isNote ? String(++noteCount) : '';
                  return (
                    <div
                      key={idx}
                      title={isNote ? `note #${noteCount} (degree ${c.degree}${c.octave != null ? ` @ octave ${c.octave}` : ''}), dur: ${String(c.dur)}` : `rest, dur: ${String(c.dur)}`}
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

        {/* Add-point moved into a modal. 'Add' button is now in the Points header. */}

        {/* Points list */}
        <div className="box">
          <div className="level" style={{ marginBottom: '0.5rem' }}>
            <div className="level-left">
              <h3 className="title is-6" style={{ margin: 0 }}>Points</h3>
            </div>
            <div className="level-right">
              <div className="level-item">
                <button className="button is-primary is-small" onClick={() => setIsAddModalOpen(true)}>
                  <span className="icon is-small" style={{ marginRight: 6 }}>
                    <i className="fas fa-plus" aria-hidden="true"></i>
                  </span>
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
          {points.length === 0 ? (
            <p className="has-text-grey">No points yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Start</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Duration</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Notes</th>
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
                      <td style={{ padding: '0.25rem' }}>
                        {(() => {
                          const dur = String(p.duration);
                          const rep = Math.max(1, Number(p.repeat) | 0);
                          return rep > 1 ? `${dur} x ${rep}` : dur;
                        })()}
                      </td>
                      <td style={{ padding: '0.25rem' }}>
                        {(() => {
                          const ROOT_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                          const notesArr = Array.isArray(p.notes) ? p.notes : [];
                          return (
                            <table className="table is-striped is-narrow is-fullwidth is-hoverable" style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '0.25rem' }}>Scale</th>
                                  <th style={{ padding: '0.25rem' }}>Root</th>
                                  <th style={{ padding: '0.25rem' }}>Octave</th>
                                  <th style={{ padding: '0.25rem' }}>Degree</th>
                                  <th style={{ padding: '0.25rem' }}>Legato</th>
                                  <th style={{ padding: '0.25rem' }}>Amp</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(notesArr.length > 0 ? notesArr : [null]).map((n, i) => {
                                  if (!n) {
                                    return (
                                      <tr key={`empty-${i}`}>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                        <td style={{ padding: '0.25rem' }}>—</td>
                                      </tr>
                                    );
                                  }
                                  const scaleLabel = n.scale || '—';
                                  const rNum = Number(n.root);
                                  const rValid = Number.isFinite(rNum);
                                  const rIdx = rValid ? ((rNum % 12) + 12) % 12 : null;
                                  const rName = rValid ? ROOT_NAMES[rIdx] : '—';
                                  const octaveLabel = n.octave == null ? '—' : String(n.octave);
                                  const degreeLabel = n.degree == null ? '—' : String(n.degree);
                                  const legatoLabel = n.legato == null ? '1' : String(n.legato);
                                  const ampLabel = n.amp == null ? '1' : String(n.amp);
                                  return (
                                    <tr key={`note-${i}`}>
                                      <td style={{ padding: '0.25rem' }}>{scaleLabel}</td>
                                      <td style={{ padding: '0.25rem' }}>{rValid ? `${rName} (${rIdx})` : '—'}</td>
                                      <td style={{ padding: '0.25rem' }}>{octaveLabel}</td>
                                      <td style={{ padding: '0.25rem' }}>{degreeLabel}</td>
                                      <td style={{ padding: '0.25rem' }}>{legatoLabel}</td>
                                      <td style={{ padding: '0.25rem' }}>{ampLabel}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '0.25rem' }}>
                        <button
                          className="button is-small is-danger"
                          onClick={() => removePoint(idx)}
                          aria-label="Remove point"
                          title="Remove point"
                        >
                          <span className="icon is-small">
                            <i className="fas fa-trash" aria-hidden="true"></i>
                          </span>
                        </button>
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
          {/* Compress on its own line */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label className="checkbox" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={compressOutput}
                onChange={(e) => setCompressOutput(e.target.checked)}
                style={{ marginRight: '0.4rem' }}
              />
              Compress output with Pn()
            </label>
          </div>
          {/* Instrument and loop count on the next row */}
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="instrument" className="label is-small" style={{ margin: 0 }}>Instrument</label>
              <input
                id="instrument"
                className="input is-small"
                type="text"
                placeholder="default or pmGrowl"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                style={{ width: '12rem' }}
              />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label htmlFor="loop-count" className="label is-small" style={{ margin: 0 }}>Loop count</label>
              <input
                id="loop-count"
                className="input is-small"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="inf"
                value={loopCount}
                onChange={(e) => setLoopCount(e.target.value)}
                style={{ width: '6rem' }}
              />
            </div>
          </div>
          <textarea
            className="textarea"
            rows={Math.max(8, Math.min(20, (preview.match(/\n/g)?.length || 0) + 2))}
            style={{ fontFamily: 'monospace' }}
            readOnly
            value={preview}
            onFocus={(e) => e.target.select()}
          />
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
      {/* Add-point modal */}
      <div className={`modal ${isAddModalOpen ? 'is-active' : ''}`} role="dialog" aria-modal={isAddModalOpen}>
        <div className="modal-background" onClick={() => setIsAddModalOpen(false)} />
        <div className="modal-card" style={{ maxWidth: '900px', width: 'min(900px, 96vw)' }}>
          <header className="modal-card-head">
            <p className="modal-card-title">Add Pbind point</p>
            <button className="delete" aria-label="close" onClick={() => setIsAddModalOpen(false)} />
          </header>
          <section className="modal-card-body">
            {/* Row 1: timing fields */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="label is-small">Start beat</label>
                <input
                  className="input is-small"
                  type="text"
                  placeholder="e.g. 1 or 3/2"
                  value={draftPoint?.startBeat ?? ''}
                  onChange={(e) =>
                    setDraftPoint((dp) => (dp ? { ...dp, startBeat: e.target.value } : dp))
                  }
                />
              </div>
              <div>
                <label className="label is-small">Duration</label>
                <input
                  className="input is-small"
                  type="text"
                  placeholder="e.g. 1/3, 1/4"
                  value={draftPoint?.duration ?? ''}
                  onChange={(e) =>
                    setDraftPoint((dp) => (dp ? { ...dp, duration: e.target.value } : dp))
                  }
                />
              </div>
              <div>
                <label className="label is-small">Repeat</label>
                <input
                  className="input is-small"
                  type="number"
                  min={1}
                  value={draftPoint?.repeat ?? 1}
                  onChange={(e) =>
                    setDraftPoint((dp) => (dp ? { ...dp, repeat: Math.max(1, Number(e.target.value) | 0) } : dp))
                  }
                />
              </div>
            </div>
            {/* Notes section heading */}
            <p className="has-text-weight-semibold is-size-7" style={{ margin: '0.75rem 0 0.25rem' }}>Notes (notes[])</p>
            {/* Row 2: pitch selectors + articulation/dynamics */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {(() => {
                const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const rootIdx = Number.isFinite(Number(n0.root)) ? ((Number(n0.root) % 12) + 12) % 12 : 0;
                const rootName = NOTE_NAMES[rootIdx] || 'C';
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="note-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Key</label>
                    <div className="select is-small">
                      <select
                        id="note-select-pbind"
                        value={rootName}
                        aria-label="Key name"
                        onChange={(e) => {
                          const name = e.target.value;
                          const idx = NOTE_NAMES.indexOf(name);
                          setDraftPoint((dp) => {
                            if (!dp) return dp;
                            const notes = [...dp.notes];
                            const first = { ...(notes[0] || {}) };
                            first.root = idx >= 0 ? idx : 0;
                            notes[0] = first;
                            return { ...dp, notes };
                          });
                        }}
                      >
                        {NOTE_NAMES.map((nm) => (
                          <option key={nm} value={nm}>{nm}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const draftScaleId = typeof n0.scale === 'string' ? n0.scale : '';
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="scale-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Scale</label>
                    <div className="select is-small">
                      <select
                        id="scale-select-pbind"
                        value={draftScaleId}
                        aria-label="Selected scale"
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftPoint((dp) => {
                            if (!dp) return dp;
                            const notes = [...dp.notes];
                            const first = { ...(notes[0] || {}) };
                            first.scale = val;
                            notes[0] = first;
                            return { ...dp, notes };
                          });
                        }}
                        style={{ minWidth: '160px' }}
                      >
                        <option value="">— none —</option>
                        {Array.isArray(scales) ? scales.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        )) : null}
                      </select>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const octVal = n0.octave == null ? '' : String(n0.octave);
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="octave-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Octave</label>
                    <div className="select is-small">
                      <select
                        id="octave-select-pbind"
                        value={octVal}
                        aria-label="Octave"
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setDraftPoint((dp) => {
                            if (!dp) return dp;
                            const notes = [...dp.notes];
                            const first = { ...(notes[0] || {}) };
                            first.octave = v;
                            notes[0] = first;
                            return { ...dp, notes };
                          });
                        }}
                      >
                        <option value="">—</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const rootIdx = Number.isFinite(Number(n0.root)) ? ((Number(n0.root) % 12) + 12) % 12 : 0;
                const draftScaleId = typeof n0.scale === 'string' ? n0.scale : '';
                const scaleObj = Array.isArray(scales) ? scales.find((s) => s.id === draftScaleId) : null;
                const degVal = n0.degree == null ? '' : String(n0.degree);
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="degree-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Degrees</label>
                    <div className="select is-small">
                      <select
                        id="degree-select-pbind"
                        value={degVal}
                        aria-label="Selected degree"
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setDraftPoint((dp) => {
                            if (!dp) return dp;
                            const notes = [...dp.notes];
                            const first = { ...(notes[0] || {}) };
                            first.degree = v;
                            notes[0] = first;
                            return { ...dp, notes };
                          });
                        }}
                        disabled={!scaleObj || !Array.isArray(scaleObj.degrees) || scaleObj.degrees.length === 0}
                        style={{ minWidth: '140px' }}
                      >
                        <option value="">— degree —</option>
                        {scaleObj && Array.isArray(scaleObj.degrees)
                          ? scaleObj.degrees.map((d) => {
                              const semis = Number(d);
                              const total = rootIdx + semis;
                              const name = NOTE_NAMES[((total % 12) + 12) % 12];
                              const octaveOffset = Math.floor(total / 12);
                              const baseOct = Number.isFinite(Number(n0.octave)) ? Number(n0.octave) : 0;
                              const displayOct = baseOct + octaveOffset;
                              const rootMidi = (baseOct + 1) * 12 + rootIdx;
                              const midi = rootMidi + semis;
                              const label = `${d}) ${name}${displayOct} (${midi})`;
                              return (
                                <option key={d} value={String(d)}>{label}</option>
                              );
                            })
                          : null}
                      </select>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const legVal = n0.legato == null ? '1' : String(n0.legato);
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="legato-input-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Legato</label>
                    <input
                      id="legato-input-pbind"
                      className="input is-small"
                      type="number"
                      step="any"
                      min={0}
                      value={legVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftPoint((dp) => {
                          if (!dp) return dp;
                          const notes = [...dp.notes];
                          const first = { ...(notes[0] || {}) };
                          first.legato = v;
                          notes[0] = first;
                          return { ...dp, notes };
                        });
                      }}
                      style={{ width: '6rem' }}
                    />
                  </div>
                );
              })()}
              {(() => {
                const n0 = (draftPoint && Array.isArray(draftPoint.notes) && draftPoint.notes[0]) || {};
                const ampVal = n0.amp == null ? '1' : String(n0.amp);
                return (
                  <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="amp-input-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Amp</label>
                    <input
                      id="amp-input-pbind"
                      className="input is-small"
                      type="number"
                      step="any"
                      min={0}
                      value={ampVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftPoint((dp) => {
                          if (!dp) return dp;
                          const notes = [...dp.notes];
                          const first = { ...(notes[0] || {}) };
                          first.amp = v;
                          notes[0] = first;
                          return { ...dp, notes };
                        });
                      }}
                      style={{ width: '6rem' }}
                    />
                  </div>
                );
              })()}
            </div>
          </section>
          <footer className="modal-card-foot" style={{ justifyContent: 'flex-end' }}>
            <button className="button" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button
              className="button is-primary"
              onClick={() => {
                const ok = addPoint();
                if (ok) setIsAddModalOpen(false);
              }}
            >
              Add point
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}

export default Pbind;
