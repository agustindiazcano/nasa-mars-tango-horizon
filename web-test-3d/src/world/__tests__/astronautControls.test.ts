import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BASE_ORIGIN } from "@th/shared";
import { AstronautProc } from "../astronautProc";
import type { TerrainProc } from "../terrainProc";

function makeStubDom() {
  const listeners = new Map<string, Array<(e: unknown) => void>>();
  return {
    addEventListener: (type: string, cb: (e: unknown) => void) => {
      const list = listeners.get(type) ?? [];
      list.push(cb);
      listeners.set(type, list);
    },
    emit: (type: string, event: unknown) => {
      for (const cb of listeners.get(type) ?? []) cb(event);
    },
  };
}

function makeStubTerrain(): TerrainProc {
  return {
    sizeM: 4000,
    heightAt: () => -4060,
    thermalClassAt: () => 1,
    svfAt: () => 0.85,
  } as unknown as TerrainProc;
}

describe("AstronautProc Half-Life FPS & aerial isometric controls", () => {
  it("keeps 1st-person yaw fixed during WASD strafe and backpedal", () => {
    const dom = makeStubDom();
    const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 30000);
    const astronaut = new AstronautProc(makeStubTerrain(), camera, dom as unknown as HTMLElement);

    astronaut.setPovMode("1st");
    astronaut.yaw = 0; // Facing -Z (right is +X, back is +Z)

    const startX = astronaut.pos.x;
    const startZ = astronaut.pos.z;

    astronaut.setKeyForTest("KeyA", true);
    astronaut.updateMovement(0.1);
    astronaut.updateMovement(0.1);
    astronaut.setKeyForTest("KeyA", false);
    expect(astronaut.yaw).toBe(0);
    expect(astronaut.pos.x).toBeLessThan(startX);

    const afterLeftX = astronaut.pos.x;
    astronaut.setKeyForTest("KeyD", true);
    astronaut.updateMovement(0.1);
    astronaut.updateMovement(0.1);
    astronaut.updateMovement(0.1);
    astronaut.setKeyForTest("KeyD", false);
    expect(astronaut.yaw).toBe(0);
    expect(astronaut.pos.x).toBeGreaterThan(afterLeftX);

    astronaut.setKeyForTest("KeyS", true);
    astronaut.updateMovement(0.1);
    astronaut.updateMovement(0.1);
    astronaut.setKeyForTest("KeyS", false);
    expect(astronaut.yaw).toBe(0);
    expect(astronaut.pos.z).toBeGreaterThan(startZ);
  });

  it("supports aerial isometric base overview with WASD pan and wheel zoom", () => {
    const dom = makeStubDom();
    const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 30000);
    const astronaut = new AstronautProc(makeStubTerrain(), camera, dom as unknown as HTMLElement);

    const astroX = astronaut.pos.x;
    const astroZ = astronaut.pos.z;

    expect(astronaut.toggleIso()).toBe("iso");
    expect(astronaut.isoTarget.x).toBeCloseTo(BASE_ORIGIN.x + 15, 2);
    expect(astronaut.isoTarget.z).toBeCloseTo(BASE_ORIGIN.z - 5, 2);
    expect(camera.position.y).toBeGreaterThan(astronaut.isoTarget.y + 40);

    const beforePanX = astronaut.isoTarget.x;
    const beforePanZ = astronaut.isoTarget.z;
    astronaut.setKeyForTest("KeyW", true);
    astronaut.setKeyForTest("KeyD", true);
    astronaut.updateMovement(0.1);
    astronaut.setKeyForTest("KeyW", false);
    astronaut.setKeyForTest("KeyD", false);

    expect(Math.hypot(astronaut.isoTarget.x - beforePanX, astronaut.isoTarget.z - beforePanZ)).toBeGreaterThan(5);
    expect(astronaut.pos.x).toBeCloseTo(astroX, 5);
    expect(astronaut.pos.z).toBeCloseTo(astroZ, 5);

    const initialDist = astronaut.isoDist;
    dom.emit("wheel", { deltaY: -400 });
    expect(astronaut.isoDist).toBeLessThan(initialDist);
    dom.emit("wheel", { deltaY: 8000 });
    expect(astronaut.isoDist).toBeLessThanOrEqual(1800);

    dom.emit("mousedown", {});
    dom.emit("mousemove", { buttons: 1, movementX: 12, movementY: 0, shiftKey: false });
    expect(astronaut.consumeWasDragged()).toBe(true);
    expect(astronaut.consumeWasDragged()).toBe(false);

    expect(astronaut.toggleIso()).toBe("1st");
  });
});
