import type { Renderer } from '../../core/AlgorithmModule';
import type { Step } from '../../core/StepPlayer';
import type { KdNode, KdTreeState, Vector } from '../shared/logic';
import { BOUNDS } from './bounds';

const COLORS = {
  line: '#aaaaaa',
  lineHighlight: '#ff8800',
  linePruned: '#e2e2e2',
  pointDefault: '#222222',
  pointHighlight: '#ff8800',
  pointVisited: '#3366ff',
  pointBest: '#22aa22',
  query: '#cc00cc',
};

type Pixel = { x: number; y: number };
type ToPixel = (point: Vector) => Pixel;

export class KdTreeRenderer implements Renderer<KdTreeState> {
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

  render(step: Step<KdTreeState>): void {
    const { ctx, canvas } = this;
    const scaleX = canvas.width / BOUNDS.max[0]!;
    const scaleY = canvas.height / BOUNDS.max[1]!;
    const toPx: ToPixel = (point) => ({ x: point[0]! * scaleX, y: point[1]! * scaleY });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { nodes, query } = step.state;
    const highlighted = new Set((step.highlight ?? []).map(String));

    for (const node of nodes) {
      this.drawSplitLine(node, toPx, highlighted, query);
    }
    for (const node of nodes) {
      this.drawPoint(node, toPx, highlighted, query);
    }
    if (query) {
      this.drawQueryPoint(query.point, toPx);
    }
  }

  dispose(): void {
    // 캔버스 컨텍스트는 별도 해제가 필요 없음
  }

  private drawSplitLine(
    node: KdNode,
    toPx: ToPixel,
    highlighted: Set<string>,
    query: KdTreeState['query']
  ): void {
    const isHighlighted = highlighted.has(node.id);
    const isPruned = query?.pruned.includes(node.id) ?? false;

    const [start, end]: [Vector, Vector] =
      node.axis === 0
        ? [
            [node.point[0]!, node.region.min[1]!],
            [node.point[0]!, node.region.max[1]!],
          ]
        : [
            [node.region.min[0]!, node.point[1]!],
            [node.region.max[0]!, node.point[1]!],
          ];

    const from = toPx(start);
    const to = toPx(end);

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = isHighlighted ? COLORS.lineHighlight : isPruned ? COLORS.linePruned : COLORS.line;
    this.ctx.lineWidth = isHighlighted ? 3 : 1;
    this.ctx.stroke();
  }

  private drawPoint(node: KdNode, toPx: ToPixel, highlighted: Set<string>, query: KdTreeState['query']): void {
    const pos = toPx(node.point);
    let color = COLORS.pointDefault;
    let radius = 4;

    if (query?.bestId === node.id) {
      color = COLORS.pointBest;
      radius = 6;
    } else if (highlighted.has(node.id)) {
      color = COLORS.pointHighlight;
      radius = 6;
    } else if (query?.visited.includes(node.id)) {
      color = COLORS.pointVisited;
    }

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  private drawQueryPoint(point: Vector, toPx: ToPixel): void {
    const pos = toPx(point);
    const size = 6;
    this.ctx.strokeStyle = COLORS.query;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x - size, pos.y - size);
    this.ctx.lineTo(pos.x + size, pos.y + size);
    this.ctx.moveTo(pos.x + size, pos.y - size);
    this.ctx.lineTo(pos.x - size, pos.y + size);
    this.ctx.stroke();
  }
}
