// Timeline builder for Pbind using exact rational math (mathjs fractions via our wrapper)
import { Fr, add, sub, mul, lt, lte, toNumber, from as fromFr } from '../../lib/fraction.js';

export function restMarker() {
  return { __rest: true };
}

function cmpFrac(a, b) {
  if (lt(a, b)) return -1;
  if (lte(a, b)) return 0; // equal
  return 1;
}

// Build a timeline filling gaps with rests, trimming overlaps, and clipping to total length
export function buildTimeline({ timeSig = { beatsPerBar: 4, beatUnit: 4 }, bars = 1, points = [] }) {
  const total = Fr(timeSig.beatsPerBar * bars, 1);

  // Expand repeats and notes into separate sequential events (one event per repeated block; notes can be multiple per point)
  const expanded = [];
  for (const p of points) {
    const start = fromFr(p.startBeat);
    const dur = fromFr(p.duration);
    const repeat = Math.max(1, Number(p.repeat || 1) | 0);
    const notes = (Array.isArray(p.notes) && p.notes.length > 0) ? p.notes : [p];
    const degreesArr = notes.map((n) => (Number.isFinite(Number(n.degree)) ? Number(n.degree) : null)).filter((v) => v != null);
    const octavesArr = notes.map((n) => (Number.isFinite(Number(n.octave)) ? Number(n.octave) : null)).filter((v) => v != null);
    const rootsArr = notes.map((n) => (Number.isFinite(Number(n.root)) ? Number(n.root) : null)).filter((v) => v != null);
  const scalesArr = notes.map((n) => (n && typeof n.scale === 'string' ? n.scale : null));
  const legatosArr = notes.map((n) => (Number.isFinite(Number(n.legato)) ? Number(n.legato) : 1));
  const ampsArr = notes.map((n) => (Number.isFinite(Number(n.amp)) ? Number(n.amp) : 1));

    const degreeVal = degreesArr.length <= 1 ? (degreesArr[0] ?? null) : degreesArr;
    const octaveVal = octavesArr.length <= 1 ? (octavesArr[0] ?? null) : octavesArr;
    const rootVal = rootsArr.length <= 1 ? (rootsArr[0] ?? null) : rootsArr;
  // SuperCollider Events expect \scale to be a single Scale per step (not an array).
  // If multiple notes are present, we pick the first non-null scale value for the step.
  // This avoids errors like "binary operator '+' failed" where an Array of Scales reaches degreeToKey.
  const scaleVal = (scalesArr.find((s) => s && s !== 'none')) ?? null;
  const legatoVal = legatosArr.length <= 1 ? (legatosArr[0] ?? 1) : legatosArr;
  const ampVal = ampsArr.length <= 1 ? (ampsArr[0] ?? 1) : ampsArr;
    // Strum: a float stagger applied to notes within a point (store per event; interpretation happens downstream in SC)
    const strumVal = (p && p.strum !== '' && p.strum != null && Number.isFinite(Number(p.strum))) ? Number(p.strum) : null;
    for (let i = 0; i < repeat; i++) {
      const offset = mul(dur, Fr(i, 1));
      const normScale = (scaleVal && scaleVal !== 'none') ? scaleVal : null;
      const legato = Array.isArray(legatoVal)
        ? legatoVal.map((l) => (Number.isFinite(Number(l)) ? Number(l) : 1))
        : (Number.isFinite(Number(legatoVal)) ? Number(legatoVal) : 1);
      expanded.push({ start: add(start, offset), dur, degree: degreeVal ?? null, octave: octaveVal ?? null, scale: normScale, root: rootVal ?? null, legato, amp: ampVal, strum: strumVal });
    }
  }

  // Sort by start then duration (shorter first to pack neatly)
  expanded.sort((a, b) => {
    if (lt(a.start, b.start)) return -1;
    if (lt(b.start, a.start)) return 1;
    if (lt(a.dur, b.dur)) return -1;
    if (lt(b.dur, a.dur)) return 1;
    return 0;
  });

  const chunks = [];
  let t = Fr(0, 1);

  for (let i = 0; i < expanded.length; i++) {
    const ev = expanded[i];
    if (lt(t, ev.start)) {
      // gap -> Rest
      const gap = sub(ev.start, t);
      chunks.push({ rest: true, dur: gap });
      t = ev.start;
    }

    // Trim event if it runs into next event or past total
    const evEnd = add(ev.start, ev.dur);
    const nextStart = i + 1 < expanded.length ? expanded[i + 1].start : total;
    const hardEnd = lt(nextStart, evEnd) ? nextStart : evEnd;
    const clipEnd = lt(total, hardEnd) ? total : hardEnd;
    if (lt(t, clipEnd)) {
      const playDur = sub(clipEnd, t);
      chunks.push({
        rest: false,
        dur: playDur,
        degree: ev.degree ?? null,
        octave: ev.octave ?? null,
        scale: ev.scale ?? null,
        root: ev.root ?? null,
        legato: ev.legato == null ? 1 : ev.legato,
        amp: ev.amp == null ? 1 : ev.amp,
        // propagate strum so non-zero values appear in pattern output
        strum: ev.strum == null ? null : ev.strum,
      });
      t = clipEnd;
    }
    if (!lt(t, total)) break;
  }

  // Trailing rest to fill to total
  if (lt(t, total)) {
    chunks.push({ rest: true, dur: sub(total, t) });
  }

  const dursFr = chunks.map((c) => c.dur);
  const durs = dursFr.map((f) => toNumber(f));
  const degrees = [];
  const octaves = [];
  const roots = [];
  const scales = [];
  const legatos = [];
  const amps = [];
  const strums = [];
  let lastRoot = null;
  let lastScale = null;
  for (const c of chunks) {
    // degree/octave keep Rest markers to align with note/rest visualization
    degrees.push(c.rest ? restMarker() : (c.degree == null ? null : c.degree));
    octaves.push(c.rest ? restMarker() : (c.octave == null ? null : c.octave));

    // For root, propagate last seen value through rests so the pattern remains defined
    if (!c.rest && c.root != null) lastRoot = c.root;
    roots.push(lastRoot == null ? 0 : lastRoot);
    // For scale: behave like degree/octave — use Rest() on rest chunks; on note chunks use explicit scale or null
    if (c.rest) {
      scales.push(restMarker());
    } else {
      lastScale = (c.scale == null ? null : c.scale);
      scales.push(lastScale);
    }
    // Legato mirrors degree/octave behavior
    legatos.push(c.rest ? restMarker() : (c.legato == null ? 1 : c.legato));
    // Amp mirrors legato behavior
    amps.push(c.rest ? restMarker() : (c.amp == null ? 1 : c.amp));
    strums.push(c.rest ? restMarker() : (c.strum == null ? 0 : c.strum));
  }

  return { chunks, durs, dursFr, degrees, octaves, roots, scales, legatos, amps, strums, totalBeats: toNumber(total) };
}

