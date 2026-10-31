/** Projected coordinates are kept independent: overlapping records stay overlapping. */
export function orbitMarkerPosition(point: { x: number; y: number; z: number }, width: number, height: number) {
  const x = (point.x + 1) * width / 2;
  const y = (1 - point.y) * height / 2;
  // Leave room for the entire portrait and label to move naturally off-screen.
  const margin = 96;
  const visible = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(point.z)
    && width > 0 && height > 0 && point.z > -1 && point.z < 1
    && x > -margin && x < width + margin && y > -margin && y < height + margin;
  return { x, y, visible, layer: Math.round((1 - point.z) * 1000) };
}
