import React from 'react';

function Scales({ status, scales, error }) {
  return (
    <section className="tool-panel">
      <h2>Scales</h2>

      {status === 'loading' && <p>Loading scale catalog…</p>}

      {status === 'error' && (
        <p role="alert" className="has-text-danger">
          Unable to load scales: {error}
        </p>
      )}

      {status === 'success' && (
        <p>Loaded {scales.length} scales from the catalog.</p>
      )}

      {status === 'idle' && <p>Preparing to load scales…</p>}
    </section>
  );
}

export default Scales;
