import { describe, expect, it } from 'vitest';
import { bruteForceNearest, generateSteps, type Region, type Vector } from '../logic';

const BOUNDS_2D: Region = { min: [0, 0], max: [800, 600] };
const BOUNDS_3D: Region = { min: [0, 0, 0], max: [800, 800, 800] };

function randomVector(bounds: Region): Vector {
  return bounds.min.map((min, i) => min + Math.random() * (bounds.max[i]! - min));
}

function squaredDistance(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return sum;
}

describe.each([
  ['2D', BOUNDS_2D],
  ['3D', BOUNDS_3D],
] as const)('generateSteps (%s)', (_label, bounds) => {
  const dimensions = bounds.min.length;

  it('matches brute-force nearest neighbor distance across random cases', () => {
    for (let trial = 0; trial < 50; trial += 1) {
      const pointCount = 1 + Math.floor(Math.random() * 30);
      const points = Array.from({ length: pointCount }, () => randomVector(bounds));
      const query = randomVector(bounds);

      const steps = generateSteps({ points, query }, bounds);
      const lastStep = steps[steps.length - 1]!;
      const bestId = lastStep.state.query?.bestId ?? null;
      expect(bestId).not.toBeNull();

      const foundNode = lastStep.state.nodes.find((node) => node.id === bestId);
      expect(foundNode).toBeDefined();
      const foundDistance = squaredDistance(foundNode!.point, query);

      const expected = bruteForceNearest(points, query);
      expect(expected).not.toBeNull();
      const expectedDistance = squaredDistance(expected!, query);

      expect(foundDistance).toBeCloseTo(expectedDistance);
    }
  });

  it('creates exactly one node per point, with axes cycling through all dimensions and points within their own region', () => {
    const points = Array.from({ length: 20 }, () => randomVector(bounds));
    const steps = generateSteps({ points, query: null }, bounds);
    const finalState = steps[steps.length - 1]!.state;

    expect(finalState.nodes).toHaveLength(points.length);

    for (const node of finalState.nodes) {
      for (let axis = 0; axis < dimensions; axis += 1) {
        expect(node.point[axis]).toBeGreaterThanOrEqual(node.region.min[axis]!);
        expect(node.point[axis]).toBeLessThanOrEqual(node.region.max[axis]!);
      }

      if (node.parentId) {
        const parent = finalState.nodes.find((candidate) => candidate.id === node.parentId);
        expect(parent).toBeDefined();
        expect(node.axis).toBe((parent!.axis + 1) % dimensions);
        expect(parent!.leftId === node.id || parent!.rightId === node.id).toBe(true);
      }
    }
  });

  it('returns no steps for an empty point set, with or without a query', () => {
    expect(generateSteps({ points: [], query: null }, bounds)).toHaveLength(0);
    expect(generateSteps({ points: [], query: randomVector(bounds) }, bounds)).toHaveLength(0);
  });

  it('handles a single point with a query trivially', () => {
    const point = randomVector(bounds);
    const query = randomVector(bounds);

    const steps = generateSteps({ points: [point], query }, bounds);
    const lastStep = steps[steps.length - 1]!;

    expect(lastStep.state.query?.bestId).toBe('n0');
  });
});
