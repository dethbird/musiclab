import React from 'react';
import { line, curveLinear, curveStepBefore, curveBasis } from 'd3-shape';

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

  // choose a curve interpolator. Right now we use a simple mapping; this is a place
  // to experiment with mapping SuperCollider curve numbers to d3 curves.
  const chooseCurve = () => {
    // try to inspect the first non-zero curve value on segments
    const firstSeg = points[1];
    if (!firstSeg) return curveLinear;
    const cv = Number(firstSeg.curve);
    // mapping (heuristic): hold -> stepBefore (-99), linear -> 0, others -> basis
    if (cv === -99) return curveStepBefore;
    if (cv === 0) return curveLinear;
    return curveBasis;
  };

  const pathGen = line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(chooseCurve());

  const d = pathGen(coords) || '';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Envelope plot">
      <rect x={0} y={0} width={width} height={height} fill="#fafafa" stroke="#eee" rx={6} />
      {/* gridlines */}
      <g stroke="#f0f0f0">
        <line x1={padding} x2={width - padding} y1={yScale(0)} y2={yScale(0)} />
        <line x1={padding} x2={width - padding} y1={yScale(1)} y2={yScale(1)} />
      </g>

      {/* path */}
      <path d={d} fill="none" stroke="#3273dc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

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
