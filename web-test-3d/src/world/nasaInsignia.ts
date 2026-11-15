import * as THREE from "three";

// Official NASA artwork, retained unchanged (121 x 102 transparent PNG):
// https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo@2x.png
// Usage: https://www.nasa.gov/nasa-brand-center/images-and-media/
// Vehicle/suit markings only; not a Tango Horizon identifier or endorsement.
const geometry = new THREE.PlaneGeometry(1, 102 / 121);
let material: THREE.MeshBasicMaterial | undefined;

/** Creates a fixed surface marking; callers choose its position and orientation. */
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
    if (typeof document !== "undefined") {
      new THREE.TextureLoader().load(
        "/textures/nasa-insignia.png",
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          sharedMaterial.map = texture;
          sharedMaterial.visible = true;
          sharedMaterial.needsUpdate = true;
        },
        undefined,
        () => console.warn("NASA insignia texture unavailable; keeping models unchanged"),
      );
    }
  }

  const insignia = new THREE.Mesh(geometry, material);
  insignia.name = "nasa-insignia";
  insignia.scale.set(widthM, widthM, 1);
  return insignia;
}
