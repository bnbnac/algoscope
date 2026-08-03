export interface Step<TState> {
  state: TState;
  highlight?: (string | number)[];
  description: string;
}

export interface StepPlayer<TState> {
  steps: Step<TState>[];
  currentIndex: number;
  next(): void;
  prev(): void;
  jumpTo(index: number): void;
  play(intervalMs: number): void;
  pause(): void;
  onStepChange: (step: Step<TState>) => void;
}

export class StepPlayerImpl<TState> implements StepPlayer<TState> {
  steps: Step<TState>[];
  currentIndex = 0;
  onStepChange: (step: Step<TState>) => void = () => {};

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(steps: Step<TState>[]) {
    this.steps = steps;
  }

  next(): void {
    if (this.currentIndex >= this.steps.length - 1) {
      return;
    }
    this.currentIndex += 1;
    this.emit();
  }

  prev(): void {
    if (this.currentIndex <= 0) {
      return;
    }
    this.currentIndex -= 1;
    this.emit();
  }

  jumpTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.steps.length - 1));
    if (clamped === this.currentIndex) {
      return;
    }
    this.currentIndex = clamped;
    this.emit();
  }

  play(intervalMs: number): void {
    this.pause();
    if (this.currentIndex >= this.steps.length - 1) {
      return;
    }
    this.timer = setInterval(() => {
      this.next();
      if (this.currentIndex >= this.steps.length - 1) {
        this.pause();
      }
    }, intervalMs);
  }

  pause(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private emit(): void {
    const step = this.steps[this.currentIndex];
    if (step !== undefined) {
      this.onStepChange(step);
    }
  }
}
