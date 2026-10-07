# Solo/Prod — Player System

Solo/Prod turns focused study and everyday tasks into a small, personal progression system inspired by Solo Leveling. It is built to make starting feel easy: choose a focus block, clear a task, claim a daily directive, and watch your progress accumulate.

## What it includes

- A resumable focus and short-break timer with 15, 25, and 50 minute presets.
- A quick log for study time completed away from the timer.
- A personal task list with first-completion XP rewards.
- Three daily directives tied to focus sessions, study time, and completed tasks.
- Hunter levels, E-to-S rank progression, XP, coins, streaks, a weekly chart, and a month-aware focus heatmap.
- Optional lofi ambience, profile name editing, keyboard-friendly controls, and responsive mobile navigation.
- Local browser storage, including migration of the earlier app's saved name, tasks, XP, and heatmap history.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The project uses React, Vite, and Lucide icons. Player data stays in the browser and is not sent to a server. Solo Leveling art and music are used from the assets already included in `public/`.
