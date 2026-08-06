import { describe, expect, it } from 'vitest';
import { BOUNDS } from '../bounds';
import { CAPACITY, generateSteps, MAX_DEPTH, type Point3 } from '../logic';

function randomPoint(): Point3 {
  return [
    BOUNDS.min[0] + Math.random() * (BOUNDS.max[0] - BOUNDS.min[0]),
    BOUNDS.min[1] + Math.random() * (BOUNDS.max[1] - BOUNDS.min[1]),
    BOUNDS.min[2] + Math.random() * (BOUNDS.max[2] - BOUNDS.min[2]),
  ];
}

function regionVolume(min: Point3, max: Point3): number {
  return (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
}

describe('generateSteps — 점이 올바른 셀에 속하는지 (스펙 필수 검증)', () => {
  it('각 점은 자신을 담고 있다고 기록된 리프의 region 안에 있다', () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const pointCount = 1 + Math.floor(Math.random() * 30);
      const points = Array.from({ length: pointCount }, randomPoint);
      const steps = generateSteps({ points }, BOUNDS);
      const finalState = steps[steps.length - 1]!.state;

      for (const { id, point } of finalState.points) {
        const owner = finalState.nodes.find((node) => node.childIds === null && node.points.includes(id));
        expect(owner).toBeDefined();

        for (let axis = 0; axis < 3; axis += 1) {
          expect(point[axis]).toBeGreaterThanOrEqual(owner!.region.min[axis]);
          expect(point[axis]).toBeLessThanOrEqual(owner!.region.max[axis]);
        }
      }
    }
  });
});

describe('generateSteps — 트리 구조 불변식', () => {
  it('내부 노드는 자식이 정확히 8개이고, 자식 region이 부모를 정확히 분할한다', () => {
    const points = Array.from({ length: 25 }, randomPoint);
    const steps = generateSteps({ points }, BOUNDS);
    const finalState = steps[steps.length - 1]!.state;

    for (const node of finalState.nodes) {
      if (node.childIds === null) {
        continue;
      }
      expect(node.childIds).toHaveLength(8);

      const children = node.childIds.map((id) => finalState.nodes.find((n) => n.id === id)!);
      for (const child of children) {
        for (let axis = 0; axis < 3; axis += 1) {
          expect(child.region.min[axis]).toBeGreaterThanOrEqual(node.region.min[axis]);
          expect(child.region.max[axis]).toBeLessThanOrEqual(node.region.max[axis]);
        }
      }

      const childVolumeSum = children.reduce((sum, c) => sum + regionVolume(c.region.min, c.region.max), 0);
      expect(childVolumeSum).toBeCloseTo(regionVolume(node.region.min, node.region.max));
    }
  });

  it('MAX_DEPTH 미만인 리프는 용량을 넘지 않는다', () => {
    const points = Array.from({ length: 25 }, randomPoint);
    const steps = generateSteps({ points }, BOUNDS);
    const finalState = steps[steps.length - 1]!.state;

    for (const node of finalState.nodes) {
      if (node.childIds === null && node.depth < MAX_DEPTH) {
        expect(node.points.length).toBeLessThanOrEqual(CAPACITY);
      }
    }
  });
});

describe('generateSteps — 엣지 케이스', () => {
  it('점이 없으면 스텝도 없다', () => {
    expect(generateSteps({ points: [] }, BOUNDS)).toHaveLength(0);
  });

  it('점 1개는 분할 없이 루트에 바로 배치된다', () => {
    const steps = generateSteps({ points: [randomPoint()] }, BOUNDS);
    const finalState = steps[steps.length - 1]!.state;

    expect(finalState.nodes).toHaveLength(1);
    expect(finalState.nodes[0]!.childIds).toBeNull();
    expect(finalState.nodes[0]!.points).toEqual(['p0']);
  });

  it('완전히 겹치는 점들은 MAX_DEPTH에서 무한분할 없이 한 리프에 쌓인다', () => {
    const point: Point3 = [123, 456, 789];
    const points = Array.from({ length: 15 }, () => point);

    const steps = generateSteps({ points }, BOUNDS);
    const finalState = steps[steps.length - 1]!.state;

    const leaves = finalState.nodes.filter((node) => node.childIds === null);
    const totalPlaced = leaves.reduce((sum, leaf) => sum + leaf.points.length, 0);
    expect(totalPlaced).toBe(15);
    expect(Math.max(...finalState.nodes.map((node) => node.depth))).toBeLessThanOrEqual(MAX_DEPTH);
  });
});
