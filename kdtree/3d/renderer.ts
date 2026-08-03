import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Renderer } from '../../core/AlgorithmModule';
import type { Step } from '../../core/StepPlayer';
import type { KdNode, KdTreeState, Vector } from '../shared/logic';
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

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    }
  });
}

export class KdTreeRenderer implements Renderer<KdTreeState> {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly group: THREE.Group;
  private rafId: number;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const center = new THREE.Vector3(
      (BOUNDS.min[0]! + BOUNDS.max[0]!) / 2,
      (BOUNDS.min[1]! + BOUNDS.max[1]!) / 2,
      (BOUNDS.min[2]! + BOUNDS.max[2]!) / 2
    );
    const span = Math.max(
      BOUNDS.max[0]! - BOUNDS.min[0]!,
      BOUNDS.max[1]! - BOUNDS.min[1]!,
      BOUNDS.max[2]! - BOUNDS.min[2]!
    );

    this.camera = new THREE.PerspectiveCamera(50, canvas.width / Math.max(canvas.height, 1), 1, span * 10);
    this.camera.position.set(center.x + span, center.y + span, center.z + span);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(center);
    this.controls.enableDamping = true;
    this.controls.update();

    this.group = new THREE.Group();
    this.scene.add(this.group);

    const box = new THREE.Box3(
      new THREE.Vector3(BOUNDS.min[0], BOUNDS.min[1], BOUNDS.min[2]),
      new THREE.Vector3(BOUNDS.max[0], BOUNDS.max[1], BOUNDS.max[2])
    );
    this.scene.add(new THREE.Box3Helper(box, new THREE.Color(0xcccccc)));

    const animate = (): void => {
      this.rafId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  render(step: Step<KdTreeState>): void {
    while (this.group.children.length > 0) {
      disposeObject3D(this.group.children.pop()!);
    }

    const { nodes, query } = step.state;
    const highlighted = new Set((step.highlight ?? []).map(String));

    for (const node of nodes) {
      this.group.add(this.buildSplitPlane(node, highlighted, query));
      this.group.add(this.buildPointMesh(node, highlighted, query));
    }
    if (query) {
      this.group.add(this.buildQueryMarker(query.point));
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.controls.dispose();
    while (this.group.children.length > 0) {
      disposeObject3D(this.group.children.pop()!);
    }
    this.renderer.dispose();
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
