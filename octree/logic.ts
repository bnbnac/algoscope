import type { Step } from '../core/StepPlayer';

export type Point3 = [number, number, number];

export interface Bounds3D {
  min: Point3;
  max: Point3;
}

export interface OctreeInput {
  points: Point3[];
}

export interface OctreeNode {
  id: string;
  region: Bounds3D;
  depth: number;
  parentId: string | null;
  /** null이면 리프. 아니면 정확히 8개(옥탄트 0~7 순서). */
  childIds: string[] | null;
  /** 리프에만 값이 있음. */
  points: string[];
}

export interface OctreeState {
  nodes: OctreeNode[];
  /** 지금까지 삽입된 전체 점(렌더링용) — 아직 리프에 배치되기 전 스텝에서도 이미 포함됨. */
  points: { id: string; point: Point3 }[];
}

export const CAPACITY = 1;
export const MAX_DEPTH = 6;

function regionCenter(region: Bounds3D): Point3 {
  return [
    (region.min[0] + region.max[0]) / 2,
    (region.min[1] + region.max[1]) / 2,
    (region.min[2] + region.max[2]) / 2,
  ];
}

function octantIndex(point: Point3, region: Bounds3D): number {
  const center = regionCenter(region);
  const bx = point[0] >= center[0] ? 1 : 0;
  const by = point[1] >= center[1] ? 1 : 0;
  const bz = point[2] >= center[2] ? 1 : 0;
  return bx | (by << 1) | (bz << 2);
}

function childRegion(region: Bounds3D, octant: number): Bounds3D {
  const center = regionCenter(region);
  const bx = octant & 1;
  const by = (octant >> 1) & 1;
  const bz = (octant >> 2) & 1;
  return {
    min: [bx ? center[0] : region.min[0], by ? center[1] : region.min[1], bz ? center[2] : region.min[2]],
    max: [bx ? region.max[0] : center[0], by ? region.max[1] : center[1], bz ? region.max[2] : center[2]],
  };
}

type PushStep = (highlight: string[], description: string) => void;

export function generateSteps(input: OctreeInput, bounds: Bounds3D): Step<OctreeState>[] {
  const steps: Step<OctreeState>[] = [];
  const nodes = new Map<string, OctreeNode>();
  const allPoints: { id: string; point: Point3 }[] = [];
  const pointById = new Map<string, Point3>();
  let rootId: string | null = null;
  let nodeCounter = 0;

  function snapshot(): OctreeState {
    return {
      nodes: Array.from(nodes.values()).map((node) => ({
        ...node,
        region: { min: [...node.region.min] as Point3, max: [...node.region.max] as Point3 },
        points: [...node.points],
      })),
      points: allPoints.map((p) => ({ id: p.id, point: [...p.point] as Point3 })),
    };
  }

  const pushStep: PushStep = (highlight, description) => {
    steps.push({ state: snapshot(), highlight, description });
  };

  function ensureRoot(): string {
    if (rootId === null) {
      const id = 'n0';
      nodes.set(id, { id, region: bounds, depth: 0, parentId: null, childIds: null, points: [] });
      rootId = id;
    }
    return rootId;
  }

  function nextNodeId(): string {
    nodeCounter += 1;
    return `n${nodeCounter}`;
  }

  function subdivide(node: OctreeNode): string[] {
    const childIds: string[] = [];
    for (let octant = 0; octant < 8; octant += 1) {
      const id = nextNodeId();
      nodes.set(id, {
        id,
        region: childRegion(node.region, octant),
        depth: node.depth + 1,
        parentId: node.id,
        childIds: null,
        points: [],
      });
      childIds.push(id);
    }
    node.childIds = childIds;
    return childIds;
  }

  function insertFrom(nodeId: string, point: Point3, pointId: string): void {
    const node = nodes.get(nodeId)!;
    pushStep([node.id], `${pointId}(${point.join(', ')}) → 셀 ${node.id} 방문`);

    if (node.childIds === null) {
      if (node.points.length < CAPACITY || node.depth >= MAX_DEPTH) {
        node.points.push(pointId);
        pushStep([node.id], `${pointId}를 셀 ${node.id}에 배치 (occupancy 갱신)`);
        return;
      }

      const existing = [...node.points];
      node.points = [];
      const childIds = subdivide(node);
      pushStep([node.id, ...childIds], `셀 ${node.id} 용량 초과 → 8분할`);

      for (const existingId of existing) {
        insertFrom(node.id, pointById.get(existingId)!, existingId);
      }
      insertFrom(node.id, point, pointId);
      return;
    }

    const octant = octantIndex(point, node.region);
    const childId = node.childIds[octant]!;
    pushStep([node.id, childId], `옥탄트 ${octant} 방향 → 자식 ${childId}로 이동`);
    insertFrom(childId, point, pointId);
  }

  input.points.forEach((point, index) => {
    const id = `p${index}`;
    pointById.set(id, point);
    allPoints.push({ id, point });
    insertFrom(ensureRoot(), point, id);
  });

  return steps;
}
