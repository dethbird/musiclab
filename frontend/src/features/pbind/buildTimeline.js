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

  // Expand repeats into separate sequential events
  const expanded = [];
  for (const p of points) {
    const start = fromFr(p.startBeat);
    const dur = fromFr(p.duration);
    const repeat = Math.max(1, Number(p.repeat || 1) | 0);
    for (let i = 0; i < repeat; i++) {
      const offset = mul(dur, Fr(i, 1));
      expanded.push({ start: add(start, offset), dur, degree: p.degree ?? null, octave: p.octave ?? null, scale: p.scale ?? null, root: p.root ?? null });
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
      chunks.push({ rest: false, dur: playDur, degree: ev.degree ?? null, octave: ev.octave ?? null, scale: ev.scale ?? null, root: ev.root ?? null });
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
  let lastRoot = null;
  let lastScale = null;
  for (const c of chunks) {
    // degree/octave keep Rest markers to align with note/rest visualization
    degrees.push(c.rest ? restMarker() : (c.degree == null ? null : c.degree));
    octaves.push(c.rest ? restMarker() : (c.octave == null ? null : c.octave));

    // For root/scale, propagate last seen value through rests so the pattern remains defined
    if (!c.rest && c.root != null) lastRoot = c.root;
    if (!c.rest && c.scale != null) lastScale = c.scale;
    roots.push(lastRoot == null ? 0 : lastRoot);
    scales.push(lastScale == null ? 'none' : lastScale);
  }

  return { chunks, durs, dursFr, degrees, octaves, roots, scales, totalBeats: toNumber(total) };
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

export function toPbind({ durs, dursFr, degrees, octaves, roots, scales }) {
  const octaveLit = Array.isArray(octaves)
    ? octaves.map((v) => (v && v.__rest ? 'Rest()' : (v == null ? 'Rest()' : String(v)))).join(', ')
    : '';

  const degreeLit = Array.isArray(degrees)
    ? degrees.map((v) => (v && v.__rest ? 'Rest()' : (v == null ? 'Rest()' : String(v)))).join(', ')
    : '';

  const rootLit = Array.isArray(roots)
    ? roots.map((v) => String(v == null ? 0 : v)).join(', ')
    : '';

  const scaleLit = Array.isArray(scales)
    ? scales.map((v) => {
        const id = (v == null ? 'none' : String(v));
        // Ensure valid identifier characters for SC
        return `Scale.${id}`;
      }).join(', ')
    : '';

  const durLit = (Array.isArray(dursFr) && dursFr.length > 0)
    ? dursFr.map((f) => fracToScLiteral(f)).join(', ')
    : durs.map((n) => +Number(n).toFixed(6)).join(', ');

  return `Pbind(\n  \\scale, Pseq([${scaleLit}], 1),\n  \\root,  Pseq([${rootLit}], 1),\n  \\octave, Pseq([${octaveLit}], 1),\n  \\degree, Pseq([${degreeLit}], 1),\n  \\dur,  Pseq([${durLit}], 1)\n)`;
}
