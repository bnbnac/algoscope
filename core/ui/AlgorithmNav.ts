export interface AlgorithmNavItem {
  label: string;
  href: string;
}

export function createAlgorithmNav(items: AlgorithmNavItem[], activeHref?: string): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'avz-algorithm-nav';

  for (const item of items) {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.className = 'avz-nav-link';
    if (item.href === activeHref) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('avz-nav-link--active');
    }
    nav.appendChild(link);
  }

  return nav;
}
