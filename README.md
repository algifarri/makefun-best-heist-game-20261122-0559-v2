# makefun-best-heist-game-20261122-0559-v2

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/algifarri/makefun-best-heist-game-20261122-0559-v2/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/algifarri/makefun-best-heist-game-20261122-0559-v2/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**SABLE & GOLD — The Aurum Casino Heist.** You are Sable, a cat-burglar
slipping into the Aurum Casino after midnight. Lift chips and gold bars,
take the keycard, crack the safe, steal the Aurum Diamond — then reach the
lift unseen. Guards patrol with vision cones that stop at walls, cameras
sweep the floor, timed laser beams guard the vault, and every sighting feeds
the alarm meter: at 100% the casino locks down and the floor men chase you.
Hack a terminal to loop the cameras, toss a gold coin to pull a guard off
his route, sneak with Shift when a cone sweeps your way, and clear all
three floors — the Casino Floor, the Vault Corridor and the Aurum Vault —
for the ghost bonus.

Runs entirely from static files in a desktop browser: no build step, no
network, no dependencies. WASD or arrows to move, Shift to sneak, click to
throw a coin, E to crack a safe or hack a terminal, P to pause, M to mute,
R to restart. Title screen, HUD with alarm meter / take / lives / coins,
pause, safe-cracking minigame, level-clear and victory cards, and WebAudio
footsteps, alarm stings and jingles synthesised in code.

The source is split one job per file under `game/src/` (config, random,
casino, sight, patrol, thief, audio, heist, draw, controls, shots, main).
`main.ts` is the hand-in program: it copies `game/` and `screenshots/` to
the output directory and writes `dossier.json` with the vendored make.fun
library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ajkq5baq&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
