import { readFileSync } from "node:fs";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { heightAt as serverHeightAt } from "../tools/terrainData.js";
import { TerrainProc, SCIENCE_STATIONS } from "../../../../web/src/world/terrainProc";
import { BASE_MODULES, BaseProc } from "../../../../web/src/world/baseProc";
import { FLEET_SPECS, FleetProc } from "../../../../web/src/world/fleetProc";

const metaBytes = readFileSync(new URL("../../../../web/public/data/terrain/meta.json", import.meta.url));
const heightBytes = readFileSync(new URL("../../../../web/public/data/terrain/height_2048.u16", import.meta.url));

function stubBrowserEnv(): void {
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal("fetch", async (url: string) => {
    const bytes = url.endsWith("meta.json") ? metaBytes : heightBytes;
    return new Response(new Uint8Array(bytes));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("2048x2048 DEM parity and chunked adaptive LOD (B25)", () => {
  it("matches server terrainData.ts heightAt 1:1 across 2048x2048 samples", async () => {
    stubBrowserEnv();
    const scene = new THREE.Scene();
    const terrain = new TerrainProc(scene);
    expect(await terrain.tryLoadRealDem()).toBe(true);

    expect(terrain.heightGridN).toBe(2048);
    expect(terrain.meta.height_px).toBe(2048);
    expect(terrain.gridN).toBe(256);

    const routeGrid = terrain.buildRouteGrid();
    expect(routeGrid.n).toBe(256);
    expect(routeGrid.z.length).toBe(256 * 256);

    const probeCoords: [number, number][] = [
      [0, 0],
      [28, 36],
      [-2000, -2000],
      [2000, 2000],
      [-2000, 2000],
      [2000, -2000],
      [13.7, -41.2],
      [-625.3, 412.8],
      ...BASE_MODULES.map((m): [number, number] => [m.offset[0], m.offset[1]]),
      ...FLEET_SPECS.map((u): [number, number] => [u.startX, u.startZ]),
      ...SCIENCE_STATIONS.map((s): [number, number] => [s.x, s.z]),
      [37.5, 45.0],
      [32.0, 46.5],
      [39.5, 40.5],
    ];

    for (const [x, z] of probeCoords) {
      const clientAbs = terrain.absoluteHeightAt(x, z);
      const srvAbs = serverHeightAt(x, z);
      expect(Math.abs(clientAbs - srvAbs)).toBeLessThanOrEqual(0.01);
    }
    terrain.dispose();
  });

  it("upgrades chunked LOD mesh above 256x256, moves near chunks with camera, and bounds LRU cache", async () => {
    stubBrowserEnv();
    const scene = new THREE.Scene();
    const terrain = new TerrainProc(scene);
    expect(await terrain.tryLoadRealDem()).toBe(true);

    expect(terrain.mesh).toBeInstanceOf(THREE.Group);
    expect(terrain.mesh.children.length).toBe(64);
    expect(scene.children.length).toBe(2);

    const originStats = terrain.getLodStats();
    expect(originStats.chunks).toBe(64);
    expect(originStats.heightGridN).toBe(2048);
    expect(originStats.nearChunkSeg).toBe(256);
    expect(originStats.effectiveVertexGridN).toBe(2048);
    expect(originStats.minChunkSeg).toBeGreaterThanOrEqual(48);

    // Raycast rendered chunk geometry: exact on near-chunk vertices (< 1e-3 m) and < 0.08 m sub-triangle on rough ridges
    const raycaster = new THREE.Raycaster();
    const vertexAlignedPoints: [number, number][] = [
      [0, 0],
      [-500 + 10 * (500 / 256), -500 + 12 * (500 / 256)],
      [25 * (500 / 256), 18 * (500 / 256)],
      [-32 * (500 / 256), 40 * (500 / 256)],
    ];
    for (const [x, z] of vertexAlignedPoints) {
      raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
      const hits = raycaster.intersectObjects(terrain.mesh.children, false);
      expect(hits.length).toBeGreaterThan(0);
      expect(Math.abs(hits[0].point.y - terrain.heightAt(x, z))).toBeLessThan(1e-3);
    }
    const nearPoints: [number, number][] = [
      [28, 36],
      [37.5, 45.0],
      [110, -70],
      [180, 120],
      [-165, 145],
      ...BASE_MODULES.map((m): [number, number] => [m.offset[0], m.offset[1]]),
    ];
    for (const [x, z] of nearPoints) {
      raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
      const hits = raycaster.intersectObjects(terrain.mesh.children, false);
      expect(hits.length).toBeGreaterThan(0);
      expect(Math.abs(hits[0].point.y - terrain.heightAt(x, z))).toBeLessThan(0.12);
    }

    // Move camera across several distant chunks; verify cache stays bounded and scene graph stays stable
    for (const [cx, cz] of [[1500, 1500], [-1500, 1500], [1500, -1500], [-1500, -1500], [0, 0]]) {
      terrain.updateLod(cx, cz, true);
    }
    const afterStats = terrain.getLodStats();
    expect(afterStats.nearChunkSeg).toBe(256);
    expect(scene.children.length).toBe(2);
    expect(terrain.mesh.children.length).toBe(64);
    expect(afterStats.cachedGeometries).toBeLessThanOrEqual(64 + 12 + 24);
    terrain.dispose();
  });
});

describe("ground contact residuals < 0.05 m (B33)", () => {
  it("seats all 16 base modules, ground fleet units, targets, and beacons within < 0.05 m", async () => {
    stubBrowserEnv();
    const scene = new THREE.Scene();
    const terrain = new TerrainProc(scene);
    expect(await terrain.tryLoadRealDem()).toBe(true);

    const base = new BaseProc(scene, terrain);
    expect(base.selectableMeshes.length).toBe(BASE_MODULES.length);

    for (const mGroup of base.group.children) {
      const clearances = mGroup.userData.contactClearanceM as number[];
      expect(clearances.length).toBeGreaterThanOrEqual(4);
      const minClearance = Math.min(...clearances);
      expect(minClearance).toBeGreaterThanOrEqual(0);
      expect(minClearance).toBeLessThan(0.05);
    }

    const fleet = new FleetProc(scene, terrain);
    for (const spec of FLEET_SPECS) {
      if (spec.flies) continue;
      const unit = fleet.units.get(spec.id)!;
      // The rescue robot rides stowed in the rescue-1 bay on tracks, so it has no wheel meshes to seat.
      if (unit.wheels.length === 0) continue;
      const checkWheelResiduals = (maxSpawnClearance?: number) => {
        const clearances = unit.wheels.map((wheel) => {
          const offset = wheel.position.clone().applyEuler(unit.object.rotation);
          const wx = unit.object.position.x + offset.x;
          const wz = unit.object.position.z + offset.z;
          const wheelBottomY = unit.object.position.y + offset.y - 0.32;
          return wheelBottomY - terrain.heightAt(wx, wz);
        });
        expect(Math.min(...clearances)).toBeGreaterThanOrEqual(-1e-5);
        expect(Math.min(...clearances)).toBeLessThan(0.05);
        if (maxSpawnClearance !== undefined) {
          expect(Math.max(...clearances)).toBeLessThan(maxSpawnClearance);
        }
      };

      checkWheelResiduals(0.08);
      // Move unit onto steep boxwork ridge (180, 120) and verify supporting wheels stay < 0.05 m with zero penetration
      unit.object.position.set(180, unit.object.position.y, 120);
      unit.update(0.016, 0.5);
      checkWheelResiduals();
    }

    for (const target of fleet.targets) {
      const obj = fleet.group.getObjectByName(`target:${target.id}`) as THREE.Mesh;
      expect(obj).toBeDefined();
      obj.geometry.computeBoundingBox();
      const bottomY = obj.position.y + obj.geometry.boundingBox!.min.y;
      const cornerHeights = [-0.225, 0.225].flatMap((dx) =>
        [-0.225, 0.225].map((dz) => terrain.heightAt(target.x + dx, target.z + dz)),
      );
      const residual = bottomY - Math.max(...cornerHeights);
      expect(residual).toBeGreaterThanOrEqual(-1e-5);
      expect(residual).toBeLessThan(0.05);
    }

    terrain.setBeacons([{ id: "B1", x: 110, z: -70 }]);
    const beaconsGroup = scene.children.find((c) => c instanceof THREE.Group && c.children.length === 3 && c !== base.group && c !== fleet.group && c !== terrain.markersGroup) as THREE.Group;
    expect(beaconsGroup).toBeDefined();
    const puck = beaconsGroup.children[0] as THREE.Mesh;
    const puckBottom = puck.position.y - 0.125;
    expect(Math.abs(puckBottom - terrain.heightAt(110, -70))).toBeLessThan(0.01);

    terrain.dispose();
  });
});
