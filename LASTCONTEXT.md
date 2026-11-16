# Last context

**Date:** 2026-11-15 (Argentina)

## Work done

- Audited launcher-1/2 after the owner requested cannon pod exit height and direction checks. Used the isolated B29 worktree on branch `fix/launcher-pod-origin`; root checkout edits were preserved.
- Both modules use life-support-cannon scaled to a 6 m maximum span. Manifest dimensions imply about 2.963 m height; `mod.height` is 2.96 m. The current origin `[wx, wz, placement.y + mod.height]` is at the horizontal module center and approximately the model roof, not a measured muzzle point.
- `PodBallistics.launch` passes a fixed elevation of pi/4 to `aimDelivery`, which solves the heading toward the target with drag/wind compensation. Neither model yaw nor a barrel axis constrains that velocity. Physics coordinates are [world x, world z, elevation]; conversion to Three.js is correct.
- Both launcher origins are populated, but main.ts constructs PodBallistics with only the first one. The second launcher is not selected by the current delivery path.
- Inspected the GLB JSON: a single mesh node, no muzzle marker and no animation. No offset, barrel axis or aiming articulation was invented. No simulator code changed because the correct muzzle cannot be established from the bounding box.
- Production from PR #55 was already verified Ready on Vercel in the preceding turn; PR #56 merged its verification record. Browser and Windows native control were unavailable, so no live visual acceptance is claimed.

## Files touched and decisions

- Updated `PENDING.md`, `PENDING_FRONT.md` and `LASTCONTEXT.md` in a separate status commit with the cannon audit findings.
- No tests were launched, following the owner's instruction. No next task was started. The existing instruction authorizes immediate PR merge without waiting for CI.
