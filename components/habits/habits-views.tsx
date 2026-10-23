import Link from 'next/link';
import { deleteGoal, deleteHabit, deletePause, setHabitArchived } from '@/app/(app)/habits/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { HabitsIcon, PlusIcon } from '@/components/icons';
import { ActionButton } from '@/components/skills/action-button';
import { buttonClasses } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { formatLongDate, formatShortDate, todayInParis } from '@/lib/dates';
import {
  completion,
  dayStatus,
  describeGoals,
  describeHistory,
  describeSchedule,
  describeToday,
  formatStreak,
  goalProgress,
  heatmap,
  isPaused,
  isScheduled,
  nextMilestone,
  rate,
  shiftDay,
  streak,
  streakDays,
  toDayKey,
  weekStart,
} from '@/lib/habits';
import { getGoalsData, getHabitsData } from '@/lib/habits-data';
import { requireUser } from '@/lib/session';
import { GoalForm, GoalProgressField, GoalStepCheckbox, HabitForm, PauseForm } from './habit-forms';
import { HabitRow, type WeekDay } from './habit-row';

function HabitsTabs() {
  return (
    <Tabs
      label="Sections des habitudes"
      items={[
        { href: '/habits', label: 'Aujourd’hui' },
        { href: '/habits/history', label: 'Historique' },
        { href: '/habits/goals', label: 'Objectifs' },
      ]}
    />
  );
}

const WEEKDAY_LABELS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
const shortDay = (key: string) =>
  formatShortDate(new Date(`${key}T12:00:00.000Z`)).replace(/ \d{4}$/, '');

