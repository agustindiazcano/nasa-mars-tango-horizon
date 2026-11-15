# Last context

**Date:** 2026-11-15

## Summary of work done

Two stacked branches, both in `web-test-3d/` unless noted.

**`feat/terrain-realism-hud-redesign` (PR #26):**
- Terrain: `buildRegolithDetailMap` + `attachRegolithShader` in [`terrainProc.ts`](web-test-3d/src/world/terrainProc.ts) replace the sine ripple POM (HiRISE luminance → dust/basalt/bedrock albedo, four rotated detail scales, pebbles, cavity shading). Exposure 1.35, hemisphere light 1.0.
- HUD: amber palette, beveled panels, full-width top strip, flat dock buttons, Rajdhani/IBM Plex Mono, `#visor-vignette` covering the full viewport ([`hud.css`](web-test-3d/src/hud/hud.css)).

**`feat/starship-launch-site` (stacked on the branch above):**
- [`shared/src/physics/sites.ts`](shared/src/physics/sites.ts): `LAUNCH_SITE_COORD = (1202, -1022)`, 1.1 km from `BASE_ORIGIN`. Chosen by scanning the real 2048² DEM (downsampled 4x) for <7 m relief inside 70 m, <7° slope, and line of sight from the astronaut spawn to 90 m above the pad. Test in `sites.test.ts` checks distance and relief on the real DEM.
- [`launchSiteProc.ts`](web-test-3d/src/world/launchSiteProc.ts): scorched concrete pad with foundation skirt to the lowest terrain sample, six-leg orbital mount, Super Heavy + Starship stack (70 m + 51 m, 33 Raptors, grid fins, flaps, weld seams, heat-shield side toward the base), 165 m lattice tower with catch arms, 6 propellant tanks, bunker, 4 floodlight poles, blinking red beacons, fog-free label. Vehicle, mount and tower are built at `COMPLEX_SCALE = 1.4` so the site reads from the base.
- Minimap marker "LAUNCH" in [`hud.ts`](web-test-3d/src/hud/hud.ts).

## Decisions made

- Chose the 1.4x scale over a closer site: at 1.1 km a real-scale tower measured about 85 px tall on a 744 px viewport and washed out in the dust haze.
- Grade the pad to the highest terrain sample and add an open-ended foundation skirt instead of editing the DEM, so `heightAt` stays untouched.
- Structures have no collision, same as the base modules.

## Where the work was left

- `localIntents.test.ts` ("defines all 6 critical local intent categories") fails: its expected id list no longer matches `LOCAL_INTENTS` after the `B40` intents. Not caused by these branches.
- Not yet checked visually: storm scenario with the launch site, iso/3rd-person POV, modal panels, phone `remote.html` (still cyan).
- No fleet or agent tool targets the launch site yet; it is scenery plus a minimap marker.
