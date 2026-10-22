'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import {
  AiError,
  generateJson,
  generateJsonWithModel,
  generateTextWithModel,
} from '@/lib/ai/gemini';
import {
  coverLetterPrompt,
  cvAdaptPrompt,
  cvAnalysisPrompt,
  offerExtractPrompt,
  type OfferForPrompt,
} from '@/lib/ai/prompts/job-search';
import { getBaseResume, getSkillLevels } from '@/lib/job-search-data';
import {
  CONTRACT_LABELS,
  cvAnalysisSchema,
  offerExtractSchema,
  parseStoredAnalysis,
  type OfferExtract,
  type StoredAnalysis,
} from '@/lib/job-search-schemas';
import { prisma } from '@/lib/prisma';
import { guardAdaptedResume } from '@/lib/resume/adapt';
import { parseResumeContent, resumeContentSchema } from '@/lib/resume/schema';
import { requireUser } from '@/lib/session';

// Gemini work on a job offer: extraction, CV analysis, adapted CV, cover letter.
// Results are stored on the offer, so each one costs a call only once (or on « Régénérer »).

type Result = { error?: string };

const aiMessage = (error: unknown) =>
  error instanceof AiError ? error.message : 'La génération a échoué. Réessaie.';

const NO_RESUME =
  'Importe d’abord ton CV dans l’onglet CV : l’analyse compare l’offre à ton CV de base.';

function revalidateOffer(offerId: string) {
  revalidatePath(`/career/job-search/offers/${offerId}`);
  revalidatePath('/career/job-search', 'layout');
  revalidatePath('/career/resume');
}

// « Analyser l'offre » in « Ajouter une offre »: fills the form, nothing is saved yet.
export async function extractOffer(
  text: string,
  url: string
): Promise<{ error?: string; offer?: OfferExtract }> {
  const user = await requireUser();
  const input = z
    .object({
      text: z.string().trim().min(80, 'Colle le texte complet de l’offre.').max(60_000),
      url: z.string().trim().max(500),
    })
    .safeParse({ text, url });
  if (!input.success) return { error: input.error.issues[0].message };
  try {
    const offer = await generateJson(
      user.id,
      'offer-extract',
      offerExtractPrompt(input.data.text, input.data.url || null),
      offerExtractSchema
    );
    return { offer };
  } catch (error) {
    return { error: aiMessage(error) };
  }
}

async function ownedOffer(userId: string, offerId: string) {
  const offer = await prisma.jobOffer.findFirst({
    where: { id: offerId, userId },
    include: { adaptedResume: true, coverLetter: true },
  });
  if (!offer) throw new Error('Offer not found');
  return offer;
}

function offerForPrompt(offer: {
  title: string;
  company: string;
  location: string | null;
  contractType: keyof typeof CONTRACT_LABELS | null;
  remotePolicy: string | null;
  tags: string[];
  description: string | null;
  summary: string | null;
}): OfferForPrompt {
  return {
    title: offer.title,
    company: offer.company,
    location: offer.location,
    contract: offer.contractType ? CONTRACT_LABELS[offer.contractType] : null,
    remotePolicy: offer.remotePolicy,
    skills: offer.tags,
    description: offer.description ?? offer.summary,
  };
}

