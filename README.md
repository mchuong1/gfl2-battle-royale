# GFL2 Battle Royale Simulator

A top-down battle royale simulator fully automated by bots. Built with React + TypeScript + Vite.

## Features

- **2–100 combatants** – enter any number of bot names (or add random ones)
- **Top-down arena** – bots appear as colored circles inside a large circular arena
- **Autonomous roaming** – bots wander with random-walk physics, bouncing off the arena boundary
- **Shrinking zone** – a red danger ring closes in over time; bots outside take extra damage
- **Combat system** – when two bots are within combat range they each roll a d6; the higher roll wins, dealing 22 HP damage; ties deal minor damage to both
- **Passive health drain** – all bots slowly lose health over time, adding urgency
- **Live scoreboard** – shows health bars for all bots sorted by status
- **Battle log** – timestamped feed of every combat and elimination event
- **Pause / Resume / Rematch** – full simulation controls

## Tech Stack

- **React 19** with hooks
- **TypeScript** (strict mode)
- **Vite** for dev server and bundling
- **Canvas API** for real-time 60 fps arena rendering

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## How the Simulation Works

1. **Setup** – Enter combatant names (2–100). Click *+ 5 Random* or *+ 10 Random* for quick fills.
2. **Battle** – Click **Start Battle!**. Bots spawn at evenly-spread positions inside the arena.
3. **Roaming** – Each tick bots apply a small random force, keeping speed capped at 1.8 px/tick (~108 px/s at 60 fps).
4. **Zone** – The safe zone shrinks at 0.05 px/tick. Bots near the edge are steered inward; those caught outside take 3× passive drain.
5. **Combat** – Two bots within 2× bot-radius + 6 px trigger a dice roll. The winner gains +6 HP (capped at 100); the loser takes −22 HP. Both enter an 80-tick combat cooldown (~1.3 s).
6. **Elimination** – A bot with health ≤ 0 is eliminated and shown as a faded ghost.
7. **Victory** – The last surviving bot wins and a banner is displayed on the canvas.
