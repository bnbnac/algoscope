import type { AlgorithmModule } from '../core/AlgorithmModule';
import { generateSteps, type OctreeInput, type OctreeState } from './logic';
import { BOUNDS } from './bounds';
import { createInputEditor } from './input-editor';
import { OctreeRenderer } from './renderer';

export const octreeModule: AlgorithmModule<OctreeInput, OctreeState> = {
  name: 'octree',
  generateSteps: (input) => generateSteps(input, BOUNDS),
  createRenderer(canvas) {
    return new OctreeRenderer(canvas);
  },
  createInputEditor,
};
