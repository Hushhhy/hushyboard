'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { changeApplicationStatus } from '@/app/(app)/career/job-search/actions';
import { AiError, generateJson } from '@/lib/ai/gemini';
import { mailClassificationSchema, mailClassifyPrompt } from '@/lib/ai/prompts/mail';
import { decryptToken } from '@/lib/crypto';
import {
  GmailExpiredError,
  gmailConfig,
  mapLimit,
  oauthClient,
  withGmail,
} from '@/lib/gmail/client';
import { INBOX, NEW_LABEL_COLORS, isLabelTone } from '@/lib/gmail/labels';
import { findApplication, parseSender } from '@/lib/gmail/match';
import { header, mailPlainText, type MessagePart } from '@/lib/gmail/message';
import { getMessage, unreadTag } from '@/lib/gmail/read';
import { unsubscribeMail } from '@/lib/gmail/unsubscribe';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { LevelUp } from '@/lib/xp';

// Gmail actions of the « Mails » page. Every call is for the signed-in user's own mailbox.
// Mail content is read into memory and never stored or logged.

type Result = { error?: string };

const EXPIRED = 'Connexion Gmail expirée. Reconnecte Gmail pour continuer.';
const FAILED = 'Gmail n’a pas pu faire l’action. Réessaie.';

function revalidateMail(userId: string) {
  updateTag(unreadTag(userId));
  revalidatePath('/mail');
}

async function run<T>(userId: string, action: Parameters<typeof withGmail<T>>[1]) {
  try {
    return { value: await withGmail(userId, action) };
  } catch (error) {
    return { error: error instanceof GmailExpiredError ? EXPIRED : FAILED };
  }
}

const messageId = z.string().regex(/^[\w-]{6,64}$/);
const labelId = z.string().regex(/^[\w-]{1,64}$/);

// « Déconnecter Gmail »: the token is revoked at Google, then the connection is deleted.
export async function disconnectGmail(): Promise<Result> {
  const user = await requireUser();
  const connection = await prisma.gmailConnection.findUnique({ where: { userId: user.id } });
  const config = gmailConfig();
  if (connection && config) {
    try {
      await oauthClient(config).revokeToken(
        decryptToken(connection.encryptedRefreshToken, config.encryptionKey)
      );
    } catch {
      // Already expired or revoked: deleting the row is enough.
    }
  }
  await prisma.gmailConnection.deleteMany({ where: { userId: user.id } });
  revalidateMail(user.id);
  return {};
}

// Opening a mail marks it as read.
export async function markRead(id: string): Promise<void> {
  const user = await requireUser();
  const parsed = messageId.safeParse(id);
  if (!parsed.success) return;
  await run(user.id, ({ gmail }) =>
    gmail.users.messages.modify({
      userId: 'me',
      id: parsed.data,
      requestBody: { removeLabelIds: ['UNREAD'] },
    })
  );
  updateTag(unreadTag(user.id));
}

// « Ranger dans » = add the label and leave the inbox. `undo` puts it back.
export async function fileMessage(id: string, label: string, undo = false): Promise<Result> {
  const user = await requireUser();
  const ids = z.tuple([messageId, labelId]).safeParse([id, label]);
  if (!ids.success) return { error: FAILED };
  const [message, target] = ids.data;
  const result = await run(user.id, ({ gmail }) =>
    gmail.users.messages.modify({
      userId: 'me',
      id: message,
      requestBody: undo
        ? { addLabelIds: [INBOX], removeLabelIds: [target] }
        : { addLabelIds: [target], removeLabelIds: [INBOX] },
    })
  );
  revalidateMail(user.id);
  return result.error ? { error: result.error } : {};
}

const newLabelSchema = z.object({
  name: z.string().trim().min(1, 'Donne un nom au libellé.').max(80),
  tone: z.string().refine(isLabelTone, 'Choisis une couleur.'),
});

// « Nouveau libellé »: created in Gmail, with a colour of Gmail's palette.
export async function createLabel(input: {
  name: string;
  tone: string;
}): Promise<Result & { id?: string }> {
  const user = await requireUser();
  const parsed = newLabelSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const color = NEW_LABEL_COLORS.find((item) => item.tone === parsed.data.tone)!.gmail;
  const result = await run(user.id, async ({ gmail }) => {
    const create = (withColor: boolean) =>
      gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: parsed.data.name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          ...(withColor ? { color } : {}),
        },
      });
    try {
      return (await create(true)).data.id ?? undefined;
    } catch (error) {
      // A colour Gmail refuses: the label is still created, without colour.
      if ((error as { status?: number }).status === 400) return (await create(false)).data.id;
      throw error;
    }
  });
  if (result.error) {
    return { error: result.error === FAILED ? 'Ce libellé existe peut-être déjà.' : result.error };
  }
  revalidateMail(user.id);
  return { id: result.value ?? undefined };
}

// « Se désabonner »: one-click POST (RFC 8058), else an unsubscribe mail, else the link to open.
export async function unsubscribe(id: string): Promise<
  Result & {
    method?: 'one-click' | 'mailto' | 'link';
    url?: string;
    sender?: string;
    oldMails?: number;
  }
