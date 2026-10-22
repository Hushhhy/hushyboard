import type { NextRequest } from 'next/server';
import { GithubError, githubRequest } from '@/lib/github/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

// GET /api/projects/<id>/raw?path=docs/demo.png: an image of a private repo (README, code view).
// The browser never sees the token; only images are served.
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/raw'>
) {
  const user = await requireUser();
  const { projectId } = await ctx.params;
  const path = request.nextUrl.searchParams.get('path') ?? '';
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  if (!path || path.split('/').some((part) => part === '..' || part === '') || !TYPES[extension]) {
    return new Response('Chemin refusé.', { status: 400 });
  }
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return new Response('Projet introuvable.', { status: 404 });

  try {
    const { response } = await githubRequest(
      `/repos/${project.fullName}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(project.defaultBranch)}`,
      'application/vnd.github.raw+json'
    );
    return new Response(response.body, {
      headers: {
        'Content-Type': TYPES[extension],
        'Cache-Control': 'private, max-age=3600',
        // An SVG from a repo must never run scripts in the page.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const status = error instanceof GithubError && error.kind === 'not-found' ? 404 : 502;
    return new Response('Image indisponible.', { status });
  }
}
