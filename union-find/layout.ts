/** renderer(그리기)와 input-editor(클릭 판정)가 같은 원형 배치 수식을 써야
 *  화면에 보이는 위치와 클릭 판정 위치가 어긋나지 않는다. */
export const LOGICAL_WIDTH = 800;
export const LOGICAL_HEIGHT = 500;
export const PANEL_GAP = 20;
export const PANEL_WIDTH = (LOGICAL_WIDTH - PANEL_GAP) / 2;
export const NODE_RADIUS = 16;

export type Point = { x: number; y: number };

export interface PanelLayout {
  offsetX: number;
  centerX: number;
  centerY: number;
  radius: number;
}

export function computeLayout(offsetX: number): PanelLayout {
  const centerX = offsetX + PANEL_WIDTH / 2;
  const centerY = LOGICAL_HEIGHT / 2 + 20;
  const radius = Math.min(PANEL_WIDTH, LOGICAL_HEIGHT) / 2 - 60;
  return { offsetX, centerX, centerY, radius };
}

export function nodePosition(index: number, count: number, layout: PanelLayout): Point {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: layout.centerX + Math.cos(angle) * layout.radius,
    y: layout.centerY + Math.sin(angle) * layout.radius,
  };
}
