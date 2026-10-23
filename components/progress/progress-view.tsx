import Link from 'next/link';
import type { XpReason } from '@/generated/prisma/client';
import { PageHeader } from '@/components/app-shell/page-header';
import { AnalyticsIcon, CareerIcon } from '@/components/icons';
import { BarChart } from '@/components/ui/bar-row';
import { EmptyState } from '@/components/ui/empty-state';
import { LevelMedal } from '@/components/ui/level-medal';
import { ModuleCard } from '@/components/ui/module-card';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatShortDate, toDateInputValue } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  DAILY_APPLICATION_XP_CAP,
  getLevelInfo,
  LEVEL_TITLES,
  weeklyXp,
  xpForLevel,
} from '@/lib/xp';

const REASON_LABELS: Record<XpReason, string> = {
  APPLICATION_SENT: 'Candidatures',
  HR_INTERVIEW: 'Entretiens RH',
  TECH_INTERVIEW: 'Entretiens techniques',
  COURSE_COMPLETED: 'Cours terminés',
  CERTIFICATION_OBTAINED: 'Certifications',
  OFFER_RECEIVED: 'Offres reçues',
  QUIZ_PASSED: 'Quiz réussis',
  SOLO_PROJECT_COMPLETED: 'Projets solo',
};

const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
});
const xpText = (xp: number) => `${xp.toLocaleString('fr-FR')} XP`;
const tier = (amount: number) =>
  amount <= 15 ? 'Palier petit' : amount <= 60 ? 'Palier moyen' : 'Palier majeur';

