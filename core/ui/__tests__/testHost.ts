import { vi } from 'vitest';
import type { StepListener } from '../../Orchestrator';
import type { PlaybackHost } from '../types';

export interface FakeHost extends PlaybackHost {
  emit(index: number, total: number, description: string): void;
}

export function makeFakeHost(): FakeHost {
  let listener: StepListener | undefined;

  return {
    next: vi.fn(),
    prev: vi.fn(),
    jumpTo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    subscribe: vi.fn((l: StepListener) => {
      listener = l;
      return vi.fn(() => {
        listener = undefined;
      });
    }),
    emit(index: number, total: number, description: string): void {
      listener?.(index, total, description);
    },
  };
}
