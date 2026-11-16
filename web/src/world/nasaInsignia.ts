import * as THREE from "three";

// Tango Horizon mission emblem (512 x 512 transparent PNG):
const geometry = new THREE.PlaneGeometry(1, 1);
let material: THREE.MeshBasicMaterial | undefined;

/** Creates a fixed surface marking with the Tango Horizon emblem; callers choose its position and orientation. */
export function createNasaInsignia(widthM: number): THREE.Mesh {
  if (!material) {
    const sharedMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      toneMapped: false,
    });
    sharedMaterial.visible = false;
    material = sharedMaterial;

    // Keep model construction usable in Node tests without a DOM or network.
    if (typeof document !== "undefined" && typeof document.createElementNS === "function") {
      new THREE.TextureLoader().load(
        "/textures/tango-horizon-insignia.png",
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          sharedMaterial.map = texture;
          sharedMaterial.visible = true;
          sharedMaterial.needsUpdate = true;
        },
        undefined,
        () => console.warn("Tango Horizon insignia texture unavailable; keeping models unchanged"),
      );
    }
  }

  const insignia = new THREE.Mesh(geometry, material);
  insignia.name = "tango-horizon-insignia";
  insignia.scale.set(widthM, widthM, 1);
  return insignia;
}

