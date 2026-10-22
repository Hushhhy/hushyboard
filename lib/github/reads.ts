import { cacheLife, cacheTag } from 'next/cache';
import { GithubError, githubJson, githubRequest } from './client';
import { isBinary, isImagePath, languageForPath } from './helpers';
import { highlightCode } from './highlight';
import { sanitizeReadme } from './readme';

// Live reads from GitHub, cached for about an hour per repository ("project:<fullName>").
// "Synchroniser" expires the tag. Nothing here is stored in the database.

export const projectTag = (fullName: string) => `project:${fullName}`;
export const rawRoute = (projectId: string, path: string) =>
  `/api/projects/${projectId}/raw?path=${encodeURIComponent(path)}`;

export async function getReadme(
  projectId: string,
  fullName: string,
  branch: string,
  isPrivate: boolean
): Promise<string | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(projectTag(fullName));
  const [owner, repo] = fullName.split('/');
  try {
    const { response } = await githubRequest(
      `/repos/${fullName}/readme`,
      'application/vnd.github.html+json'
    );
    return sanitizeReadme(await response.text(), {
      owner,
      repo,
      branch,
      isPrivate,
      rawRoute: (path) => rawRoute(projectId, path),
    });
  } catch (error) {
    // No README in the repo: the page says so instead of failing.
    if (error instanceof GithubError && error.kind === 'not-found') return null;
    throw error;
  }
}

export type TreeEntry = { path: string; type: 'blob' | 'tree'; size?: number };

export async function getTree(
  fullName: string,
  branch: string
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  'use cache';
  cacheLife('hours');
  cacheTag(projectTag(fullName));
  const { data } = await githubJson<{ tree: TreeEntry[]; truncated: boolean }>(
    `/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  return {
    entries: data.tree.filter((entry) => entry.type === 'blob' || entry.type === 'tree'),
    truncated: data.truncated,
  };
}

const MAX_FILE_BYTES = 1_000_000;

export type FileView =
  | { kind: 'code'; html: string; text: string; lines: number; language: string }
  | { kind: 'image'; src: string }
  | { kind: 'too-large' }
  | { kind: 'binary' };

export async function getFile(
  projectId: string,
  fullName: string,
  branch: string,
  isPrivate: boolean,
  path: string,
  size: number | undefined
): Promise<FileView> {
  'use cache';
  cacheLife('hours');
  cacheTag(projectTag(fullName));
  if (isImagePath(path)) {
    return {
      kind: 'image',
      src: isPrivate
        ? rawRoute(projectId, path)
        : `https://raw.githubusercontent.com/${fullName}/${branch}/${path}`,
    };
  }
  if (size !== undefined && size > MAX_FILE_BYTES) return { kind: 'too-large' };
  const { response } = await githubRequest(
    `/repos/${fullName}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,
    'application/vnd.github.raw+json'
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_FILE_BYTES) return { kind: 'too-large' };
  if (isBinary(bytes)) return { kind: 'binary' };
  const text = new TextDecoder().decode(bytes);
  const language = languageForPath(path);
  return {
    kind: 'code',
    html: await highlightCode(text, language),
    text,
    lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
    language,
  };
}

export type CommitItem = {
  sha: string;
  message: string;
  date: string | null;
  author: string;
  url: string;
};

export async function getCommits(fullName: string, branch: string): Promise<CommitItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(projectTag(fullName));
  const { data } = await githubJson<
    {
      sha: string;
      html_url: string;
      commit: { message: string; author: { name: string; date: string } | null };
      author: { login: string } | null;
    }[]
  >(`/repos/${fullName}/commits?per_page=30&sha=${encodeURIComponent(branch)}`);
  return data.map((item) => ({
    sha: item.sha,
    message: item.commit.message.split('\n')[0],
    date: item.commit.author?.date ?? null,
    author: item.author?.login ?? item.commit.author?.name ?? 'inconnu',
    url: item.html_url,
  }));
}