// « Analyse du CV »: generated on first open, « Régénérer » recomputes it (and drops the
// adapted CV, which followed the old analysis).
export async function analyzeOffer(offerId: string, force = false): Promise<Result> {
  const user = await requireUser();
  const offer = await ownedOffer(user.id, offerId);
  if (offer.analysis && !force) return {};
  const base = await getBaseResume(user.id);
  const content = base ? parseResumeContent(base.content) : null;
  if (!base || !content) return { error: NO_RESUME };
  const skills = await getSkillLevels(user.id);
  try {
    const { data, model } = await generateJsonWithModel(
      user.id,
      'cv-analysis',
      cvAnalysisPrompt({ offer: offerForPrompt(offer), resume: content, skills }),
      cvAnalysisSchema
    );
    const analysis: StoredAnalysis = {
      ...data,
      baseResumeId: base.id,
      baseResumeName: base.name,
      model,
    };
    await prisma.$transaction([
      prisma.jobOffer.update({
        where: { id: offer.id },
        data: { analysis: analysis as Prisma.InputJsonValue, analyzedAt: new Date() },
      }),
      // Not used by an application: the next download adapts the CV again.
      ...(force && offer.adaptedResume
        ? [
            prisma.resume.deleteMany({
              where: { id: offer.adaptedResume.id, applications: { none: {} } },
            }),
          ]
        : []),
    ]);
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateOffer(offer.id);
  return {};
}

// The CV adapted to the offer, created on the first « Télécharger le CV adapté (PDF) » or
// before the first letter. Gemini rewrites and reorders; guardAdaptedResume removes anything
// it would have invented.
async function ensureAdaptedResume(
  userId: string,
  offerId: string
): Promise<{ error?: string; resumeId?: string }> {
  const offer = await ownedOffer(userId, offerId);
  if (offer.adaptedResume && parseResumeContent(offer.adaptedResume.content)) {
    return { resumeId: offer.adaptedResume.id };
  }
  const analysis = parseStoredAnalysis(offer.analysis);
  if (!analysis) return { error: 'L’analyse du CV doit être prête avant.' };
  const base =
    (await prisma.resume.findFirst({ where: { id: analysis.baseResumeId, userId } })) ??
    (await getBaseResume(userId));
  const content = base ? parseResumeContent(base.content) : null;
  if (!base || !content) return { error: NO_RESUME };
  const skills = await getSkillLevels(userId);
  try {
    const adapted = await generateJson(
      userId,
      'cv-adapt',
      cvAdaptPrompt({ offer: offerForPrompt(offer), resume: content, analysis, skills }),
      resumeContentSchema
    );
    const guarded = guardAdaptedResume(content, adapted, {
      known: skills.filter((skill) => skill.level >= 1).map((skill) => skill.name),
      learning: skills.filter((skill) => skill.level === 0 && skill.started).map((s) => s.name),
    });
    const data = {
      name: `${base.name} · adapté à ${offer.company}`.slice(0, 120),
      content: guarded as Prisma.InputJsonValue,
      basedOnId: base.id,
    };
    const resume = offer.adaptedResume
      ? await prisma.resume.update({ where: { id: offer.adaptedResume.id }, data })
      : await prisma.resume.create({ data: { ...data, userId, jobOfferId: offer.id } });
    return { resumeId: resume.id };
  } catch (error) {
    return { error: aiMessage(error) };
  }
}

// « Télécharger le CV adapté (PDF) »: returns the id; the browser then opens the PDF route.
export async function prepareAdaptedResume(
  offerId: string
): Promise<{ error?: string; resumeId?: string }> {
  const user = await requireUser();
  const result = await ensureAdaptedResume(user.id, offerId);
  if (result.resumeId) revalidateOffer(offerId);
  return result;
}

// « Rédiger la lettre » / « Régénérer »: from the adapted CV, in Alex's style.
export async function generateCoverLetter(offerId: string, force = false): Promise<Result> {
  const user = await requireUser();
  const offer = await ownedOffer(user.id, offerId);
  if (offer.coverLetter && !force) return {};
  const adapted = await ensureAdaptedResume(user.id, offer.id);
  if (!adapted.resumeId) return { error: adapted.error };
  const resume = await prisma.resume.findFirst({
    where: { id: adapted.resumeId, userId: user.id },
  });
  const content = resume ? parseResumeContent(resume.content) : null;
  if (!content) return { error: NO_RESUME };
  try {
    const { text, model } = await generateTextWithModel(
      user.id,
      'cover-letter',
      coverLetterPrompt({ offer: offerForPrompt(offer), resume: content })
    );
    await prisma.coverLetter.upsert({
      where: { jobOfferId: offer.id },
      create: { jobOfferId: offer.id, content: text, model },
      update: { content: text, model, editedAt: null },
    });
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateOffer(offer.id);
  return {};
}

// The letter edited inline, saved on blur.
export async function saveCoverLetter(offerId: string, content: string): Promise<Result> {
  const user = await requireUser();
  const offer = await ownedOffer(user.id, offerId);
  const parsed = z.string().trim().min(1, 'La lettre est vide.').max(8000).safeParse(content);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!offer.coverLetter) return { error: 'Rédige d’abord la lettre.' };
  await prisma.coverLetter.update({
    where: { jobOfferId: offer.id },
    data: { content: parsed.data, editedAt: new Date() },
  });
  revalidateOffer(offer.id);
  return {};
}
