import type { PlaybackHost, UiComponent } from './types';

export const DEFAULT_INTERVAL_MS = 800;

export function createPlaybackControls(host: PlaybackHost, intervalMs = DEFAULT_INTERVAL_MS): UiComponent {
  const container = document.createElement('div');
  container.className = 'avz-playback-controls';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'avz-btn';
  prevBtn.textContent = '◀ 이전';

  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.className = 'avz-btn';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'avz-btn';
  nextBtn.textContent = '다음 ▶';

  const scrubber = document.createElement('input');
  scrubber.type = 'range';
  scrubber.className = 'avz-scrubber';
  scrubber.min = '0';

  let isPlaying = false;

  function setPlaying(playing: boolean): void {
    isPlaying = playing;
    playPauseBtn.textContent = isPlaying ? '⏸ 일시정지' : '▶ 재생';
  }
  setPlaying(false);

  prevBtn.addEventListener('click', () => host.prev());
  nextBtn.addEventListener('click', () => host.next());
  scrubber.addEventListener('input', () => host.jumpTo(Number(scrubber.value)));
  playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
      host.pause();
      setPlaying(false);
    } else {
      host.play(intervalMs);
      setPlaying(true);
    }
  });

  const unsubscribe = host.subscribe((index, total) => {
    scrubber.max = String(Math.max(0, total - 1));
    scrubber.value = String(index);
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= total - 1;
    // StepPlayer가 마지막 스텝에서 스스로 pause하므로 컨트롤 표시도 맞춰준다.
    if (index >= total - 1 && isPlaying) {
      setPlaying(false);
    }
  });

  container.append(prevBtn, playPauseBtn, nextBtn, scrubber);
  return { element: container, dispose: unsubscribe };
}
