import type { Subscribable, UiComponent } from './types';

export function createStepIndicator(host: Subscribable): UiComponent {
  const container = document.createElement('div');
  container.className = 'avz-step-indicator';

  const counter = document.createElement('span');
  counter.className = 'avz-step-counter';

  const description = document.createElement('p');
  description.className = 'avz-step-description';

  const unsubscribe = host.subscribe((index, total, desc) => {
    counter.textContent = `${index + 1} / ${total}`;
    description.textContent = desc;
  });

  container.append(counter, description);
  return { element: container, dispose: unsubscribe };
}
