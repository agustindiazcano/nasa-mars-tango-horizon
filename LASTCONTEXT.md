# Last context

**Date:** 2026-11-15 (Argentina)

## Work done

- Checked model-2/rover-1 and rover-new/rover-2 in the isolated B29 worktree, branch `fix/rover-forward-audit`. Root checkout changes were preserved.
- Both MODEL_SPECS entries already use yaw pi/2. ModelLibrary applies this yaw to the inner GLB once before measuring and grounding; spawn and swapVehicle preserve it. This maps the documented authored -X front onto the +Z movement convention.
- Fleet movement uses atan2(dx, dz), consistent with +Z forward. Fixed a waypoint-arrival edge case: heading now updates before either movement branch, including the final step; zero-distance waypoints retain their heading.
- Rescue scenario poses also use atan2(dx, dz). rover-1 is parked at the expedition site in that scenario; rover-2 is not driven by its scripted timeline.
- No tests or builds were launched, per owner instruction. git diff --check passed. Browser/Windows control was unavailable in this session context; no live visual acceptance is claimed.

## Files touched and decisions

- `web/src/world/fleetProc.ts`: waypoint heading correction in its own source commit.
- `PENDING.md`, `PENDING_FRONT.md`, `LASTCONTEXT.md`: status update in its own commit.
- Kept the existing catalogue yaw without adding a second rotation. Owner authorization permits immediate PR merge without waiting for CI. No next task was started.
