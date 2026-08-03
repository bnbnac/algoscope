import type { Step } from '../../core/StepPlayer';

/** 좌표 하나 = 길이 k(2 또는 3 등)인 숫자 배열. kd-tree의 "k"가 곧 이 길이다. */
export type Vector = number[];

export interface Region {
  min: number[];
  max: number[];
}

export interface KdTreeInput {
  points: Vector[];
  query: Vector | null;
}

export interface KdNode {
  id: string;
  point: Vector;
  axis: number;
  depth: number;
  region: Region;
  parentId: string | null;
  leftId: string | null;
  rightId: string | null;
}

export interface QuerySnapshot {
  point: Vector;
  visited: string[];
  backtracked: string[];
  pruned: string[];
  bestId: string | null;
  bestDistance: number | null;
}

export interface KdTreeState {
  nodes: KdNode[];
  query: QuerySnapshot | null;
}

function splitRegion(region: Region, axis: number, value: number, goLeft: boolean): Region {
  const min = [...region.min];
  const max = [...region.max];
  if (goLeft) {
    max[axis] = value;
  } else {
    min[axis] = value;
  }
  return { min, max };
}

function squaredDistance(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return sum;
}

export function bruteForceNearest(points: Vector[], query: Vector): Vector | null {
  let best: Vector | null = null;
  let bestDist = Infinity;
  for (const point of points) {
    const dist = squaredDistance(point, query);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  return best;
}

type PushStep = (highlight: string[], description: string, query: QuerySnapshot | null) => void;

export function generateSteps(input: KdTreeInput, bounds: Region): Step<KdTreeState>[] {
  const dimensions = bounds.min.length;
  const steps: Step<KdTreeState>[] = [];
  const nodes = new Map<string, KdNode>();
  let rootId: string | null = null;

  function snapshot(query: QuerySnapshot | null): KdTreeState {
    return {
      nodes: Array.from(nodes.values()).map((node) => ({ ...node, point: [...node.point] })),
      query: query
        ? {
            ...query,
            point: [...query.point],
            visited: [...query.visited],
            backtracked: [...query.backtracked],
            pruned: [...query.pruned],
          }
        : null,
    };
  }

  const pushStep: PushStep = (highlight, description, query) => {
    steps.push({ state: snapshot(query), highlight, description });
  };

  function formatPoint(point: Vector): string {
    return `(${point.join(', ')})`;
  }

  function insert(point: Vector, index: number): void {
    const id = `n${index}`;

    if (rootId === null) {
      const node: KdNode = {
        id,
        point,
        axis: 0,
        depth: 0,
        region: bounds,
        parentId: null,
        leftId: null,
        rightId: null,
      };
      nodes.set(id, node);
      rootId = id;
      pushStep([id], `P${index}${formatPoint(point)} → 루트 노드로 삽입 (axis 0축 분할)`, null);
      return;
    }

    let currentId = rootId;
    for (;;) {
      const current = nodes.get(currentId)!;
      const currentValue = current.point[current.axis]!;
      const pointValue = point[current.axis]!;

      pushStep(
        [current.id],
        `P${index}${formatPoint(point)} vs ${current.id} — axis ${current.axis}=${currentValue} 기준 비교`,
        null
      );

      const goLeft = pointValue < currentValue;
      const childId = goLeft ? current.leftId : current.rightId;

      if (childId === null) {
        const childAxis = (current.axis + 1) % dimensions;
        const childRegion = splitRegion(current.region, current.axis, currentValue, goLeft);
        const node: KdNode = {
          id,
          point,
          axis: childAxis,
          depth: current.depth + 1,
          region: childRegion,
          parentId: current.id,
          leftId: null,
          rightId: null,
        };
        nodes.set(id, node);
        if (goLeft) {
          current.leftId = id;
        } else {
          current.rightId = id;
        }
        pushStep(
          [id],
          `P${index} → ${current.id}의 ${goLeft ? '왼쪽' : '오른쪽'} 자식으로 삽입 (axis ${childAxis}축 분할)`,
          null
        );
        return;
      }

      currentId = childId;
    }
  }

  input.points.forEach((point, index) => insert(point, index));

  if (input.query && rootId !== null) {
    runNearestNeighborQuery(input.query, nodes, rootId, pushStep);
  }

  return steps;
}

function runNearestNeighborQuery(
  queryPoint: Vector,
  nodes: Map<string, KdNode>,
  rootId: string,
  pushStep: PushStep
): void {
  const state: QuerySnapshot = {
    point: queryPoint,
    visited: [],
    backtracked: [],
    pruned: [],
    bestId: null,
    bestDistance: null,
  };

  function visit(nodeId: string | null): void {
    if (nodeId === null) {
      return;
    }
    const node = nodes.get(nodeId)!;
    state.visited.push(node.id);

    const dist = squaredDistance(queryPoint, node.point);
    const updated = state.bestDistance === null || dist < state.bestDistance;
    if (updated) {
      state.bestId = node.id;
      state.bestDistance = dist;
    }
    pushStep(
      [node.id],
      `${node.id} 방문, 거리² ${dist.toFixed(0)}${updated ? ' → 최근접 후보 갱신' : ''}`,
      state
    );

    const diff = queryPoint[node.axis]! - node.point[node.axis]!;
    const nearId = diff < 0 ? node.leftId : node.rightId;
    const farId = diff < 0 ? node.rightId : node.leftId;

    visit(nearId);

    state.backtracked.push(node.id);
    const distToPlane = diff * diff;
    const shouldExploreFar = farId !== null && (state.bestDistance === null || distToPlane < state.bestDistance);

    if (shouldExploreFar) {
      pushStep(
        [node.id],
        `${node.id}으로 back-track, 분할면까지 거리² ${distToPlane.toFixed(0)} < 최근접 거리² ${state.bestDistance ?? 0} → 반대편 탐색`,
        state
      );
      visit(farId);
    } else {
      if (farId !== null) {
        state.pruned.push(farId);
      }
      pushStep([node.id], `${node.id}으로 back-track, 반대편 가지치기`, state);
    }
  }

  visit(rootId);
  pushStep(state.bestId ? [state.bestId] : [], `최근접점 확정: ${state.bestId ?? '없음'}`, state);
}
