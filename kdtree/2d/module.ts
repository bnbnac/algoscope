import type { AlgorithmModule } from '../../core/AlgorithmModule';
import { generateSteps, type KdTreeInput, type KdTreeState } from '../shared/logic';
import { BOUNDS } from './bounds';
import { createInputEditor } from './input-editor';
import { KdTreeRenderer } from './renderer';

export const kdtreeModule: AlgorithmModule<KdTreeInput, KdTreeState> = {
  name: 'kdtree-2d',
  generateSteps: (input) => generateSteps(input, BOUNDS),
  createRenderer(canvas) {
    return new KdTreeRenderer(canvas);
  },
  createInputEditor,
};
