import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app-shell/page-header';
import { ResumeEditor } from '@/components/resume/resume-editor';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { prisma } from '@/lib/prisma';
import { EMPTY_RESUME, parseResumeContent, type ResumeContent } from '@/lib/resume/schema';
import { requireUser } from '@/lib/session';

export default function EditResumePage({
  params,
  searchParams,
}: PageProps<'/career/resume/[resumeId]/edit'>) {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-240 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense
        fallback={
          <LoadingRegion label="Chargement du CV…" className="flex flex-col gap-3">
            <Skeleton surface="card" className="h-13 w-2/3" />
            <Skeleton surface="card" className="h-60" />
            <Skeleton surface="card" className="h-80" />
          </LoadingRegion>
        }
      >
        <Editor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Editor({
  params,
  searchParams,
}: Pick<PageProps<'/career/resume/[resumeId]/edit'>, 'params' | 'searchParams'>) {
  const [{ resumeId }, { imported }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } });
  if (!resume) notFound();
  // Older versions without content start from an empty CV.
  const content: ResumeContent = parseResumeContent(resume.content) ?? {
    ...EMPTY_RESUME,
    header: { ...EMPTY_RESUME.header, fullName: user.name },
  };

  return (
    <>
      <PageHeader breadcrumb="Carrière · CV · Modifier" title={resume.name} />
      <ResumeEditor
        resumeId={resume.id}
        initialName={resume.name}
        initialContent={content}
        imported={imported === '1'}
      />
    </>
  );
}