export function fracToScLiteral(fr) {
  // Prefer strict rational form n/d for SC
  try {
    // fraction.js (used by mathjs) exposes s (sign), n (numerator), d (denominator)
    if (fr && typeof fr === 'object' && 'n' in fr && 'd' in fr) {
      const sign = fr.s < 0 ? '-' : '';
      const n = fr.n;
      const d = fr.d;
      if (d === 1) return `${sign}${n}`;
      return `${sign}${n}/${d}`;
    }
    if (fr && typeof fr.toFraction === 'function') {
      return fr.toFraction();
    }
  } catch (_) {}
  // Fallback: best-effort string
  return String(fr);
}

function compressWithPn(list, formatItem = (v) => String(v)) {
  const tokens = [];
  if (!Array.isArray(list) || list.length === 0) return tokens;
  let curr = list[0];
  let count = 1;
  for (let i = 1; i < list.length; i++) {
    const v = list[i];
    if (v === curr) {
      count++;
    } else {
      if (count > 1) tokens.push(`Pn(${formatItem(curr)}, ${count})`);
      else tokens.push(formatItem(curr));
      curr = v;
      count = 1;
    }
  }
  if (count > 1) tokens.push(`Pn(${formatItem(curr)}, ${count})`);
  else tokens.push(formatItem(curr));
  return tokens;
}

