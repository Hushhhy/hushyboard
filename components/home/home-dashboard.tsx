import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { getHomeData, type HomeData } from '@/lib/home-data';
import { formatLongDate, formatMonth } from '@/lib/dates';
import { getLevelInfo, LEVEL_TITLES } from '@/lib/xp';
import { formatEuros, formatSignedEuros } from '@/lib/finance';
import { ModuleCard } from '@/components/ui/module-card';
import { Ruler } from '@/components/ui/ruler';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart } from '@/components/ui/bar-row';
import { buttonClasses } from '@/components/ui/button';
import { LevelMedal } from '@/components/ui/level-medal';
import { Skeleton, LoadingRegion } from '@/components/ui/skeleton';
import {
  CareerIcon,
  CheckIcon,
  FinanceIcon,
  HabitsIcon,
  LeisureIcon,
  ResumeIcon,
  SearchIcon,
  TrophyIcon,
} from '@/components/icons';

// Server component: reads the session and the database, then renders the whole dashboard.
export async function HomeDashboard() {
  const user = await requireUser();
  const now = new Date();
  const data = await getHomeData(user.id, now);

  const habitsLeft = data.todayHabits.filter((habit) => !habit.isDone).length;

  return (
    <>
      <header className="flex h-13 items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-label-12 text-fg-3 uppercase">{formatLongDate(now)}</p>
          <h1 className="truncate font-display text-display-24">
            {buildSummary(habitsLeft, data.pendingOfferCount)}
          </h1>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-12 grid-rows-[1.4fr_1fr_1fr] gap-3">
        <CareerModule data={data} />
        <HabitsModule data={data} />
        <ApplicationsModule data={data} />
        <OfferModule data={data} />
        <FinanceModule data={data} monthLabel={formatMonth(now)} />
        <LeisureModule data={data} />
        <TrophiesModule data={data} />
      </div>
    </>
  );
}

// "Il reste 2 habitudes et 1 offre à trier."
function buildSummary(habitsLeft: number, offersLeft: number): string {
  const parts: string[] = [];
  if (habitsLeft > 0) parts.push(`${habitsLeft} habitude${habitsLeft > 1 ? 's' : ''}`);
  if (offersLeft > 0) parts.push(`${offersLeft} offre${offersLeft > 1 ? 's' : ''} à trier`);
  if (parts.length === 0) return 'Tout est à jour.';
  return `Il reste ${parts.join(' et ')}.`;
}

function CareerModule({ data }: { data: HomeData }) {
  const level = getLevelInfo(data.totalXp);
  const nextTitle = LEVEL_TITLES[level.level] ?? level.title;
  const course = data.currentCourse;

  return (
    <ModuleCard
      title="Carrière · scolaire et pro"
      icon={<CareerIcon className="size-4" />}
      accentClass="text-career"
      aside={<span className="text-fg-3 tabular">+{data.monthXp} XP ce mois</span>}
      focal
      className="col-span-7"
    >
      <div className="flex items-center gap-5">
        <LevelMedal level={level.level} />
        <div className="min-w-0">
          <p className="text-label-12 text-fg-3 uppercase">Niveau {level.level}</p>
          <p className="font-display text-display-40">{level.title}</p>
          <p className="text-body-14 text-fg-2">
            Encore{' '}
            <b className="font-semibold text-fg-1 tabular">
              {level.xpForLevel - level.xpIntoLevel}
            </b>{' '}
            XP pour devenir {nextTitle}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-baseline justify-between text-body-14 text-fg-2">
          Expérience du niveau
          <span className="tabular">
            <b className="text-title-18 text-fg-1">{level.xpIntoLevel}</b> / {level.xpForLevel} XP
          </span>
        </p>
        <Ruler
          value={level.xpIntoLevel}
          max={level.xpForLevel}
          label="Expérience du niveau"
          valueText={`${level.xpIntoLevel} XP sur ${level.xpForLevel}, niveau ${level.level}, ${level.title}`}
          colorClass="bg-career"
        />
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-line-subtle pt-3">
        {course ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-label-12 text-fg-3 uppercase">Prochaine étape</p>
              <p className="truncate font-semibold">
                {course.position ? `Cours ${course.position}` : course.title}
                {course.certification ? ` · ${course.certification.name}` : ''}
              </p>
            </div>
            <Link href="/career/courses" className={buttonClasses({ variant: 'primary' })}>
              Reprendre le cours
            </Link>
          </>
        ) : (
          <p className="text-body-14 text-fg-2">
            Aucun cours en cours.{' '}
            <Link href="/career/courses" className="font-semibold text-fg-1 hover:underline">
              Ajoute ton prochain cours
            </Link>{' '}
            pour voir ici ta prochaine étape.
          </p>
        )}
      </div>
    </ModuleCard>
  );
}