// « Progression »: Career levels (the road of the Argonauts), XP per week, the journal of
// gains, XP by source and the history of skill levels.
export async function ProgressView() {
  const user = await requireUser();
  const [events, skills] = await Promise.all([
    prisma.xpEvent.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, amount: true, label: true, reason: true, occurredAt: true },
    }),
    prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        assessments: { orderBy: { assessedAt: 'asc' }, select: { level: true, assessedAt: true } },
      },
    }),
  ]);
  const total = events.reduce((sum, event) => sum + event.amount, 0);
  const info = getLevelInfo(total);
  const left = info.xpForLevel - info.xpIntoLevel;
  const nextTitle = LEVEL_TITLES[info.level] ?? null;
  const today = toDateInputValue(new Date());
  const weeks = weeklyXp(events, today, 8, toDateInputValue);
  const thisWeek = weeks[weeks.length - 1].xp;
  const maxWeek = Math.max(1, ...weeks.map((week) => week.xp));
  const byReason = new Map<XpReason, number>();
  for (const event of events) {
    byReason.set(event.reason, (byReason.get(event.reason) ?? 0) + event.amount);
  }
  const skillSteps = skills
    .map((skill) => {
      const steps = skill.assessments.filter(
        (item, index, list) => index === 0 || item.level !== list[index - 1].level
      );
      return { ...skill, steps };
    })
    .filter((skill) => skill.steps.length > 0);
  const title = nextTitle
    ? `${info.title}, niveau ${info.level} : encore ${xpText(left)}.`
    : `${info.title}, niveau ${info.level} : le sommet de la route.`;

  return (
    <>
      <PageHeader breadcrumb="Carrière · Progression" title={title} />

      <ModuleCard
        title="Route des Argonautes"
        icon={<CareerIcon className="size-4" />}
        accentClass="text-career"
        aside="titres de niveau Carrière"
      >
        <ol className="grid grid-cols-4 gap-y-4 sm:grid-cols-8">
          {LEVEL_TITLES.map((levelTitle, index) => {
            const level = index + 1;
            const reached = level <= info.level;
            const current = level === info.level;
            return (
              <li
                key={levelTitle}
                aria-current={current ? 'step' : undefined}
                className="flex flex-col items-center gap-1 text-center"
              >
                <LevelMedal
                  level={level}
                  size="small"
                  upcoming={!reached}
                  className={current ? '' : reached ? 'opacity-80' : ''}
                />
                <span className={`font-semibold ${reached ? '' : 'text-fg-2'}`}>{levelTitle}</span>
                <span
                  className={`text-caption-12 tabular ${current ? 'text-career' : 'text-fg-3'}`}
                >
                  {current && nextTitle
                    ? `${info.xpIntoLevel} / ${xpText(info.xpForLevel)}`
                    : xpText(xpForLevel(level))}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="text-caption-12 text-fg-2">
          {nextTitle
            ? `Niveau ${info.level} · ${info.title}. Encore ${xpText(left)} pour devenir ${nextTitle}. Total : ${xpText(total)}.`
            : `Niveau ${info.level} · ${info.title}. Total : ${xpText(total)}.`}
        </p>
      </ModuleCard>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex flex-col gap-4">
          <ModuleCard
            title="XP gagnés par semaine"
            icon={<AnalyticsIcon className="size-4" />}
            accentClass="text-career"
            aside={`plafond : ${DAILY_APPLICATION_XP_CAP} XP / jour sur les candidatures`}
          >
            <figure className="flex flex-col gap-2">
              <figcaption className="sr-only">XP gagnés sur les 8 dernières semaines</figcaption>
              <div aria-hidden="true" className="grid h-48 grid-cols-8 items-end gap-3">
                {weeks.map((week, index) => (
                  <div key={week.start} className="flex h-full flex-col justify-end gap-1">
                    <span className="text-center text-caption-12 text-fg-2 tabular">{week.xp}</span>
                    <span
                      className={`block rounded-t-tick ${
                        index === weeks.length - 1 ? 'bg-career' : 'bg-fg-3'
                      }`}
                      style={{ height: `${(week.xp / maxWeek) * 80}%`, minHeight: 2 }}
                    />
                    <span className="text-center text-caption-12 text-fg-3">S{week.week}</span>
                  </div>
                ))}
              </div>
              <table className="sr-only">
                <thead>
                  <tr>
                    <th scope="col">Semaine</th>
                    <th scope="col">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week) => (
                    <tr key={week.start}>
                      <th scope="row">
                        Semaine {week.week}, du{' '}
                        {formatShortDate(new Date(`${week.start}T12:00:00Z`))}
                      </th>
                      <td>{week.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
            <p className="text-caption-12 text-fg-3">
              Pas d’XP pour les habitudes, les loisirs ni les finances : seulement pour ce qui fait
              avancer la carrière.
            </p>
          </ModuleCard>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <ModuleCard title="XP par source">
              {byReason.size === 0 ? (
                <p className="text-body-14 text-fg-2">Aucun XP gagné pour l’instant.</p>
              ) : (
                <BarChart
                  caption="XP gagnés par source"
                  valueHeader="XP"
                  rows={[...byReason].map(([reason, xp]) => ({
                    key: reason,
                    label: REASON_LABELS[reason],
                    value: xp,
                    colorClass: 'bg-career',
                    display: xpText(xp),
                  }))}
                />
              )}
            </ModuleCard>
            <ModuleCard title="Niveaux de compétence">
              {skillSteps.length === 0 ? (
                <p className="text-body-14 text-fg-2">
                  Les évaluations de tes compétences apparaîtront ici.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {skillSteps.map((skill) => {
                    const last = skill.steps[skill.steps.length - 1];
                    return (
                      <li key={skill.id} className="flex items-baseline gap-2 text-body-14">
                        <span className="min-w-0 flex-1 truncate">{skill.name}</span>
                        <span className="text-caption-12 text-fg-2 tabular">
                          {skill.steps.map((step) => step.level).join(' → ')}
                        </span>
                        <span className="w-14 text-right text-caption-12 text-fg-3">
                          {formatShortDate(last.assessedAt).replace(/ \d{4}$/, '')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ModuleCard>
          </div>
        </div>

        <ModuleCard title="Journal des gains" aside={`cette semaine : ${xpText(thisWeek)}`}>
          {events.length === 0 ? (
            <EmptyState
              title="Aucun gain pour l’instant."
              description="Une candidature avec un CV joint rapporte 15 XP, un entretien 40 à 60 XP, un cours terminé 60 XP."
              action={{ label: 'Voir mes candidatures', href: '/career/job-search' }}
            />
          ) : (
            <ol className="flex flex-col">
              {events.slice(0, 12).map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 border-t border-line-subtle py-2.5 first:border-t-0"
                >
                  <span className="w-12 font-semibold text-career tabular">+{event.amount}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{event.label}</p>
                    <p className="text-caption-12 text-fg-3">{tier(event.amount)}</p>
                  </div>
                  <span className="text-caption-12 whitespace-nowrap text-fg-2">
                    {dayFormatter.format(event.occurredAt)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {events.length > 12 ? (
            <p className="text-caption-12 text-fg-3">
              12 gains les plus récents sur {events.length}.{' '}
              <Link href="/trophies" className="underline hover:text-fg-1">
                Voir l’historique des récompenses
              </Link>
            </p>
          ) : null}
        </ModuleCard>
      </div>
    </>
  );
}

export function ProgressSkeleton() {
  return (
    <LoadingRegion label="Chargement de la progression…" className="flex flex-col gap-4">
      <div className="flex min-h-13 flex-col justify-center gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>
      <Skeleton surface="card" className="h-40" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <Skeleton surface="card" className="h-80" />
        <Skeleton surface="card" className="h-80" />
      </div>
    </LoadingRegion>
  );
}
