import React from 'react';
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

function EnvelopePlot({ points = [], width = 420, height = 140, padding = 12 }) {
  // guard
  if (!points || points.length === 0) return null;

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

  // Render each segment separately using its curve
  const segmentPaths = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const segCoords = [coords[i], coords[i + 1]];
    const segCurve = chooseCurveForValue(Number(points[i + 1]?.curve));
    const gen = line().x((d) => xScale(d.x)).y((d) => yScale(d.y)).curve(segCurve);
    const pd = gen(segCoords) || '';
    segmentPaths.push(pd);
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Envelope plot">
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" stroke="#eee" rx={6} />
      {/* gridlines */}
      <g stroke="#f0f0f0">
        <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} />
        <line x1={padding} x2={width - padding} y1={yScale(1)} y2={yScale(1)} />
      </g>

      {/* per-segment paths */}
      <g>
        {segmentPaths.map((pd, i) => (
          <path key={i} d={pd} fill="none" stroke="#3273dc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>

      {/* points */}
      <g>
        {coords.map((c, i) => (
          <circle key={i} cx={xScale(c.x)} cy={yScale(c.y)} r={3} fill="#3273dc" stroke="#fff" />
        ))}
      </g>

      {/* duration text */}
      <text x={padding} y={height - 6} style={{ fontSize: 11, fill: '#666' }}>
        {`duration: ${total.toFixed(3)}s`}
      </text>
    </svg>
  );
}

export default EnvelopePlot;
