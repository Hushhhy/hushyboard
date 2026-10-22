import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CareerIcon, CodeIcon, ResumeIcon } from '@/components/icons';
import { Tag } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/error-state';
import { GithubError } from '@/lib/github/client';
import { projectSlug } from '@/lib/github/helpers';
import { getReadme } from '@/lib/github/reads';
import { getProjectBySlug } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';
import { FeaturedToggle } from './featured-toggle';
import { LanguageBar } from './language-bar';

function SideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface-default p-4">
      <h2 className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export async function ReadmeTab({ slug }: { slug: Promise<string> }) {
  const [user, repoSlug] = await Promise.all([requireUser(), slug]);
  const project = await getProjectBySlug(user.id, repoSlug);
  if (!project) notFound();

  let readme: string | null = null;
  let error: string | null = null;
  try {
    readme = await getReadme(
      project.id,
      project.fullName,
      project.defaultBranch,
      project.isPrivate
    );
  } catch (caught) {
    error = caught instanceof GithubError ? caught.message : 'README illisible pour le moment.';
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="min-w-0 rounded-card bg-surface-default p-4 md:p-6">
        {error ? (
          <ErrorState title="README indisponible." description={error} />
        ) : readme ? (
          <div className="markdown readme" dangerouslySetInnerHTML={{ __html: readme }} />
        ) : (
          <p className="text-body-14 text-fg-2">Ce dépôt n’a pas de README.</p>
        )}
      </article>

      <div className="flex flex-col gap-3">
        <SideCard title="Langages" icon={<CodeIcon className="size-4" />}>
          <LanguageBar languages={project.languages} />
        </SideCard>
        <SideCard title="Compétences liées" icon={<CareerIcon className="size-4 text-career" />}>
          {project.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {project.skills.map((skill) => (
                <Link key={skill.id} href={`/career/profile/${skill.slug}`}>
                  <Tag>{skill.name}</Tag>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-body-14 text-fg-2">Aucune compétence liée.</p>
          )}
          <p className="text-caption-12 text-fg-3">
            Proposées depuis les langages et les topics.{' '}
            <Link
              href={`/career/projects/${projectSlug(project)}/details`}
              className="underline decoration-line-strong underline-offset-3 hover:decoration-current"
            >
              Modifiables dans « Fiche projet »
            </Link>
            .
          </p>
        </SideCard>
        <SideCard title="Sur le CV" icon={<ResumeIcon className="size-4" />}>
          <FeaturedToggle projectId={project.id} featured={project.featuredOnCv} />
          <p className="text-caption-12 text-fg-3">
            Utilisé par l’analyse et l’adaptation du CV pour chaque offre (nom, description,
            langages et ton rôle, jamais le code).
          </p>
        </SideCard>
      </div>
    </div>
  );
}
