'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { setCheckIn } from '@/app/(app)/habits/actions';
import { useRewards } from '@/components/rewards/rewards-provider';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { Ruler } from '@/components/ui/ruler';
import { UndoStatus } from '@/components/ui/undo-status';

type HomeHabit = { id: string; name: string; isDone: boolean };

// Today's habits on the dashboard: optimistic check with undo, same action as /habits.
export function HomeHabitList({ habits }: { habits: HomeHabit[] }) {
  const { announce } = useRewards();
  const [optimistic, setOptimistic] = useOptimistic(
    habits,
    (current, change: { id: string; isDone: boolean }) =>
      current.map((habit) => (habit.id === change.id ? { ...habit, isDone: change.isDone } : habit))
  );
  const [last, setLast] = useState<{ id: string; name: string; done: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const done = optimistic.filter((habit) => habit.isDone).length;

  function toggle(habit: HomeHabit, next: boolean) {
    setLast({ id: habit.id, name: habit.name, done: next });
    startTransition(async () => {
      setOptimistic({ id: habit.id, isDone: next });
      const result = await setCheckIn(habit.id, next);
      if (result.rewards.length > 0) announce(result.rewards);
    });
  }

  return (
    <>
      <Ruler
        value={done}
        max={optimistic.length}
        segments={optimistic.length}
        label="Habitudes faites aujourd'hui"
        valueText={`${done} habitudes faites sur ${optimistic.length}`}
        colorClass="bg-habits"
        size="small"
      />
      <ul className="flex flex-col">
        {optimistic.map((habit) => (
          <li key={habit.id}>
            <HabitCheckbox
              label={<span className={habit.isDone ? 'text-fg-2' : ''}>{habit.name}</span>}
              checked={habit.isDone}
              onChange={(event) => toggle(habit, event.target.checked)}
            />
          </li>
        ))}
      </ul>
      <UndoStatus
        message={last ? `« ${last.name} » ${last.done ? 'cochée' : 'décochée'}.` : null}
        onUndo={() => {
          if (!last) return;
          const undo = { id: last.id, done: !last.done };
          setLast(null);
          startTransition(async () => {
            setOptimistic({ id: undo.id, isDone: undo.done });
            await setCheckIn(undo.id, undo.done);
          });
        }}
      />
    </>
  );
}
