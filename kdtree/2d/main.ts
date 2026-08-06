import { Orchestrator } from '../../core/Orchestrator';
import { mountShell } from '../../core/ui/shell';
import { kdtreeModule } from './module';

const canvas = document.querySelector<HTMLCanvasElement>('#kdtree-canvas');
const shellContainer = document.querySelector<HTMLElement>('#kdtree-shell');
const editorContainer = document.querySelector<HTMLElement>('#kdtree-input-editor');

if (!canvas || !shellContainer || !editorContainer) {
  throw new Error('kdtree 2D 페이지에 필요한 DOM 요소를 찾을 수 없습니다.');
}

// 빈 입력으로 시작 — createInputEditor가 마운트되면서 랜덤 점을 시드하고 즉시 재생성한다.
const orchestrator = new Orchestrator(kdtreeModule, canvas, { points: [], query: null });

mountShell(shellContainer, orchestrator, {
  navItems: [
    { label: '← 홈', href: '../../index.html' },
    { label: 'KD-tree', href: '../index.html' },
    { label: '2차원', href: './index.html' },
    { label: '3차원', href: '../3d/index.html' },
    { label: 'Octree', href: '../../octree/index.html' },
  ],
  activeHref: './index.html',
});

orchestrator.mountInputEditor(editorContainer);
