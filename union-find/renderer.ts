import type { Renderer } from '../core/AlgorithmModule';
import type { Step } from '../core/StepPlayer';
import type { CombinedState, UnionFindState } from './logic';
import {
  computeLayout,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  nodePosition,
  NODE_RADIUS,
  PANEL_GAP,
  PANEL_WIDTH,
  type Point,
} from './layout';

const COLORS = {
  edge: '#aaaaaa',
  nodeDefault: '#ffffff',
  nodeBorder: '#333333',
  root: '#3366ff',
  highlight: '#ff8800',
  compressed: '#22aa22',
  label: '#333333',
  divider: '#eeeeee',
};

export class UnionFindRenderer implements Renderer<CombinedState> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D 캔버스 컨텍스트를 가져올 수 없습니다.');
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(step: Step<CombinedState>): void {
    const { ctx, canvas } = this;
    const scaleX = canvas.width / LOGICAL_WIDTH;
    const scaleY = canvas.height / LOGICAL_HEIGHT;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleX, scaleY);

    this.drawPanel(step.state.naive, computeLayout(0), 'Naive');
    this.drawPanel(
      step.state.optimized,
      computeLayout(PANEL_WIDTH + PANEL_GAP),
      'Optimized (경로 압축 + union-by-size)'
    );

    ctx.strokeStyle = COLORS.divider;
    ctx.beginPath();
    ctx.moveTo(PANEL_WIDTH + PANEL_GAP / 2, 0);
    ctx.lineTo(PANEL_WIDTH + PANEL_GAP / 2, LOGICAL_HEIGHT);
    ctx.stroke();

    ctx.restore();
  }

  dispose(): void {
    // 캔버스 컨텍스트는 별도 해제가 필요 없음
  }

  private drawPanel(state: UnionFindState, layout: PanelLayout, title: string): void {
    const { ctx } = this;
    const count = state.nodes.length;
    const positions = new Map(state.nodes.map((node, index) => [node.id, nodePosition(index, count, layout)]));

    ctx.fillStyle = COLORS.label;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, layout.centerX, layout.centerY - layout.radius - 30);

    for (const node of state.nodes) {
      if (node.parent === node.id) {
        continue;
      }
      const from = positions.get(node.id)!;
      const to = positions.get(node.parent)!;
      const highlighted = state.highlight.includes(node.id) || state.compressed.includes(node.id);
      this.drawArrow(from, to, highlighted);
    }

    for (const node of state.nodes) {
      const pos = positions.get(node.id)!;
      const isRoot = node.parent === node.id;
      const isCompressed = state.compressed.includes(node.id);
      const isHighlighted = state.highlight.includes(node.id);

      let fill = isRoot ? COLORS.root : COLORS.nodeDefault;
      if (isCompressed) {
        fill = COLORS.compressed;
      } else if (isHighlighted) {
        fill = COLORS.highlight;
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = COLORS.nodeBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isRoot || isCompressed || isHighlighted ? '#ffffff' : '#222222';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, pos.x, pos.y);
    }
  }

  private drawArrow(from: Point, to: Point, highlighted: boolean): void {
    const { ctx } = this;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      return;
    }
    const ux = dx / dist;
    const uy = dy / dist;
    const startX = from.x + ux * NODE_RADIUS;
    const startY = from.y + uy * NODE_RADIUS;
    const endX = to.x - ux * NODE_RADIUS;
    const endY = to.y - uy * NODE_RADIUS;

    ctx.strokeStyle = highlighted ? COLORS.highlight : COLORS.edge;
    ctx.lineWidth = highlighted ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const headLength = 8;
    const angle = Math.atan2(endY - startY, endX - startX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = highlighted ? COLORS.highlight : COLORS.edge;
    ctx.fill();
  }
}
