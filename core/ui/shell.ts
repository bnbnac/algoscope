import './styles.css';
import { createPlaybackControls } from './PlaybackControls';
import { createStepIndicator } from './StepIndicator';
import { createAlgorithmNav, type AlgorithmNavItem } from './AlgorithmNav';
import type { PlaybackHost } from './types';

export interface ShellOptions {
  navItems?: AlgorithmNavItem[];
  activeHref?: string;
  playIntervalMs?: number;
}

export interface ShellHandle {
  /** step indicator/재생 컨트롤이 host를 구독한 것을 해제한다. */
  dispose: () => void;
}

export function mountShell(container: HTMLElement, host: PlaybackHost, options: ShellOptions = {}): ShellHandle {
  container.classList.add('avz-shell');

  if (options.navItems && options.navItems.length > 0) {
    container.appendChild(createAlgorithmNav(options.navItems, options.activeHref));
  }

  const stepIndicator = createStepIndicator(host);
  const playbackControls = createPlaybackControls(host, options.playIntervalMs);
  container.append(stepIndicator.element, playbackControls.element);

  return {
    dispose(): void {
      stepIndicator.dispose();
      playbackControls.dispose();
    },
  };
}

export { createPlaybackControls, createStepIndicator, createAlgorithmNav };
export type { AlgorithmNavItem, PlaybackHost };
