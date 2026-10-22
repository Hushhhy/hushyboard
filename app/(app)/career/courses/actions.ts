'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { CourseStatus } from '@/generated/prisma/client';
import { parseDateInput } from '@/lib/dates';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { renderMarkdown } from '@/lib/markdown';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { LevelUp } from '@/lib/xp';
import { grantXp, revokeXp } from '@/lib/xp-events';

function revalidateLearning() {
  revalidatePath('/career/courses', 'layout');
  revalidatePath('/career/certifications');
  revalidatePath('/career/profile', 'layout');
  revalidatePath('/');
}

const statusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']);

// The single place where a course changes status: dates, progress and XP follow.
// Completing grants COURSE_COMPLETED once; leaving "completed" removes that XP (undo).
async function applyCourseStatus(
  userId: string,
  course: { id: string; title: string; status: CourseStatus; startedAt: Date | null },
  status: CourseStatus
): Promise<LevelUp | null> {
  const now = new Date();
  if (status === 'COMPLETED') {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        status,
        progress: 100,
        startedAt: course.startedAt ?? now,
        ...(course.status === 'COMPLETED' ? {} : { completedAt: now }),
      },
    });
    return grantXp(userId, 'COURSE_COMPLETED', course.id, `Cours terminé · ${course.title}`);
  }
  await prisma.course.update({
    where: { id: course.id },
    data: {
      status,
      completedAt: null,
      startedAt: status === 'IN_PROGRESS' ? (course.startedAt ?? now) : course.startedAt,
    },
  });
  if (course.status === 'COMPLETED') await revokeXp(userId, 'COURSE_COMPLETED', course.id);
  return null;
}

// Buttons "Commencer", "Terminer", and their "Annuler".
export async function setCourseStatus(
  courseId: string,
  status: string
): Promise<{ levelUp: LevelUp | null }> {
  const user = await requireUser();
  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) throw new Error('Course not found');
  const levelUp = await applyCourseStatus(user.id, course, statusSchema.parse(status));
  revalidateLearning();
  return { levelUp };
}

const courseSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Donne un titre au cours.').max(160),
  provider: z.string().trim().min(1, 'Indique la plateforme ou l’école.').max(80),
  status: statusSchema,
  progress: z.coerce
    .number({ error: 'Saisis un pourcentage entre 0 et 100.' })
    .int('Saisis un nombre entier.')
    .min(0, 'Saisis un pourcentage entre 0 et 100.')
    .max(100, 'Saisis un pourcentage entre 0 et 100.'),
  certificationId: z.string(),
  position: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/, 'Saisis un numéro, par exemple 4.'),
  nextDeadline: z.string(),
});

export async function saveCourse(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const deadline = data.nextDeadline ? parseDateInput(data.nextDeadline) : null;
  if (data.nextDeadline && !deadline) {
    return { fieldErrors: { nextDeadline: 'Choisis une date valide.' }, values };
  }
  const certification = data.certificationId
    ? await prisma.certification.findFirst({ where: { id: data.certificationId, userId: user.id } })
    : null;
  const skillIds = formData.getAll('skillIds').map(String);
  const skills = await prisma.skill.findMany({
    where: { id: { in: skillIds }, userId: user.id },
    select: { id: true },
  });

  const fields = {
    title: data.title,
    provider: data.provider,
    progress: data.status === 'COMPLETED' ? 100 : data.progress,
    certificationId: certification?.id ?? null,
    position: data.position ? Number(data.position) : null,
    nextDeadline: deadline,
  };

  let course;
  if (data.id) {
    const existing = await prisma.course.findFirst({ where: { id: data.id, userId: user.id } });
    if (!existing) return { error: "Ce cours n'existe plus.", values };
    course = await prisma.course.update({
      where: { id: existing.id },
      data: { ...fields, skills: { set: skills } },
    });
    course = { ...course, status: existing.status };
  } else {
    course = await prisma.course.create({
      data: { userId: user.id, ...fields, status: 'PLANNED', skills: { connect: skills } },
    });
  }

  const levelUp =
    course.status === data.status ? null : await applyCourseStatus(user.id, course, data.status);
  revalidateLearning();
  return { done: Date.now(), levelUp };
}

export async function deleteCourse(courseId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  // XP already earned stays: it rewarded real work.
  const deleted = await prisma.course.deleteMany({ where: { id: courseId, userId: user.id } });
  if (deleted.count === 0) return { error: "Ce cours n'existe plus." };
  revalidateLearning();
  redirect('/career/courses');
}

const noteSchema = z.object({
  title: z.string().trim().min(1, 'Donne un titre à la note.').max(120),
  // Markdown (GitHub style): long enough for code blocks and tables.
  content: z.string().trim().min(1, 'Écris la note.').max(20_000, '20 000 caractères au maximum.'),
});

export async function addCourseNote(
  courseId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return { error: "Ce cours n'existe plus.", values };
  await prisma.courseNote.create({ data: { courseId: course.id, ...parsed.data } });
  revalidateLearning();
  return { done: Date.now() };
}

export async function updateCourseNote(
  noteId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const updated = await prisma.courseNote.updateMany({
    where: { id: noteId, course: { userId: user.id } },
    data: parsed.data,
  });
  if (updated.count === 0) return { error: "Cette note n'existe plus.", values };
  revalidateLearning();
  return { done: Date.now() };
}

// "Aperçu" tab of the note editor: same rendering as the saved note, done on the server
// so the browser does not load the Markdown and sanitizer libraries.
export async function previewMarkdown(source: string): Promise<string> {
  await requireUser();
  return renderMarkdown(z.string().max(20_000).parse(source));
}

export async function deleteCourseNote(noteId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const deleted = await prisma.courseNote.deleteMany({
    where: { id: noteId, course: { userId: user.id } },
  });
  if (deleted.count === 0) return { error: "Cette note n'existe plus." };
  revalidateLearning();
  return {};
}
