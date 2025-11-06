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

  // Output preferences
  const [compressOutput, setCompressOutput] = useState(true);
  const [loopCount, setLoopCount] = useState(''); // blank => inf
  const [instrument, setInstrument] = useState(''); // blank => \\default (handled in toPbind)

  // No midinote: we store degree & octave per point, while scale/root are provided by global state

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
  setStorageError('JSON must be an array of points: [{ startBeat, duration, repeat, notes: [{ legato, amp, scale, root, degree, octave }] }, ...]');
      return;
    }
    // Clean and coerce shape for new schema with notes[]
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const rootIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const currentScale = selectedScaleId || 'none';
    const cleaned = parsed
      .filter((p) => p && typeof p === 'object')
      .map((p) => {
        const base = {
          startBeat: String(p.startBeat ?? '0'),
          duration: String(p.duration ?? '1'),
          repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
        };
        // If legacy shape, wrap into notes[]
        const hasNotes = Array.isArray(p.notes);
        const n = hasNotes && p.notes.length > 0 ? p.notes[0] : p;
        const noteObj = {
          legato: (Number.isFinite(Number(n.legato)) ? Number(n.legato) : 1),
          amp: (Number.isFinite(Number(n.amp)) ? Number(n.amp) : 1),
          scale: typeof n.scale === 'string' ? n.scale : currentScale,
          root: Number.isFinite(Number(n.root)) ? Number(n.root) : rootIdx,
          degree: Number.isFinite(Number(n.degree)) ? Number(n.degree) : (Number.isFinite(Number(selectedDegree)) ? Number(selectedDegree) : null),
          octave: Number.isFinite(Number(n.octave)) ? Number(n.octave) : (Number.isFinite(Number(octave)) ? Number(octave) : null),
        };
        return { ...base, notes: [noteObj] };
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
    try {
      // Validate fraction-like inputs by constructing fractions (throws on invalid)
      Fr(form.startBeat);
      Fr(form.duration);
    } catch (e) {
      window.alert('Please enter valid startBeat and duration (e.g., 1, 0.5, 1/3)');
      return;
    }
    const repeat = Math.max(1, Number(form.repeat) | 0);
    const sd = Number(selectedDegree);
    const degreeVal = Number.isFinite(sd) ? sd : null;
    const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : null;
  const leg = Number.isFinite(Number(form.legato)) ? Number(form.legato) : 1;
  const ampVal = Number.isFinite(Number(form.amp)) ? Number(form.amp) : 1;
    const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
    const rootIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
    const scaleId = selectedScaleId || 'none';
    setPoints((prev) => [
      ...prev,
      {
        startBeat: form.startBeat,
        duration: form.duration,
        repeat,
        notes: [
          { legato: leg, amp: ampVal, scale: scaleId, root: rootIdx, degree: degreeVal, octave: baseOct },
        ],
      },
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
          // Basic shape validation; coerce minimal fields to new schema
          const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
          const defaultRoot = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
          const cleaned = parsed
            .filter((p) => p && typeof p === 'object')
            .map((p) => {
              const base = {
                startBeat: String(p.startBeat ?? '0'),
                duration: String(p.duration ?? '1'),
                repeat: Math.max(1, Number(p.repeat ?? 1) | 0),
              };
              const hasNotes = Array.isArray(p.notes);
              const n = hasNotes && p.notes.length > 0 ? p.notes[0] : p;
              const noteObj = {
                legato: (Number.isFinite(Number(n.legato)) ? Number(n.legato) : 1),
                amp: (Number.isFinite(Number(n.amp)) ? Number(n.amp) : 1),
                scale: typeof n.scale === 'string' ? n.scale : (selectedScaleId || 'none'),
                root: Number.isFinite(Number(n.root)) ? Number(n.root) : defaultRoot,
                degree: Number.isFinite(Number(n.degree)) ? Number(n.degree) : (Number.isFinite(Number(selectedDegree)) ? Number(selectedDegree) : null),
                octave: Number.isFinite(Number(n.octave)) ? Number(n.octave) : (Number.isFinite(Number(octave)) ? Number(octave) : null),
              };
              return { ...base, notes: [noteObj] };
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
          {/* Row 1: timing fields (legato moved to row 2 with pitch selectors) */}
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
          </div>
          {/* Row 2: pitch selectors */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {/* Inline synced selectors (same as header) */}
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="note-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Key</label>
              <div className="select is-small">
                <select
                  id="note-select-pbind"
                  value={note}
                  aria-label="Key name"
                  onChange={(e) => onNoteChange && onNoteChange(e.target.value)}
                >
                  <option value="C">C</option>
                  <option value="C#">C#</option>
                  <option value="D">D</option>
                  <option value="E♭">E♭</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="F#">F#</option>
                  <option value="G">G</option>
                  <option value="G#">G#</option>
                  <option value="A">A</option>
                  <option value="B♭">B♭</option>
                  <option value="B">B</option>
                </select>
              </div>
            </div>
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="scale-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Scale</label>
              <div className="select is-small">
                <select
                  id="scale-select-pbind"
                  value={selectedScaleId}
                  aria-label="Selected scale"
                  onChange={(e) => onSelectedScaleChange && onSelectedScaleChange(e.target.value)}
                  style={{ minWidth: '160px' }}
                >
                  <option value="">— none —</option>
                  {Array.isArray(scales) ? scales.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )) : null}
                </select>
              </div>
            </div>
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="octave-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Octave</label>
              <div className="select is-small">
                <select
                  id="octave-select-pbind"
                  value={octave}
                  aria-label="Octave"
                  onChange={(e) => onOctaveChange && onOctaveChange(e.target.value)}
                >
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
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="degree-select-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Degrees</label>
              <div className="select is-small">
                <select
                  id="degree-select-pbind"
                  value={selectedDegree}
                  aria-label="Selected degree"
                  onChange={(e) => onSelectedDegreeChange && onSelectedDegreeChange(e.target.value)}
                  disabled={!selectedScale || !Array.isArray(selectedScale.degrees) || selectedScale.degrees.length === 0}
                  style={{ minWidth: '140px' }}
                >
                  <option value="">— degree —</option>
                  {selectedScale && Array.isArray(selectedScale.degrees)
                    ? selectedScale.degrees.map((d) => {
                        const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                        const baseIdx = NOTE_NAMES.indexOf(note) >= 0 ? NOTE_NAMES.indexOf(note) : 0;
                        const semis = Number(d);
                        const total = baseIdx + semis;
                        const name = NOTE_NAMES[((total % 12) + 12) % 12];
                        const octaveOffset = Math.floor(total / 12);
                        const baseOct = Number.isFinite(Number(octave)) ? Number(octave) : 0;
                        const displayOct = baseOct + octaveOffset;
                        const rootMidi = (baseOct + 1) * 12 + baseIdx;
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
          </div>
          {/* Row 3: articulation/dynamics + Add button */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="legato-input-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Legato</label>
              <input
                id="legato-input-pbind"
                className="input is-small"
                type="number"
                step="any"
                min={0}
                value={form.legato}
                onChange={(e) => setForm((f) => ({ ...f, legato: e.target.value }))}
                style={{ width: '6rem' }}
              />
            </div>
            <div className="control" style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="amp-input-pbind" className="label is-small" style={{ marginBottom: '0.25rem' }}>Amp</label>
              <input
                id="amp-input-pbind"
                className="input is-small"
                type="number"
                step="any"
                min={0}
                value={form.amp}
                onChange={(e) => setForm((f) => ({ ...f, amp: e.target.value }))}
                style={{ width: '6rem' }}
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
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Legato</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Amp</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Scale</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Octave</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem' }}>Deg / Note (MIDI)</th>
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
                      <td style={{ padding: '0.25rem' }}>{(() => {
                        const n = Array.isArray(p.notes) && p.notes[0] ? p.notes[0] : {};
                        return n.legato == null ? '1' : String(n.legato);
                      })()}</td>
                      <td style={{ padding: '0.25rem' }}>{(() => {
                        const n = Array.isArray(p.notes) && p.notes[0] ? p.notes[0] : {};
                        return n.amp == null ? '1' : String(n.amp);
                      })()}</td>
                      <td style={{ padding: '0.25rem' }}>
                        {(() => {
                          const ROOT_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                          const n = Array.isArray(p.notes) && p.notes[0] ? p.notes[0] : {};
                          if (!Number.isFinite(Number(n.root))) return n.scale || '—';
                          const r = Number(n.root) % 12;
                          const name = ROOT_NAMES[(r + 12) % 12];
                          const scaleLabel = n.scale || '—';
                          return `${name}(${r}) ${scaleLabel}`;
                        })()}
                      </td>
                      <td style={{ padding: '0.25rem' }}>{(() => {
                        const n = Array.isArray(p.notes) && p.notes[0] ? p.notes[0] : {};
                        return n.octave == null ? '—' : String(n.octave);
                      })()}</td>
                      <td style={{ padding: '0.25rem' }}>
                        {(() => {
                          const n = Array.isArray(p.notes) && p.notes[0] ? p.notes[0] : {};
                          if (n.degree == null) return '—';
                          const deg = Number(n.degree);
                          if (!Number.isFinite(deg)) return String(p.degree);
                          const rootVal = Number(n.root);
                          const octVal = Number(n.octave);
                          if (!Number.isFinite(rootVal) || !Number.isFinite(octVal)) return String(deg);
                          const safeRoot = ((rootVal % 12) + 12) % 12;
                          const midi = (octVal + 1) * 12 + safeRoot + deg;
                          if (!Number.isFinite(midi)) return String(deg);
                          const NOTE_NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B♭', 'B'];
                          const nName = NOTE_NAMES[((midi % 12) + 12) % 12] || 'C';
                          const nOct = Math.floor(midi / 12) - 1;
                          return `${deg} - ${nName}${nOct} (${midi})`;
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
    </section>
  );
}

export default Pbind;
