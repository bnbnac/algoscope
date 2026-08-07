import type { Step } from '../core/StepPlayer';

export interface UnionFindNode {
  id: string;
  parent: string;
  size: number;
}

export interface UnionFindState {
  nodes: UnionFindNode[];
  /** 이번 스텝에서 강조할 노드 id (naive/optimized 패널이 각자 독립적으로 가짐). */
  highlight: string[];
  /** 이번 스텝에서 경로 압축으로 부모가 바뀐 노드 id들. */
  compressed: string[];
}

export interface CombinedState {
  naive: UnionFindState;
  optimized: UnionFindState;
}

export interface UnionFindInput {
  elementCount: number;
  operations: [string, string][];
}

interface InternalNode {
  id: string;
  parent: string;
  size: number;
}

function createInitialNodes(elementCount: number): Map<string, InternalNode> {
  const nodes = new Map<string, InternalNode>();
  for (let i = 0; i < elementCount; i += 1) {
    const id = `e${i}`;
    nodes.set(id, { id, parent: id, size: 1 });
  }
  return nodes;
}

function snapshot(nodes: Map<string, InternalNode>, highlight: string[], compressed: string[]): UnionFindState {
  return {
    nodes: Array.from(nodes.values()).map((node) => ({ ...node })),
    highlight: [...highlight],
    compressed: [...compressed],
  };
}

type LocalPushStep = (highlight: string[], description: string, compressed: string[]) => void;

function makePush(nodes: Map<string, InternalNode>, steps: Step<UnionFindState>[]): LocalPushStep {
  return (highlight, description, compressed) => {
    steps.push({ state: snapshot(nodes, highlight, compressed), highlight, description });
  };
}

/** 압축 없이 부모 체인을 그대로 타고 루트까지 간다. 홉마다 스텝. */
function naiveFind(nodes: Map<string, InternalNode>, start: string, push: LocalPushStep): string {
  let current = start;
  push([current], `find(${start}): ${current} 방문`, []);
  while (nodes.get(current)!.parent !== current) {
    current = nodes.get(current)!.parent;
    push([current], `find(${start}): ${current}로 이동`, []);
  }
  return current;
}

/** naive union: 항상 첫 인자의 루트를 두 번째 인자의 루트 밑에 붙인다 — 크기 비교 없음. */
function runNaiveUnion(nodes: Map<string, InternalNode>, a: string, b: string): Step<UnionFindState>[] {
  const steps: Step<UnionFindState>[] = [];
  const push = makePush(nodes, steps);

  const rootA = naiveFind(nodes, a, push);
  const rootB = naiveFind(nodes, b, push);

  if (rootA === rootB) {
    push([rootA], `${a}, ${b}는 이미 같은 그룹(루트 ${rootA})`, []);
    return steps;
  }

  nodes.get(rootA)!.parent = rootB;
  push([rootA, rootB], `union(${a}, ${b}): ${rootA} → ${rootB} 밑에 연결`, []);
  return steps;
}

/** 루트까지 홉 이동(스텝) 후, 실제로 바뀌는 게 있을 때만 경로 압축 스텝 1개 추가. */
function optimizedFind(nodes: Map<string, InternalNode>, start: string, push: LocalPushStep): string {
  const path: string[] = [];
  let current = start;
  push([current], `find(${start}): ${current} 방문`, []);
  path.push(current);

  while (nodes.get(current)!.parent !== current) {
    current = nodes.get(current)!.parent;
    push([current], `find(${start}): ${current}로 이동`, []);
    path.push(current);
  }

  const root = current;
  const toCompress = path.filter((id) => id !== root && nodes.get(id)!.parent !== root);
  if (toCompress.length > 0) {
    for (const id of toCompress) {
      nodes.get(id)!.parent = root;
    }
    push([root, ...toCompress], `경로 압축: ${toCompress.join(', ')} → 루트 ${root}로 직결`, toCompress);
  }
  return root;
}

/** optimized union: 크기 비교해서 작은 쪽을 큰 쪽 밑에 붙인다 (union by size). */
function runOptimizedUnion(nodes: Map<string, InternalNode>, a: string, b: string): Step<UnionFindState>[] {
  const steps: Step<UnionFindState>[] = [];
  const push = makePush(nodes, steps);

  const rootA = optimizedFind(nodes, a, push);
  const rootB = optimizedFind(nodes, b, push);

  if (rootA === rootB) {
    push([rootA], `${a}, ${b}는 이미 같은 그룹(루트 ${rootA})`, []);
    return steps;
  }

  const nodeA = nodes.get(rootA)!;
  const nodeB = nodes.get(rootB)!;
  const [small, large] = nodeA.size <= nodeB.size ? [nodeA, nodeB] : [nodeB, nodeA];
  const smallSize = small.size;
  const largeSize = large.size;
  small.parent = large.id;
  large.size += small.size;
  push(
    [small.id, large.id],
    `union(${a}, ${b}): 크기 비교 ${small.id}(${smallSize}) ≤ ${large.id}(${largeSize}) → ${small.id}를 ${large.id} 밑에 연결`,
    []
  );
  return steps;
}

/** 테스트/진단용 — 연산별로 naive/optimized가 각각 몇 스텝(홉+압축+연결) 걸렸는지. */
export function countOperationSteps(input: UnionFindInput): { naive: number; optimized: number }[] {
  const naiveNodes = createInitialNodes(input.elementCount);
  const optimizedNodes = createInitialNodes(input.elementCount);
  return input.operations.map(([a, b]) => ({
    naive: runNaiveUnion(naiveNodes, a, b).length,
    optimized: runOptimizedUnion(optimizedNodes, a, b).length,
  }));
}

export function generateSteps(input: UnionFindInput): Step<CombinedState>[] {
  const naiveNodes = createInitialNodes(input.elementCount);
  const optimizedNodes = createInitialNodes(input.elementCount);
  const combined: Step<CombinedState>[] = [];

  combined.push({
    state: {
      naive: snapshot(naiveNodes, [], []),
      optimized: snapshot(optimizedNodes, [], []),
    },
    highlight: [],
    description: '초기 상태: 모든 원소가 독립된 그룹',
  });

  for (const [a, b] of input.operations) {
    const naiveOpSteps = runNaiveUnion(naiveNodes, a, b);
    const optimizedOpSteps = runOptimizedUnion(optimizedNodes, a, b);
    const len = Math.max(naiveOpSteps.length, optimizedOpSteps.length);

    // 연산 하나 안에서 먼저 끝난 쪽은 그 연산의 마지막 상태를 유지하며 기다린다 —
    // 그래야 어느 스텝에서 스크러빙하든 "지금 몇 번째 union 호출을 보는 중인지"가
    // 양쪽 패널에서 항상 같다 (naive/optimized 홉 수 차이는 연산 "안에서만" 나타남).
    for (let i = 0; i < len; i += 1) {
      const naiveStep = naiveOpSteps[Math.min(i, naiveOpSteps.length - 1)]!;
      const optimizedStep = optimizedOpSteps[Math.min(i, optimizedOpSteps.length - 1)]!;
      combined.push({
        state: { naive: naiveStep.state, optimized: optimizedStep.state },
        highlight: [],
        description: `[Naive] ${naiveStep.description} | [Optimized] ${optimizedStep.description}`,
      });
    }
  }

  return combined;
}
