import { Orchestrator } from '../../core/Orchestrator';
import { mountShell } from '../../core/ui/shell';
import { demoModule } from './demoModule';

const canvas = document.querySelector<HTMLCanvasElement>('#demo-canvas');
const shellContainer = document.querySelector<HTMLElement>('#demo-shell');
const editorContainer = document.querySelector<HTMLElement>('#demo-input-editor');

if (!canvas || !shellContainer || !editorContainer) {
  throw new Error('데모 페이지에 필요한 DOM 요소를 찾을 수 없습니다.');
}

const orchestrator = new Orchestrator(demoModule, canvas, 5);

mountShell(shellContainer, orchestrator, {
  navItems: [{ label: '← 홈', href: '../../index.html' }],
});

orchestrator.mountInputEditor(editorContainer);
