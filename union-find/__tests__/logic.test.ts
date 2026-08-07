import { describe, expect, it } from 'vitest';
import { countOperationSteps, generateSteps, type UnionFindNode } from '../logic';

function rootOf(byId: Map<string, UnionFindNode>, id: string): string {
  let current = id;
  while (byId.get(current)!.parent !== current) {
    current = byId.get(current)!.parent;
  }
  return current;
}

function actualGroups(nodes: UnionFindNode[]): string[][] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, Set<string>>();
  for (const node of nodes) {
    const root = rootOf(byId, node.id);
    if (!groups.has(root)) {
      groups.set(root, new Set());
    }
    groups.get(root)!.add(node.id);
  }
  return normalize(groups.values());
}

/** union-find 없이 순수 집합 병합으로 기대 grouping을 독립적으로 계산 (교차검증용). */
function expectedGroups(elementCount: number, operations: [string, string][]): string[][] {
  let groups: Set<string>[] = Array.from({ length: elementCount }, (_, i) => new Set([`e${i}`]));
  for (const [a, b] of operations) {
    const groupA = groups.find((g) => g.has(a))!;
    const groupB = groups.find((g) => g.has(b))!;
    if (groupA !== groupB) {
      for (const id of groupB) {
        groupA.add(id);
      }
      groups = groups.filter((g) => g !== groupB);
    }
  }
  return normalize(groups);
}

function normalize(groups: Iterable<Set<string>>): string[][] {
  return Array.from(groups, (g) => Array.from(g).sort()).sort((a, b) => a[0]!.localeCompare(b[0]!));
}

function randomOperations(elementCount: number, count: number): [string, string][] {
  const ops: [string, string][] = [];
  for (let i = 0; i < count; i += 1) {
    const a = Math.floor(Math.random() * elementCount);
    let b = Math.floor(Math.random() * elementCount);
    if (b === a) {
      b = (b + 1) % elementCount;
    }
    ops.push([`e${a}`, `e${b}`]);
  }
  return ops;
}

describe('generateSteps — 최종 그룹핑이 기대 connected component와 일치 (스펙 필수)', () => {
  it('naive와 optimized 둘 다 독립적으로 계산한 기대 grouping과 일치한다', () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const elementCount = 4 + Math.floor(Math.random() * 10);
      const operations = randomOperations(elementCount, elementCount + 3);

      const steps = generateSteps({ elementCount, operations });
      const finalState = steps[steps.length - 1]!.state;
      const expected = expectedGroups(elementCount, operations);

      expect(actualGroups(finalState.naive.nodes)).toEqual(expected);
      expect(actualGroups(finalState.optimized.nodes)).toEqual(expected);
    }
  });
});

describe('generateSteps — 경로 압축/union-by-size 효과', () => {
  it('같은 원소를 반복 참조하는 입력에서 optimized의 누적 스텝 수가 naive보다 적다', () => {
    // naive와 optimized는 서로 독립적으로 진화하는 트리라 "매 연산마다" optimized가
    // 더 짧다는 보장은 없음(union-by-size는 전체 높이를 억제할 뿐, 개별 연산 단위 순서를
    // 보장하지 않음) — 검증 가능한 진짜 주장은 "누적으로는 naive가 더 손해"라는 것.
    // union(e0, e1), union(e0, e2), ... 처럼 매번 e0을 다시 참조하면, naive는 union을
    // 항상 "첫 인자의 루트를 두 번째 인자 밑에" 붙이는 규칙 때문에 e0을 찾아가는 경로가
    // 연산마다 한 홉씩 길어진다(선형 증가). optimized는 경로 압축 덕에 e0에서 루트까지
    // 항상 짧게 유지된다.
    const elementCount = 12;
    const operations: [string, string][] = Array.from({ length: elementCount - 1 }, (_, i) => [
      'e0',
      `e${i + 1}`,
    ]);

    const counts = countOperationSteps({ elementCount, operations });
    const totalNaive = counts.reduce((sum, c) => sum + c.naive, 0);
    const totalOptimized = counts.reduce((sum, c) => sum + c.optimized, 0);
    expect(totalOptimized).toBeLessThan(totalNaive);
  });
});

describe('generateSteps — 엣지 케이스', () => {
  it('연산이 없으면 초기 상태 스텝 1개만 존재한다', () => {
    const steps = generateSteps({ elementCount: 5, operations: [] });
    expect(steps).toHaveLength(1);
    expect(steps[0]!.state.naive.nodes).toHaveLength(5);
  });

  it('이미 같은 그룹인 원소끼리 union해도 무동작(grouping 변화 없음)', () => {
    const steps = generateSteps({
      elementCount: 3,
      operations: [
        ['e0', 'e1'],
        ['e1', 'e0'],
      ],
    });
    const finalState = steps[steps.length - 1]!.state;

    expect(actualGroups(finalState.naive.nodes)).toEqual([['e0', 'e1'], ['e2']]);
    expect(actualGroups(finalState.optimized.nodes)).toEqual([['e0', 'e1'], ['e2']]);
  });

  it('체인형 union N-1개로 전체가 한 그룹이 된다', () => {
    const elementCount = 6;
    const operations: [string, string][] = Array.from({ length: elementCount - 1 }, (_, i) => [
      `e${i}`,
      `e${i + 1}`,
    ]);

    const steps = generateSteps({ elementCount, operations });
    const finalState = steps[steps.length - 1]!.state;

    expect(actualGroups(finalState.naive.nodes)).toHaveLength(1);
    expect(actualGroups(finalState.optimized.nodes)).toHaveLength(1);
    expect(actualGroups(finalState.optimized.nodes)[0]).toHaveLength(elementCount);
  });
});
