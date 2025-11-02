import React, { useState } from 'react';
import {
  line,
  curveLinear,
  curveStepBefore,
  curveBasis,
  curveCardinal,
  curveMonotoneX,
  curveNatural,
} from 'd3-shape';

// A small, self-contained SVG plot for the envelope points.
// Input: points = [{level, time, curve}, ...]
// Notes:
// - `time` for the first point is ignored (start at 0). For subsequent points we treat
//   `time` as per-segment duration (this matches the derived `times` array in Envelope.jsx).
// - For now we map a few curve types to d3 curve functions. We'll iterate on how
//   SuperCollider `curves[]` maps to d3 curve interpolators later.

function EnvelopePlot({ points = [], width = 420, height = 140, padding = 6 }) {
  // guard
  if (!points || points.length === 0) return null;

  const [hover, setHover] = useState(null);

  // compute per-point absolute times (cumulative)
  const segmentDurations = points.slice(1).map((p) => Number(p.time) || 0);
  const cum = [0];
  for (let i = 0; i < segmentDurations.length; i++) {
    cum.push(cum[cum.length - 1] + segmentDurations[i]);
  }
  const total = cum[cum.length - 1] || 1;

  // normalize x (time) to pixel coordinates
  const xScale = (t) => padding + (t / total) * (width - padding * 2);

  // determine y domain from levels (support arbitrary range, but default 0..1)
  let levels = points.map((p) => Number(p.level) || 0);
  const minL = Math.min(...levels, 0);
  const maxL = Math.max(...levels, 1);
  const rangeL = maxL - minL || 1;
  const yScale = (lvl) => {
    // invert y: higher level => smaller y pixel
    const norm = (lvl - minL) / rangeL; // 0..1
    return padding + (1 - norm) * (height - padding * 2);
  };

  // prepare coords
  const coords = points.map((p, i) => ({ x: cum[i], y: Number(p.level) || 0 }));

  // choose a d3 curve interpolator for a given numeric curve value
  const chooseCurveForValue = (cv) => {
    // map some common SuperCollider-like curve numbers to d3 curves
    // -99 => hold/step; 0 => linear; small fractional values => cardinal/monotone
    if (!Number.isFinite(cv)) return curveLinear;
    if (cv === -99) return curveStepBefore;
    if (cv === 0) return curveLinear;
    if (cv === 0.5) return curveCardinal;
    if (cv === 1) return curveMonotoneX;
    if (cv === 2 || cv === 3) return curveBasis;
    // fallback
    return curveNatural;
  };

  // Sample each segment according to its curve value and build a sampled coords array
  function sampleSegment(a, b, cv, samples) {
    const sx = a.x;
    const ex = b.x;
    const duration = ex - sx;
    const sy = a.y;
    const ey = b.y;

    // easing function derived from curve value
    const eased = (t) => {
      if (!Number.isFinite(cv)) return t;
      if (cv === -99) return 0; // hold: keep start level until the end
      if (cv === 0) return t; // linear
      if (cv > 0) {
        // convex/exponential-like: use an inverse exponent to give more curvature with larger cv
        return Math.pow(t, 1 / (1 + cv));
      }
      // cv < 0 : concave / logarithmic-like
      const abs = Math.abs(cv);
      return 1 - Math.pow(1 - t, 1 / (1 + abs));
    };

    // If samples not provided, choose adaptively based on pixel length and curvature
    let n = samples || 32;
    try {
      // estimate pixel length using xScale (guard in case xScale depends on external values)
      const pxLen = Math.abs(xScale(ex) - xScale(sx));
      // base density: ~0.5 samples per pixel, plus more for higher curve magnitudes
      const extra = Math.min(160, Math.round(Math.abs(cv || 0) * 24));
      n = Math.max(4, Math.min(400, Math.round(pxLen * 0.6) + extra));
    } catch (e) {
      n = samples || 32;
    }

    const pts = [];
    const nClamped = Math.max(3, n);
    for (let i = 0; i < n; i++) {
      const tt = i / (nClamped - 1);
      let vv;
      if (cv === -99) {
        // hold: all intermediate samples stay at start level; last sample is the end
        vv = i === nClamped - 1 ? ey : sy;
      } else {
        const u = eased(tt);
        vv = sy + u * (ey - sy);
      }
      const xx = sx + tt * duration;
      pts.push({ x: xx, y: vv });
    }
    return pts;
  }

  const sampled = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const cv = Number(points[i + 1]?.curve);
    const segSamples = sampleSegment(a, b, cv, 32);
    // avoid duplicating the first sample of following segments
    if (i === 0) sampled.push(...segSamples);
    else sampled.push(...segSamples.slice(1));
  }

  // generate a single path from sampled points (linear between samples approximates the SC curve)
  const pathGen = line().x((d) => xScale(d.x)).y((d) => yScale(d.y)).curve(curveLinear);
  const d = pathGen(sampled) || '';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Envelope plot">
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" stroke="#eee" rx={6} />
      {/* gridlines */}
      <g stroke="#f0f0f0">
        <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} />
        <line x1={padding} x2={width - padding} y1={yScale(1)} y2={yScale(1)} />
      </g>

      {/* sampled path approximating per-segment SC curves */}
      <path d={d} fill="none" stroke="#3273dc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* points */}
      <g>
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={xScale(c.x)}
            cy={yScale(c.y)}
            r={4}
            fill="#3273dc"
            stroke="#fff"
            onMouseEnter={() => setHover({ i, x: xScale(c.x), y: yScale(c.y) })}
            onMouseMove={() => setHover({ i, x: xScale(c.x), y: yScale(c.y) })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </g>

      {/* tooltip */}
      {hover ? (() => {
        const i = hover.i;
        const px = hover.x;
        const py = hover.y;
        const pt = points[i] || { level: 0, time: 0, curve: 0 };
        const lines = [];
        lines.push(`#${i} level: ${Number(pt.level).toFixed(3)}`);
        if (i > 0) {
          lines.push(`time: ${Number(pt.time).toFixed(3)}s`);
          lines.push(`curve: ${String(pt.curve)}`);
        }
        const boxW = 160;
        const boxH = 16 * lines.length + 8;
        // position tooltip to the right unless close to right edge
        const tx = px + 8 > width - boxW ? px - boxW - 8 : px + 8;
        const ty = Math.max(8, py - boxH / 2);
        return (
          <g transform={`translate(${tx},${ty})`} pointerEvents="none">
            <rect x={0} y={0} width={boxW} height={boxH} rx={6} fill="#ffffff" stroke="#ddd" />
            <g transform={`translate(8,${12})`} fill="#222" style={{ fontSize: 12 }}>
              {lines.map((ln, idx) => (
                <text key={idx} x={0} y={idx * 16}>
                  {ln}
                </text>
              ))}
            </g>
          </g>
        );
      })() : null}

      {/* duration text */}
      <text x={Math.max(padding, 8)} y={height - 6} style={{ fontSize: 11, fill: '#666' }}>
        {`duration: ${total.toFixed(3)}s`}
      </text>
    </svg>
  );
}

export default EnvelopePlot;
