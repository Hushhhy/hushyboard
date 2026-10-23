'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ApplicationStatus } from '@/generated/prisma/client';
import { parseDateInput, todayInParis } from '@/lib/dates';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { followUpDate, statusXpReason } from '@/lib/job-search';
import { CONTRACT_TYPES } from '@/lib/job-search-schemas';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { LevelUp } from '@/lib/xp';
import { grantApplicationXp, grantXp, revokeXp } from '@/lib/xp-events';

// Applications (offer-based and spontaneous), offers of the watch, sources and keywords.

function revalidateJobSearch() {
  revalidatePath('/career/job-search', 'layout');
  revalidatePath('/career/resume');
  revalidatePath('/');
}

const STATUSES = [
  'SENT',
  'WAITING',
  'HR_INTERVIEW',
  'TECH_INTERVIEW',
  'OFFER',
  'REJECTED',
  'NO_RESPONSE',
  'FOLLOWED_UP',
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || /^https?:\/\/\S+$/.test(value), 'Indique une adresse en http(s)://')
  .transform((value) => value || null);

const applicationSchema = z
  .object({
    id: z.string().optional(),
    kind: z.enum(['OFFER', 'SPONTANEOUS']),
    company: z.string().trim().min(1, 'Indique l’entreprise.').max(120),
    position: optionalText(160),
    contractType: z
      .enum(CONTRACT_TYPES)
      .or(z.literal(''))
      .transform((value) => value || null),
    location: optionalText(120),
    source: optionalText(80),
    url: optionalUrl,
    careersUrl: optionalUrl,
    sentAt: z.string().refine((value) => parseDateInput(value) !== null, 'Date invalide.'),
    resumeId: z.string().transform((value) => value || null),
    notes: optionalText(2000),
  })
  .refine((data) => data.kind === 'SPONTANEOUS' || data.position, {
    path: ['position'],
    message: 'Indique le poste.',
  });

const APPLICATION_DEFAULTS = {
  position: '',
  contractType: '',
  location: '',
  source: '',
  url: '',
  careersUrl: '',
  resumeId: '',
  notes: '',
};

const applicationLabel = (company: string, position: string | null) =>
  position ? `${position} · ${company}` : `Candidature spontanée · ${company}`;

async function ownedResumeId(userId: string, resumeId: string | null) {
  if (!resumeId) return null;
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  return resume?.id ?? null;
}

// « Ajouter une candidature » / « Ajouter un site » and their edit forms.
// A new application starts as « Envoyée », with a follow-up 14 days later, and earns
// APPLICATION_SENT (within the daily cap) when a CV is attached.
export async function saveApplication(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  // Each form shows only some fields (no offer link on a spontaneous one): missing = empty.
  const parsed = applicationSchema.safeParse({ ...APPLICATION_DEFAULTS, ...values });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, sentAt: sentAtInput, resumeId: requestedResume, ...data } = parsed.data;
  const sentAt = parseDateInput(sentAtInput)!;
  const resumeId = await ownedResumeId(user.id, requestedResume);

  let applicationId: string;
  if (id) {
    const existing = await prisma.application.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { error: 'Cette candidature n’existe plus.', values };
    await prisma.application.update({
      where: { id: existing.id },
      data: { ...data, sentAt, resumeId },
    });
    applicationId = existing.id;
  } else {
    const created = await prisma.application.create({
      data: {
        ...data,
        userId: user.id,
        sentAt,
        resumeId,
        status: 'SENT',
        followUpAt: followUpDate(sentAt),
        events: { create: { status: 'SENT', occurredAt: sentAt } },
      },
    });
    applicationId = created.id;
  }

  const levelUp = resumeId
    ? await grantApplicationXp(
        user.id,
        applicationId,
        applicationLabel(data.company, data.position)
      )
    : null;
  revalidateJobSearch();
  return { done: Date.now(), levelUp };
}

