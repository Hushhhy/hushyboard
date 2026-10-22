import { notFound } from 'next/navigation';
import { removeProject } from '@/app/(app)/career/projects/actions';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { prisma } from '@/lib/prisma';
import { getProjectBySlug } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';
import { DetailsForm } from './details-form';

// « Fiche projet »: what only Hushyboard knows about the project.
export async function DetailsTab({ slug }: { slug: Promise<string> }) {
  const [user, repoSlug] = await Promise.all([requireUser(), slug]);
  const project = await getProjectBySlug(user.id, repoSlug);
  if (!project) notFound();
  const [skills, courses] = await Promise.all([
    prisma.skill.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { position: 'asc' },
    }),
    prisma.course.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: [{ status: 'desc' }, { title: 'asc' }],
    }),
  ]);

  return (
    <section
      aria-label="Fiche projet"
      className="flex max-w-180 flex-col gap-4 rounded-card bg-surface-default p-4 md:p-6"
    >
      <DetailsForm project={project} skills={skills} courses={courses} />
      {project.isExternal || project.deletedOnGithubAt ? (
        <div className="border-t border-line-subtle pt-3">
          <DeleteDialog
            title={`Retirer « ${project.name} » de Hushyboard ?`}
            description="Le projet disparaît de Hushyboard, avec sa fiche. Rien n’est modifié sur GitHub."
            triggerLabel="Retirer de Hushyboard"
            onConfirm={removeProject.bind(null, project.id)}
          />
        </div>
      ) : null}
    </section>
  );
}
