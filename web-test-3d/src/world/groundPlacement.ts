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
