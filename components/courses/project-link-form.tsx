'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { setCourseProjects } from '@/app/(app)/career/courses/actions';
import { Button } from '@/components/ui/button';

type ProjectOption = { id: string; name: string };

// Pick the GitHub repos done for a course. A filter helps when there are many repos.
export function ProjectLinkForm({
  courseId,
  projects,
  linkedIds,
}: {
  courseId: string;
  projects: ProjectOption[];
  linkedIds: string[];
}) {
  const [selected, setSelected] = useState(() => new Set(linkedIds));
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const shown = useMemo(
    () =>
      projects.filter((project) =>
        project.name.toLowerCase().includes(filter.trim().toLowerCase())
      ),
    [projects, filter]
  );

  if (projects.length === 0) {
    return (
      <p className="text-body-14 text-fg-2">
        Aucun projet pour l’instant.{' '}
        <Link href="/career/projects" className="underline">
          Synchronise tes dépôts GitHub
        </Link>{' '}
        puis reviens ici.
      </p>
    );
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await setCourseProjects(courseId, [...selected]);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`project-filter-${courseId}`} className="text-body-14 font-medium">
          Filtrer
        </label>
        <input
          id={`project-filter-${courseId}`}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="minishell, piscine…"
          className="h-9 rounded-control border border-line-strong bg-surface-sunken px-3 text-body-14"
        />
      </div>
      <fieldset className="flex flex-col gap-0.5">
        <legend className="mb-1 text-body-14 text-fg-2">
          {selected.size} projet{selected.size > 1 ? 's' : ''} lié{selected.size > 1 ? 's' : ''}
        </legend>
        {shown.map((project) => (
          <label
            key={project.id}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-body-14 hover:bg-surface-raised"
          >
            <input
              type="checkbox"
              checked={selected.has(project.id)}
              onChange={() => toggle(project.id)}
              className="size-4 accent-career"
            />
            {project.name}
          </label>
        ))}
        {shown.length === 0 ? (
          <p className="px-2 text-caption-12 text-fg-3">Aucun projet ne correspond.</p>
        ) : null}
      </fieldset>
      <div>
        <Button type="submit" onOverlay pending={isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