function HabitsModule({ data }: { data: HomeData }) {
  const habits = data.todayHabits;
  const done = habits.filter((habit) => habit.isDone).length;

  return (
    <ModuleCard
      title="Habitudes du jour"
      icon={<HabitsIcon className="size-4" />}
      accentClass="text-habits"
      aside={
        habits.length > 0 ? (
          <span className="tabular">{`${done} / ${habits.length} faites`}</span>
        ) : null
      }
      className="col-span-5"
    >
      {habits.length === 0 ? (
        <EmptyState
          title="Aucune habitude prévue aujourd'hui."
          description="Crée ta première habitude : un clic par jour suffit pour la suivre."
          action={{ label: 'Créer une habitude', href: '/habits' }}
        />
      ) : (
        <>
          <Ruler
            value={done}
            max={habits.length}
            segments={habits.length}
            label="Habitudes faites aujourd'hui"
            valueText={`${done} habitudes faites sur ${habits.length}`}
            colorClass="bg-habits"
            size="small"
          />
          <ul className="flex flex-col">
            {habits.map((habit) => (
              <li key={habit.id} className="flex items-center gap-2.5 py-1.5">
                <span
                  role="img"
                  aria-label={habit.isDone ? 'Faite' : 'À faire'}
                  className={`grid size-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] ${
                    habit.isDone
                      ? 'border-habits bg-habits text-surface-sunken'
                      : 'border-line-strong'
                  }`}
                >
                  {habit.isDone ? <CheckIcon className="size-3.5" strokeWidth={2.4} /> : null}
                </span>
                <span className={`flex-1 font-medium ${habit.isDone ? 'text-fg-2' : ''}`}>
                  {habit.name}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ModuleCard>
  );
}

function ApplicationsModule({ data }: { data: HomeData }) {
  const { applications } = data;
  return (
    <ModuleCard
      title="Candidatures"
      icon={<SearchIcon className="size-4" />}
      accentClass="text-career"
      className="col-span-4"
    >
      {applications.total === 0 ? (
        <EmptyState
          title="Aucune candidature suivie."
          description="Ajoute ta première candidature pour voir tes réponses ici."
          action={{ label: 'Ajouter une candidature', href: '/career/job-search' }}
        />
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="text-kpi-30 tabular">{applications.total}</span>
            <span className="text-body-14 text-fg-2">envoyées</span>
          </p>
          <BarChart
            caption={`Réponses à tes ${applications.total} candidatures`}
            valueHeader="Candidatures"
            rows={[
              {
                key: 'no-response',
                label: 'Sans réponse',
                value: applications.noResponse,
                colorClass: 'bg-fg-3',
              },
              {
                key: 'rejected',
                label: 'Refus',
                value: applications.rejected,
                colorClass: 'bg-danger',
              },
              {
                key: 'interviews',
                label: 'Entretiens',
                value: applications.interviews,
                colorClass: 'bg-info',
              },
            ]}
          />
        </>
      )}
    </ModuleCard>
  );
}

function OfferModule({ data }: { data: HomeData }) {
  const offer = data.pendingOffer;
  return (
    <ModuleCard
      title="Nouvelle offre"
      icon={<ResumeIcon className="size-4" />}
      accentClass="text-career"
      aside={
        data.pendingOfferCount > 1 ? (
          <span className="tabular">{data.pendingOfferCount} à trier</span>
        ) : null
      }
      className="col-span-4"
    >
      {offer ? (
        <>
          <p className="text-title-18">{offer.title}</p>
          <p className="text-body-14 text-fg-2">
            {offer.company}
            {offer.location ? ` · ${offer.location}` : ''}
          </p>
          <Link
            href="/career/job-search"
            className="mt-auto text-body-14 font-semibold text-fg-2 hover:text-fg-1 hover:underline"
          >
            Trier dans la veille
          </Link>
        </>
      ) : (
        <EmptyState
          title="Aucune offre à trier."
          description="Les offres repérées dans ta veille apparaîtront ici."
          action={{ label: 'Ouvrir la veille', href: '/career/job-search' }}
        />
      )}
    </ModuleCard>
  );
}

function FinanceModule({ data, monthLabel }: { data: HomeData; monthLabel: string }) {
  const { incomeCents, expensesCents } = data.finance;
  const balance = incomeCents - expensesCents;
  const hasData = incomeCents > 0 || expensesCents > 0;

  return (
    <ModuleCard
      title="Finances"
      icon={<FinanceIcon className="size-4" />}
      accentClass="text-finance"
      aside={<span className="text-fg-1 capitalize">{monthLabel}</span>}
      className="col-span-4"
    >
      {hasData ? (
        <>
          <p className={`text-kpi-30 tabular ${balance >= 0 ? 'text-finance' : ''}`}>
            {formatSignedEuros(balance)}
          </p>
          <p className="text-caption-12 text-fg-3">Solde du mois</p>
          <BarChart
            caption={`Revenus et dépenses, ${monthLabel}`}
            valueHeader="Montant"
            rows={[
              {
                key: 'income',
                label: 'Revenus',
                value: incomeCents,
                colorClass: 'bg-finance',
                display: formatEuros(incomeCents),
              },
              {
                key: 'expenses',
                label: 'Dépenses',
                value: expensesCents,
                colorClass: 'bg-fg-3',
                display: formatEuros(expensesCents),
              },
            ]}
          />
        </>
      ) : (
        <EmptyState
          title="Aucune transaction ce mois-ci."
          description="Importe le relevé CSV de ta banque ou saisis une dépense."
          action={{ label: 'Ouvrir les finances', href: '/finance' }}
        />
      )}
    </ModuleCard>
  );
}

function LeisureModule({ data }: { data: HomeData }) {
  const game = data.currentGame;
  return (
    <ModuleCard
      title="Loisirs"
      icon={<LeisureIcon className="size-4" />}
      accentClass="text-leisure"
      aside="pas d'XP, juste le plaisir"
      className="col-span-6"
    >
      {game ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption-12 text-fg-3">Jeux vidéo · en cours</p>
          <p className="font-semibold">{game.title}</p>
          {game.progressCurrent !== null && game.progressTotal ? (
            <Ruler
              value={game.progressCurrent}
              max={game.progressTotal}
              segments={Math.min(game.progressTotal, 12)}
              label="Progression du jeu"
              colorClass="bg-leisure"
              size="small"
            />
          ) : null}
          {data.nextGame ? (
            <p className="text-caption-12 text-fg-2">
              Ensuite dans la franchise : <span className="text-fg-1">{data.nextGame.title}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Aucun jeu en cours."
          description="Ajoute tes jeux par franchise, dans l'ordre de l'histoire."
          action={{ label: 'Ajouter un jeu', href: '/leisure/games' }}
        />
      )}
    </ModuleCard>
  );
}

function TrophiesModule({ data }: { data: HomeData }) {
  return (
    <ModuleCard
      title="Vitrine"
      icon={<TrophyIcon className="size-4" />}
      accentClass="text-career"
      aside={
        <span className="tabular">
          {data.trophyCount} trophée{data.trophyCount > 1 ? 's' : ''}
        </span>
      }
      className="col-span-6"
    >
      <p className="text-body-14 text-fg-2">
        {data.trophyCount === 0
          ? 'Ta vitrine est vide pour l’instant. Ton premier trophée arrive avec ta première série ou ta première candidature.'
          : 'Tes derniers trophées apparaîtront ici.'}
      </p>
    </ModuleCard>
  );
}

// Static placeholder shown while the data loads (no looping animation, as decided in the design).
export function HomeDashboardSkeleton() {
  return (
    <LoadingRegion label="Chargement du tableau de bord…" className="flex flex-1 flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <div className="grid flex-1 grid-cols-12 grid-rows-[1.4fr_1fr_1fr] gap-3">
        {[
          'col-span-7',
          'col-span-5',
          'col-span-4',
          'col-span-4',
          'col-span-4',
          'col-span-6',
          'col-span-6',
        ].map((span, index) => (
          <Skeleton key={index} surface="card" className={span} />
        ))}
      </div>
    </LoadingRegion>
  );
}
