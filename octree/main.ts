import { Orchestrator } from '../core/Orchestrator';
import { mountShell } from '../core/ui/shell';
import { octreeModule } from './module';

const canvas = document.querySelector<HTMLCanvasElement>('#octree-canvas');
const shellContainer = document.querySelector<HTMLElement>('#octree-shell');
const editorContainer = document.querySelector<HTMLElement>('#octree-input-editor');

if (!canvas || !shellContainer || !editorContainer) {
  throw new Error('octree 페이지에 필요한 DOM 요소를 찾을 수 없습니다.');
}

// 빈 입력으로 시작 — createInputEditor가 마운트되면서 랜덤 점을 시드하고 즉시 재생성한다.
const orchestrator = new Orchestrator(octreeModule, canvas, { points: [] });

mountShell(shellContainer, orchestrator, {
  navItems: [
    { label: '← 홈', href: '../index.html' },
    { label: 'KD-tree', href: '../kdtree/index.html' },
    { label: 'Octree', href: './index.html' },
    { label: 'Union-Find', href: '../union-find/index.html' },
  ],
  activeHref: './index.html',
});

orchestrator.mountInputEditor(editorContainer);
