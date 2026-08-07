import type { UnionFindInput } from './logic';
import { computeLayout, LOGICAL_HEIGHT, LOGICAL_WIDTH, nodePosition, NODE_RADIUS, PANEL_GAP, PANEL_WIDTH } from './layout';

const ELEMENT_COUNT = 10;
const HIT_RADIUS = NODE_RADIUS + 6;

function randomOperations(): [string, string][] {
  const opCount = ELEMENT_COUNT - 1 + Math.floor(Math.random() * 3); // N-1 ~ N+1개
  const operations: [string, string][] = [];
  for (let i = 0; i < opCount; i += 1) {
    const a = Math.floor(Math.random() * ELEMENT_COUNT);
    let b = Math.floor(Math.random() * ELEMENT_COUNT);
    if (b === a) {
      b = (b + 1) % ELEMENT_COUNT;
    }
    operations.push([`e${a}`, `e${b}`]);
  }
  return operations;
}

function toLogicalPoint(clientX: number, clientY: number, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT,
  };
}

/** 두 패널 다 같은 원소 id 집합을 보여주므로, 어느 쪽을 클릭해도 같은 효과. */
function findNodeAt(point: { x: number; y: number }): string | null {
  const layouts = [computeLayout(0), computeLayout(PANEL_WIDTH + PANEL_GAP)];
  for (const layout of layouts) {
    for (let i = 0; i < ELEMENT_COUNT; i += 1) {
      const pos = nodePosition(i, ELEMENT_COUNT, layout);
      if (Math.hypot(pos.x - point.x, pos.y - point.y) <= HIT_RADIUS) {
        return `e${i}`;
      }
    }
  }
  return null;
}

export function createInputEditor(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  onChange: (input: UnionFindInput) => void
): void {
  let operations: [string, string][] = [];
  let selected: string | null = null;

  function emit(): void {
    onChange({ elementCount: ELEMENT_COUNT, operations: [...operations] });
  }

  const status = document.createElement('p');
  status.style.margin = '0.5rem 0';
  status.style.fontSize = '0.85rem';
  status.style.color = '#666';

  function updateStatus(): void {
    status.textContent = selected
      ? `${selected} 선택됨 — 연결할 다른 노드를 클릭하세요.`
      : '노드를 클릭해 union할 첫 원소를 선택하세요.';
  }
  updateStatus();

  const reseedBtn = document.createElement('button');
  reseedBtn.type = 'button';
  reseedBtn.textContent = '다시 섞기';
  reseedBtn.addEventListener('click', () => {
    selected = null;
    operations = randomOperations();
    updateStatus();
    emit();
  });

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.textContent = '마지막 union 취소';
  undoBtn.addEventListener('click', () => {
    if (operations.length === 0) {
      return;
    }
    operations = operations.slice(0, -1);
    emit();
  });

  canvas.addEventListener('click', (event) => {
    const point = toLogicalPoint(event.clientX, event.clientY, canvas);
    const nodeId = findNodeAt(point);
    if (!nodeId) {
      return;
    }

    if (selected === null) {
      selected = nodeId;
    } else if (selected === nodeId) {
      selected = null; // 같은 노드 다시 클릭 → 선택 취소
    } else {
      operations = [...operations, [selected, nodeId]];
      selected = null;
      emit();
    }
    updateStatus();
  });

  container.append(reseedBtn, undoBtn, status);

  operations = randomOperations();
  emit();
}
