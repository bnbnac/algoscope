import type { Region } from '../shared/logic';

/** canvas 실제 픽셀 크기와 분리된 고정 논리 좌표계. index.html의 초기 canvas 크기(800x600)와
 *  일치시켜서 로드 직후에는 왜곡 없이 1:1로 그려진다. */
export const BOUNDS: Region = { min: [0, 0], max: [800, 600] };
