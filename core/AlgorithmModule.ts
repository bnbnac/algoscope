import type { Step } from './StepPlayer';

export interface Renderer<TState> {
  render(step: Step<TState>): void;
  dispose(): void;
  /**
   * 캔버스 픽셀 크기가 바뀐 뒤 core가 호출한다. 2D는 보통 다음 render()만으로 충분하지만,
   * Three.js는 카메라 aspect/projection matrix 갱신이 필요해 렌더러별로 구현이 갈리므로
   * optional로 둔다.
   */
  resize?(width: number, height: number): void;
}

export interface AlgorithmModule<TInput, TState> {
  name: string;
  generateSteps(input: TInput): Step<TState>[];
  createRenderer(canvas: HTMLCanvasElement): Renderer<TState>;
  createInputEditor?(
    container: HTMLElement,
    onChange: (input: TInput) => void
  ): void;
}
