import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { ExternalLinkIcon, MailIcon, PlusIcon, SearchIcon, SparkleIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { GmailExpiredError, withGmail } from '@/lib/gmail/client';
import { ALL_MAIL, INBOX } from '@/lib/gmail/labels';
import {
  formatMailDate,
  formatMailDateTime,
  hasRemoteImages,
  mailDocument,
} from '@/lib/gmail/message';
import {
  getMailState,
  getMessage,
  listLabels,
  listMessages,
  type MailDetail,
  type MailLabel,
  type MailSummary,
} from '@/lib/gmail/read';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  ClassifyMessages,
  DisconnectButton,
  FileMenu,
  MarkRead,
  NewLabelForm,
  RecruiterBanner,
  UnsubscribeButton,
} from './mail-controls';
import { TONE_DOTS } from './tones';

type Search = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const CALLBACK_ERRORS: Record<string, string> = {
  denied: 'Connexion à Gmail annulée.',
  state: 'La connexion à Gmail a expiré avant la fin. Recommence.',
  refresh:
    'Google n’a pas renvoyé d’accès durable. Retire Hushyboard des accès de ton compte Google, puis reconnecte-le.',
  scope: 'Coche l’autorisation de lire et modifier les mails sur l’écran de Google.',
  exchange:
    'Google a refusé l’échange du code. Vérifie GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et l’URI de redirection http://localhost:3000/api/gmail/callback dans Google Cloud.',
  api: 'Connecté à Google, mais l’API Gmail refuse l’accès. Vérifie qu’elle est activée dans Google Cloud (APIs & Services, Library, Gmail API).',
  save: 'La connexion n’a pas pu être enregistrée. Vérifie TOKEN_ENCRYPTION_KEY et relance npx prisma generate.',
  config: 'Gmail n’est pas configuré sur ce serveur.',
};

const CONNECT_HREF = '/api/gmail/connect';

