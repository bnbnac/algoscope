import type { OctreeInput, Point3 } from './logic';
import { BOUNDS } from './bounds';

const SEED_MIN = 8;
const SEED_MAX = 12;

function randomCoord(axis: number): number {
  return Math.round(BOUNDS.min[axis]! + Math.random() * (BOUNDS.max[axis]! - BOUNDS.min[axis]!));
}

function randomPoint(): Point3 {
  return [randomCoord(0), randomCoord(1), randomCoord(2)];
}

function seedPoints(): Point3[] {
  const count = SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
  return Array.from({ length: count }, randomPoint);
}

// octree는 NN 쿼리 개념이 없어서(스펙에 없음) kdtree/3d보다 단순 — 점 추가/삭제만.
export function createInputEditor(
  container: HTMLElement,
  _canvas: HTMLCanvasElement,
  onChange: (input: OctreeInput) => void
): void {
  let points: Point3[] = [];

  function emit(): void {
    onChange({ points: [...points] });
  }

  const form = document.createElement('div');
  form.style.display = 'flex';
  form.style.gap = '0.5rem';
  form.style.alignItems = 'center';
  form.style.flexWrap = 'wrap';

  const axisInputs = ['X', 'Y', 'Z'].map((label, axis) => {
    const wrap = document.createElement('label');
    wrap.textContent = `${label}: `;
    const input = document.createElement('input');
    input.type = 'number';
    input.style.width = '5rem';
    input.value = String(Math.round((BOUNDS.min[axis]! + BOUNDS.max[axis]!) / 2));
    wrap.appendChild(input);
    return { wrap, input };
  });

  function readPoint(): Point3 {
    const [x, y, z] = axisInputs.map(({ input }) => Number(input.value) || 0);
    return [x!, y!, z!];
  }

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0.5rem 0';
  list.style.display = 'flex';
  list.style.flexWrap = 'wrap';
  list.style.gap = '0.25rem';

  function renderList(): void {
    list.innerHTML = '';
    points.forEach((point, index) => {
      const item = document.createElement('li');
      item.style.border = '1px solid #ddd';
      item.style.borderRadius = '4px';
      item.style.padding = '2px 6px';
      item.style.fontSize = '0.85rem';

      const label = document.createElement('span');
      label.textContent = `P${index}(${point.map((v) => Math.round(v)).join(', ')}) `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        points = points.filter((_, i) => i !== index);
        emit();
        renderList();
      });

      item.append(label, removeBtn);
      list.appendChild(item);
    });
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '점 추가';
  addBtn.addEventListener('click', () => {
    points = [...points, readPoint()];
    emit();
    renderList();
  });

  const reseedBtn = document.createElement('button');
  reseedBtn.type = 'button';
  reseedBtn.textContent = '다시 섞기';
  reseedBtn.addEventListener('click', () => {
    points = seedPoints();
    emit();
    renderList();
  });

  form.append(...axisInputs.map((i) => i.wrap), addBtn, reseedBtn);
  container.append(form, list);

  points = seedPoints();
  renderList();
  emit();
}
