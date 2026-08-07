import type { AlgorithmModule } from '../core/AlgorithmModule';
import { generateSteps, type CombinedState, type UnionFindInput } from './logic';
import { createInputEditor } from './input-editor';
import { UnionFindRenderer } from './renderer';

export const unionFindModule: AlgorithmModule<UnionFindInput, CombinedState> = {
  name: 'union-find',
  generateSteps,
  createRenderer(canvas) {
    return new UnionFindRenderer(canvas);
  },
  createInputEditor,
};
