export interface ContactPoint { x: number; y: number; z: number }
/** Lowest root elevation that keeps every supplied physical contact at or above the surface. */
export function groundPlacement(heightAt: (x: number, z: number) => number, x: number, z: number,
  contacts: readonly ContactPoint[] = [{ x: 0, y: 0, z: 0 }]): { y: number; clearanceM: number[] } {
  if (!contacts.length) throw new Error("Ground placement requires contact points");
  const required = contacts.map(p => heightAt(x + p.x, z + p.z) - p.y);
  if (!required.every(Number.isFinite)) throw new Error("Nonfinite ground contact");
  const y = Math.max(...required);
  return { y, clearanceM: required.map(h => y - h) };
}
export function footprintContacts(width: number, depth: number, contactY = 0): ContactPoint[] {
  return [-1, 1].flatMap(x => [-1, 1].map(z => ({ x: x * width / 2, y: contactY, z: z * depth / 2 })));
}
/** Dense footprint grid contacts (corners + interior) so wide structures never intersect terrain mounds. */
export function footprintGridContacts(width: number, depth: number, contactY = 0, stepM = 2): ContactPoint[] {
  const nx = Math.max(1, Math.ceil(width / Math.max(0.5, stepM)));
  const nz = Math.max(1, Math.ceil(depth / Math.max(0.5, stepM)));
  const pts: ContactPoint[] = [];
  for (let ix = 0; ix <= nx; ix++) {
    const x = (ix / nx - 0.5) * width;
    for (let iz = 0; iz <= nz; iz++) {
      pts.push({ x, y: contactY, z: (iz / nz - 0.5) * depth });
    }
  }
  return pts;
}