> {
  const user = await requireUser();
  const parsed = messageId.safeParse(id);
  if (!parsed.success) return { error: FAILED };
  const result = await run(user.id, async (session) => {
    const message = await getMessage(session, parsed.data);
    const plan = message.unsubscribe;
    if (!plan) return { error: 'Ce mail ne propose pas de désinscription.' };
    if (plan.method === 'one-click') {
      const response = await fetch(plan.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
        // A redirect is not followed: it could lead to an internal address.
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status >= 400)
        return { error: 'L’expéditeur a refusé la désinscription. Réessaie plus tard.' };
    } else if (plan.method === 'mailto') {
      await session.gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: unsubscribeMail(session.email, plan) },
      });
    }
    const sender = message.from.email;
    if (plan.method !== 'link') {
      await prisma.mailUnsubscribe.upsert({
        where: { userId_sender: { userId: user.id, sender } },
        create: { userId: user.id, sender, method: plan.method },
        update: { method: plan.method, unsubscribedAt: new Date() },
      });
    }
    const { data } = await session.gmail.users.messages.list({
      userId: 'me',
      q: `from:${sender} in:inbox`,
      maxResults: 500,
    });
    return {
      method: plan.method,
      url: plan.method === 'link' ? plan.url : undefined,
      sender: message.from.name,
      oldMails: data.messages?.length ?? 0,
    };
  });
  if (result.error) return { error: result.error };
  revalidateMail(user.id);
  return result.value!;
}

// « Archiver ses anciens mails »: every mail of this sender leaves the inbox.
export async function archiveSender(id: string): Promise<Result & { count?: number }> {
  const user = await requireUser();
  const parsed = messageId.safeParse(id);
  if (!parsed.success) return { error: FAILED };
  const result = await run(user.id, async ({ gmail }) => {
    const { data: message } = await gmail.users.messages.get({
      userId: 'me',
      id: parsed.data,
      format: 'metadata',
      metadataHeaders: ['From'],
    });
    const sender = parseSender(header(message.payload as MessagePart, 'From')).email;
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${sender} in:inbox`,
      maxResults: 500,
    });
    const ids = (data.messages ?? []).map((item) => item.id!).filter(Boolean);
    if (ids.length > 0) {
      await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: { ids, removeLabelIds: [INBOX] },
      });
    }
    return ids.length;
  });
  if (result.error) return { error: result.error };
  revalidateMail(user.id);
  return { count: result.value };
}

// At most this many Gemini calls per list shown, to protect the free quota.
const CLASSIFY_PER_LOAD = 5;

// Recruiter replies: mails of the list that come from a company Alex applied to are classified
// once by Gemini (stored as MailMatch, without the mail content).
export async function classifyMessages(ids: string[]): Promise<Result & { classified?: number }> {
  const user = await requireUser();
  const parsed = z.array(messageId).max(25).safeParse(ids);
  if (!parsed.success) return { error: FAILED };
  const [applications, known] = await Promise.all([
    prisma.application.findMany({
      where: { userId: user.id },
      select: { id: true, company: true, position: true, sentAt: true },
    }),
    prisma.mailMatch.findMany({
      where: { userId: user.id, gmailMessageId: { in: parsed.data } },
      select: { gmailMessageId: true },
    }),
  ]);
  if (applications.length === 0) return { classified: 0 };
  const done = new Set(known.map((match) => match.gmailMessageId));
  const todo = parsed.data.filter((id) => !done.has(id));
  if (todo.length === 0) return { classified: 0 };

  const result = await run(user.id, async (session) => {
    const metadata = await mapLimit(todo, 10, (id) =>
      session.gmail.users.messages
        .get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From'] })
        .then(({ data }) => ({
          id,
          sender: parseSender(header(data.payload as MessagePart, 'From')),
        }))
    );
    const candidates = metadata
      .map((item) => ({ ...item, application: findApplication(item.sender, applications) }))
      .filter((item) => item.application)
      .slice(0, CLASSIFY_PER_LOAD);
    let classified = 0;
    for (const candidate of candidates) {
      const message = await getMessage(session, candidate.id);
      const application = candidate.application!;
      try {
        const answer = await generateJson(
          user.id,
          'mail-classify',
          mailClassifyPrompt({
            from: `${message.from.name} <${message.from.email}>`,
            subject: message.subject,
            body: mailPlainText(message.bodies),
            company: application.company,
            position: application.position,
          }),
          mailClassificationSchema
        );
        await prisma.mailMatch.createMany({
          data: [
            {
              userId: user.id,
              gmailMessageId: candidate.id,
              applicationId: application.id,
              classification: answer.classification,
              confidence: answer.confidence,
              reason: answer.reason,
            },
          ],
          skipDuplicates: true,
        });
        classified += 1;
      } catch (error) {
        // Quota or AI error: the mail will be classified on a later visit.
        if (error instanceof AiError) break;
        throw error;
      }
    }
    return classified;
  });
  if (result.error) return { error: result.error };
  if (result.value) revalidatePath('/mail');
  return { classified: result.value };
}

// Banner of a recruiter reply: « Marquer « Entretien RH » », « Marquer « Refus » » or « Ignorer ».
// Nothing changes on the application without this click.
export async function decideMatch(
  matchId: string,
  decision: 'HR_INTERVIEW' | 'REJECTED' | 'IGNORE'
): Promise<Result & { levelUp?: LevelUp | null }> {
  const user = await requireUser();
  const choice = z.enum(['HR_INTERVIEW', 'REJECTED', 'IGNORE']).parse(decision);
  const match = await prisma.mailMatch.findFirst({ where: { id: matchId, userId: user.id } });
  if (!match) return { error: 'Cette réponse n’existe plus.' };
  let levelUp: LevelUp | null | undefined;
  if (choice !== 'IGNORE') {
    if (!match.applicationId) return { error: 'La candidature liée a été supprimée.' };
    const result = await changeApplicationStatus(match.applicationId, choice);
    if (result.error) return { error: result.error };
    levelUp = result.levelUp;
  }
  await prisma.mailMatch.update({
    where: { id: match.id },
    data: { decision: choice === 'IGNORE' ? 'IGNORED' : 'ACCEPTED', decidedAt: new Date() },
  });
  revalidatePath('/mail');
  return { levelUp };
}
