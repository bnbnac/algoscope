import { describe, expect, it, vi } from 'vitest';
import { createStepIndicator } from '../StepIndicator';
import { makeFakeHost } from './testHost';

describe('createStepIndicator', () => {
  it('renders the current index/total and description on updates', () => {
    const host = makeFakeHost();
    const { element } = createStepIndicator(host);

    host.emit(0, 5, 'first step');
    expect(element.textContent).toContain('1 / 5');
    expect(element.textContent).toContain('first step');

    host.emit(4, 5, 'last step');
    expect(element.textContent).toContain('5 / 5');
    expect(element.textContent).toContain('last step');
  });

  it('dispose unsubscribes from the host', () => {
    const host = makeFakeHost();
    const { dispose } = createStepIndicator(host);

    dispose();

    const unsubscribe = (host.subscribe as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
