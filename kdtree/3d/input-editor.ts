import type { KdTreeInput, Vector } from '../shared/logic';
import { BOUNDS } from './bounds';

const SEED_MIN = 8;
const SEED_MAX = 12;

function randomCoord(axis: number): number {
  return Math.round(BOUNDS.min[axis]! + Math.random() * (BOUNDS.max[axis]! - BOUNDS.min[axis]!));
}

function randomPoint(): Vector {
  return [randomCoord(0), randomCoord(1), randomCoord(2)];
}

function seedPoints(): Vector[] {
  const count = SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));
  return Array.from({ length: count }, randomPoint);
}

// 3D는 화면 클릭 한 번으로 깊이 축을 특정할 수 없어(레이캐스팅 없이는), 클릭 배치 대신
// 좌표 입력 폼을 쓴다.
export function createInputEditor(
  container: HTMLElement,
  _canvas: HTMLCanvasElement,
  onChange: (input: KdTreeInput) => void
): void {
  let points: Vector[] = [];
  let query: Vector | null = null;

  function emit(): void {
    onChange({ points: [...points], query });
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

  function readVector(): Vector {
    return axisInputs.map(({ input }) => Number(input.value) || 0);
  }

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0.5rem 0';
  list.style.display = 'flex';
  list.style.flexWrap = 'wrap';
  list.style.gap = '0.25rem';

  const queryLabel = document.createElement('p');
  queryLabel.style.fontSize = '0.85rem';
  queryLabel.style.color = '#666';

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

    queryLabel.textContent = query ? `쿼리 지점: (${query.map((v) => Math.round(v)).join(', ')})` : '쿼리 미지정';
  }

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '점 추가';
  addBtn.addEventListener('click', () => {
    points = [...points, readVector()];
    emit();
    renderList();
  });

  const queryBtn = document.createElement('button');
  queryBtn.type = 'button';
  queryBtn.textContent = '쿼리로 지정';
  queryBtn.addEventListener('click', () => {
    query = readVector();
    emit();
    renderList();
  });

  const reseedBtn = document.createElement('button');
  reseedBtn.type = 'button';
  reseedBtn.textContent = '다시 섞기';
  reseedBtn.addEventListener('click', () => {
    points = seedPoints();
    query = null;
    emit();
    renderList();
  });

  form.append(...axisInputs.map((i) => i.wrap), addBtn, queryBtn, reseedBtn);
  container.append(form, list, queryLabel);

  points = seedPoints();
  renderList();
  emit();
}