// « Aujourd’hui »: habits scheduled today, milestones, pauses, the month's rate.
export async function TodayView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const { habits, pauses, archived } = await getHabitsData(user.id);
  const now = new Date();
  const today = toDayKey(todayInParis(now));
  const monday = weekStart(today);
  const monthStart = `${today.slice(0, 8)}01`;
  const panel = typeof params.panel === 'string' ? params.panel : undefined;

  const rows = habits.map((habit) => {
    const value = streak(habit.rule, habit.done, pauses, today);
    const pausedToday = isPaused(habit.id, today, pauses);
    const pause = pausedToday
      ? pauses.find(
          (item) =>
            (item.habitId === null || item.habitId === habit.id) &&
            toDayKey(item.startDate) <= today &&
            today <= toDayKey(item.endDate)
        )
      : undefined;
    return {
      habit,
      value,
      scheduled: isScheduled(habit.rule, today),
      done: habit.done.has(today),
      pausedUntil: pause ? shortDay(toDayKey(pause.endDate)) : null,
      week: Array.from({ length: 7 }, (_, index) => {
        const key = shiftDay(monday, index);
        return {
          key,
          label: WEEKDAY_LABELS[index],
          status: dayStatus(habit.rule, key, habit.done, pauses, today),
        };
      }) as WeekDay[],
    };
  });
  const todayRows = rows.filter((row) => row.scheduled || row.done);
  const otherRows = rows.filter((row) => !row.scheduled && !row.done);
  const active = todayRows.filter((row) => !row.pausedUntil);
  const doneCount = active.filter((row) => row.done).length;

  const month = habits.reduce(
    (sum, habit) => {
      const part = completion(habit.rule, habit.done, pauses, monthStart, today);
      return { done: sum.done + part.done, expected: sum.expected + part.expected };
    },
    { done: 0, expected: 0 }
  );
  const monthRate = rate(month);
  const milestones = rows
    .map((row) => ({
      row,
      days: streakDays(row.value),
      next: nextMilestone(streakDays(row.value)),
    }))
    .filter((item) => item.next && !item.row.pausedUntil)
    .sort((a, b) => a.next!.left - b.next!.left)
    .slice(0, 3);
  const upcomingPauses = pauses.filter((pause) => toDayKey(pause.endDate) >= today);
  const habitName = new Map(habits.map((habit) => [habit.id, habit.name]));
  const editing = panel?.startsWith('habit-')
    ? habits.find((habit) => habit.id === panel.slice(6))
    : undefined;
  const dateTitle = formatLongDate(now);

  const renderRow = (row: (typeof rows)[number]) => (
    <li key={row.habit.id} className="flex items-center gap-1">
      <div className="min-w-0 flex-1">
        <HabitRow
          habit={{ id: row.habit.id, name: row.habit.name, unit: row.habit.unit }}
          meta={describeSchedule(row.habit.rule)}
          week={row.week}
          streak={formatStreak(row.value.current, row.value.unit)}
          record={`record ${formatStreak(row.value.best, row.value.unit)}`}
          done={row.done}
          quantity={row.habit.quantities.get(today) ?? null}
          paused={row.pausedUntil}
        />
      </div>
      <Link
        href={`/habits?panel=habit-${row.habit.id}`}
        scroll={false}
        className={buttonClasses({ variant: 'quiet', small: true })}
        aria-label={`Modifier « ${row.habit.name} »`}
      >
        Modifier
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader
        breadcrumb="Habitudes & objectifs"
        title={describeToday(active.length - doneCount, active.length)}
      />
      <HabitsTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <ModuleCard
          title={dateTitle.charAt(0).toUpperCase() + dateTitle.slice(1)}
          icon={<HabitsIcon className="size-4" />}
          accentClass="text-habits"
          aside={
            active.length > 0 ? (
              <span className="tabular">{`${doneCount} / ${active.length} faites`}</span>
            ) : null
          }
          focal
        >
          {habits.length === 0 ? (
            <EmptyState
              title="Aucune habitude pour l’instant."
              description="Crée ta première habitude : un clic par jour suffit pour la suivre, et les jours de repos ne cassent pas la série."
              action={{
                label: 'Nouvelle habitude',
                href: '/habits?panel=habit-new',
                primary: true,
              }}
            />
          ) : (
            <>
              {active.length > 0 ? (
                <Ruler
                  value={doneCount}
                  max={active.length}
                  segments={active.length}
                  label="Habitudes faites aujourd’hui"
                  valueText={`${doneCount} habitudes faites sur ${active.length}`}
                  colorClass="bg-habits"
                  size="small"
                />
              ) : null}
              <ul className="flex flex-col">{todayRows.map(renderRow)}</ul>
              {otherRows.length > 0 ? (
                <>
                  <h3 className="mt-2 text-label-12 text-fg-3 uppercase">Repos aujourd’hui</h3>
                  <ul className="flex flex-col opacity-80">{otherRows.map(renderRow)}</ul>
                </>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle pt-3">
                <p className="flex-1 text-caption-12 text-fg-3">
                  Plein = fait · creux = manqué · point = repos · tiret = pause. Les pauses ne
                  cassent pas les séries.
                </p>
                <Link
                  href="/habits?panel=habit-new"
                  scroll={false}
                  className={buttonClasses({ variant: 'primary' })}
                >
                  <PlusIcon className="size-4" />
                  Nouvelle habitude
                </Link>
              </div>
            </>
          )}
        </ModuleCard>

        <div className="flex flex-col gap-3">
          <ModuleCard title="Jalons de série">
            {milestones.length === 0 ? (
              <p className="text-body-14 text-fg-2">Coche une habitude pour lancer une série.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {milestones.map(({ row, days, next }) => (
                  <li key={row.habit.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 font-semibold">{next!.target} jours</span>
                      <span className="text-caption-12 text-fg-3 tabular">
                        {Math.round(next!.progress * 100)} %
                      </span>
                    </div>
                    <Ruler
                      value={days}
                      max={next!.target}
                      segments={10}
                      label={`Série de « ${row.habit.name} » vers ${next!.target} jours`}
                      valueText={`${days} jours sur ${next!.target}`}
                      colorClass="bg-habits"
                      size="small"
                    />
                    <span className="text-caption-12 text-fg-2">
                      {row.habit.name} · dans {next!.left} jour{next!.left > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ModuleCard>
          <ModuleCard title="Pauses">
            {upcomingPauses.length === 0 ? (
              <p className="text-body-14 text-fg-2">Aucune pause prévue.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingPauses.map((pause) => (
                  <li key={pause.id} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {pause.reason ?? 'Pause'} · {shortDay(toDayKey(pause.startDate))} →{' '}
                        {shortDay(toDayKey(pause.endDate))}
                      </p>
                      <p className="text-caption-12 text-fg-2">
                        {pause.habitId
                          ? (habitName.get(pause.habitId) ?? 'Habitude archivée')
                          : 'Toutes les habitudes'}
                      </p>
                    </div>
                    <ActionButton variant="quiet" action={deletePause.bind(null, pause.id)}>
                      Retirer
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/habits?panel=pause-new"
              scroll={false}
              className={`${buttonClasses()} self-start`}
            >
              Planifier une pause
            </Link>
          </ModuleCard>
          <ModuleCard title="Ce mois-ci">
            <p className="text-kpi-30 tabular">{monthRate === null ? '—' : `${monthRate} %`}</p>
            <p className="text-caption-12 text-fg-2">des jours prévus faits (hors pauses)</p>
          </ModuleCard>
          {archived.length > 0 ? (
            <ModuleCard title="Habitudes archivées">
              <ul className="flex flex-col gap-1">
                {archived.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-body-14 text-fg-2">
                      {habit.name}
                    </span>
                    <ActionButton
                      variant="quiet"
                      action={setHabitArchived.bind(null, habit.id, false)}
                    >
                      Réactiver
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </ModuleCard>
          ) : null}
        </div>
      </div>

      <SidePanel name="habit-new" title="Nouvelle habitude">
        <HabitForm habit={null} closeHref="/habits" />
      </SidePanel>
      <SidePanel name="pause-new" title="Planifier une pause">
        <PauseForm
          habits={habits.map(({ id, name }) => ({ id, name }))}
          closeHref="/habits"
          today={today}
        />
      </SidePanel>
      {editing ? (
        <SidePanel name={`habit-${editing.id}`} title="Modifier l’habitude">
          <HabitForm habit={editing} closeHref="/habits" />
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
            <ActionButton variant="quiet" action={setHabitArchived.bind(null, editing.id, true)}>
              Archiver
            </ActionButton>
            <span className="flex-1" />
            <DeleteDialog
              title={`Supprimer « ${editing.name} » ?`}
              description="Toutes ses coches et ses séries sont supprimées. Pour la mettre de côté en gardant l’historique, archive-la plutôt."
              onConfirm={deleteHabit.bind(null, editing.id)}
            />
          </div>
        </SidePanel>
      ) : null}
    </>
  );
}

// Heat level → classes (one hue, lighter = more habits done).
const HEAT_CLASSES = [
  'bg-surface-sunken border border-line-subtle',
  'bg-habits-deep',
  'bg-habits/45',
  'bg-habits/70',
  'bg-habits',
];
const WEEKS = 12;

// « Historique »: 12-week heatmap and the same figures per habit, in a table.
export async function HistoryView() {
  const user = await requireUser();
  const { habits, pauses } = await getHabitsData(user.id);
  const today = toDayKey(todayInParis(new Date()));
  const from = shiftDay(weekStart(today), -7 * (WEEKS - 1));
  const cells = heatmap(
    habits.map((habit) => ({ rule: habit.rule, done: habit.done })),
    pauses,
    today,
    WEEKS
  );
  const perHabit = habits.map((habit) => ({
    habit,
    completion: completion(habit.rule, habit.done, pauses, from, today),
    value: streak(habit.rule, habit.done, pauses, today),
  }));
  const total = perHabit.reduce(
    (sum, item) => ({
      done: sum.done + item.completion.done,
      expected: sum.expected + item.completion.expected,
    }),
    { done: 0, expected: 0 }
  );
  const overall = rate(total);
  const weeks = Array.from({ length: WEEKS }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const weekNumber = (key: string) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    return Math.ceil(
      ((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7
    );
  };

  return (
    <>
      <PageHeader breadcrumb="Habitudes & objectifs" title={describeHistory(WEEKS, overall)} />
      <HabitsTabs />
      {habits.length === 0 ? (
        <EmptyState
          variant="block"
          title="Pas encore d’historique."
          description="Crée une habitude et coche-la : la régularité apparaît ici, semaine après semaine."
          action={{ label: 'Nouvelle habitude', href: '/habits?panel=habit-new' }}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <ModuleCard
            title="Régularité · toutes les habitudes"
            icon={<HabitsIcon className="size-4" />}
            accentClass="text-habits"
            aside="plus clair = plus d’habitudes faites"
          >
            <div className="flex gap-3">
              <div
                aria-hidden="true"
                className="flex flex-col justify-around text-caption-12 text-fg-3"
              >
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
                  <span key={index}>{label}</span>
                ))}
              </div>
              <div
                role="img"
                tabIndex={0}
                aria-label={`Grille de ${WEEKS} semaines : ${overall ?? 0} % des jours prévus faits. Le tableau « Par habitude » donne les chiffres.`}
                className="grid flex-1 grid-flow-col grid-rows-7 gap-1"
              >
                {weeks.flat().map((cell) => (
                  <span
                    key={cell.key}
                    title={`${shortDay(cell.key)} : ${cell.rest ? 'rien de prévu' : `${cell.done} / ${cell.expected}`}`}
                    className={`aspect-square min-h-2.5 rounded-tick ${
                      cell.key > today
                        ? 'opacity-0'
                        : cell.rest
                          ? 'bg-surface-sunken'
                          : HEAT_CLASSES[cell.level]
                    }`}
                  />
                ))}
              </div>
            </div>
            <div aria-hidden="true" className="flex items-center gap-1.5 text-caption-12 text-fg-3">
              <span>S{weekNumber(from)}</span>
              <span className="flex-1" />
              <span>Moins</span>
              {HEAT_CLASSES.map((classes, index) => (
                <span key={index} className={`size-3 rounded-tick ${classes}`} />
              ))}
              <span>Plus</span>
              <span className="ml-3">S{weekNumber(today)}</span>
            </div>
          </ModuleCard>

          <ModuleCard title="Par habitude">
            <table className="w-full text-body-14">
              <caption className="sr-only">
                Jours faits sur les jours prévus et record de série, sur {WEEKS} semaines
              </caption>
              <thead>
                <tr className="text-left text-caption-12 text-fg-3">
                  <th scope="col" className="pb-2 font-medium">
                    Habitude
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Faits
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Record
                  </th>
                </tr>
              </thead>
              <tbody>
                {perHabit.map(({ habit, completion: part, value }) => (
                  <tr key={habit.id} className="border-t border-line-subtle">
                    <th scope="row" className="py-2 text-left font-normal">
                      {habit.name}
                    </th>
                    <td className="py-2 text-right tabular">
                      {part.done} / {part.expected}
                    </td>
                    <td className="py-2 text-right tabular">
                      {formatStreak(value.best, value.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-caption-12 text-fg-3">
              Les jours de pause et de repos ne comptent ni pour ni contre.
            </p>
          </ModuleCard>
        </div>
      )}
    </>
  );
}

// « Objectifs »: progress from steps, a linked habit or a manual value.
export async function GoalsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const { goals, habits } = await getGoalsData(user.id);
  const panel = typeof params.panel === 'string' ? params.panel : undefined;
  const today = todayInParis(new Date());
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const cards = goals.map((goal) => ({ goal, progress: goalProgress(goal) }));
  const active = cards.filter((card) => !card.goal.achievedAt).length;
  const achievedThisMonth = cards.filter(
    (card) => card.goal.achievedAt && card.goal.achievedAt >= monthStart
  ).length;
  const editing = panel?.startsWith('goal-')
    ? goals.find((goal) => goal.id === panel.slice(5))
    : undefined;

  const hint = (card: (typeof cards)[number]) => {
    const { goal, progress } = card;
    if (goal.achievedAt) return `Atteint le ${formatShortDate(goal.achievedAt)}`;
    if (goal.steps.length > 0) {
      const next = goal.steps.find((step) => !step.doneAt);
      return next ? `Prochaine : ${next.title}` : '';
    }
    const left = Math.max(0, progress.target - progress.value);
    const daysLeft = goal.deadline
      ? Math.ceil((goal.deadline.getTime() - today.getTime()) / 86_400_000)
      : null;
    return [
      `${left} ${progress.unit} restant${left > 1 ? 's' : ''}`,
      daysLeft !== null
        ? daysLeft >= 0
          ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
          : 'échéance passée'
        : null,
    ]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <>
      <PageHeader
        breadcrumb="Habitudes & objectifs"
        title={describeGoals(active, achievedThisMonth)}
      />
      <HabitsTabs />
      <div className="flex justify-end">
        <Link
          href="/habits/goals?panel=goal-new"
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Nouvel objectif
        </Link>
      </div>
      {goals.length === 0 ? (
        <EmptyState
          variant="block"
          title="Un objectif découpé en étapes avance mieux."
          description="Donne-lui une échéance et relie-le à une habitude si possible : l’avancée se remplit toute seule."
          action={{ label: 'Nouvel objectif', href: '/habits/goals?panel=goal-new' }}
        />
      ) : (
        <ul className="grid items-start gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const { goal, progress } = card;
            const achieved = goal.achievedAt !== null;
            const kind = [
              goal.steps.length > 0
                ? 'Étapes'
                : goal.habit
                  ? `Lié à « ${goal.habit.name} »`
                  : 'Avancée manuelle',
              goal.deadline ? `échéance ${formatShortDate(goal.deadline)}` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={goal.id}>
                <section
                  aria-labelledby={`goal-${goal.id}`}
                  className="flex flex-col gap-2 rounded-card bg-surface-default p-4"
                >
                  <div className="flex items-center gap-2">
                    <h2 id={`goal-${goal.id}`} className="flex-1 text-title-18">
                      {goal.title}
                    </h2>
                    {achieved ? <Tag tone="success">Atteint</Tag> : null}
                    <Link
                      href={`/habits/goals?panel=goal-${goal.id}`}
                      scroll={false}
                      className={buttonClasses({ variant: 'quiet', small: true })}
                      aria-label={`Modifier « ${goal.title} »`}
                    >
                      Modifier
                    </Link>
                  </div>
                  <p className="text-caption-12 text-fg-3">{kind}</p>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-kpi-30 tabular">{progress.value}</span>
                    <span className="text-fg-2 tabular">
                      / {progress.target} {progress.unit}
                    </span>
                  </p>
                  <Ruler
                    value={Math.min(progress.value, progress.target)}
                    max={Math.max(1, progress.target)}
                    segments={10}
                    label={`Avancée de « ${goal.title} »`}
                    valueText={`${progress.value} sur ${progress.target} ${progress.unit}`}
                    colorClass={achieved ? 'bg-success' : 'bg-habits'}
                  />
                  <p className="text-caption-12 text-fg-2">{hint(card)}</p>
                  {goal.steps.length > 0 ? (
                    <ul className="flex flex-col">
                      {goal.steps.map((step) => (
                        <li key={step.id}>
                          <GoalStepCheckbox
                            stepId={step.id}
                            title={step.title}
                            done={step.doneAt !== null}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : !goal.habit ? (
                    <GoalProgressField
                      goalId={goal.id}
                      value={goal.manualProgress}
                      unit={progress.unit}
                    />
                  ) : null}
                </section>
              </li>
            );
          })}
        </ul>
      )}

      <SidePanel name="goal-new" title="Nouvel objectif">
        <GoalForm goal={null} habits={habits} closeHref="/habits/goals" />
      </SidePanel>
      {editing ? (
        <SidePanel name={`goal-${editing.id}`} title="Modifier l’objectif">
          <GoalForm goal={editing} habits={habits} closeHref="/habits/goals" />
          <div className="mt-auto border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer « ${editing.title} » ?`}
              description="L’objectif et ses étapes sont supprimés. Les habitudes liées ne changent pas."
              onConfirm={deleteGoal.bind(null, editing.id)}
            />
          </div>
        </SidePanel>
      ) : null}
    </>
  );
}

export function HabitsSkeleton() {
  return (
    <LoadingRegion label="Chargement des habitudes…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <Skeleton surface="card" className="h-120" />
        <Skeleton surface="card" className="h-80" />
      </div>
    </LoadingRegion>
  );
}
