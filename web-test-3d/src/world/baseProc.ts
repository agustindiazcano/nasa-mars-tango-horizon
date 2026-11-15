import { BASE_ORIGIN } from "@th/shared";
import { footprintContacts, groundPlacement } from "./groundPlacement";
import * as THREE from "three";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";

export interface BaseModuleSpec {
  id: string;
  name: string;
  kind:
    | "habitat"
    | "airlock"
    | "compute"
    | "lab"
    | "medical"
    | "greenhouse"
    | "eclss"
    | "isru"
    | "solar"
    | "battery"
    | "fission"
    | "garage"
    | "comms"
    | "launcher"
    | "shelter";
  offset: [number, number];
  footprint: [number, number];
  height: number;
  color: number;
  specs: { key: string; value: string; source: string; assumption?: boolean }[];
}

export const BASE_MODULES: BaseModuleSpec[] = [
  {
    id: "hab-1",
    name: "Main Habitat",
    kind: "habitat",
    offset: [0, 0],
    footprint: [12, 9],
    height: 4.5,
    color: 0xe6edf2,
    specs: [
      { key: "Crew size", value: "4 crew", source: "Design choice", assumption: true },
      { key: "Cabin pressure", value: "70 kPa (34% O2)", source: "NASA-STD-3001 Vol. 2" },
    ],
  },
  {
    id: "airlock",
    name: "EVA Airlock & Suit Port",
    kind: "airlock",
    offset: [-9, 0],
    footprint: [4.5, 4],
    height: 3.2,
    color: 0x35e0ff,
    specs: [
      { key: "Depress time", value: "12 min", source: "NTRS Exploration EVA Brief" },
      { key: "Prebreathe", value: "40 min", source: "NASA-STD-3001 Vol. 2" },
    ],
  },
  {
    id: "compute",
    name: "Local AI Compute Node",
    kind: "compute",
    offset: [10, 0],
    footprint: [4, 4],
    height: 3.0,
    color: 0x5c8eff,
    specs: [
      { key: "Orchestrator", value: "BASE + MCP + GUARDIAN", source: "Tango Horizon Architecture" },
      { key: "Link mode", value: "Local (<2 s)", source: "Measured in runtime" },
    ],
  },
  {
    id: "lab",
    name: "Geoscience Lab",
    kind: "lab",
    offset: [0, 12],
    footprint: [8, 6],
    height: 3.5,
    color: 0xd6dfe8,
    specs: [{ key: "Instruments", value: "XRD / Raman / Mass Spec", source: "Design choice", assumption: true }],
  },
  {
    id: "med",
    name: "Medical Bay",
    kind: "medical",
    offset: [10, 12],
    footprint: [5, 4.5],
    height: 3.2,
    color: 0xff5470,
    specs: [{ key: "Hyperbaric", value: "210 kPa chamber", source: "NASA-STD-3001 Vol. 1" }],
  },
  {
    id: "greenhouse",
    name: "Hydroponic Greenhouse",
    kind: "greenhouse",
    offset: [-14, -12],
    footprint: [13, 6],
    height: 3.4,
    color: 0x45d97b,
    specs: [{ key: "Growing area", value: "64 m^2", source: "ISS Veggie / APH scaled", assumption: true }],
  },
  {
    id: "eclss",
    name: "ECLSS & Water",
    kind: "eclss",
    offset: [10, -10],
    footprint: [5.5, 4.5],
    height: 3.4,
    color: 0x4ec4e8,
    specs: [
      { key: "O2 demand", value: "0.84 kg/person/day", source: "NASA-STD-3001 Vol. 2" },
      { key: "Water recovery", value: "98%", source: "ISS WRS NTRS Report" },
    ],
  },
  {
    id: "isru",
    name: "MOXIE-Scale ISRU",
    kind: "isru",
    offset: [26, 0],
    footprint: [7, 5],
    height: 3.6,
    color: 0xf59e42,
    specs: [{ key: "O2 rate", value: "2.4 kg/h scaled", source: "PDS Atmospheres MOXIE scaled", assumption: true }],
  },
  {
    id: "solar",
    name: "Primary Solar Array",
    kind: "solar",
    offset: [0, -40],
    footprint: [48, 22],
    height: 1.2,
    color: 0x203b66,
    specs: [
      { key: "Array area", value: "850 m^2", source: "Design choice", assumption: true },
      { key: "Model", value: "Direct beam exp(-tau/mu)", source: "NASA TM-102299 / solar.ts" },
    ],
  },
  {
    id: "battery",
    name: "Battery Bank",
    kind: "battery",
    offset: [20, -24],
    footprint: [6, 4],
    height: 2.4,
    color: 0x35e0ff,
    specs: [{ key: "Capacity", value: "420 kWh", source: "Design choice", assumption: true }],
  },
  {
    id: "fission",
    name: "Fission Surface Power (100 m Keep-Out)",
    kind: "fission",
    offset: [220, -40],
    footprint: [5, 5],
    height: 6.0,
    color: 0xffb800,
    specs: [
      { key: "Rated power", value: "40 kWe storm-proof", source: "NASA Fission Surface Power (NTRS)" },
      { key: "Keep-out radius", value: "100 m", source: "Safety exclusion", assumption: true },
    ],
  },
  {
    id: "garage",
    name: "Fleet Garage",
    kind: "garage",
    offset: [-26, 12],
    footprint: [11, 9],
    height: 4.2,
    color: 0x9aa6b2,
    specs: [{ key: "Bays", value: "4 pressurized/unpressurized", source: "Design choice", assumption: true }],
  },
  {
    id: "comms",
    name: "Comms Relay Tower",
    kind: "comms",
    offset: [24, 18],
    footprint: [3, 3],
    height: 16.0,
    color: 0xf2f5f8,
    specs: [{ key: "Uplink", value: "MRO / TGO UHF + X-band", source: "NASA Mars Relay Network" }],
  },
  {
    id: "launcher-1",
    name: "Pod Launcher Tower 1",
    kind: "launcher",
    offset: [55, 24],
    footprint: [4, 4],
    height: 8.5,
    color: 0xff623b,
    specs: [
      { key: "Muzzle speed", value: "90 m/s max (6 m tube)", source: "Design choice", assumption: true },
      { key: "Peak launch load", value: "69 g", source: "Computed: launchLoadG(90, 6)" },
    ],
  },
  {
    id: "launcher-2",
    name: "Pod Launcher Tower 2",
    kind: "launcher",
    offset: [65, 24],
    footprint: [4, 4],
    height: 8.5,
    color: 0xff623b,
    specs: [
      { key: "Max vacuum range", value: "2183 m", source: "Computed: maxRangeVacuum(90)" },
      { key: "Payload", value: "3 kg O2 / Battery / Patch", source: "Design choice", assumption: true },
    ],
  },
  {
    id: "shelter",
    name: "Radiation Storm Shelter",
    kind: "shelter",
    offset: [-7, 7],
    footprint: [5, 4],
    height: 2.5,
    color: 0xc2956b,
    specs: [{ key: "Regolith shielding", value: "45 g/cm^2", source: "NASA-STD-3001 Vol. 1" }],
  },
];

