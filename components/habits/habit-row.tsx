'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import { setCheckIn, setQuantity } from '@/app/(app)/habits/actions';
import { useRewards } from '@/components/rewards/rewards-provider';
import { HabitCheckbox, PausedHabit } from '@/components/ui/checkbox';
import { UndoStatus } from '@/components/ui/undo-status';
import type { DayStatus } from '@/lib/habits';

export type WeekDay = { key: string; label: string; status: DayStatus };

const STATUS_TEXT: Record<DayStatus, string> = {
  done: 'fait',
  missed: 'manqué',
  rest: 'repos',
  paused: 'en pause',
  todo: 'à faire',
  free: 'libre',
  future: 'à venir',
};

// One cell of the week strip: the shape carries the meaning, not only the colour.
function DayMark({ status }: { status: DayStatus }) {
  if (status === 'done') return <span className="size-3 rounded-tick bg-habits" />;
  if (status === 'rest') return <span className="size-1 rounded-full bg-fg-3" />;
  if (status === 'paused') return <span className="h-0.5 w-2.5 rounded-full bg-fg-3" />;
  if (status === 'todo')
    return <span className="size-3 rounded-tick border-[1.5px] border-habits" />;
  if (status === 'missed')
    return <span className="size-3 rounded-tick border-[1.5px] border-line-strong" />;
  return <span className="size-3 rounded-tick border border-line-subtle" />;
}

export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <ol aria-label="Cette semaine" className="hidden items-end gap-1.5 sm:flex">
      {days.map((day) => (
        <li key={day.key} className="flex w-4 flex-col items-center gap-1">
          <span aria-hidden="true" className="grid h-3 place-items-center">
            <DayMark status={day.status} />
          </span>
          <span aria-hidden="true" className="text-caption-12 leading-none text-fg-3">
            {day.label.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only">
            {day.label} : {STATUS_TEXT[day.status]}
          </span>
        </li>
      ))}
    </ol>
  );
}

// A habit of the day: optimistic check (with undo), optional quantity, week, streak.
export function HabitRow({
  habit,
  meta,
  week,
  streak,
  record,
  done,
  quantity,
  paused,
}: {
  habit: { id: string; name: string; unit: string | null };
  // « Tous les jours », « Lun–ven · en pause jusqu’au 19 oct. »
  meta: string;
  week: WeekDay[];
  streak: string;
  record: string;
  done: boolean;
  quantity: number | null;
  // Paused today: nothing to check, the streak is frozen.
  paused: string | null;
}) {
  const { announce } = useRewards();
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [last, setLast] = useState<boolean | null>(null);
  const [quantityStatus, setQuantityStatus] = useState('');
  const [, startTransition] = useTransition();
  const quantityId = useId();

  function toggle(next: boolean) {
    setLast(next);
    startTransition(async () => {
      setOptimisticDone(next);
      const result = await setCheckIn(habit.id, next);
      if (result.rewards.length > 0) announce(result.rewards);
    });
  }

  const todayIndex = week.findIndex((day) => day.status === 'todo' || day.status === 'done');
  const shownWeek = week.map((day, index) =>
    index === todayIndex && !paused ? { ...day, status: optimisticDone ? 'done' : 'todo' } : day
  ) as WeekDay[];

  const aside = (
    <>
      <WeekStrip days={shownWeek} />
      <div className="w-24 text-right">
        <p className={`font-semibold tabular ${paused ? 'text-fg-3' : ''}`}>{streak}</p>
        <p className="text-caption-12 text-fg-3">{paused ? 'série gelée' : record}</p>
      </div>
    </>
  );

  if (paused) {
    return (
      <PausedHabit
        label={<HabitLabel name={habit.name} meta={meta} />}
        until={paused}
        aside={aside}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <HabitCheckbox
        label={<HabitLabel name={habit.name} meta={meta} muted={optimisticDone} />}
        checked={optimisticDone}
        onChange={(event) => toggle(event.target.checked)}
        aside={aside}
      />
      {optimisticDone && habit.unit ? (
        <div className="flex items-center gap-2 pb-1 pl-11">
          <label htmlFor={quantityId} className="text-caption-12 text-fg-2">
            Quantité
          </label>
          <input
            id={quantityId}
            inputMode="decimal"
            defaultValue={quantity ?? ''}
            onBlur={(event) => {
              const value = event.currentTarget.value;
              startTransition(async () => {
                const result = await setQuantity(habit.id, value);
                setQuantityStatus(result.error ?? 'Quantité enregistrée.');
              });
            }}
            className="h-7 w-20 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14 tabular"
          />
          <span className="text-caption-12 text-fg-2">{habit.unit}</span>
          <span role="status" className="text-caption-12 text-fg-3">
            {quantityStatus}
          </span>
        </div>
      ) : null}
      <UndoStatus
        className="pl-11"
        message={last === null ? null : `« ${habit.name} » ${last ? 'cochée' : 'décochée'}.`}
        onUndo={() => {
          if (last === null) return;
          const undo = !last;
          setLast(null);
          startTransition(async () => {
            setOptimisticDone(undo);
            await setCheckIn(habit.id, undo);
          });
        }}
      />
    </div>
  );
}

function HabitLabel({
  name,
  meta,
  muted = false,
}: {
  name: string;
  meta: string;
  muted?: boolean;
}) {
  return (
    <span className="flex flex-col">
      <span className={muted ? 'text-fg-2' : ''}>{name}</span>
      <span className="text-caption-12 font-normal text-fg-3">{meta}</span>
    </span>
  );
}
