'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AiError, generateJson } from '@/lib/ai/gemini';
import { GmailExpiredError, withGmail } from '@/lib/gmail/client';
import {
  extractLinks,
  alertSource,
  jobAlertPrompt,
  jobAlertSchema,
  keepRealLinks,
  normalizeOfferUrl,
  offerKeys,
} from '@/lib/job-alerts';
import { mailPlainText } from '@/lib/gmail/message';
import { getMessage } from '@/lib/gmail/read';
import { OFFER_MAX_AGE_DAYS, offerCutoff } from '@/lib/job-search';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// « Veille automatique »: offers read from the job-alert mails Alex files in one Gmail label.
// Only these mails are sent to Gemini (Alex's choice, 23/10/2026); their content is not stored.

// Automatic imports at most every 30 min; « Synchroniser maintenant » forces one.
const AUTO_SYNC_MS = 30 * 60 * 1000;
// Mails read per call, to stay well within the 60 s of a server function. The client calls
// again while some remain.
const MAILS_PER_CALL = 4;
// Alert mails of the last 7 days only: older offers would be deleted at once.
const LOOKBACK = `newer_than:${OFFER_MAX_AGE_DAYS}d`;

function revalidateWatch() {
  revalidatePath('/career/job-search', 'layout');
}

// The Gmail label holding the alerts (Alex sets a Gmail filter to file them there).
export async function setAlertLabel(labelId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z
    .string()
    .regex(/^[\w-]{0,64}$/)
    .safeParse(labelId);
  if (!parsed.success) return { error: 'Libellé invalide.' };
  if (!parsed.data) {
    await prisma.jobAlertSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: { gmailLabelId: null, gmailLabelName: null, lastError: null },
    });
    revalidateWatch();
    return {};
  }
  try {
    const name = await withGmail(user.id, async ({ gmail }) => {
      const { data } = await gmail.users.labels.get({ userId: 'me', id: parsed.data });
      return data.name ?? parsed.data;
    });
    await prisma.jobAlertSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, gmailLabelId: parsed.data, gmailLabelName: name },
      update: { gmailLabelId: parsed.data, gmailLabelName: name, lastError: null },
    });
  } catch (error) {
    return {
      error:
        error instanceof GmailExpiredError
          ? 'Connexion Gmail expirée : reconnecte-la dans Mails.'
          : 'Gmail n’a pas répondu. Réessaie.',
    };
  }
  revalidateWatch();
  return {};
}

export type SyncResult = {
  error?: string;
  skipped?: boolean;
  mails?: number;
  offers?: number;
  remaining?: boolean;
};

// Reads the new alert mails of the label (a few per call) and adds their offers to the watch,
// without duplicates across sites. Each mail is sent to Gemini once.
export async function syncJobAlerts(force = false): Promise<SyncResult> {
  const user = await requireUser();
  const settings = await prisma.jobAlertSettings.findUnique({ where: { userId: user.id } });
  if (!settings?.gmailLabelId) return { skipped: true };
  if (
    !force &&
    settings.lastSyncedAt &&
    Date.now() - settings.lastSyncedAt.getTime() < AUTO_SYNC_MS
  ) {
    return { skipped: true };
  }
  const labelId = settings.gmailLabelId;
  await prisma.jobOffer.deleteMany({
    where: {
      userId: user.id,
      decision: { not: 'APPLIED' },
      application: null,
      foundAt: { lt: offerCutoff(new Date()) },
    },
  });

  let mails = 0;
  let created = 0;
  let remaining = false;
  let failure: string | null = null;
  try {
    await withGmail(user.id, async (session) => {
      const { data } = await session.gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        q: LOOKBACK,
        maxResults: 50,
      });
      const ids = (data.messages ?? []).map((message) => message.id!).filter(Boolean);
      const done = await prisma.jobAlertMail.findMany({
        where: { userId: user.id, gmailMessageId: { in: ids } },
        select: { gmailMessageId: true },
      });
      const doneIds = new Set(done.map((mail) => mail.gmailMessageId));
      // Oldest first, so the newest offers end up on top of the watch.
      const todo = ids.filter((id) => !doneIds.has(id)).reverse();
      remaining = todo.length > MAILS_PER_CALL;

      const existing = await prisma.jobOffer.findMany({
        where: { userId: user.id },
        select: { url: true, company: true, title: true },
      });
      const known = new Set(existing.flatMap((offer) => offerKeys(offer)));

      for (const id of todo.slice(0, MAILS_PER_CALL)) {
        const message = await getMessage(session, id);
        // Gmail's « newer_than » is approximate: a mail older than 7 days is skipped.
        if (message.date < offerCutoff(new Date())) {
          await prisma.jobAlertMail.create({
            data: { userId: user.id, gmailMessageId: id, offersFound: 0 },
          });
          mails += 1;
          continue;
        }
        const links = extractLinks(message.bodies.html ?? '');
        let offers;
        try {
          const answer = await generateJson(
            user.id,
            'job-alert',
            jobAlertPrompt({
              from: `${message.from.name} <${message.from.email}>`,
              subject: message.subject,
              text: mailPlainText(message.bodies),
              links,
            }),
            jobAlertSchema
          );
          offers = keepRealLinks(answer.offers, links);
        } catch (error) {
          // Quota or AI error: this mail is read again on the next import.
          if (error instanceof AiError) {
            failure = error.message;
            remaining = true;
            break;
          }
          throw error;
        }
        const source = alertSource(message.from);
        const fresh = offers.filter((offer) => {
          const keys = offerKeys(offer);
          if (keys.some((key) => known.has(key))) return false;
          keys.forEach((key) => known.add(key));
          return true;
        });
        await prisma.$transaction([
          prisma.jobOffer.createMany({
            data: fresh.map((offer) => ({
              userId: user.id,
              title: offer.title,
              company: offer.company,
              location: offer.location || null,
              contractType: offer.contractType,
              url: normalizeOfferUrl(offer.url),
              source,
              tags: [],
              foundAt: message.date,
              importedAt: new Date(),
            })),
          }),
          prisma.jobAlertMail.create({
            data: { userId: user.id, gmailMessageId: id, offersFound: fresh.length },
          }),
          // The site appears in « Sources suivies » with its count of the week.
          prisma.watchSource.createMany({
            data: [{ userId: user.id, name: source }],
            skipDuplicates: true,
          }),
        ]);
        mails += 1;
        created += fresh.length;
      }
    });
  } catch (error) {
    failure =
      error instanceof GmailExpiredError
        ? 'Connexion Gmail expirée : reconnecte-la dans Mails.'
        : 'L’import des alertes a échoué. Réessaie.';
  }

  await prisma.jobAlertSettings.update({
    where: { userId: user.id },
    data: { lastSyncedAt: new Date(), lastError: failure },
  });
  revalidateWatch();
  return failure
    ? { error: failure, mails, offers: created }
    : { mails, offers: created, remaining };
}
