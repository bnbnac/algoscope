import type { StepListener } from '../Orchestrator';

export interface Subscribable {
  subscribe(listener: StepListener): () => void;
}

export interface PlaybackHost extends Subscribable {
  next(): void;
  prev(): void;
  jumpTo(index: number): void;
  play(intervalMs: number): void;
  pause(): void;
}

export interface UiComponent {
  element: HTMLElement;
  /** host 구독을 해제한다. 컴포넌트를 셸에서 개별적으로 떼어낼 때 사용. */
  dispose: () => void;
}
