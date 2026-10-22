// GitHub returns the files of a repo as a flat list of paths; the « Code » tab shows a tree.

export type TreeNode = {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  size?: number;
  children: TreeNode[];
};

type FlatEntry = { path: string; type: 'tree' | 'blob'; size?: number };

// Folders first, then files, each alphabetically (case-insensitive), like GitHub.
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) =>
    a.type !== b.type
      ? a.type === 'tree'
        ? -1
        : 1
      : a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );
  for (const node of nodes) sortNodes(node.children);
  return nodes;
}

export function buildTree(entries: FlatEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folders = new Map<string, TreeNode>();

  // Parents before children, so every folder exists when its files arrive.
  const sorted = [...entries].sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  for (const entry of sorted) {
    const slash = entry.path.lastIndexOf('/');
    const parentPath = slash === -1 ? '' : entry.path.slice(0, slash);
    const node: TreeNode = {
      name: entry.path.slice(slash + 1),
      path: entry.path,
      type: entry.type,
      size: entry.size,
      children: [],
    };
    if (entry.type === 'tree') folders.set(entry.path, node);

    // A truncated tree may list a file without its folder: create the missing folders.
    let siblings = root;
    if (parentPath) {
      let parent = folders.get(parentPath);
      if (!parent) {
        const parts = parentPath.split('/');
        let current = '';
        let level = root;
        for (const part of parts) {
          current = current ? `${current}/${part}` : part;
          let folder = folders.get(current);
          if (!folder) {
            folder = { name: part, path: current, type: 'tree', children: [] };
            folders.set(current, folder);
            level.push(folder);
          }
          level = folder.children;
        }
        parent = folders.get(parentPath)!;
      }
      siblings = parent.children;
    }
    siblings.push(node);
  }
  return sortNodes(root);
}

export function countFiles(entries: FlatEntry[]): number {
  return entries.filter((entry) => entry.type === 'blob').length;
}

// The README file to open first in the « Code » tab when no file is chosen.
export function defaultFile(entries: FlatEntry[]): string | null {
  const readme = entries.find(
    (entry) => entry.type === 'blob' && /^readme(\.md|\.markdown|\.txt)?$/i.test(entry.path)
  );
  return readme?.path ?? null;
}
