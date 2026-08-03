import { describe, expect, it } from 'vitest';
import { createAlgorithmNav } from '../AlgorithmNav';

describe('createAlgorithmNav', () => {
  it('renders a link per item', () => {
    const nav = createAlgorithmNav([
      { label: 'KD-tree', href: './kdtree/' },
      { label: 'Octree', href: './octree/' },
    ]);
    const links = nav.querySelectorAll('a');

    expect(links).toHaveLength(2);
    expect(links[0]!.textContent).toBe('KD-tree');
    expect(links[0]!.getAttribute('href')).toBe('./kdtree/');
  });

  it('marks the active item', () => {
    const nav = createAlgorithmNav(
      [
        { label: 'KD-tree', href: './kdtree/' },
        { label: 'Octree', href: './octree/' },
      ],
      './octree/'
    );
    const links = nav.querySelectorAll('a');

    expect(links[0]!.getAttribute('aria-current')).toBeNull();
    expect(links[1]!.getAttribute('aria-current')).toBe('page');
    expect(links[1]!.classList.contains('avz-nav-link--active')).toBe(true);
  });
});
