import { Orchestrator } from '../core/Orchestrator';
import { mountShell } from '../core/ui/shell';
import { unionFindModule } from './module';

const canvas = document.querySelector<HTMLCanvasElement>('#union-find-canvas');
const shellContainer = document.querySelector<HTMLElement>('#union-find-shell');
const editorContainer = document.querySelector<HTMLElement>('#union-find-input-editor');

if (!canvas || !shellContainer || !editorContainer) {
  throw new Error('union-find 페이지에 필요한 DOM 요소를 찾을 수 없습니다.');
}

// 빈 입력으로 시작 — createInputEditor가 마운트되면서 랜덤 union 시퀀스를 시드하고 즉시 재생성한다.
const orchestrator = new Orchestrator(unionFindModule, canvas, { elementCount: 0, operations: [] });

mountShell(shellContainer, orchestrator, {
  navItems: [
    { label: '← 홈', href: '../index.html' },
    { label: 'KD-tree', href: '../kdtree/index.html' },
    { label: 'Octree', href: '../octree/index.html' },
    { label: 'Union-Find', href: './index.html' },
  ],
  activeHref: './index.html',
});

orchestrator.mountInputEditor(editorContainer);