export class BaseProc {
  readonly group = new THREE.Group();
  readonly selectableMeshes: THREE.Object3D[] = [];
  readonly launcherOrigins: [number, number, number][] = [];

  constructor(scene: THREE.Scene, terrain: TerrainProc) {
    for (const mod of BASE_MODULES) {
      const [ox, oz] = mod.offset;
      const wx = BASE_ORIGIN.x + ox;
      const wz = BASE_ORIGIN.z + oz;
      const gy = terrain.heightAt(wx, wz);
      const mGroup = new THREE.Group();
      mGroup.position.set(wx, gy, wz);
      mGroup.name = `base:${mod.id}`;
      mGroup.userData = { baseModuleId: mod.id };

      let mesh: THREE.Mesh;
      const mat = new THREE.MeshStandardMaterial({
        color: mod.color,
        roughness: 0.48,
        metalness: mod.kind === "solar" ? 0.65 : 0.25,
      });

      if (mod.kind === "habitat" || mod.kind === "lab" || mod.kind === "greenhouse") {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(mod.footprint[1] * 0.5, mod.footprint[1] * 0.5, mod.footprint[0], 16),
          mat,
        );
        mesh.rotation.z = Math.PI / 2;
        mesh.position.y = mod.footprint[1] * 0.42;
      } else if (mod.kind === "solar") {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(mod.footprint[0], 0.35, mod.footprint[1]), mat);
        mesh.position.y = 0.9;
      } else if (mod.kind === "comms") {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.55, mod.height, 8), mat);
        mesh.position.y = mod.height / 2;
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(1.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
          new THREE.MeshStandardMaterial({ color: 0xe8ecf0, side: THREE.DoubleSide }),
        );
        dish.position.y = mod.height;
        dish.rotation.x = 0.6;
        mGroup.add(dish);
      } else if (mod.kind === "launcher") {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(mod.footprint[0], 2.2, mod.footprint[1]), mat);
        mesh.position.y = 1.1;
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.34, mod.height, 10),
          new THREE.MeshStandardMaterial({ color: 0x323b45, metalness: 0.7 }),
        );
        rail.position.y = 4.2;
        rail.rotation.z = -0.35;
        mGroup.add(rail);

      } else if (mod.kind === "fission") {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, mod.height, 12), mat);
        mesh.position.y = mod.height / 2;
        // 100 m keep-out ring on terrain
        const ringGeo = new THREE.RingGeometry(98.5, 100, 64);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color: 0xffb800, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
        );
        ring.position.y = 0.5;
        mGroup.add(ring);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(mod.footprint[0], mod.height, mod.footprint[1]), mat);
        mesh.position.y = mod.height / 2;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { baseModuleId: mod.id };
      mGroup.add(mesh);
      mesh.updateMatrix();
      mesh.geometry.computeBoundingBox();
      const localBounds = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrix);
      const placement = groundPlacement((x, z) => terrain.heightAt(x, z), wx, wz,
        footprintContacts(mod.footprint[0], mod.footprint[1], localBounds.min.y));
      mGroup.position.y = placement.y;
      mGroup.userData.contactClearanceM = placement.clearanceM;
      if (mod.kind === "launcher") this.launcherOrigins.push([wx, wz, placement.y + 5.5]);
      this.selectableMeshes.push(mesh);

      const lbl = makeSpriteLabel(mod.id.toUpperCase(), mod.kind === "fission" ? "#ffb800" : "#35e0ff");
      lbl.position.y = mod.height + 2.2;
      lbl.scale.set(6.0, 1.1, 1);
      mGroup.add(lbl);

      this.group.add(mGroup);
    }

    scene.add(this.group);
  }
}
