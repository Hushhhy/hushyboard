import Link from 'next/link';
import { deleteGame } from '@/app/(app)/leisure/games/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { GamesIcon, PlusIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dates';
import {
  currentGame,
  describeGames,
  formatPlayTime,
  franchises as listFranchises,
  GAME_STATUS_LABELS,
  nextInFranchise,
  NO_FRANCHISE,
  storyOrder,
} from '@/lib/games';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { CurrentGameControls, GameForm } from './game-client';

const BASE_PATH = '/leisure/games';
type Search = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// « Jeux vidéo »: games by franchise in story order, the game being played on top.
export async function GamesView({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const games = await prisma.game.findMany({ where: { userId: user.id } });
  const chips = listFranchises(games);
  const playing = currentGame(games);
  const requested = one(params.franchise);
  // Default: the franchise of the game being played, else the biggest one.
  const selected =
    (requested && chips.some((chip) => chip.name === requested) ? requested : null) ??
    (playing ? playing.franchise?.trim() || NO_FRANCHISE : chips[0]?.name) ??
    null;
  const inFranchise = storyOrder(
    games.filter((game) => (game.franchise?.trim() || NO_FRANCHISE) === selected)
  );
  // The focal game of this franchise: the one being played, else a paused one.
  const focal =
    currentGame(inFranchise) ?? inFranchise.find((game) => game.status === 'PAUSED') ?? null;
  const next = nextInFranchise(inFranchise, focal);
  const panel = one(params.panel);
  const listHref = selected ? `${BASE_PATH}?franchise=${encodeURIComponent(selected)}` : BASE_PATH;
  const panelHref = (name: string) => `${listHref}${selected ? '&' : '?'}panel=${name}`;
  const editing = panel?.startsWith('game-')
    ? games.find((game) => game.id === panel.slice(5))
    : undefined;
  const franchiseNames = chips.map((chip) => chip.name).filter((name) => name !== NO_FRANCHISE);

  return (
    <>
      <PageHeader breadcrumb="Loisirs · Jeux vidéo" title={describeGames(playing, games.length)} />

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Franchises" className="flex flex-1 flex-wrap gap-1.5">
          {chips.map((chip) => {
            const isActive = chip.name === selected;
            return (
              <Link
                key={chip.name}
                href={`${BASE_PATH}?franchise=${encodeURIComponent(chip.name)}`}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-14 ${
                  isActive
                    ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
                    : 'border-transparent bg-surface-default font-medium text-fg-2 hover:text-fg-1'
                }`}
              >
                {chip.name}
                <span className="text-caption-12 text-fg-3 tabular">{chip.count}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href={panelHref('game-new')}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Ajouter un jeu
        </Link>
      </div>

      {games.length === 0 ? (
        <EmptyState
          variant="block"
          icon={<GamesIcon className="size-5 text-leisure" />}
          title="Aucun jeu pour l’instant."
          description="Ajoute tes jeux avec leur franchise et leur place dans l’histoire : le suivant est proposé tout seul. Pas d’XP pour les loisirs, juste le plaisir."
          action={{ label: 'Ajouter un jeu', href: panelHref('game-new') }}
        />
      ) : (
        <>
          {focal ? (
            <section
              aria-labelledby="focal-game"
              className="flex flex-col gap-4 rounded-card bg-surface-raised px-6 py-5 shadow-raised sm:flex-row sm:items-center"
            >
              {focal.coverUrl ? (
                // External image of an unknown host: next/image would need each domain configured.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={focal.coverUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-24 w-16 shrink-0 rounded-control bg-surface-sunken object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-24 w-16 shrink-0 place-items-center rounded-control bg-leisure-deep p-1 text-center text-caption-12 font-bold text-leisure"
                >
                  {focal.title.slice(0, 18)}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-label-12 text-fg-3 uppercase">
                  {GAME_STATUS_LABELS[focal.status]} · ordre de l’histoire
                </p>
                <h2 id="focal-game" className="font-display text-display-24">
                  {focal.title}
                </h2>
                <p className="text-body-14 text-fg-2">
                  {[
                    focal.startedAt ? `Commencé le ${formatShortDate(focal.startedAt)}` : null,
                    focal.minutesPlayed ? `${formatPlayTime(focal.minutesPlayed)} de jeu` : null,
                    focal.progressCurrent !== null && focal.progressTotal
                      ? `${focal.progressCurrent} sur ${focal.progressTotal}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {focal.progressTotal ? (
                  <Ruler
                    value={focal.progressCurrent ?? 0}
                    max={focal.progressTotal}
                    segments={Math.min(focal.progressTotal, 20)}
                    label={`Avancée dans ${focal.title}`}
                    valueText={`${focal.progressCurrent ?? 0} sur ${focal.progressTotal}`}
                    colorClass="bg-leisure"
                  />
                ) : null}
                {next ? (
                  <p className="text-caption-12 text-fg-2">
                    Ensuite dans la franchise : <span className="text-fg-1">{next.title}</span>
                  </p>
                ) : null}
              </div>
              <CurrentGameControls
                key={focal.id}
                gameId={focal.id}
                status={focal.status}
                hasProgress={focal.progressTotal !== null}
              />
            </section>
          ) : null}

          <section
            aria-label={`Jeux · ${selected}`}
            className="overflow-x-auto rounded-card bg-surface-default"
          >
            <table className="w-full min-w-150 text-body-14">
              <caption className="sr-only">{selected}, dans l’ordre de l’histoire</caption>
              <thead>
                <tr className="text-left text-label-12 text-fg-3 uppercase">
                  <th scope="col" className="w-16 px-4.5 py-3 font-semibold">
                    Ordre
                  </th>
                  <th scope="col" className="px-4.5 py-3 font-semibold">
                    Jeu
                  </th>
                  <th scope="col" className="px-4.5 py-3 font-semibold">
                    Époque
                  </th>
                  <th scope="col" className="px-4.5 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4.5 py-3 text-right font-semibold">
                    Temps
                  </th>
                </tr>
              </thead>
              <tbody>
                {inFranchise.map((game) => {
                  const isFocal = game.id === focal?.id;
                  const isNext = game.id === next?.id;
                  return (
                    <tr
                      key={game.id}
                      className={`relative border-t border-line-subtle ${isFocal ? 'bg-surface-raised' : 'hover:bg-surface-raised'}`}
                    >
                      <td className="px-4.5 py-2.5 text-fg-3 tabular">{game.storyOrder ?? '—'}</td>
                      <td
                        className={`px-4.5 py-2.5 font-medium ${game.status === 'FINISHED' ? 'text-fg-2' : ''}`}
                      >
                        <Link
                          href={panelHref(`game-${game.id}`)}
                          scroll={false}
                          className="after:absolute after:inset-0"
                        >
                          {game.title}
                        </Link>
                      </td>
                      <td className="px-4.5 py-2.5 text-caption-12 text-fg-2 tabular">
                        {game.setting ?? '—'}
                      </td>
                      <td
                        className={`px-4.5 py-2.5 text-caption-12 ${
                          isFocal
                            ? 'font-semibold text-fg-1'
                            : game.status === 'FINISHED'
                              ? 'text-fg-2'
                              : 'text-fg-3'
                        }`}
                      >
                        {isNext ? 'Ensuite' : GAME_STATUS_LABELS[game.status]}
                      </td>
                      <td className="px-4.5 py-2.5 text-right text-caption-12 text-fg-2 tabular">
                        {formatPlayTime(game.minutesPlayed)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <p className="text-caption-12 text-fg-3">
            Les jeux se rangent par franchise, dans l’ordre de l’histoire ; « Ensuite » est proposé
            tout seul.
          </p>
        </>
      )}

      <SidePanel name="game-new" title="Ajouter un jeu">
        <GameForm
          game={null}
          franchises={franchiseNames}
          defaultFranchise={selected && selected !== NO_FRANCHISE ? selected : null}
          closeHref={listHref}
        />
      </SidePanel>
      {editing ? (
        <SidePanel name={`game-${editing.id}`} title="Modifier le jeu">
          <GameForm
            game={editing}
            franchises={franchiseNames}
            defaultFranchise={null}
            closeHref={listHref}
          />
          <div className="mt-auto border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer « ${editing.title} » ?`}
              description="Le jeu, son avancée et son temps de jeu sont supprimés."
              onConfirm={deleteGame.bind(null, editing.id)}
            />
          </div>
        </SidePanel>
      ) : null}
    </>
  );
}

export function GamesSkeleton() {
  return (
    <LoadingRegion label="Chargement des jeux…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <Skeleton surface="card" className="h-36" />
      <Skeleton surface="card" className="h-100" />
    </LoadingRegion>
  );
}
