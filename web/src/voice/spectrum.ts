/** Maps an analyser byte (0-255) to a bar height in px; the floor keeps an idle flat bar. */
export function barHeight(value: number, maxPx: number, minPx = 2): number {
  const v = Math.max(0, Math.min(255, value)) / 255;
  return Math.max(minPx, Math.round(v * maxPx));
}
