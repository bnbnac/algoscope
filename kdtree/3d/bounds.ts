import type { Region } from '../shared/logic';

/** 2D와 달리 화면 픽셀 비율에 얽매일 필요가 없어서 정육면체로 잡는다. */
export const BOUNDS: Region = { min: [0, 0, 0], max: [800, 800, 800] };
