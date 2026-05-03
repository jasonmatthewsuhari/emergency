# Sightline

Next.js app (port 3000). Out-of-home advertising analytics platform with a 3D map view powered by Deck.gl + Mapbox.

## Key paths

- `src/components/MapCanvas.tsx` — main map component
- `src/layers/PedestrianAgentLayer.ts` — Deck.gl layers for ≤5 named agents
- `src/types/index.ts` — all shared TypeScript interfaces
- `public/generated/ai4animation-low-poly-guy.json` — walk cycle animation data (load once, cache)

## Pedestrian agents

**Read `docs/crowd-agents.md` before adding, spawning, or rendering any pedestrian agents.**

Short version:
- Spawn with `spawnAgentsInRadius()` from `src/lib/spawnAgents.ts`
- Render crowds (>5 agents) with `<CrowdLayer>` from `src/components/CrowdLayer.tsx` — uses Three.js `InstancedMesh`, one draw call per body part, works on integrated graphics
- `makePedestrianAgentLayers` (Deck.gl path) is only for ≤5 individually-named/labeled agents
- Never call `makePedestrianAgentLayers` in a loop or with a large array — it allocates new JS objects every frame

## Dev commands

```bash
npm run dev      # start dev server on port 3000
npm run build    # production build
npm run test     # vitest
```
