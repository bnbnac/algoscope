import * as THREE from 'three';
import type { Renderer } from '../../core/AlgorithmModule';
import type { Step } from '../../core/StepPlayer';
import type { KdNode, KdTreeState, Vector } from '../shared/logic';
import { createOrbitScene, disposeObject3D, type OrbitScene } from '../../three-shared/orbitScene';
import { BOUNDS } from './bounds';

const COLORS = {
  line: 0xaaaaaa,
  highlight: 0xff8800,
  pruned: 0xe2e2e2,
  pointDefault: 0x222222,
  visited: 0x3366ff,
  best: 0x22aa22,
  query: 0xcc00cc,
};

export class KdTreeRenderer implements Renderer<KdTreeState> {
  private readonly orbit: OrbitScene;

  constructor(canvas: HTMLCanvasElement) {
    this.orbit = createOrbitScene(canvas, {
      min: [BOUNDS.min[0]!, BOUNDS.min[1]!, BOUNDS.min[2]!],
      max: [BOUNDS.max[0]!, BOUNDS.max[1]!, BOUNDS.max[2]!],
    });
  }

  render(step: Step<KdTreeState>): void {
    const { group } = this.orbit;
    while (group.children.length > 0) {
      disposeObject3D(group.children.pop()!);
    }

    const { nodes, query } = step.state;
    const highlighted = new Set((step.highlight ?? []).map(String));

    for (const node of nodes) {
      group.add(this.buildSplitPlane(node, highlighted, query));
      group.add(this.buildPointMesh(node, highlighted, query));
    }
    if (query) {
      group.add(this.buildQueryMarker(query.point));
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

  private buildSplitPlane(node: KdNode, highlighted: Set<string>, query: KdTreeState['query']): THREE.Object3D {
    const [minX, minY, minZ] = node.region.min;
    const [maxX, maxY, maxZ] = node.region.max;
    const [px, py, pz] = node.point;

    let width: number;
    let height: number;
    let position: THREE.Vector3;
    let rotation: THREE.Euler;

    if (node.axis === 0) {
      width = maxZ! - minZ!;
      height = maxY! - minY!;
      position = new THREE.Vector3(px!, (minY! + maxY!) / 2, (minZ! + maxZ!) / 2);
      rotation = new THREE.Euler(0, Math.PI / 2, 0);
    } else if (node.axis === 1) {
      width = maxX! - minX!;
      height = maxZ! - minZ!;
      position = new THREE.Vector3((minX! + maxX!) / 2, py!, (minZ! + maxZ!) / 2);
      rotation = new THREE.Euler(Math.PI / 2, 0, 0);
    } else {
      width = maxX! - minX!;
      height = maxY! - minY!;
      position = new THREE.Vector3((minX! + maxX!) / 2, (minY! + maxY!) / 2, pz!);
      rotation = new THREE.Euler(0, 0, 0);
    }

    const isHighlighted = highlighted.has(node.id);
    const isPruned = query?.pruned.includes(node.id) ?? false;
    const color = isHighlighted ? COLORS.highlight : isPruned ? COLORS.pruned : COLORS.line;

    const geometry = new THREE.PlaneGeometry(Math.max(width, 0.001), Math.max(height, 0.001));
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isHighlighted ? 0.6 : 0.25,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    return mesh;
  }

  private buildPointMesh(node: KdNode, highlighted: Set<string>, query: KdTreeState['query']): THREE.Object3D {
    let color = COLORS.pointDefault;
    let radius = 8;

    if (query?.bestId === node.id) {
      color = COLORS.best;
      radius = 14;
    } else if (highlighted.has(node.id)) {
      color = COLORS.highlight;
      radius = 14;
    } else if (query?.visited.includes(node.id)) {
      color = COLORS.visited;
    }

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.point[0]!, node.point[1]!, node.point[2]!);
    return mesh;
  }

  private buildQueryMarker(point: Vector): THREE.Object3D {
    const geometry = new THREE.OctahedronGeometry(12);
    const material = new THREE.MeshBasicMaterial({ color: COLORS.query, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point[0]!, point[1]!, point[2]!);
    return mesh;
  }
}
