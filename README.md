# Log Race Planner

A small planning tool for predicted log races.

In a predicted log race, each boat submits its expected elapsed time before the start, then runs the course using only a compass, paper charts and a tachometer. The boat that finishes closest to its own prediction wins.

## What it does

- Plots the course marks from the Sailing Instructions on a chart-style grid. Drag a mark or edit its coordinates to re-plan.
- Takes a cruising speed in mph and converts it to knots.
- Computes each leg's rhumb-line distance, true course and magnetic compass course (true + west variation).
- Totals the predicted elapsed time in minutes for the entry form, with optional allowances for a standing start and mark roundings.
- Builds a helm card to copy or print and take aboard.

## Run it

Static files, no build step:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Files

- `course.js` – marks and course order from the NOR/SI. Edit this for a new year.
- `app.js` – rhumb-line math, rendering and interaction.
- `styles.css` – light/dark theme and the print layout for the helm card.
- `index.html` – page structure.

Planning aid only. Verify every course against your chart and apply your compass deviation card.
