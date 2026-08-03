import { describe, expect, it, vi } from 'vitest';
import { createPlaybackControls } from '../PlaybackControls';
import { makeFakeHost } from './testHost';

describe('createPlaybackControls', () => {
  it('wires prev/next buttons to the host', () => {
    const host = makeFakeHost();
    const { element } = createPlaybackControls(host);
    const [prevBtn, , nextBtn] = element.querySelectorAll('button');

    prevBtn!.click();
    expect(host.prev).toHaveBeenCalledTimes(1);

    nextBtn!.click();
    expect(host.next).toHaveBeenCalledTimes(1);
  });

  it('moving the scrubber calls jumpTo with the numeric value', () => {
    const host = makeFakeHost();
    const { element } = createPlaybackControls(host);
    const scrubber = element.querySelector('input[type="range"]') as HTMLInputElement;

    scrubber.value = '2';
    scrubber.dispatchEvent(new Event('input'));

    expect(host.jumpTo).toHaveBeenCalledWith(2);
  });

  it('toggles play/pause on click', () => {
    const host = makeFakeHost();
    const { element } = createPlaybackControls(host, 500);
    const [, playPauseBtn] = element.querySelectorAll('button');

    playPauseBtn!.click();
    expect(host.play).toHaveBeenCalledWith(500);
    expect(playPauseBtn!.textContent).toContain('일시정지');

    playPauseBtn!.click();
    expect(host.pause).toHaveBeenCalledTimes(1);
    expect(playPauseBtn!.textContent).toContain('재생');
  });

  it('updates scrubber bounds and disables prev/next at the edges', () => {
    const host = makeFakeHost();
    const { element } = createPlaybackControls(host);
    const [prevBtn, , nextBtn] = element.querySelectorAll('button');
    const scrubber = element.querySelector('input[type="range"]') as HTMLInputElement;

    host.emit(0, 3, 's0');
    expect(scrubber.max).toBe('2');
    expect(scrubber.value).toBe('0');
    expect(prevBtn!.disabled).toBe(true);
    expect(nextBtn!.disabled).toBe(false);

    host.emit(2, 3, 's2');
    expect(prevBtn!.disabled).toBe(false);
    expect(nextBtn!.disabled).toBe(true);
  });

  it('reverts to the play label when the host reports the last step while playing', () => {
    const host = makeFakeHost();
    const { element } = createPlaybackControls(host);
    const [, playPauseBtn] = element.querySelectorAll('button');

    playPauseBtn!.click();
    expect(playPauseBtn!.textContent).toContain('일시정지');

    // StepPlayer가 마지막 스텝에서 스스로 pause한 뒤 알려주는 상황을 흉내낸다.
    host.emit(2, 3, 's2');
    expect(playPauseBtn!.textContent).toContain('재생');
  });

  it('dispose unsubscribes from the host', () => {
    const host = makeFakeHost();
    const { dispose } = createPlaybackControls(host);

    dispose();

    const unsubscribe = (host.subscribe as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
