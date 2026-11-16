# Last context

**Date:** 2026-11-15 (Argentina)

## Work done

- Corrected visual anchoring of drone-new for drone-1 and drone-2 in the isolated B29 worktree, branch `fix/drone-model-ground-anchor`. Root checkout edits were preserved.
- Existing flight roots land at terrain + 0.35 m. The replacement GLB was shifted down by half its height (about 0.455 m from its manifest at 2 m span), burying its bottom by about 0.105 m on level terrain.
- The GLB now shifts down by the existing landed root clearance of 0.35 m. The same constant names the unchanged root clearance and the model offset. No movement, flight altitudes, scenario timing or rotor geometry changed.
- drone-1 and drone-2 retain 14 m and 16 m flight root altitudes. This is an anchor correction, not a claim that airborne drones should touch the ground.
- No tests, builds or browser probes were launched. Live visual acceptance was unavailable; the correction establishes zero bottom offset at settled landing on level ground, not full landing-gear contact over arbitrary slopes.

## Files touched and decisions

- `web/src/world/fleetProc.ts`: visual model anchor correction in its own commit.
- `PENDING.md`, `PENDING_FRONT.md`, `LASTCONTEXT.md`: status update in a separate commit.
- Owner authorization requests immediate PR merge and Vercel deployment. No next task was started.
