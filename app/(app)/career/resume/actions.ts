'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { AiError, generateJson } from '@/lib/ai/gemini';
import { CV_IMPORT_PROMPT } from '@/lib/ai/prompts/cv-import';
import { formatMonthKey, monthKeyInParis } from '@/lib/dates';
import type { FormState } from '@/lib/forms';
import { prisma } from '@/lib/prisma';
import {
  EMPTY_RESUME,
  coerceResumeContent,
  resumeContentSchema,
  type ResumeContent,
} from '@/lib/resume/schema';
import { requireUser } from '@/lib/session';

const RESUME_PATH = '/career/resume';
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function revalidateResumes() {
  revalidatePath(RESUME_PATH, 'layout');
}

// "Full stack · oct. 2026" style default name: "CV importé · octobre 2026".
function defaultName(prefix: string): string {
  return `${prefix} · ${formatMonthKey(monthKeyInParis(new Date()))}`;
}

async function createResume(userId: string, name: string, content: ResumeContent) {
  const hasDefault = await prisma.resume.count({ where: { userId, isDefault: true } });
  return prisma.resume.create({
    data: {
      userId,
      name,
      content: content as Prisma.InputJsonValue,
      isDefault: hasDefault === 0,
    },
  });
}

// Import: the PDF is sent to Gemini, then discarded. Only the extracted content is stored.
export async function importResume(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: 'Choisis le PDF de ton CV.' } };
  }
  if (file.type !== 'application/pdf') {
    return { fieldErrors: { file: 'Le fichier doit être un PDF.' } };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { fieldErrors: { file: 'Le PDF dépasse 4 Mo. Exporte-le en taille réduite.' } };
  }

  let content: ResumeContent;
  try {
    content = await generateJson(
      user.id,
      'cv-import',
      CV_IMPORT_PROMPT,
      resumeContentSchema,
      [{ mimeType: 'application/pdf', data: Buffer.from(await file.arrayBuffer()) }],
      { coerce: (data) => coerceResumeContent(data, user.name) }
    );
  } catch (error) {
    return { error: error instanceof AiError ? error.message : 'Import impossible. Réessaie.' };
  }

  const resume = await createResume(user.id, defaultName('CV importé'), content);
  revalidateResumes();
  redirect(`${RESUME_PATH}/${resume.id}/edit?imported=1`);
}

// Without AI (quota reached, or a CV written from scratch): prefilled with the profile.
export async function createEmptyResume(): Promise<void> {
  const user = await requireUser();
  const profile = await prisma.profileInfo.findUnique({ where: { userId: user.id } });
  const content: ResumeContent = {
    ...EMPTY_RESUME,
    header: {
      ...EMPTY_RESUME.header,
      fullName: user.name,
      email: user.email,
      location: profile?.zone ?? '',
      github: profile?.githubUrl ?? '',
    },
  };
  const resume = await createResume(user.id, defaultName('Nouveau CV'), content);
  revalidateResumes();
  redirect(`${RESUME_PATH}/${resume.id}/edit`);
}

async function ownedResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new Error('Resume not found');
  return resume;
}

export async function duplicateResume(resumeId: string): Promise<void> {
  const user = await requireUser();
  const source = await ownedResume(user.id, resumeId);
  const copy = await prisma.resume.create({
    data: {
      userId: user.id,
      name: `${source.name} (copie)`,
      language: source.language,
      content: (source.content ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  revalidateResumes();
  redirect(`${RESUME_PATH}?v=${copy.id}`);
}

export async function setDefaultResume(resumeId: string): Promise<void> {
  const user = await requireUser();
  const resume = await ownedResume(user.id, resumeId);
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.resume.update({ where: { id: resume.id }, data: { isDefault: true } }),
  ]);
  revalidateResumes();
}

const saveSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Donne un nom à cette version.')
    .max(80, '80 caractères au maximum.'),
  content: resumeContentSchema,
});

export type SaveResumeResult = { error?: string; issues?: { path: string; message: string }[] };

export async function saveResume(
  resumeId: string,
  input: { name: string; content: ResumeContent }
): Promise<SaveResumeResult> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: 'Certains champs sont à corriger.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  const resume = await ownedResume(user.id, resumeId);
  await prisma.resume.update({
    where: { id: resume.id },
    data: { name: parsed.data.name, content: parsed.data.content as Prisma.InputJsonValue },
  });
  revalidateResumes();
  redirect(`${RESUME_PATH}?v=${resume.id}`);
}

export async function deleteResume(resumeId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId: user.id } });
  if (!resume) return { error: "Cette version n'existe plus." };
  await prisma.resume.delete({ where: { id: resume.id } });
  // Keep one default version when there are others left.
  if (resume.isDefault) {
    const next = await prisma.resume.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (next) await prisma.resume.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidateResumes();
  redirect(RESUME_PATH);
}
