import { cacheLife, cacheTag } from 'next/cache';
import type { gmail_v1 } from '@googleapis/gmail';
import { prisma } from '@/lib/prisma';
import { gmailConfig, mapLimit, withGmail, type GmailSession } from './client';
import { INBOX, nearestTone, type LabelTone } from './labels';
import { extractBodies, header, type MessagePart } from './message';
import { parseSender, type Sender } from './match';
import { unsubscribePlan } from './unsubscribe';

// Reads of the « Mails » page. Results go straight to the page: nothing is stored.

export type MailState =
  | { status: 'unconfigured' }
  | { status: 'disconnected' }
  | { status: 'expired'; email: string }
  | { status: 'connected'; email: string };

export async function getMailState(userId: string): Promise<MailState> {
  if (!gmailConfig()) return { status: 'unconfigured' };
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!connection) return { status: 'disconnected' };
  if (connection.lastErrorAt) return { status: 'expired', email: connection.email };
  return { status: 'connected', email: connection.email };
}

export type MailLabel = { id: string; name: string; tone: LabelTone; unread: number };

// Inbox, then Alex's own labels (Gmail system labels are hidden), with their unread counts.
export async function listLabels(session: GmailSession): Promise<MailLabel[]> {
  const { data } = await session.gmail.users.labels.list({ userId: 'me' });
  const own = (data.labels ?? []).filter((label) => label.type === 'user' && label.id);
  const detailed = await mapLimit([INBOX, ...own.map((label) => label.id!)], 10, (id) =>
    session.gmail.users.labels.get({ userId: 'me', id }).then((response) => response.data)
  );
  return detailed.map((label) => ({
    id: label.id!,
    name: label.id === INBOX ? 'Boîte de réception' : (label.name ?? ''),
    tone: label.id === INBOX ? 'neutral' : nearestTone(label.color?.backgroundColor),
    unread: label.messagesUnread ?? 0,
  }));
}

export type MailSummary = {
  id: string;
  threadId: string;
  from: Sender;
  subject: string;
  snippet: string;
  date: Date;
  unread: boolean;
  labelIds: string[];
};

const METADATA_HEADERS = [
  'From',
  'To',
  'Subject',
  'Date',
  'List-Unsubscribe',
  'List-Unsubscribe-Post',
];

function toSummary(message: gmail_v1.Schema$Message): MailSummary {
  const payload = message.payload as MessagePart | undefined;
  return {
    id: message.id!,
    threadId: message.threadId ?? message.id!,
    from: parseSender(header(payload, 'From')),
    subject: header(payload, 'Subject') || '(sans objet)',
    snippet: decodeEntities(message.snippet ?? ''),
    date: new Date(Number(message.internalDate ?? Date.now())),
    unread: (message.labelIds ?? []).includes('UNREAD'),
    labelIds: message.labelIds ?? [],
  };
}

// Gmail snippets come HTML-escaped ("&#39;").
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// One page of 25 mails of a label (or all mail), with Gmail's own search syntax.
export async function listMessages(
  session: GmailSession,
  options: { labelId: string | null; query: string; pageToken: string | null }
): Promise<{ messages: MailSummary[]; nextPageToken: string | null }> {
  const { data } = await session.gmail.users.messages.list({
    userId: 'me',
    maxResults: 25,
    labelIds: options.labelId ? [options.labelId] : undefined,
    q: options.query || undefined,
    pageToken: options.pageToken ?? undefined,
  });
  const messages = await mapLimit(data.messages ?? [], 10, (item) =>
    session.gmail.users.messages
      .get({ userId: 'me', id: item.id!, format: 'metadata', metadataHeaders: METADATA_HEADERS })
      .then((response) => toSummary(response.data))
  );
  return { messages, nextPageToken: data.nextPageToken ?? null };
}

export type MailDetail = MailSummary & {
  to: string;
  bodies: { html: string | null; text: string | null };
  unsubscribe: ReturnType<typeof unsubscribePlan>;
};

export async function getMessage(session: GmailSession, id: string): Promise<MailDetail> {
  const { data } = await session.gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  const payload = data.payload as MessagePart | undefined;
  return {
    ...toSummary(data),
    to: header(payload, 'To'),
    bodies: extractBodies(payload),
    unsubscribe: unsubscribePlan(
      header(payload, 'List-Unsubscribe'),
      header(payload, 'List-Unsubscribe-Post')
    ),
  };
}

export const unreadTag = (userId: string) => `gmail-unread-${userId}`;

// Inbox unread count for the sidebar, cached 60 s (one Gmail call a minute at most).
export async function getInboxUnread(userId: string): Promise<number | null> {
  'use cache';
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag(unreadTag(userId));
  try {
    return await withGmail(userId, async (session) => {
      const { data } = await session.gmail.users.labels.get({ userId: 'me', id: INBOX });
      return data.messagesUnread ?? 0;
    });
  } catch {
    return null;
  }
}
