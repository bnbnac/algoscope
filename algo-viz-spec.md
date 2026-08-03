# algo-viz 아키텍처 스펙

## 목적

KD-tree, Octree, Union-Find, Laplacian 네 알고리즘을 인터랙티브하게 시각화하는 프로젝트.
공통 `core` 모듈 위에 알고리즘별 모듈을 얹는 구조. 브라우저에서 바로 열람 가능해야 함 (GitHub Pages 배포 전제).

**진행 순서: 넷을 동시에 벌리지 않는다. KD-tree + core를 먼저 끝까지 완성한 뒤 나머지 셋을 확장한다.**

## 스택

- 언어: TypeScript (바닐라, 프레임워크 없음)
- 2D 렌더링 (KD-tree, Union-Find): Canvas API
- 3D 렌더링 (Octree, Laplacian): Three.js
- 배포: GitHub Pages (정적 빌드)

## 전체 구조

```
algo-viz/
├── core/
│   ├── StepPlayer.ts        # 스텝 재생 엔진
│   ├── AlgorithmModule.ts   # 알고리즘 모듈 계약 (인터페이스)
│   ├── Orchestrator.ts      # 입력 변경 → 재생성 오케스트레이션
│   └── ui/                  # 재생 컨트롤 바, 스텝 인디케이터, 알고리즘 네비게이션
├── kdtree/
│   ├── logic.ts             # generateSteps 구현 (알고리즘 로직)
│   ├── renderer.ts          # Canvas 2D 렌더러
│   └── input-editor.ts      # 점 추가/삭제 입력 UI
├── octree/
├── union-find/
├── laplacian/
└── index.html               # 진입점, 알고리즘별 링크
```

## core의 책임 범위 (이것만, 그 이상은 알고리즘 모듈 쪽으로)

1. **스텝 재생 엔진** — 스텝 배열을 앞으로/뒤로/점프/자동재생
2. **캔버스/씬 생명주기 관리** — mount/unmount, resize 대응 (2D/3D 공통 부분만)
3. **공통 UI 셸** — 재생 컨트롤 바, 스텝 인디케이터, 알고리즘 전환 네비게이션
4. **입력 변경 → 재생성 오케스트레이션** — 사용자가 입력을 바꾸면 `generateSteps`를 처음부터 재실행하고 `StepPlayer`를 교체

**core에 넣지 않는 것**: 알고리즘 고유 로직(트리 삽입, union 연산 등), 알고리즘 고유 렌더링(선 긋기, 노드 그리기), 알고리즘별 입력 UI(점 클릭 추가 등).

## 핵심 설계 결정: 스텝은 Snapshot 방식

매 스텝마다 전체 상태를 통째로 저장하는 방식(Command+undo 방식이 아님). 이유:
- 프로젝트 규모(개인 학습·시연용, 수백~수천 개 요소)에서 메모리 낭비는 무시 가능한 수준
- 뒤로가기/점프/스크러빙이 배열 인덱스 접근이라 O(1)로 단순하게 구현됨
- Command 방식(연산 저장 + undo 로직)은 구현 비용이 약 2배인데 이 스케일에서 실익 없음 → 과설계이므로 배제

## 인터페이스 정의

```ts
// core/StepPlayer.ts
interface Step<TState> {
  state: TState;
  highlight?: (string | number)[];   // 강조할 노드/엣지 id
  description: string;               // "축 x=5로 분할" 같은 설명 텍스트
}

interface StepPlayer<TState> {
  steps: Step<TState>[];
  currentIndex: number;
  next(): void;
  prev(): void;
  jumpTo(index: number): void;
  play(intervalMs: number): void;
  pause(): void;
  onStepChange: (step: Step<TState>) => void;   // 렌더러가 구독
}

// core/AlgorithmModule.ts — 각 알고리즘 모듈이 구현해야 하는 계약
interface AlgorithmModule<TInput, TState> {
  name: string;
  generateSteps(input: TInput): Step<TState>[];   // 입력 → 전체 스텝 배열을 미리 다 계산
  createRenderer(canvas: HTMLCanvasElement): Renderer<TState>;
  createInputEditor?(
    container: HTMLElement,
    onChange: (input: TInput) => void
  ): void;   // 사용자가 입력을 바꾸면 onChange 호출 → core가 재생성
}

interface Renderer<TState> {
  render(step: Step<TState>): void;
  dispose(): void;
}
```

## 동작 흐름 (입력 변경 시)

1. 사용자가 `input-editor`에서 조작 (예: 캔버스 클릭으로 점 추가)
2. `onChange(newInput)` 콜백 호출
3. `core/Orchestrator`가 `generateSteps(newInput)` 재실행
4. 새 스텝 배열로 `StepPlayer` 교체, 재생 위치 0으로 리셋
5. 알고리즘 실행이 매 조작마다 재계산되므로 밀리초 단위로 끝나야 함 (현재 스케일에서는 문제없음)

## 검증 장치 (사람 개입 없이 도는 구조이므로 필수)

각 알고리즘 모듈은 알려진 정답이 있는 테스트 케이스를 자체 검증해야 한다.
- KD-tree: brute-force nearest neighbor와 결과 비교
- Octree: 삽입된 점이 올바른 셀에 속하는지 검증
- Union-Find: 최종 그룹핑이 기대되는 connected component와 일치하는지 검증
- Laplacian: smoothing 후 수렴 여부(정점 이동량이 임계값 이하로 감소하는지) 검증

리뷰 부담을 줄이기 위해, 결과물 전체를 정독하기보다 테스트 통과 여부 + 원래 스토리보드와의 차이만 확인하는 방식으로 검토한다.

## 알고리즘별 시각화 스펙 (요약)

| 알고리즘 | 렌더링 | 보여줄 것 |
|---|---|---|
| KD-tree | Canvas 2D | 점 삽입 시 축 분할선이 재귀적으로 그려지는 과정, NN 쿼리 시 back-track되는 노드 하이라이트 |
| Octree | Three.js | 3D 포인트 삽입 시 셀 분할(subdivision) 애니메이션, occupancy 갱신 시 색상 변화 |
| Union-Find | Canvas 2D | union 호출 시 트리 병합 과정, 경로 압축 전/후 비교 |
| Laplacian | Three.js | mesh smoothing 반복 시 정점 수렴 과정, 스펙트럴 클러스터링 시 고유값 분해 시각화 |

## 진행 순서 (재확인)

1. `core` (StepPlayer, AlgorithmModule 인터페이스, Orchestrator, 공통 UI) 구현
2. `kdtree` 모듈로 core 인터페이스 검증하며 완성까지 끝냄
3. KD-tree 완주 확인 후에만 `octree`, `union-find`, `laplacian` 순차 확장
