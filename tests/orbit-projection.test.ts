import { describe, expect, it } from "vitest";
import { Group, PerspectiveCamera, Vector3 } from "three";
import { orbitMarkerPosition } from "../src/services/orbit-projection";

describe("3D Orbit portrait projection", () => {
  it("keeps overlapping portraits at the same projected position and layers nearer records in front", () => {
    const near = orbitMarkerPosition({ x: 0.1, y: -0.2, z: 0.2 }, 1000, 700);
    const far = orbitMarkerPosition({ x: 0.1, y: -0.2, z: 0.8 }, 1000, 700);
    expect(near).toMatchObject({ x: 550, y: 420, visible: true });
    expect({ x: far.x, y: far.y }).toEqual({ x: near.x, y: near.y });
    expect(near.layer).toBeGreaterThan(far.layer);
  });
  it("lets portraits move naturally past the viewport edge without clamping", () => {
    const atEdge = orbitMarkerPosition({ x: -1, y: 0, z: 0 }, 1000, 600);
    const partlyOffscreen = orbitMarkerPosition({ x: -1.1, y: 0, z: 0 }, 1000, 600);
    const fullyOffscreen = orbitMarkerPosition({ x: -1.21, y: 0, z: 0 }, 1000, 600);
    expect(atEdge.x).toBe(0);
    expect(partlyOffscreen.x).toBeCloseTo(-50);
    expect(partlyOffscreen.visible).toBe(true);
    expect(fullyOffscreen.visible).toBe(false);
    expect(orbitMarkerPosition({ x: 0, y: 0, z: 1.1 }, 1000, 600).visible).toBe(false);
  });
  it("moves continuously during small rotations, even when two paths cross", () => {
    const camera = new PerspectiveCamera(40, 1000 / 700, 0.1, 100);
    camera.position.z = 14;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const galaxy = new Group();
    const points = [new Vector3(0.3, 0, -1), new Vector3(-0.3, 0, 1)];
    let previous: { x: number; y: number }[] | undefined;
    for (let i = -100; i <= 100; i++) {
      galaxy.rotation.y = i / 1000;
      galaxy.updateMatrixWorld(true);
      const positions = points.map(point => orbitMarkerPosition(point.clone().applyMatrix4(galaxy.matrixWorld).project(camera), 1000, 700));
      if (previous) for (let index = 0; index < points.length; index++) {
        expect(Math.hypot(positions[index].x - previous[index].x, positions[index].y - previous[index].y)).toBeLessThan(1);
      }
      previous = positions;
    }
  });
});
