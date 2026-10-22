'use client';

import { useOptimistic, useTransition } from 'react';
import { setProjectFlag } from '@/app/(app)/career/projects/actions';
import { HabitCheckbox } from '@/components/ui/checkbox';

// « Mis en avant sur le CV »: instant, saved on the server (undo = uncheck).
export function FeaturedToggle({ projectId, featured }: { projectId: string; featured: boolean }) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(featured);
  return (
    <HabitCheckbox
      className="-ml-2"
      checked={checked}
      onChange={(event) => {
        const value = event.target.checked;
        startTransition(async () => {
          setChecked(value);
          await setProjectFlag(projectId, 'featuredOnCv', value);
        });
      }}
      label="Mis en avant sur le CV"
    />
  );
}
