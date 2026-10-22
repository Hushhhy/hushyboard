'use client';

import { useState, useTransition } from 'react';
import { setSkillCourses } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';

type CourseOption = { id: string; title: string; provider: string };

export function CourseLinkForm({
  skillId,
  courses,
  linkedIds,
}: {
  skillId: string;
  courses: CourseOption[];
  linkedIds: string[];
}) {
  const [selected, setSelected] = useState(() => new Set(linkedIds));
  const [isPending, startTransition] = useTransition();

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
          await setSkillCourses(skillId, [...selected]);
        });
      }}
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-body-14 text-fg-2">
          Coche les cours qui font progresser.
        </legend>
        {courses.map((course) => (
          <label
            key={course.id}
            className="flex items-center gap-2 rounded-control px-2 py-1.5 text-body-14 hover:bg-surface-raised"
          >
            <input
              type="checkbox"
              checked={selected.has(course.id)}
              onChange={() => toggle(course.id)}
              className="size-4 accent-career"
            />
            <span className="min-w-0 flex-1">
              {course.title}
              <span className="text-fg-3"> · {course.provider}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" onOverlay pending={isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
