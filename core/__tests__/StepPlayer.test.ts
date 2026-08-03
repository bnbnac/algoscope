import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StepPlayerImpl, type Step } from '../StepPlayer';

function makeSteps(n: number): Step<number>[] {
  return Array.from({ length: n }, (_, i) => ({ state: i, description: `step ${i}` }));
}

describe('StepPlayerImpl', () => {
  it('starts at index 0', () => {
    const player = new StepPlayerImpl(makeSteps(3));
    expect(player.currentIndex).toBe(0);
  });

  it('next advances and calls onStepChange', () => {
    const player = new StepPlayerImpl(makeSteps(3));
    const onStepChange = vi.fn();
    player.onStepChange = onStepChange;
    player.next();
    expect(player.currentIndex).toBe(1);
    expect(onStepChange).toHaveBeenCalledWith(player.steps[1]);
  });

  it('next is a no-op at the last step', () => {
    const player = new StepPlayerImpl(makeSteps(2));
    player.jumpTo(1);
    const onStepChange = vi.fn();
    player.onStepChange = onStepChange;
    player.next();
    expect(player.currentIndex).toBe(1);
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it('prev is a no-op at index 0', () => {
    const player = new StepPlayerImpl(makeSteps(3));
    const onStepChange = vi.fn();
    player.onStepChange = onStepChange;
    player.prev();
    expect(player.currentIndex).toBe(0);
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it('jumpTo clamps out-of-range indices', () => {
    const player = new StepPlayerImpl(makeSteps(3));
    player.jumpTo(100);
    expect(player.currentIndex).toBe(2);
    player.jumpTo(-5);
    expect(player.currentIndex).toBe(0);
  });

  it('jumpTo to the same index does not call onStepChange', () => {
    const player = new StepPlayerImpl(makeSteps(3));
    const onStepChange = vi.fn();
    player.onStepChange = onStepChange;
    player.jumpTo(0);
    expect(onStepChange).not.toHaveBeenCalled();
  });

  describe('play/pause', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('advances one step per interval tick', () => {
      const player = new StepPlayerImpl(makeSteps(4));
      player.play(100);
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(1);
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(2);
    });

    it('auto-pauses at the last step', () => {
      const player = new StepPlayerImpl(makeSteps(2));
      player.play(100);
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(player.currentIndex).toBe(1);
    });

    it('play() again clears the previous timer instead of stacking', () => {
      const player = new StepPlayerImpl(makeSteps(10));
      player.play(100);
      player.play(100);
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(1);
    });

    it('pause stops the timer', () => {
      const player = new StepPlayerImpl(makeSteps(5));
      player.play(100);
      player.pause();
      vi.advanceTimersByTime(500);
      expect(player.currentIndex).toBe(0);
    });
  });
});
