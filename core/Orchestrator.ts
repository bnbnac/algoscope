import type { AlgorithmModule, Renderer } from './AlgorithmModule';
import { StepPlayerImpl, type Step } from './StepPlayer';

export type StepListener = (index: number, total: number, description: string) => void;

/**
 * 입력 변경 시 StepPlayer 인스턴스 자체가 교체되므로, UI는 player를 직접 들고 있지 않고
 * 항상 Orchestrator를 통해서만 재생을 제어한다 (stale player 참조 방지).
 */
export class Orchestrator<TInput, TState> {
  private readonly module: AlgorithmModule<TInput, TState>;
  private readonly renderer: Renderer<TState>;
  private readonly canvas: HTMLCanvasElement;
  private player: StepPlayerImpl<TState>;
  private readonly listeners = new Set<StepListener>();
  private readonly resizeObserver: ResizeObserver | undefined;

  constructor(module: AlgorithmModule<TInput, TState>, canvas: HTMLCanvasElement, initialInput: TInput) {
    this.module = module;
    this.canvas = canvas;
    this.renderer = module.createRenderer(canvas);
    this.player = this.buildPlayer(initialInput);
    this.dispatchCurrent();
    this.resizeObserver = this.observeResize(canvas);
  }

  mountInputEditor(container: HTMLElement): void {
    this.module.createInputEditor?.(container, this.canvas, (input) => this.setInput(input));
  }

  subscribe(listener: StepListener): () => void {
    this.listeners.add(listener);
    this.notify(listener);
    return () => this.listeners.delete(listener);
  }

  next(): void {
    this.player.next();
  }

  prev(): void {
    this.player.prev();
  }

  jumpTo(index: number): void {
    this.player.jumpTo(index);
  }

  play(intervalMs: number): void {
    this.player.play(intervalMs);
  }

  pause(): void {
    this.player.pause();
  }

  dispose(): void {
    this.player.pause();
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
    this.listeners.clear();
  }

  /**
   * canvas 자체가 아니라 부모 컨테이너를 관찰한다. canvas.width/height(드로잉 버퍼)를
   * 직접 갱신하면 canvas 자신의 레이아웃 크기가 함께 바뀌어 옵저버가 재귀적으로 다시
   * 트리거될 수 있기 때문. jsdom 등 ResizeObserver가 없는 환경에서는 조용히 건너뛴다.
   */
  private observeResize(canvas: HTMLCanvasElement): ResizeObserver | undefined {
    const container = canvas.parentElement;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width <= 0 || height <= 0) {
        return;
      }
      canvas.width = width;
      canvas.height = height;
      this.renderer.resize?.(width, height);
      this.dispatchCurrent();
    });
    observer.observe(container);
    return observer;
  }

  private setInput(input: TInput): void {
    this.player.pause();
    this.player = this.buildPlayer(input);
    this.dispatchCurrent();
  }

  private buildPlayer(input: TInput): StepPlayerImpl<TState> {
    const player = new StepPlayerImpl(this.module.generateSteps(input));
    player.onStepChange = (step) => this.dispatch(step);
    return player;
  }

  private dispatchCurrent(): void {
    const step = this.player.steps[this.player.currentIndex];
    if (step !== undefined) {
      this.dispatch(step);
    }
  }

  private dispatch(step: Step<TState>): void {
    this.renderer.render(step);
    for (const listener of this.listeners) {
      this.notify(listener);
    }
  }

  private notify(listener: StepListener): void {
    const step = this.player.steps[this.player.currentIndex];
    if (step !== undefined) {
      listener(this.player.currentIndex, this.player.steps.length, step.description);
    }
  }
}
