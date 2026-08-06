import * as THREE from 'three';
import type { Renderer } from '../core/AlgorithmModule';
import type { Step } from '../core/StepPlayer';
import type { OctreeNode, OctreeState, Point3 } from './logic';
import { createOrbitScene, disposeObject3D, type OrbitScene } from '../three-shared/orbitScene';
import { BOUNDS } from './bounds';

const COLORS = {
  emptyEdge: 0xaaaaaa,
  occupiedEdge: 0x3366ff,
  occupiedFill: 0x3366ff,
  highlight: 0xff8800,
  point: 0x222222,
};

export class OctreeRenderer implements Renderer<OctreeState> {
  private readonly orbit: OrbitScene;

  constructor(canvas: HTMLCanvasElement) {
    this.orbit = createOrbitScene(canvas, { min: BOUNDS.min, max: BOUNDS.max });
  }

  render(step: Step<OctreeState>): void {
    const { group } = this.orbit;
    while (group.children.length > 0) {
      disposeObject3D(group.children.pop()!);
    }

    const highlighted = new Set((step.highlight ?? []).map(String));
    const leaves = step.state.nodes.filter((node) => node.childIds === null);

    for (const leaf of leaves) {
      group.add(this.buildCell(leaf, highlighted));
    }
    for (const { point } of step.state.points) {
      group.add(this.buildPointMesh(point));
    }
  }

  resize(width: number, height: number): void {
    this.orbit.resize(width, height);
  }

  dispose(): void {
    while (this.orbit.group.children.length > 0) {
      disposeObject3D(this.orbit.group.children.pop()!);
    }
    this.orbit.dispose();
  }

  private buildCell(node: OctreeNode, highlighted: Set<string>): THREE.Object3D {
    const [minX, minY, minZ] = node.region.min;
    const [maxX, maxY, maxZ] = node.region.max;
    const size: [number, number, number] = [
      Math.max(maxX - minX, 0.001),
      Math.max(maxY - minY, 0.001),
      Math.max(maxZ - minZ, 0.001),
    ];

    const isHighlighted = highlighted.has(node.id);
    const isOccupied = node.points.length > 0;

    const container = new THREE.Group();
    container.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);

    const geometry = new THREE.BoxGeometry(...size);
    const edgeColor = isHighlighted ? COLORS.highlight : isOccupied ? COLORS.occupiedEdge : COLORS.emptyEdge;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: edgeColor })
    );
    container.add(edges);

    if (isOccupied) {
      const fill = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: isHighlighted ? COLORS.highlight : COLORS.occupiedFill,
          transparent: true,
          opacity: isHighlighted ? 0.35 : 0.15,
        })
      );
      container.add(fill);
    } else {
      // EdgesGeometry(geometry)는 정점 데이터를 복사해갈 뿐 원본을 참조로 들고 있지 않는다.
      // 채워진 셀이면 fill Mesh가 geometry를 물고 있어 disposeObject3D가 알아서 치우지만,
      // 빈 셀은 원본 BoxGeometry가 씬 트리에 안 걸려서 여기서 직접 안 지우면 샌다.
      geometry.dispose();
    }

    return container;
  }

  private buildPointMesh(point: Point3): THREE.Object3D {
    const geometry = new THREE.SphereGeometry(8, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: COLORS.point });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point[0], point[1], point[2]);
    return mesh;
  }
}
