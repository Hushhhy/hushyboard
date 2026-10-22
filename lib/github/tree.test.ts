import { describe, expect, it } from 'vitest';
import { buildTree, countFiles, defaultFile, type TreeNode } from './tree';

const names = (nodes: TreeNode[]) => nodes.map((node) => node.name);

describe('buildTree', () => {
  const entries = [
    { path: 'README.md', type: 'blob' as const, size: 120 },
    { path: 'backend', type: 'tree' as const },
    { path: 'backend/src', type: 'tree' as const },
    { path: 'backend/src/server.ts', type: 'blob' as const, size: 900 },
    { path: 'backend/src/game', type: 'tree' as const },
    { path: 'backend/src/game/table.ts', type: 'blob' as const },
    { path: 'Makefile', type: 'blob' as const },
    { path: 'docker-compose.yml', type: 'blob' as const },
  ];

  it('nests files in their folders, folders first then files alphabetically', () => {
    const tree = buildTree(entries);
    expect(names(tree)).toEqual(['backend', 'docker-compose.yml', 'Makefile', 'README.md']);
    const src = tree[0].children[0];
    expect(src.path).toBe('backend/src');
    expect(names(src.children)).toEqual(['game', 'server.ts']);
    expect(src.children[0].children[0].path).toBe('backend/src/game/table.ts');
  });

  it('creates missing folders of a truncated tree', () => {
    const tree = buildTree([{ path: 'a/b/c.txt', type: 'blob' }]);
    expect(tree[0]).toMatchObject({ name: 'a', type: 'tree' });
    expect(tree[0].children[0]).toMatchObject({ name: 'b', path: 'a/b' });
    expect(tree[0].children[0].children[0].path).toBe('a/b/c.txt');
  });

  it('counts files and finds the README', () => {
    expect(countFiles(entries)).toBe(5);
    expect(defaultFile(entries)).toBe('README.md');
    expect(defaultFile([{ path: 'src/main.c', type: 'blob' }])).toBeNull();
  });
});
