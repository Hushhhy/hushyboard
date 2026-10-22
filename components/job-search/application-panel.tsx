import Link from 'next/link';
import { deleteApplication } from '@/app/(app)/career/job-search/actions';
import { ExternalLinkIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { KeyValueList } from '@/components/ui/key-value-list';
import { StatusPill } from '@/components/ui/status-pill';
import { formatShortDate } from '@/lib/dates';
import { displayUrl } from '@/lib/job-search';
import type { ApplicationRow } from '@/lib/job-search-data';
import { CONTRACT_LABELS } from '@/lib/job-search-schemas';
import { FollowUpField, StatusControls } from './status-controls';

// Content of the side panel of one application: details, status, follow-up, history.
export function ApplicationPanel({
  application,
  editHref,
}: {
  application: ApplicationRow;
  editHref: string;
}) {
  const link = application.url ?? application.careersUrl;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={application.status} />
        {application.kind === 'SPONTANEOUS' ? (
          <span className="text-caption-12 text-fg-3">Candidature spontanée</span>
        ) : null}
      </div>
      <KeyValueList
        items={[
          { key: 'position', label: 'Poste', value: application.position ?? '—' },
          {
            key: 'contract',
            label: 'Contrat',
            value: application.contractType ? CONTRACT_LABELS[application.contractType] : '—',
          },
          { key: 'location', label: 'Lieu', value: application.location ?? '—' },
          { key: 'source', label: 'Source', value: application.source ?? '—' },
          { key: 'sent', label: 'Envoyée le', value: formatShortDate(application.sentAt) },
          {
            key: 'resume',
            label: 'CV',
            value: application.resume?.name ?? 'Aucun CV joint',
          },
          {
            key: 'link',
            label: 'Lien',
            value: link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                <ExternalLinkIcon className="size-3.5" />
                {displayUrl(link)}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : (
              '—'
            ),
          },
        ]}
      />
      {application.jobOffer ? (
        <Link
          href={`/career/job-search/offers/${application.jobOffer.id}`}
          className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
        >
          Voir l’offre, le CV adapté et la lettre
        </Link>
      ) : null}
      {application.notes ? (
        <p className="text-body-14 whitespace-pre-line text-fg-2">{application.notes}</p>
      ) : null}

      <StatusControls applicationId={application.id} status={application.status} />
      <FollowUpField applicationId={application.id} followUpAt={application.followUpAt} />

      <section aria-labelledby={`history-${application.id}`} className="flex flex-col gap-2">
        <h3 id={`history-${application.id}`} className="text-label-12 text-fg-3 uppercase">
          Historique
        </h3>
        <ol className="flex flex-col gap-2 border-l border-line-subtle pl-3">
          {[...application.events].reverse().map((event) => (
            <li key={event.id} className="flex items-center gap-2 text-body-14">
              <span className="w-24 shrink-0 text-caption-12 text-fg-3 tabular">
                {formatShortDate(event.occurredAt)}
              </span>
              <StatusPill status={event.status} />
              {event.note ? <span className="text-fg-2">{event.note}</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-2 flex items-center gap-2 border-t border-line-subtle pt-3">
        <Link href={editHref} scroll={false} className={buttonClasses({ variant: 'quiet' })}>
          Modifier
        </Link>
        <span className="flex-1" />
        <DeleteDialog
          title={`Supprimer la candidature ${application.company} ?`}
          description="Son historique et l’XP qu’elle a rapportée sont supprimés. Une offre liée revient dans la veille."
          onConfirm={deleteApplication.bind(null, application.id)}
        />
      </div>
    </div>
  );
}
