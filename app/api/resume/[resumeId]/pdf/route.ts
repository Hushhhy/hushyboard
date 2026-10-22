import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderResumePdf, resumeFileName } from '@/lib/resume/pdf';
import { parseResumeContent } from '@/lib/resume/schema';
import { requireUser } from '@/lib/session';

// GET /api/resume/<id>/pdf: the CV rendered to PDF, as a download.
// ?inline=1 shows it in the page preview instead of downloading it.
export async function GET(request: NextRequest, ctx: RouteContext<'/api/resume/[resumeId]/pdf'>) {
  const user = await requireUser();
  const { resumeId } = await ctx.params;
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } });
  const content = resume ? parseResumeContent(resume.content) : null;
  if (!resume || !content) {
    return new Response('CV introuvable ou sans contenu.', { status: 404 });
  }

  const pdf = await renderResumePdf(content, resume.name);
  const fileName = resumeFileName(content.header.fullName);
  const disposition = request.nextUrl.searchParams.get('inline') === '1' ? 'inline' : 'attachment';
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