// Status change from the side panel or a quick button: one event, the XP of the new status
// (interviews, offer), and a new follow-up date when Alex has just followed up.
export async function changeApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ error?: string; eventId?: string; levelUp?: LevelUp | null }> {
  const user = await requireUser();
  const next = z.enum(STATUSES).parse(status);
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
  });
  if (!application) return { error: 'Cette candidature n’existe plus.' };
  if (application.status === next) return {};

  const today = todayInParis(new Date());
  const [event] = await prisma.$transaction([
    prisma.applicationEvent.create({
      data: { applicationId: application.id, status: next },
    }),
    prisma.application.update({
      where: { id: application.id },
      data: {
        status: next,
        ...(next === 'FOLLOWED_UP' ? { followUpAt: followUpDate(today) } : {}),
      },
    }),
  ]);
  const reason = statusXpReason(next);
  const levelUp = reason
    ? await grantXp(
        user.id,
        reason,
        application.id,
        applicationLabel(application.company, application.position)
      )
    : null;
  revalidateJobSearch();
  return { eventId: event.id, levelUp };
}

// « Annuler » after a status change: the event goes, the previous status comes back, and the
// XP of the cancelled status is removed if no other event of that status remains.
export async function undoApplicationEvent(eventId: string): Promise<void> {
  const user = await requireUser();
  const event = await prisma.applicationEvent.findFirst({
    where: { id: eventId, application: { userId: user.id } },
    include: { application: true },
  });
  if (!event) return;
  await prisma.applicationEvent.delete({ where: { id: event.id } });
  const remaining = await prisma.applicationEvent.findMany({
    where: { applicationId: event.applicationId },
    orderBy: { occurredAt: 'asc' },
  });
  const previous = remaining.at(-1)?.status ?? 'SENT';
  await prisma.application.update({
    where: { id: event.applicationId },
    data: {
      status: previous,
      ...(event.status === 'FOLLOWED_UP'
        ? { followUpAt: followUpDate(event.application.sentAt) }
        : {}),
    },
  });
  const reason = statusXpReason(event.status);
  if (reason && !remaining.some((item) => item.status === event.status)) {
    await revokeXp(user.id, reason, event.applicationId);
  }
  revalidateJobSearch();
}

export async function setFollowUpDate(applicationId: string, value: string): Promise<void> {
  const user = await requireUser();
  const date = value ? parseDateInput(value) : null;
  if (value && !date) return;
  await prisma.application.updateMany({
    where: { id: applicationId, userId: user.id },
    data: { followUpAt: date },
  });
  revalidateJobSearch();
}

// Deleting an application removes the XP it earned (it was a mistake) and puts its offer
// back in the watch.
export async function deleteApplication(applicationId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
  });
  if (!application) return {};
  await prisma.$transaction([
    prisma.xpEvent.deleteMany({ where: { userId: user.id, sourceId: application.id } }),
    prisma.application.delete({ where: { id: application.id } }),
    ...(application.jobOfferId
      ? [
          prisma.jobOffer.update({
            where: { id: application.jobOfferId },
            data: { decision: 'PENDING', decidedAt: null },
          }),
        ]
      : []),
  ]);
  revalidateJobSearch();
  return {};
}

// --- Offers ----------------------------------------------------------------------------

const offerSchema = z.object({
  title: z.string().trim().min(1, 'Indique l’intitulé du poste.').max(160),
  company: z.string().trim().min(1, 'Indique l’entreprise.').max(120),
  location: optionalText(120),
  contractType: z
    .enum(CONTRACT_TYPES)
    .or(z.literal(''))
    .transform((value) => value || null),
  remotePolicy: optionalText(80),
  skills: z.string().max(600),
  summary: optionalText(400),
  url: optionalUrl,
  source: optionalText(80),
  description: optionalText(20_000),
});

