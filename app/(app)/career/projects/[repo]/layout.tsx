import { Suspense } from 'react';
import { ProjectHeader, ProjectHeaderSkeleton } from '@/components/projects/project-header';

// Header and tabs shared by README, Code, Commits and Fiche projet.
export default function ProjectLayout({
  children,
  params,
}: LayoutProps<'/career/projects/[repo]'>) {
  const slug = params.then((value) => value.repo);
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ProjectHeaderSkeleton />}>
        <ProjectHeader slug={slug} />
      </Suspense>
      {children}
    </main>
  );
}
