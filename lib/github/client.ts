import { env } from '@/lib/env';

// Server-only access to the GitHub REST API with Alex's read-only token.
// Never falls back to unauthenticated calls (60 requests per hour is too low).

const API = 'https://api.github.com';

export type GithubErrorKind =
  'missing-token' | 'unauthorized' | 'rate-limit' | 'not-found' | 'network';

const MESSAGES: Record<GithubErrorKind, string> = {
  'missing-token': 'Aucun jeton GitHub configuré.',
  unauthorized: 'Le jeton GitHub est refusé : il a peut-être expiré ou perdu ses droits.',
  'rate-limit': 'Limite GitHub presque atteinte, réessaie dans une heure.',
  'not-found': 'Dépôt ou fichier introuvable sur GitHub.',
  network: 'GitHub ne répond pas. Réessaie dans un instant.',
};

export class GithubError extends Error {
  constructor(public kind: GithubErrorKind) {
    super(MESSAGES[kind]);
    this.name = 'GithubError';
  }
}

export function hasGithubToken(): boolean {
  return Boolean(env.GITHUB_TOKEN);
}

// Below this many remaining requests, the automatic sync is skipped.
export const RATE_LIMIT_FLOOR = 100;

export async function githubRequest(
  path: string,
  accept = 'application/vnd.github+json'
): Promise<{ response: Response; remaining: number | null }> {
  if (!env.GITHUB_TOKEN) throw new GithubError('missing-token');
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Hushyboard',
      },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    throw new GithubError('network');
  }
  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  const remaining = remainingHeader === null ? null : Number(remainingHeader);
  if (response.status === 401) throw new GithubError('unauthorized');
  if ((response.status === 403 || response.status === 429) && remaining === 0) {
    throw new GithubError('rate-limit');
  }
  if (response.status === 404) throw new GithubError('not-found');
  if (!response.ok) throw new GithubError('network');
  return { response, remaining };
}

export async function githubJson<T>(path: string): Promise<{ data: T; remaining: number | null }> {
  const { response, remaining } = await githubRequest(path);
  return { data: (await response.json()) as T, remaining };
}

// Repository as returned by the GitHub API (only the fields we use).
export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string | null;
  owner: { login: string };
};
