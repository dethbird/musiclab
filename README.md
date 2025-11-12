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

#### Example: driving a Live track from the exported Pbind

Follow this one-time and per-session flow to record a Pbind into Ableton and align it to the timeline:

1) Add a throw-away alignment note
- In your pattern, include a single, very short note at time = 0 (first event). This gives you a clear transient to line up against Ableton’s bar 1 beat 1 after the take is recorded. You’ll delete it after alignment.

2) Create a virtual MIDI port
- Use loopMIDI and create a port named "SCtoLive" (any name works; just be consistent).

3) Point SuperCollider at that port
- Run this setup in SuperCollider, then pick the destination index that corresponds to your "SCtoLive" port (change the 0 if needed):

```js
(
// MIDI setup
MIDIClient.init;
MIDIClient.destinations.do({ |e, i| [i, e.device, e.name].postln; });
// Pick a destination by index (change 0 if needed):
~m = MIDIOut(0);
~m.latency = 0.0;
)
```

4) Play the exported Pbind
- With the MusicLab Pbind preview copied to your clipboard, paste it into SuperCollider and evaluate. For example:

```
(
// Tempo
TempoClock.default.tempo = 60/60;

// Pattern
Pbind(
	\instrument, \pmGrowl,
		ype, \midi,
	\midiout, ~m,
	\scale, Pseq([Pn(Scale.major, 2), Rest(), Pn(Scale.major, 7), Rest(), Pn(Scale.major, 3), Rest(), Pn(Scale.major, 7), Rest(), Pn(Scale.major, 4), Rest()], 1),
	\root,  Pseq([Pn([5, 5], 3), Pn([5, 5, 5], 9), Pn(5, 16)], 1),
	\octave, Pseq([Pn([4, 4], 2), Rest(), Pn([3, 3, 3], 7), Rest(), [6, 6, 6], 4, 6, Rest(), Pn(5, 7), Rest(), Pn(3, 4), Rest()], 1),
	\degree, Pseq([Pn([2, 7], 2), Rest(), Pn([0, 2, 7], 7), Rest(), [7, 9, 0], 9, 11, Rest(), Pn(2, 7), Rest(), Pn(5, 3), 7, Rest()], 1),
	\legato, Pseq([Pn([1, 1], 2), Rest(), Pn([1.1, 1.1, 1.1], 7), Rest(), [1.1, 1.1, 1.1], Pn(1.1, 2), Rest(), Pn(1.1, 7), Rest(), Pn(1, 4), Rest()], 1),
	\amp, Pseq([Pn([0.85, 0.85], 2), Rest(), Pn([1, 0.8, 0.8], 7), Rest(), [1, 1, 1], Pn(1, 2), Rest(), Pn(1, 7), Rest(), Pn(0.85, 4), Rest()], 1),
	\strum, Pseq([Pn(0.05, 2), Rest(), Pn(0.08, 7), Rest(), Pn(0, 3), Rest(), Pn(0, 7), Rest(), Pn(0, 4), Rest()], 1),
	\dur,  Pseq([Pn(1/2, 2), Pn(1/8, 12), 3/8, Pn(1/8, 8), Pn(1, 4), 1/8], 1)
).play(TempoClock.default)
)
```

5) Configure Ableton input and record
- In Ableton, set your target MIDI track’s input to "SCtoLive".
- Arm the track and enable Session Record.
- Start recording in Ableton, then evaluate/play the Pbind in SuperCollider.

6) Align and clean up
- After recording, align the take’s start so the throw-away note transient lands exactly at bar 1 beat 1 (or your intended start).
- Delete the throw-away alignment note.
- Uncheck legato from midi clip details.


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

