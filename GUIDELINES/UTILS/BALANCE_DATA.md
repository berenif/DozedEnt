# 📦 Balance Data Guide

## Overview

Gameplay and enemy balance constants are defined in JSON files and compiled into the WASM build via a generated header. This enables non-code tuning with reproducible builds.

## Files

- `data/balance/player.json` — Player movement, stamina, timing, attacks, world walls
- `data/balance/enemies.json` — Enemy movement, lunge/feint, fatigue, spawn, packs

## Generator

- Script: `scripts/generate-balance.js`
- Output: `src/wasm/generated/balance_data.h`
- Invoked automatically by `npm run wasm:build*` scripts, or manually:

```bash
npm run balance:gen
```

## Include Sites

- `src/wasm/internal_core.h`
- `src/wasm/enemies.h`

Both headers include `generated/balance_data.h` and define sane defaults if the header is absent.

## Workflow

1) Edit the relevant JSON values
2) Run `npm run balance:gen` (optional, run automatically in wasm builds)
3) Build using `npm run wasm:build` or `npm run wasm:build:dev`
4) Run tests (`npm test`, `npm run test:unit`)

## JSON Reference (abridged)

- `player.baseSpeed` (float): normalized units/sec
- `timing.attackCooldown` (float): seconds
- `stamina.rollStartCost` (float): 0..1
- `lightAttack.windup/active/recovery` (float): seconds
- `enemy.baseSpeed/maxSpeed` (float)
- `enemy.lungeRange/speed/duration/cooldown` (float)
- `pack.maxPacks` (int), `pack.respawnDelay` (seconds)

## Determinism

- All values are constants consumed by WASM logic.
- Changing constants changes behavior deterministically across clients when using the same WASM build.

## Tips

- Keep values within the ranges used by collision and animation systems.
- After tuning, re-run golden tests to confirm no determinism regressions.
