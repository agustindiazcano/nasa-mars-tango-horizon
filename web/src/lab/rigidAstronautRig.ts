import * as THREE from "three";
import { ARM_REST_ABDUCTION, buildSkeletonSpec, computeSkinWeights, type BoneSpec } from "./autoSkin";
import { JOINTS, type JointName, type Pose } from "./proceduralAstronaut";

export interface RigidAstronautRig {
  /** Add this to the scene. Holds the skinned mesh; its transform is the root motion. */
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  spec: BoneSpec[];
  bones: Record<JointName, THREE.Bone>;
  helper: THREE.SkeletonHelper;
  /** Hips position in the bind pose, used as the root offset origin. */
  hipsRest: THREE.Vector3;
  applyPose(pose: Pose, options?: { armDrop?: number }): void;
  /** Weight heat map of one bone (blue 0, red 1); `null` restores the original material. */
  showWeights(bone: JointName | null): void;
  dispose(): void;
}

/** Collects the first mesh under `object`. */
export function findFirstMesh(object: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  object.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  return found;
}

function heat(w: number, out: THREE.Color): void {
  // blue -> cyan -> green -> yellow -> red
  const t = Math.min(1, Math.max(0, w));
  out.setHSL((1 - t) * 0.66, 1, 0.5);
}

/**
 * Turns the rigid scan into a SkinnedMesh with a fitted humanoid skeleton.
 * `source` is the loaded GLB scene (its single mesh keeps its transform chain: the node scale is kept).
 */
export function buildRigidAstronautRig(source: THREE.Object3D): RigidAstronautRig {
  const srcMesh = findFirstMesh(source);
  if (!srcMesh) throw new Error("rigid astronaut: no mesh in the GLB");
  const geometry = srcMesh.geometry as THREE.BufferGeometry;
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const spec = buildSkeletonSpec({ min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] });

  const pos = geometry.getAttribute("position");
  const positions = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    positions[i * 3] = pos.getX(i);
    positions[i * 3 + 1] = pos.getY(i);
    positions[i * 3 + 2] = pos.getZ(i);
  }
  const midline = (bb.min.x + bb.max.x) / 2;
  const { skinIndex, skinWeight } = computeSkinWeights(positions, spec, midline);
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));

  const bones = {} as Record<JointName, THREE.Bone>;
  const worldHead = new Map<JointName, THREE.Vector3>();
  for (const b of spec) {
    const bone = new THREE.Bone();
    bone.name = b.name;
    bones[b.name] = bone;
    worldHead.set(b.name, new THREE.Vector3(...b.head));
  }
  for (const b of spec) {
    const head = worldHead.get(b.name)!;
    if (b.parent) {
      bones[b.parent].add(bones[b.name]);
      bones[b.name].position.copy(head).sub(worldHead.get(b.parent)!);
    } else {
      bones[b.name].position.copy(head);
    }
  }
  const skeleton = new THREE.Skeleton(JOINTS.map((j) => bones[j]));

  const material = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = "rigid-astronaut-skinned";
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.add(bones.hips);
  mesh.updateMatrixWorld(true);
  mesh.bind(skeleton);

  // Reproduce the source transform chain (the scan carries a uniform node scale).
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.position.copy(srcMesh.getWorldPosition(new THREE.Vector3()));
  holder.scale.copy(srcMesh.getWorldScale(new THREE.Vector3()));
  holder.quaternion.copy(srcMesh.getWorldQuaternion(new THREE.Quaternion()));
  holder.add(mesh);
  root.add(holder);

  const helper = new THREE.SkeletonHelper(mesh);
  (helper.material as THREE.LineBasicMaterial).depthTest = false;
  helper.visible = false;
  helper.renderOrder = 10;
  root.add(helper);

  const hipsRest = bones.hips.position.clone();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const originalMaterial = material;
  let weightMaterial: THREE.MeshBasicMaterial | null = null;

  return {
    root,
    mesh,
    skeleton,
    spec,
    bones,
    helper,
    hipsRest,
    applyPose(pose, options = {}) {
      const drop = options.armDrop ?? 0.75;
      for (const j of JOINTS) {
        const r = pose.joints[j];
        let z = r.z;
        // The scan stands in an A-pose: rotate the arms down by a fraction of the rest abduction.
        if (j === "upperArmL") z -= ARM_REST_ABDUCTION * drop;
        if (j === "upperArmR") z += ARM_REST_ABDUCTION * drop;
        euler.set(r.x, r.y, z, "XYZ");
        bones[j].quaternion.copy(quat.setFromEuler(euler));
      }
      // Root motion lives on the mesh (not the hips bone) so the offset stays in world axes while the body pitches.
      mesh.rotation.set(-pose.root.pitch, pose.root.yaw, 0, "YXZ"); // positive pitch tips the head backward
      const unit = 1 / holder.scale.y; // geometry units per metre
      mesh.position.set(0, 0, 0);
      if (pose.root.pitch !== 0 || pose.root.yaw !== 0) {
        // Rotate about the hips, not the mesh origin, so a fall tips around the body.
        const rotated = hipsRest.clone().applyEuler(mesh.rotation);
        mesh.position.copy(hipsRest).sub(rotated);
      }
      mesh.position.x += pose.root.offset.x * unit;
      mesh.position.y += pose.root.offset.y * unit;
      mesh.position.z += pose.root.offset.z * unit;
    },
    showWeights(bone) {
      if (bone === null) {
        mesh.material = originalMaterial;
        return;
      }
      const idx = JOINTS.indexOf(bone);
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (skinIndex[i * 4 + k] === idx) w += skinWeight[i * 4 + k];
        heat(w, c);
        if (w === 0) c.setRGB(0.05, 0.05, 0.15);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      weightMaterial ??= new THREE.MeshBasicMaterial({ vertexColors: true });
      weightMaterial.needsUpdate = true;
      mesh.material = weightMaterial;
    },
    dispose() {
      geometry.dispose();
      weightMaterial?.dispose();
    },
  };
}