export function toPbind({ durs, dursFr, degrees, octaves, roots, scales, legatos, amps, strums }, options = {}) {
  const { compress = true, loopCount = null, instrument = '' } = options;
  const repeatsLit = (Number.isFinite(Number(loopCount)) && Number(loopCount) > 0)
    ? String(Math.floor(Number(loopCount)))
    : 'inf';
  const instrumentSym = (() => {
    const raw = String(instrument || '').trim();
    if (!raw) return '\\default';
    return raw.startsWith('\\') ? raw : `\\${raw}`;
  })();

  const fmtArray = (arr, mapItem = (x) => String(x)) => `[` + arr.map(mapItem).join(', ') + `]`;
  const octaveItems = Array.isArray(octaves)
    ? octaves.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x));
        return String(v);
      })
    : [];
  const octaveLit = octaveItems.length > 0
    ? (compress ? compressWithPn(octaveItems, (s) => s).join(', ') : octaveItems.join(', '))
    : '';

  const degreeItems = Array.isArray(degrees)
    ? degrees.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x));
        return String(v);
      })
    : [];
  const degreeLit = degreeItems.length > 0
    ? (compress ? compressWithPn(degreeItems, (s) => s).join(', ') : degreeItems.join(', '))
    : '';

  const rootItems = Array.isArray(roots)
    ? roots.map((v) => {
        if (v == null) return '0';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x == null ? 0 : x));
        return String(v);
      })
    : [];
  const rootLit = rootItems.length > 0
    ? (compress ? compressWithPn(rootItems, (s) => s).join(', ') : rootItems.join(', '))
    : '';

  const scaleItems = Array.isArray(scales)
    ? scales.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        // Defensive: \scale must not be an array in SC Events. If an array slips through,
        // pick the first non-null value to keep the pattern valid.
        if (Array.isArray(v)) {
          const first = v.find((x) => x != null);
          return first ? `Scale.${String(first)}` : 'Rest()';
        }
        return `Scale.${String(v)}`;
      })
    : [];
  const scaleLit = scaleItems.length > 0
    ? (compress ? compressWithPn(scaleItems, (s) => s).join(', ') : scaleItems.join(', '))
    : '';

  const legatoItems = Array.isArray(legatos)
    ? legatos.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x));
        return String(v);
      })
    : [];
  const legatoLit = legatoItems.length > 0
    ? (compress ? compressWithPn(legatoItems, (s) => s).join(', ') : legatoItems.join(', '))
    : '';

  const ampItems = Array.isArray(amps)
    ? amps.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x));
        return String(v);
      })
    : [];
  const ampLit = ampItems.length > 0
    ? (compress ? compressWithPn(ampItems, (s) => s).join(', ') : ampItems.join(', '))
    : '';

  const strumItems = Array.isArray(strums)
    ? strums.map((v) => {
        if (v && v.__rest) return 'Rest()';
        if (v == null) return 'Rest()';
        if (Array.isArray(v)) return fmtArray(v, (x) => String(x)); // though we expect scalar
        return String(v);
      })
    : [];
  const strumLit = strumItems.length > 0
    ? (compress ? compressWithPn(strumItems, (s) => s).join(', ') : strumItems.join(', '))
    : '';

  const durItems = (Array.isArray(dursFr) && dursFr.length > 0)
    ? dursFr.map((f) => fracToScLiteral(f))
    : durs.map((n) => String(+Number(n).toFixed(6)));
  const durLit = durItems.length > 0
    ? (compress ? compressWithPn(durItems, (s) => s).join(', ') : durItems.join(', '))
    : '';

  return `(\nPbind(\n  \\instrument, ${instrumentSym},\n  \\scale, Pseq([${scaleLit}], ${repeatsLit}),\n  \\root,  Pseq([${rootLit}], ${repeatsLit}),\n  \\octave, Pseq([${octaveLit}], ${repeatsLit}),\n  \\degree, Pseq([${degreeLit}], ${repeatsLit}),\n  \\legato, Pseq([${legatoLit}], ${repeatsLit}),\n  \\amp, Pseq([${ampLit}], ${repeatsLit}),\n  \\strum, Pseq([${strumLit}], ${repeatsLit}),\n  \\dur,  Pseq([${durLit}], ${repeatsLit})\n).play\n)`;
}
