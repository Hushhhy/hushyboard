import { PageHeader } from '@/components/app-shell/page-header';
import { TrophyIcon } from '@/components/icons';
import { DOMAIN_CLASSES, type Domain } from '@/components/ui/domain';
import { LevelMedal } from '@/components/ui/level-medal';
import { ModuleCard } from '@/components/ui/module-card';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { TrophyShelf } from '@/components/ui/trophy';
import { formatShortDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { TROPHIES, TROPHY_KEYS } from '@/lib/trophies';
import { levelHistory } from '@/lib/xp';
import { TrophyButton } from './trophy-button';
import { DomainIcon } from './trophy-icon';

const AREAS: Domain[] = ['career', 'habits', 'leisure', 'finance'];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// « Vitrine »: every trophy by area (unlocked or locked) and the history of rewards.
export async function TrophiesView({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [unlocks, xpEvents] = await Promise.all([
    prisma.trophyUnlock.findMany({
      where: { userId: user.id },
      select: { trophyKey: true, unlockedAt: true },
    }),
    prisma.xpEvent.findMany({
      where: { userId: user.id },
      select: { amount: true, occurredAt: true },
    }),
  ]);
  const unlockedAt = new Map(
    unlocks
      .filter((unlock) => TROPHIES[unlock.trophyKey])
      .map((unlock) => [unlock.trophyKey, unlock.unlockedAt])
  );
  const history = [
    ...[...unlockedAt].map(([key, date]) => ({
      kind: 'trophy' as const,
      key,
      date,
      title: TROPHIES[key].name,
      text: TROPHIES[key].feat,
      domain: TROPHIES[key].domain,
    })),
    ...levelHistory(xpEvents).map((level) => ({
      kind: 'level' as const,
      key: `level-${level.level}`,
      date: level.reachedAt,
      title: `Niveau ${level.level} · ${level.title}`,
      text: 'Nouveau titre sur la route des Argonautes.',
      level: level.level,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const latest = history.find((item) => item.kind === 'trophy');
  const title =
    unlockedAt.size === 0
      ? 'Aucun trophée pour l’instant.'
      : `${unlockedAt.size} trophée${unlockedAt.size > 1 ? 's' : ''} sur ${TROPHY_KEYS.length}, le dernier : ${latest?.title}.`;
  const panel = typeof params.panel === 'string' ? params.panel : '';
  const openKey = panel.startsWith('trophy-') ? panel.slice(7) : '';
  const open = TROPHIES[openKey];

  return (
    <>
      <PageHeader breadcrumb="Vitrine" title={title} />
      {unlockedAt.size === 0 ? (
        <p className="max-w-[70ch] text-body-14 text-fg-2">
          Le premier arrive avec ta première candidature suivie, ta première série de 7 jours ou ton
          premier relevé importé. Les trophées ne donnent pas d’XP : ils gardent la trace de ce que
          tu as accompli, dans tous les domaines.
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          {AREAS.map((area) => {
            const keys = TROPHY_KEYS.filter((key) => TROPHIES[key].domain === area);
            const count = keys.filter((key) => unlockedAt.has(key)).length;
            return (
              <ModuleCard
                key={area}
                title={DOMAIN_CLASSES[area].label}
                icon={<DomainIcon domain={area} />}
                accentClass={DOMAIN_CLASSES[area].text}
                aside={<span className="tabular">{`${count} / ${keys.length}`}</span>}
              >
                <TrophyShelf>
                  {keys.map((key) => {
                    const date = unlockedAt.get(key);
                    return (
                      <li key={key}>
                        <TrophyButton
                          trophyKey={key}
                          name={TROPHIES[key].name}
                          domain={area}
                          unlocked={Boolean(date)}
                          detail={date ? formatShortDate(date) : TROPHIES[key].condition}
                          icon={<DomainIcon domain={area} />}
                        />
                      </li>
                    );
                  })}
                </TrophyShelf>
              </ModuleCard>
            );
          })}
        </div>

        <ModuleCard title="Historique des récompenses" icon={<TrophyIcon className="size-4" />}>
          {history.length === 0 ? (
            <p className="text-body-14 text-fg-2">
              Chaque trophée et chaque nouveau niveau s’inscriront ici, du plus récent au plus
              ancien.
            </p>
          ) : (
            <ol className="flex flex-col">
              {history.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 border-t border-line-subtle py-2 first:border-t-0"
                >
                  {item.kind === 'level' ? (
                    <LevelMedal level={item.level} size="small" className="scale-75" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center ${DOMAIN_CLASSES[item.domain].text}`}
                    >
                      <DomainIcon domain={item.domain} className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-caption-12 text-fg-2">{item.text}</p>
                  </div>
                  <span className="text-caption-12 whitespace-nowrap text-fg-3 tabular">
                    {formatShortDate(item.date).replace(/ \d{4}$/, '')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ModuleCard>
      </div>

      {open ? (
        <SidePanel
          name={`trophy-${openKey}`}
          title={open.name}
          subtitle={`Trophée · ${DOMAIN_CLASSES[open.domain].label}`}
        >
          {unlockedAt.has(openKey) ? (
            <>
              <p className="font-semibold">{open.feat}</p>
              <p className="text-body-14 text-fg-2">
                Obtenu le {formatShortDate(unlockedAt.get(openKey)!)}.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Pas encore obtenu.</p>
              <p className="text-body-14 text-fg-2">Condition : {open.condition}</p>
            </>
          )}
          <p className="text-caption-12 text-fg-3">
            Les trophées ne donnent pas d’XP et ne se perdent pas.
          </p>
        </SidePanel>
      ) : null}
    </>
  );
}

export function TrophiesSkeleton() {
  return (
    <LoadingRegion label="Chargement de la vitrine…" className="flex flex-col gap-4">
      <div className="flex min-h-13 flex-col justify-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          {AREAS.map((area) => (
            <Skeleton key={area} surface="card" className="h-36" />
          ))}
        </div>
        <Skeleton surface="card" className="h-96" />
      </div>
    </LoadingRegion>
  );
}
