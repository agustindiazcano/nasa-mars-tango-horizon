import { FleetUnit } from "../../../../web-test-3d/src/world/fleetProc";
import * as THREE from "three";
import { TerrainProc } from "../../../../web-test-3d/src/world/terrainProc";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { READY_TERRAIN, terrainMatches, normalizeTerrainMetadata, TERRAIN_META_SHA256 } from "@th/shared";
import { TerrainLoader, sha256 } from "../../../../web-test-3d/src/world/terrainLoader";
import { groundPlacement, footprintContacts } from "../../../../web-test-3d/src/world/groundPlacement";
import { buildContext, registerAgentRoutes } from "../routes.js";
import { terrainIdentity } from "../tools/terrainData.js";
import Fastify from "fastify";

const meta = readFileSync(new URL("../../../../web/public/data/terrain/meta.json", import.meta.url));
const height = readFileSync(new URL("../../../../web/public/data/terrain/height_2048.u16", import.meta.url));
function response(bytes: Uint8Array) { return new Response(new Uint8Array(bytes)); }
function assets() { return vi.fn(async (url: string) => response(url.endsWith("meta.json") ? meta : height)); }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("terrain lifecycle", () => {
  it("waits beyond six seconds and caches only validated success", async () => {
    const fetcher = assets();
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("meta.json")) await new Promise(resolve => setTimeout(resolve, 6500));
      return fetcher(url);
    });
    const loader = new TerrainLoader();
    const pending = loader.load();
    await new Promise(resolve => setTimeout(resolve, 6100));
    expect(loader.state).toBe("loading");
    const result = await pending;
    expect(result?.identity).toEqual(READY_TERRAIN);
    expect(await loader.load()).toBe(result);
    expect(fetcher).toHaveBeenCalledTimes(2);
  }, 15000);
  it.each(["missing", "truncated", "corrupt", "metadata mismatch"])("rejects %s and permits manual retry", async kind => {
    const fetcher = assets();
    vi.stubGlobal("fetch", async (url: string) => {
      if (kind === "missing") return new Response("", { status: 404 });
      if (kind === "metadata mismatch") return response(new TextEncoder().encode("{}"));
      if (url.endsWith("meta.json")) return response(meta);
      const bytes = new Uint8Array(height);
      if (kind === "truncated") return response(bytes.subarray(2));
      bytes[0] ^= 1;
      return response(bytes);
    });
    const loader = new TerrainLoader();
    expect(await loader.load()).toBeNull();
    expect(loader.state).toBe("error");
    expect(loader.error).not.toBe("");
    vi.stubGlobal("fetch", fetcher);
    expect((await loader.load())?.identity).toEqual(READY_TERRAIN);
  }, 15000);
  it("cancels an ignored abort and prevents late completion replacing retry", async () => {
    let release!: (r: Response) => void;
    vi.stubGlobal("fetch", () => new Promise<Response>(resolve => { release = resolve; }));
    const loader = new TerrainLoader();
    const old = loader.load();
    loader.cancel();
    expect(loader.state).toBe("cancelled");
    vi.stubGlobal("fetch", assets());
    const latest = await loader.load();
    release(response(meta));
    expect(await old).toBeNull();
    expect(loader.state).toBe("ready");
    expect(await loader.load()).toBe(latest);
  });
  it("cancels retry backoff without making another request", async () => {
    const loader = new TerrainLoader();
    const fetcher = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const task = loader.load("/data/terrain", message => { if (message.includes("Retrying")) loader.cancel(); });
    expect(await task).toBeNull();
    expect(loader.state).toBe("cancelled");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retry and repeated ready loads do not duplicate scene objects or markers", async () => {
    const context = new Proxy({}, { get: () => () => {}, set: () => true });
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => context }) });
    vi.stubGlobal("fetch", assets());
    const scene = new THREE.Scene();
    const terrain = new TerrainProc(scene);
    const initial = scene.children.length;
    expect(await terrain.tryLoadRealDem()).toBe(true);
    const markers = terrain.markersGroup.children.length;
    expect(await terrain.tryLoadRealDem()).toBe(true);
    expect(scene.children.length).toBe(initial);
    expect(terrain.markersGroup.children.length).toBe(markers);
    expect(markers).toBe(5);
  });
  it("a fresh reset owner starts without cached state", async () => {
    vi.stubGlobal("fetch", assets());
    const first = new TerrainLoader();
    await first.load();
    const reset = new TerrainLoader();
    expect(reset.state).toBe("cancelled");
    expect((await reset.load())?.identity).toEqual(READY_TERRAIN);
  });
});

describe("terrain contract and placement", () => {
  it("pins metadata identically across LF and CRLF checkouts", async () => {
    const lf = meta.toString("utf8").replace(/\r\n/g, "\n");
    for (const text of [lf, lf.replace(/\n/g, "\r\n")]) {
      expect(await sha256(new TextEncoder().encode(normalizeTerrainMetadata(text)).buffer)).toBe(TERRAIN_META_SHA256);
    }
  });
  it("checks readiness and each identity component", () => {
    expect(terrainMatches(terrainIdentity)).toBe(true);
    for (const bad of [undefined, {}, { ...READY_TERRAIN, status: "loading" }, { ...READY_TERRAIN, version: "other" }, { ...READY_TERRAIN, metaSha256: "other" }, { ...READY_TERRAIN, heightSha256: "other" }]) expect(terrainMatches(bad)).toBe(false);
    expect(buildContext({ terrain: READY_TERRAIN }, "en").terrain).toEqual(READY_TERRAIN);
  });
  it.each(["/api/agent/voice", "/api/agent/run"])("rejects mismatch before agent execution at %s", async url => {
    const app = Fastify();
    await registerAgentRoutes(app);
    try {
      const res = await app.inject({ method: "POST", url, payload: { text: "Plan a route to S2", agent: "BASE", lang: "en", context: { terrain: { ...READY_TERRAIN, heightSha256: "other" } } } });
      expect(res.statusCode).toBe(409);
      expect(res.json().actions).toEqual([]);
      expect(res.json().terrain).toEqual(READY_TERRAIN);
    } finally { await app.close(); }
  });
  it("uses actual rover wheel centers and radius when pitched on a slope", () => {
    const object = new THREE.Group();
    object.position.set(10, 0, 20);
    object.rotation.set(0.1, 0.3, 0);
    const terrain = { heightAt: (x: number, z: number) => x * 0.1 + z * 0.2 } as TerrainProc;
    const unit = new FleetUnit({ id: "rover-1", kind: "rover_crew", speed: 3.2, flies: false, startX: 10, startZ: 20 }, object, terrain);
    for (const z of [-0.95, 0, 0.95]) for (const x of [-0.99, 0.99]) {
      const wheel = new THREE.Mesh(); wheel.position.set(x, 0.32, z); unit.wheels.push(wheel);
    }
    unit.placeOnGround();
    const clearances = unit.wheels.map(w => {
      const c = w.position.clone().applyEuler(object.rotation);
      return object.position.y + c.y - 0.32 - terrain.heightAt(10 + c.x, 20 + c.z);
    });
    expect(Math.min(...clearances)).toBeCloseTo(0, 10);
    expect(clearances.every(v => v >= -1e-10)).toBe(true);
  });
  it("accounts for contact offsets and footprint slope with no penetrating supports", () => {
    const placed = groundPlacement((x, z) => x + z, 10, 20, footprintContacts(4, 6, -0.5));
    expect(placed.y).toBe(35.5);
    expect(placed.clearanceM).toEqual([10, 4, 6, 0]);
    expect(() => groundPlacement(() => NaN, 0, 0)).toThrow();
  });
});

