# MusicLab

A small toolkit for exploring music theory and sketching patterns:

- Scales: browse and compare scale degrees, mapped to concrete notes for any key and octave.
- Chords: inspect common chord types and multiple voicings, with optional keyboard previews.
- Envelope: design simple envelopes and export arrays suitable for SuperCollider.
- Pbind: build time-aligned musical points and export a syntax-highlighted SuperCollider Pbind snippet.


## App layout and shared controls

At the top of the app you’ll find shared controls for Key, Scale, Octave, and (when a scale is selected) Degree. These choices feed into several tabs so labels, MIDI values, and previews are consistent. Your selections and many per-tab toggles are saved to localStorage so they persist across refreshes.


## Scales

What you can do:

- Select a scale from the catalog (fetched from `/api/scales`).
- See the scale’s semitone degrees displayed as tags (0..n), with each value labeled as a concrete note based on the selected Key and Octave.
- View an inline keyboard preview of the chosen scale with the relevant keys highlighted.
- Add scales to a “Compare” list and open a modal that shows multiple scales at once:
	- Each compared scale shows its degrees, concrete note labels, and a small keyboard preview.
	- Key/Octave updates automatically re-label notes and re-center the keyboard previews.

Notes:

- The compare list is stored locally. Toggling compare for a scale adds/removes it from the modal.
- Keyboard highlights use the C0 = 12 MIDI convention in this project.


## Chords

What you can do:

- Choose a chord type (e.g., Major, Minor, Dominant 7, sus4, add9, diminished, augmented, etc.).
- Explore a set of voicings for the chosen chord type:
	- Close positions (root and inversions)
	- Drop-2 and Drop-3 (when applicable)
	- Spread/Open triads (for triads)
- For each voicing, see:
	- The interval list rendered as concrete note+octave names based on the current Key and Octave.
	- The absolute MIDI numbers for that voicing.
	- An optional inline keyboard (toggle via the 🎹 switch in the Chords header). The toggle is persisted.


## Envelope

What you can do:

- Create a piecewise envelope by adding points with Level, Time (seconds, per segment), and Curve.
- The first point starts at time 0; its time and curve are fixed at 0 so the envelope always has a defined origin.
- Reorder points using the up/down arrow buttons; the first point cannot move. Remove is available for subsequent points.
- Visualize the curve with an SVG plot that approximates per-segment curves.
- Export / Import the envelope from localStorage as JSON via the storage modal.
- See derived arrays that match SuperCollider’s env shape:
	- levels = [l0, l1, …]
	- times = [t1, t2, …] (durations between points)
	- curves = [c1, c2, …]

Curve presets currently include: hold (-99), linear (0), exponential-ish (1), logarithmic-ish (-1), sine (0.5), squared (2), cubed (3), and welch (4). A “custom” numeric curve value is also supported.


## Pbind

Pbind is a point-based pattern editor that exports a ready-to-paste SuperCollider snippet, including a lightweight MIDI preamble and a tempo line.

What you can do:

- Timeline settings: set Beats per bar, Beat unit, and Bars. A compact timeline view shows beats, bars, and colored note segments.
- Points table: each point has Start beat, Duration, Repeat, optional Strum (seconds), and an array of notes.
	- Start and Duration accept simple fractions (e.g., `1`, `1/3`).
	- Repeat multiplies the point’s span; the “Copy” action duplicates a point after its total span with repeat=1.
	- Strum delays notes within a point (e.g., `0.02`), exported as `\strum`.
- Add/Edit point modal:
	- Per-note rows: for each note you can set Key (root), Scale (id), Octave, Degree (semitones in the selected scale), Legato, and Amp.
	- Reorder notes with up/down arrows (top cannot move up; bottom cannot move down). Removing a note updates the list but always leaves at least one note.
	- The modal shows a small keyboard preview of the draft point.
- Per-point keyboard previews: toggle the 🎹 switch in the Points box to reveal a keyboard for each point’s notes.
- Export/Import points: a storage modal lets you view and edit the raw JSON stored under a localStorage key. The order of notes is preserved exactly — no auto-sorting.
- SuperCollider preview:
	- Shows a formatted, syntax-highlighted code block (Highlight.js with a vendored SuperCollider language), including:
		- A MIDI setup block (MIDIClient.init, destination listing, ~m = MIDIOut(0)).
		- A tempo line derived from the BPM control.
		- A Pbind with your instrument (defaulted if left blank), durations (with optional compression via Pn()), and your points.
	- “Copy” button places the preview text on the clipboard.
	- Preview options: Instrument (symbol name), Loop count (empty = infinite), BPM, and Compress output (wraps in Pn when enabled).

### SuperCollider -> Ableton Live

To be documented here by you. Suggested outline (adjust as needed):

- SC MIDI routing into Ableton Live (virtual MIDI bus or loopback device)
- Setting MIDI channels and destinations
- Latency considerations (`~m.latency`) and clock sync
- Translating Pbind fields to Live instrument parameters
- Example: driving a Live track from the exported Pbind


## Notes and conventions

- MIDI: the project uses the C0 = 12 convention when converting notes to MIDI numbers.
- Persistence: tab preferences and data are stored in localStorage under `musiclab:*` keys.
- Accessibility: buttons and interactive controls include labels/titles; keyboard focus is preserved where practical.


## Project structure (brief)

- `frontend/`: React + Vite app (tabs under `src/features/`).
- `public/`: PHP frontend entry and built assets when deploying.
- `database/`: SQL schema used by the backend for scales.
- `scripts/`: utilities such as importing scales.
- `vendor/`: PHP dependencies (Slim PSR-7, etc.).

The app expects a `/api/scales` endpoint that returns `{ scales: [...] }`. The included PHP backend serves this in typical setups, but you can adapt the frontend to another source if needed.