// « Enregistrer l'offre » (after the AI extraction, or filled by hand).
export async function saveOffer(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = offerSchema.safeParse({
    contractType: '',
    skills: '',
    location: '',
    remotePolicy: '',
    summary: '',
    url: '',
    source: '',
    description: '',
    ...values,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { skills, ...data } = parsed.data;
  await prisma.jobOffer.create({
    data: {
      ...data,
      userId: user.id,
      tags: [
        ...new Set(
          skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
        ),
      ].slice(0, 15),
    },
  });
  revalidateJobSearch();
  return { done: Date.now() };
}

// « Refusé » on an offer card, and « Annuler » to put it back.
export async function setOfferDecision(
  offerId: string,
  decision: 'PENDING' | 'DISMISSED'
): Promise<void> {
  const user = await requireUser();
  const offer = await prisma.jobOffer.findFirst({ where: { id: offerId, userId: user.id } });
  // An offer Alex applied to changes only by deleting the application.
  if (!offer || offer.decision === 'APPLIED') return;
  await prisma.jobOffer.update({
    where: { id: offer.id },
    data: { decision, decidedAt: decision === 'PENDING' ? null : new Date() },
  });
  revalidateJobSearch();
}

// « Postulé » / « Marquer postulée »: the application is created from the offer, with the
// chosen CV (else the CV adapted to this offer, else the default one).
export async function applyToOffer(
  offerId: string,
  input: { resumeId?: string; sentAt?: string } = {}
): Promise<{ error?: string; levelUp?: LevelUp | null }> {
  const user = await requireUser();
  const offer = await prisma.jobOffer.findFirst({
    where: { id: offerId, userId: user.id },
    include: { application: true, adaptedResume: { select: { id: true } } },
  });
  if (!offer) return { error: 'Cette offre n’existe plus.' };
  if (offer.application) return { error: 'Tu as déjà postulé à cette offre.' };

  const sentAt = (input.sentAt && parseDateInput(input.sentAt)) || todayInParis(new Date());
  const chosen =
    input.resumeId === 'none'
      ? null
      : ((await ownedResumeId(user.id, input.resumeId ?? null)) ??
        offer.adaptedResume?.id ??
        (
          await prisma.resume.findFirst({
            where: { userId: user.id, jobOfferId: null },
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
            select: { id: true },
          })
        )?.id ??
        null);

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        userId: user.id,
        kind: 'OFFER',
        company: offer.company,
        position: offer.title,
        contractType: offer.contractType,
        location: offer.location,
        source: offer.source,
        url: offer.url,
        sentAt,
        followUpAt: followUpDate(sentAt),
        resumeId: chosen,
        jobOfferId: offer.id,
        events: { create: { status: 'SENT', occurredAt: sentAt } },
      },
    });
    await tx.jobOffer.update({
      where: { id: offer.id },
      data: { decision: 'APPLIED', decidedAt: new Date() },
    });
    return created;
  });
  const levelUp = chosen
    ? await grantApplicationXp(
        user.id,
        application.id,
        applicationLabel(offer.company, offer.title)
      )
    : null;
  revalidateJobSearch();
  return { levelUp };
}

export async function deleteOffer(offerId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const offer = await prisma.jobOffer.findFirst({
    where: { id: offerId, userId: user.id },
    include: { application: { select: { id: true } } },
  });
  if (!offer) return {};
  if (offer.application) {
    return { error: 'Supprime d’abord la candidature liée, dans l’onglet Candidatures.' };
  }
  await prisma.jobOffer.delete({ where: { id: offer.id } });
  revalidateJobSearch();
  return {};
}

// --- Sources and keywords ----------------------------------------------------------------

export async function addWatchSource(name: string, url: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z
    .object({ name: z.string().trim().min(1, 'Nomme la source.').max(80), url: optionalUrl })
    .safeParse({ name, url });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const exists = await prisma.watchSource.findUnique({
    where: { userId_name: { userId: user.id, name: parsed.data.name } },
  });
  if (exists) return { error: 'Cette source est déjà suivie.' };
  const last = await prisma.watchSource.aggregate({
    where: { userId: user.id },
    _max: { position: true },
  });
  await prisma.watchSource.create({
    data: { userId: user.id, ...parsed.data, position: (last._max.position ?? -1) + 1 },
  });
  revalidateJobSearch();
  return {};
}

export async function removeWatchSource(sourceId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.watchSource.deleteMany({ where: { id: sourceId, userId: user.id } });
  revalidateJobSearch();
  return {};
}

export async function addWatchKeyword(label: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z.string().trim().min(1, 'Écris un mot-clé.').max(60).safeParse(label);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.watchKeyword.createMany({
    data: [{ userId: user.id, label: parsed.data }],
    skipDuplicates: true,
  });
  revalidateJobSearch();
  return {};
}

export async function removeWatchKeyword(keywordId: string): Promise<void> {
  const user = await requireUser();
  await prisma.watchKeyword.deleteMany({ where: { id: keywordId, userId: user.id } });
  revalidateJobSearch();
}