// « Mails »: Gmail labels, a page of mails, and the selected mail.
export async function MailView({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const state = await getMailState(user.id);
  const callbackError = CALLBACK_ERRORS[one(params.error) ?? ''];

  if (state.status === 'unconfigured') {
    return (
      <>
        <PageHeader breadcrumb="Mails · Gmail" title="Gmail n’est pas encore configuré." />
        <EmptyState
          variant="block"
          icon={<MailIcon className="size-5 text-fg-3" />}
          title="Il manque la configuration Google."
          description="Ajoute GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et TOKEN_ENCRYPTION_KEY dans .env (et sur Vercel), puis relance l’application. Les étapes sont dans docs/claude-code/06-alex-actions.md, section « Phase 5 · Gmail »."
        />
      </>
    );
  }

  if (state.status === 'disconnected') {
    return (
      <>
        <PageHeader breadcrumb="Mails · Gmail" title="Gmail n’est pas connecté." />
        {callbackError ? <ErrorState title={callbackError} announce /> : null}
        <EmptyState
          variant="block"
          icon={<MailIcon className="size-5 text-fg-3" />}
          title="Connecte ta boîte Gmail pour suivre tes mails ici."
          description="Hushyboard lit tes mails en direct depuis Gmail, sans les enregistrer. Tu pourras les ranger, te désabonner des newsletters et repérer les réponses de recruteurs."
        >
          <a href={CONNECT_HREF} className={buttonClasses({ variant: 'primary' })}>
            Connecter Gmail
          </a>
        </EmptyState>
      </>
    );
  }

  const expiredBanner = (
    <ErrorState
      title="Connexion Gmail expirée."
      description="Google déconnecte l’application au bout de 7 jours en mode « Testing ». Reconnecte-la pour continuer."
      action={
        <a href={CONNECT_HREF} className={buttonClasses({ variant: 'secondary' })}>
          Reconnecter
        </a>
      }
    />
  );
  if (state.status === 'expired') {
    return (
      <>
        <PageHeader breadcrumb="Mails · Gmail" title="Connexion Gmail expirée." />
        {expiredBanner}
      </>
    );
  }

  const labelParam = one(params.label) ?? INBOX;
  const labelId = labelParam === ALL_MAIL ? null : labelParam;
  const query = (one(params.q) ?? '').trim();
  const pageToken = one(params.pt) ?? null;
  const selectedId = one(params.m) ?? null;
  const showImages = one(params.images) === '1';

  let data: {
    labels: MailLabel[];
    list: { messages: MailSummary[]; nextPageToken: string | null };
    selected: MailDetail | null;
  };
  try {
    data = await withGmail(user.id, async (session) => {
      const [labels, list, selected] = await Promise.all([
        listLabels(session),
        listMessages(session, { labelId, query, pageToken }),
        selectedId ? getMessage(session, selectedId).catch(() => null) : null,
      ]);
      return { labels, list, selected };
    });
  } catch (error) {
    return (
      <>
        <PageHeader
          breadcrumb="Mails · Gmail"
          title={
            error instanceof GmailExpiredError ? 'Connexion Gmail expirée.' : 'Gmail ne répond pas.'
          }
        />
        {error instanceof GmailExpiredError ? (
          expiredBanner
        ) : (
          <ErrorState
            title="Gmail n’a pas pu charger tes mails."
            description="Réessaie dans un instant."
            action={
              <Link href="/mail" className={buttonClasses()}>
                Réessayer
              </Link>
            }
          />
        )}
      </>
    );
  }

  const { labels, list, selected } = data;
  const ids = list.messages.map((message) => message.id);
  const [matches, pendingTotal, unsubscribed] = await Promise.all([
    prisma.mailMatch.findMany({
      where: { userId: user.id, gmailMessageId: { in: selectedId ? [...ids, selectedId] : ids } },
      include: { application: { select: { company: true, position: true } } },
    }),
    prisma.mailMatch.count({
      where: { userId: user.id, decision: null, classification: { not: 'OTHER' } },
    }),
    selected
      ? prisma.mailUnsubscribe.findUnique({
          where: { userId_sender: { userId: user.id, sender: selected.from.email } },
        })
      : null,
  ]);
  const pendingIds = new Set(
    matches
      .filter((match) => match.decision === null && match.classification !== 'OTHER')
      .map((match) => match.gmailMessageId)
  );
  const inbox = labels.find((label) => label.id === INBOX);
  const ownLabels = labels.filter((label) => label.id !== INBOX);
  const labelNames = new Map(ownLabels.map((label) => [label.id, label]));

  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (labelParam !== INBOX) next.set('label', labelParam);
    if (query) next.set('q', query);
    if (pageToken) next.set('pt', pageToken);
    if (selectedId) next.set('m', selectedId);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const text = next.toString();
    return text ? `/mail?${text}` : '/mail';
  };

  const unread = inbox?.unread ?? 0;
  const title = [
    `${unread} non lu${unread > 1 ? 's' : ''}`,
    pendingTotal > 0
      ? `${pendingTotal} réponse${pendingTotal > 1 ? 's' : ''} de recruteur à valider`
      : null,
  ]
    .filter(Boolean)
    .join(', ');
  const selectedMatch = selected
    ? matches.find((match) => match.gmailMessageId === selected.id)
    : undefined;

  return (
    <>
      <PageHeader breadcrumb="Mails · Gmail" title={`${title}.`} />
      {callbackError ? <ErrorState title={callbackError} announce /> : null}
      <ClassifyMessages ids={ids} />

      <div className="grid items-start gap-3 lg:grid-cols-[13.375rem_21.25rem_minmax(0,1fr)]">
        <nav
          aria-label="Libellés"
          className="flex flex-col gap-0.5 rounded-card bg-surface-default p-2.5"
        >
          {[
            ...(inbox ? [inbox] : []),
            ...ownLabels,
            { id: ALL_MAIL, name: 'Tous les mails', tone: 'neutral' as const, unread: 0 },
          ].map((label) => {
            const isActive = label.id === labelParam;
            return (
              <Link
                key={label.id}
                href={label.id === INBOX ? '/mail' : `/mail?label=${encodeURIComponent(label.id)}`}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-control px-2 py-1.5 text-body-14 ${
                  isActive
                    ? 'bg-surface-raised font-semibold text-fg-1'
                    : 'text-fg-2 hover:bg-surface-raised hover:text-fg-1'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${TONE_DOTS[label.tone]}`}
                />
                <span className="min-w-0 flex-1 truncate">{label.name}</span>
                {label.unread > 0 ? (
                  <span className="text-caption-12 text-fg-3 tabular">
                    {label.unread}
                    <span className="sr-only"> non lus</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
          <Link
            href={href({ panel: 'label-new' })}
            scroll={false}
            className="mt-2 flex items-center gap-2 rounded-control px-2 py-1.5 text-body-14 text-fg-2 hover:bg-surface-raised hover:text-fg-1"
          >
            <PlusIcon className="size-4" />
            Nouveau libellé
          </Link>
          <div className="mt-3 flex flex-col gap-1 border-t border-line-subtle px-2 pt-3">
            <p className="truncate text-caption-12 text-fg-3">{state.email}</p>
            <div className="-ml-2">
              <DisconnectButton />
            </div>
          </div>
        </nav>

        <section
          aria-label="Liste des mails"
          className="flex flex-col gap-1 rounded-card bg-surface-default p-2"
        >
          <form role="search" action="/mail" className="relative px-1 pt-1 pb-2">
            {labelParam !== INBOX ? <input type="hidden" name="label" value={labelParam} /> : null}
            <label htmlFor="mail-search" className="sr-only">
              Rechercher dans les mails
            </label>
            <SearchIcon className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-fg-3" />
            <input
              id="mail-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Rechercher dans les mails"
              className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken pr-3 pl-8 text-body-14"
            />
          </form>
          {list.messages.length === 0 ? (
            <p className="px-2 py-6 text-body-14 text-fg-2">
              {query ? 'Aucun mail ne correspond à cette recherche.' : 'Aucun mail ici.'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {list.messages.map((message) => {
                const isSelected = message.id === selectedId;
                const chips = message.labelIds
                  .map((id) => labelNames.get(id))
                  .filter(
                    (label): label is MailLabel => Boolean(label) && label!.id !== labelParam
                  );
                return (
                  <li key={message.id}>
                    <Link
                      href={href({ m: message.id, images: null })}
                      scroll={false}
                      prefetch={false}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`grid grid-cols-[0.5rem_minmax(0,1fr)_auto] gap-x-2 rounded-control px-2 py-2 ${
                        isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 rounded-full ${message.unread ? 'bg-career' : ''}`}
                      />
                      <span
                        className={`truncate text-body-14 ${message.unread ? 'font-semibold text-fg-1' : 'text-fg-2'}`}
                      >
                        {message.unread ? <span className="sr-only">Non lu : </span> : null}
                        {message.from.name}
                      </span>
                      <span className="text-caption-12 text-fg-3 tabular">
                        {formatMailDate(message.date, new Date())}
                      </span>
                      <span className="col-start-2 col-end-4 flex items-center gap-1 truncate text-body-14 text-fg-1">
                        {pendingIds.has(message.id) ? (
                          <>
                            <SparkleIcon className="size-3.5 shrink-0 text-career" />
                            <span className="sr-only">Réponse de recruteur : </span>
                          </>
                        ) : null}
                        <span className="truncate">{message.subject}</span>
                      </span>
                      <span className="col-start-2 col-end-4 truncate text-caption-12 text-fg-3">
                        {message.snippet}
                      </span>
                      {chips.length > 0 ? (
                        <span className="col-start-2 col-end-4 mt-1 flex flex-wrap gap-1">
                          {chips.map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex items-center gap-1 rounded-pill bg-surface-sunken px-1.5 text-caption-12 text-fg-2"
                            >
                              <span
                                aria-hidden="true"
                                className={`size-1.5 rounded-full ${TONE_DOTS[label.tone]}`}
                              />
                              {label.name}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 px-1 pt-1">
            {pageToken ? (
              <Link
                href={href({ pt: null, m: null })}
                className={buttonClasses({ variant: 'quiet' })}
              >
                Revenir aux plus récents
              </Link>
            ) : null}
            {list.nextPageToken ? (
              <Link
                href={href({ pt: list.nextPageToken, m: null })}
                className={buttonClasses({ variant: 'quiet' })}
              >
                Mails suivants
              </Link>
            ) : null}
          </div>
        </section>

        <section
          aria-label="Lecture"
          className="flex min-w-0 flex-col gap-4 rounded-card bg-surface-default p-4"
        >
          {!selected ? (
            <p className="text-body-14 text-fg-2">
              {selectedId
                ? 'Ce mail n’est plus disponible.'
                : 'Choisis un mail dans la liste pour le lire.'}
            </p>
          ) : (
            <>
              {selected.unread ? <MarkRead id={selected.id} /> : null}
              <div className="flex flex-wrap items-start gap-2">
                <FileMenu
                  key={selected.id}
                  messageId={selected.id}
                  labels={ownLabels.map(({ id, name, tone }) => ({ id, name, tone }))}
                  current={selected.labelIds}
                  newLabelHref={href({ panel: 'label-new' })}
                />
                {selected.unsubscribe && !unsubscribed ? (
                  <UnsubscribeButton key={`u-${selected.id}`} messageId={selected.id} />
                ) : null}
                <a
                  href={`https://mail.google.com/mail/u/0/#all/${selected.threadId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: 'quiet' })}
                >
                  <ExternalLinkIcon className="size-4" />
                  Ouvrir dans Gmail
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
                <span className="ml-auto self-center text-caption-12 text-fg-3 tabular">
                  {formatMailDateTime(selected.date)}
                </span>
              </div>
              <header className="flex flex-col gap-1">
                <h2 className="text-title-20">{selected.subject}</h2>
                <p className="text-caption-12 text-fg-2">
                  {selected.from.name} &lt;{selected.from.email}&gt;
                  {selected.to ? ` · à ${selected.to}` : ''}
                </p>
              </header>
              {selectedMatch &&
              selectedMatch.decision === null &&
              selectedMatch.classification !== 'OTHER' &&
              selectedMatch.application ? (
                <RecruiterBanner
                  matchId={selectedMatch.id}
                  title={`Réponse à ta candidature « ${[selectedMatch.application.position, selectedMatch.application.company].filter(Boolean).join(' · ')} »`}
                  reason={selectedMatch.reason}
                  suggestion={selectedMatch.classification}
                />
              ) : null}
              {!showImages && hasRemoteImages(selected.bodies.html ?? '') ? (
                <p className="flex flex-wrap items-center gap-2 text-caption-12 text-fg-3">
                  Les images distantes sont bloquées (elles peuvent signaler l’ouverture du mail).
                  <Link
                    href={href({ images: '1' })}
                    scroll={false}
                    className="font-semibold text-fg-2 underline"
                  >
                    Afficher les images
                  </Link>
                </p>
              ) : null}
              <iframe
                title={`Contenu du mail « ${selected.subject} »`}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={mailDocument(selected.bodies, showImages)}
                className="h-[70dvh] min-h-96 w-full rounded-control bg-surface-sunken"
              />
            </>
          )}
        </section>
      </div>

      <SidePanel name="label-new" title="Nouveau libellé">
        <NewLabelForm closeHref={href({ panel: null })} />
      </SidePanel>
    </>
  );
}

export function MailSkeleton() {
  return (
    <LoadingRegion label="Chargement des mails…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <div className="grid gap-3 lg:grid-cols-[13.375rem_21.25rem_minmax(0,1fr)]">
        <Skeleton surface="card" className="h-80" />
        <Skeleton surface="card" className="h-160" />
        <Skeleton surface="card" className="h-160" />
      </div>
    </LoadingRegion>
  );
}
