import type { AlgorithmModule, Renderer } from '../../core/AlgorithmModule';
import type { Step } from '../../core/StepPlayer';

/**
 * core 모듈(StepPlayer/Orchestrator/UI 셸) 수동 검증용 더미 모듈.
 * kdtree/octree/union-find/laplacian과 무관하며, 실제 알고리즘 모듈이 갖춰지면
 * dev/demo 폴더는 통째로 삭제해도 된다.
 */

type DemoInput = number;
type DemoState = number;

function buildSteps(target: number): Step<DemoState>[] {
  const clamped = Math.max(0, Math.floor(target));
  const steps: Step<DemoState>[] = [];
  for (let i = 0; i <= clamped; i++) {
    steps.push({ state: i, description: `count = ${i}` });
  }
  return steps;
}

class DemoRenderer implements Renderer<DemoState> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D 캔버스 컨텍스트를 가져올 수 없습니다.');
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(step: Step<DemoState>): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.font = '48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(step.state), canvas.width / 2, canvas.height / 2);
  }

  dispose(): void {
    // 캔버스 컨텍스트는 별도 해제가 필요 없음
  }
}

export const demoModule: AlgorithmModule<DemoInput, DemoState> = {
  name: 'demo-counter',
  generateSteps: buildSteps,
  createRenderer(canvas) {
    return new DemoRenderer(canvas);
  },
  createInputEditor(container, _canvas, onChange) {
    const label = document.createElement('label');
    label.textContent = '목표 카운트: ';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = '5';

    input.addEventListener('change', () => {
      const value = Number(input.value);
      onChange(Number.isFinite(value) ? value : 0);
    });

    label.appendChild(input);
    container.appendChild(label);
  },
};
