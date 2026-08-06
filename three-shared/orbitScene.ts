import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface Bounds3D {
  min: [number, number, number];
  max: [number, number, number];
}

export interface OrbitScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** 알고리즘별 메시는 여기 add/remove. group 안 메시의 dispose는 호출자 책임. */
  group: THREE.Group;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Mesh뿐 아니라 LineSegments/Points 등 geometry+material을 갖는 모든 Object3D를 정리한다.
 * (instanceof THREE.Mesh만 검사하면 옥트리 셀의 LineSegments 테두리가 안 지워지고 샌다.)
 */
export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ('geometry' in child) {
      (child as THREE.Mesh).geometry?.dispose();
    }
    if ('material' in child) {
      const material = (child as THREE.Mesh).material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose();
      }
    }
  });
}

/**
 * Three.js 기반 알고리즘 모듈(kdtree/3d, octree, ...)이 공통으로 쓰는 씬 보일러플레이트.
 * WebGLRenderer/카메라/OrbitControls/RAF 루프/경계 박스를 여기서 세팅하고, 알고리즘별
 * 렌더러는 반환된 group에 자기 메시만 채우면 된다.
 */
export function createOrbitScene(canvas: HTMLCanvasElement, bounds: Bounds3D): OrbitScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const center = new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  );
  const span = Math.max(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2]
  );

  const camera = new THREE.PerspectiveCamera(50, canvas.width / Math.max(canvas.height, 1), 1, span * 10);
  camera.position.set(center.x + span, center.y + span, center.z + span);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.update();

  const group = new THREE.Group();
  scene.add(group);

  const box = new THREE.Box3(new THREE.Vector3(...bounds.min), new THREE.Vector3(...bounds.max));
  scene.add(new THREE.Box3Helper(box, new THREE.Color(0xcccccc)));

  let rafId = requestAnimationFrame(function animate() {
    rafId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    group,
    resize(width, height) {
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    dispose() {
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
    },
  };
}
