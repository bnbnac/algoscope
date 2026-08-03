import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Orchestrator } from '../Orchestrator';
import type { AlgorithmModule, Renderer } from '../AlgorithmModule';
import type { Step } from '../StepPlayer';

function makeModule(overrides: Partial<AlgorithmModule<number, number>> = {}) {
  const render = vi.fn();
  const dispose = vi.fn();
  const resize = vi.fn();
  const renderer: Renderer<number> = { render, dispose, resize };

  const module: AlgorithmModule<number, number> = {
    name: 'mock',
    generateSteps: (input: number): Step<number>[] =>
      Array.from({ length: Math.max(1, input) }, (_, i) => ({ state: i, description: `s${i}` })),
    createRenderer: vi.fn(() => renderer),
    ...overrides,
  };

  return { module, renderer, render, dispose, resize };
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(public readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
}

function triggerResize(observer: FakeResizeObserver, width: number, height: number): void {
  const entry = { contentRect: { width, height } } as ResizeObserverEntry;
  observer.callback([entry], observer as unknown as ResizeObserver);
}

function createCanvasWithParent(): HTMLCanvasElement {
  const parent = document.createElement('div');
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  return canvas;
}

describe('Orchestrator', () => {
  it('renders the first step immediately on construction', () => {
    const { module, render } = makeModule();
    const canvas = document.createElement('canvas');
    new Orchestrator(module, canvas, 3);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith({ state: 0, description: 's0' });
  });

  it('forwards next/prev/jumpTo to the live player', () => {
    const { module, render } = makeModule();
    const canvas = document.createElement('canvas');
    const orchestrator = new Orchestrator(module, canvas, 3);

    orchestrator.next();
    expect(render).toHaveBeenLastCalledWith({ state: 1, description: 's1' });

    orchestrator.jumpTo(2);
    expect(render).toHaveBeenLastCalledWith({ state: 2, description: 's2' });

    orchestrator.prev();
    expect(render).toHaveBeenLastCalledWith({ state: 1, description: 's1' });
  });

  it('notifies subscribers with index/total/description, including an immediate initial call', () => {
    const { module } = makeModule();
    const canvas = document.createElement('canvas');
    const orchestrator = new Orchestrator(module, canvas, 3);

    const listener = vi.fn();
    orchestrator.subscribe(listener);
    expect(listener).toHaveBeenLastCalledWith(0, 3, 's0');

    orchestrator.next();
    expect(listener).toHaveBeenLastCalledWith(1, 3, 's1');
  });

  it('regenerates steps and resets to index 0 when input changes via the input editor', () => {
    let capturedOnChange: ((input: number) => void) | undefined;
    let capturedCanvas: HTMLCanvasElement | undefined;
    const { module, render } = makeModule({
      createInputEditor: (_container, canvas, onChange) => {
        capturedCanvas = canvas;
        capturedOnChange = onChange;
      },
    });
    const canvas = document.createElement('canvas');
    const orchestrator = new Orchestrator(module, canvas, 3);

    orchestrator.next();
    expect(render).toHaveBeenLastCalledWith({ state: 1, description: 's1' });

    orchestrator.mountInputEditor(document.createElement('div'));
    expect(capturedCanvas).toBe(canvas);
    capturedOnChange?.(5);

    expect(render).toHaveBeenLastCalledWith({ state: 0, description: 's0' });
  });

  it('dispose pauses playback and disposes the renderer', () => {
    const { module, dispose } = makeModule();
    const canvas = document.createElement('canvas');
    const orchestrator = new Orchestrator(module, canvas, 3);

    orchestrator.play(1000);
    orchestrator.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops further notifications', () => {
    const { module } = makeModule();
    const canvas = document.createElement('canvas');
    const orchestrator = new Orchestrator(module, canvas, 3);

    const listener = vi.fn();
    const unsubscribe = orchestrator.subscribe(listener);
    unsubscribe();
    listener.mockClear();

    orchestrator.next();
    expect(listener).not.toHaveBeenCalled();
  });

  describe('resize', () => {
    beforeEach(() => {
      FakeResizeObserver.instances = [];
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('does not observe when the canvas has no parent element', () => {
      const { module } = makeModule();
      const canvas = document.createElement('canvas');
      new Orchestrator(module, canvas, 3);
      expect(FakeResizeObserver.instances).toHaveLength(0);
    });

    it('observes the parent container and updates canvas size on resize', () => {
      const { module, render, resize } = makeModule();
      const canvas = createCanvasWithParent();
      new Orchestrator(module, canvas, 3);

      const observer = FakeResizeObserver.instances[0];
      expect(observer).toBeDefined();
      expect(observer!.observe).toHaveBeenCalledWith(canvas.parentElement);

      render.mockClear();
      triggerResize(observer!, 320, 240);

      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(240);
      expect(resize).toHaveBeenCalledWith(320, 240);
      expect(render).toHaveBeenCalledWith({ state: 0, description: 's0' });
    });

    it('ignores zero-size resize entries', () => {
      const { module, render, resize } = makeModule();
      const canvas = createCanvasWithParent();
      new Orchestrator(module, canvas, 3);
      const observer = FakeResizeObserver.instances[0]!;

      render.mockClear();
      triggerResize(observer, 0, 0);

      expect(resize).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
    });

    it('dispose disconnects the resize observer', () => {
      const { module } = makeModule();
      const canvas = createCanvasWithParent();
      const orchestrator = new Orchestrator(module, canvas, 3);
      const observer = FakeResizeObserver.instances[0]!;

      orchestrator.dispose();

      expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
