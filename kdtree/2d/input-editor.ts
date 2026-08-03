import type { KdTreeInput, Vector } from '../shared/logic';
import { BOUNDS } from './bounds';

type Mode = 'add' | 'query';

const SEED_MIN = 8;
const SEED_MAX = 12;
const HIT_RADIUS = 16; // 논리 좌표 기준, 이 반경 안을 클릭/hover하면 "그 점"으로 판정

function randomPoint(): Vector {
  return [
    Math.round(BOUNDS.min[0]! + Math.random() * (BOUNDS.max[0]! - BOUNDS.min[0]!)),
    Math.round(BOUNDS.min[1]! + Math.random() * (BOUNDS.max[1]! - BOUNDS.min[1]!)),
  ];
}

function seedPoints(): Vector[] {
  const count = SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
  return Array.from({ length: count }, randomPoint);
}

function toLogicalPoint(clientX: number, clientY: number, canvas: HTMLCanvasElement): Vector {
  const rect = canvas.getBoundingClientRect();
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  return [
    BOUNDS.min[0]! + relX * (BOUNDS.max[0]! - BOUNDS.min[0]!),
    BOUNDS.min[1]! + relY * (BOUNDS.max[1]! - BOUNDS.min[1]!),
  ];
}

function findNearbyIndex(points: Vector[], target: Vector): number {
  return points.findIndex((point) => Math.hypot(point[0]! - target[0]!, point[1]! - target[1]!) <= HIT_RADIUS);
}

function createHoverTooltip(canvas: HTMLCanvasElement, points: () => Vector[]): void {
  const host = canvas.parentElement;
  if (!host) {
    return;
  }
  if (getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }

  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.background = 'rgba(0, 0, 0, 0.75)';
  tooltip.style.color = '#fff';
  tooltip.style.font = '12px system-ui, sans-serif';
  tooltip.style.padding = '2px 6px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.display = 'none';
  host.appendChild(tooltip);

  canvas.addEventListener('mousemove', (event) => {
    const target = toLogicalPoint(event.clientX, event.clientY, canvas);
    const nearbyIndex = findNearbyIndex(points(), target);

    if (nearbyIndex < 0) {
      tooltip.style.display = 'none';
      return;
    }

    const point = points()[nearbyIndex]!;
    const rect = canvas.getBoundingClientRect();
    tooltip.textContent = `(${Math.round(point[0]!)}, ${Math.round(point[1]!)})`;
    tooltip.style.left = `${event.clientX - rect.left + 12}px`;
    tooltip.style.top = `${event.clientY - rect.top + 12}px`;
    tooltip.style.display = 'block';
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

export function createInputEditor(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  onChange: (input: KdTreeInput) => void
): void {
  let points: Vector[] = [];
  let query: Vector | null = null;
  let mode: Mode = 'add';

  function emit(): void {
    onChange({ points: [...points], query });
  }

  const addModeBtn = document.createElement('button');
  addModeBtn.type = 'button';
  addModeBtn.textContent = '점 추가 모드';

  const queryModeBtn = document.createElement('button');
  queryModeBtn.type = 'button';
  queryModeBtn.textContent = '쿼리 지정 모드';

  const reseedBtn = document.createElement('button');
  reseedBtn.type = 'button';
  reseedBtn.textContent = '다시 섞기';

  const hint = document.createElement('p');
  hint.style.margin = '0.5rem 0';
  hint.style.fontSize = '0.85rem';
  hint.style.color = '#666';

  function updateModeUi(): void {
    addModeBtn.style.fontWeight = mode === 'add' ? '700' : '400';
    queryModeBtn.style.fontWeight = mode === 'query' ? '700' : '400';
    hint.textContent =
      mode === 'add'
        ? '캔버스를 클릭해 점을 추가하세요 (기존 점 근처를 클릭하면 삭제됩니다).'
        : '캔버스를 클릭해 NN 쿼리 지점을 지정하세요.';
  }
  updateModeUi();

  addModeBtn.addEventListener('click', () => {
    mode = 'add';
    updateModeUi();
  });

  queryModeBtn.addEventListener('click', () => {
    mode = 'query';
    updateModeUi();
  });

  reseedBtn.addEventListener('click', () => {
    points = seedPoints();
    query = null;
    emit();
  });

  canvas.addEventListener('click', (event) => {
    const target = toLogicalPoint(event.clientX, event.clientY, canvas);

    if (mode === 'query') {
      query = target;
    } else {
      const nearbyIndex = findNearbyIndex(points, target);
      points = nearbyIndex >= 0 ? points.filter((_, index) => index !== nearbyIndex) : [...points, target];
    }
    emit();
  });

  createHoverTooltip(canvas, () => points);

  container.append(addModeBtn, queryModeBtn, reseedBtn, hint);

  points = seedPoints();
  emit();
}
