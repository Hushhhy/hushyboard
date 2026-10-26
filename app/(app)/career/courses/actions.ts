'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { CourseItemKind, CourseStatus } from '@/generated/prisma/client';
import { isQuizPassed } from '@/lib/course-progress';
import { parseDateInput } from '@/lib/dates';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { renderMarkdownWithCode } from '@/lib/markdown';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { LevelUp } from '@/lib/xp';
import { grantXp, revokeXp } from '@/lib/xp-events';

function revalidateLearning() {
  revalidatePath('/career/courses', 'layout');
  revalidatePath('/career/projects', 'layout');
  revalidatePath('/career/certifications');
  revalidatePath('/career/profile', 'layout');
  revalidatePath('/');
}

const statusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']);

// The single place where a course changes status: dates and XP follow.
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

// --- Plan of a course: modules and their items (parts, quizzes, solo projects) ---------

async function ownedItem(userId: string, itemId: string) {
  const item = await prisma.courseItem.findFirst({
    where: { id: itemId, module: { course: { userId } } },
    include: { module: { include: { course: true } } },
  });
  if (!item) throw new Error('Course item not found');
  return item;
}

// XP of one item, recomputed from its current state: a quiz passed with 70 % or more,
// a finished solo project. Anything else (unchecked, score too low) removes the XP.
async function syncItemXp(
  userId: string,
  item: {
    id: string;
    kind: CourseItemKind;
    title: string;
    completedAt: Date | null;
    score: number | null;
  }
): Promise<LevelUp | null> {
  if (item.kind === 'QUIZ') {
    if (isQuizPassed(item))
      return grantXp(userId, 'QUIZ_PASSED', item.id, `Quiz réussi · ${item.title}`);
    await revokeXp(userId, 'QUIZ_PASSED', item.id);
  }
  if (item.kind === 'SOLO_PROJECT') {
    if (item.completedAt) {
      return grantXp(userId, 'SOLO_PROJECT_COMPLETED', item.id, `Solo project · ${item.title}`);
    }
    await revokeXp(userId, 'SOLO_PROJECT_COMPLETED', item.id);
  }
  return null;
}

const scoreSchema = z
  .number({ error: 'Saisis un score entre 0 et 100.' })
  .int('Saisis un score entier.')
  .min(0, 'Saisis un score entre 0 et 100.')
  .max(100, 'Saisis un score entre 0 et 100.')
  .nullable();

// Check or uncheck an item, and for a quiz, set its score. Checking the first item of a
// planned course starts it. Returns the level-up, if any.
export async function updateCourseItem(
  itemId: string,
  change: { done?: boolean; score?: number | null }
): Promise<{ levelUp: LevelUp | null; error?: string }> {
  const user = await requireUser();
  const item = await ownedItem(user.id, itemId);

  let score = item.score;
  if (change.score !== undefined) {
    const parsed = scoreSchema.safeParse(change.score);
    if (!parsed.success) return { levelUp: null, error: parsed.error.issues[0].message };
    score = parsed.data;
  }
  let completedAt = item.completedAt;
  if (change.done !== undefined)
    completedAt = change.done ? (item.completedAt ?? new Date()) : null;

  const updated = await prisma.courseItem.update({
    where: { id: item.id },
    // Only quizzes have a score.
    data: { completedAt, score: item.kind === 'QUIZ' ? score : null },
  });
  const course = item.module.course;
  if (completedAt && course.status === 'PLANNED') {
    await prisma.course.update({
      where: { id: course.id },
      data: { status: 'IN_PROGRESS', startedAt: course.startedAt ?? new Date() },
    });
  }
  const levelUp = await syncItemXp(user.id, updated);
  revalidateLearning();
  return { levelUp };
}

const itemKindSchema = z.enum(['PART', 'QUIZ', 'SOLO_PROJECT']);

const moduleSchema = z.object({
  title: z.string().trim().min(1, 'Donne un titre au module.').max(120),
  items: z
    .array(
      z.object({
        id: z.string().nullable(),
        kind: itemKindSchema,
        title: z.string().trim().min(1, 'Un élément du module n’a pas de titre.').max(160),
      })
    )
    .max(60, '60 éléments au maximum par module.'),
});

// Edit mode: create or save one module with its items (rename, add, remove, reorder).
// Removing an item keeps the XP it earned, like deleting a course.
export async function saveCourseModule(
  courseId: string,
  moduleId: string | null,
  input: { title: string; items: { id: string | null; kind: string; title: string }[] }
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: user.id },
    include: { modules: { include: { items: { select: { id: true } } } } },
  });
  if (!course) return { error: "Ce cours n'existe plus." };

  const existing = moduleId ? course.modules.find((item) => item.id === moduleId) : null;
  if (moduleId && !existing) return { error: "Ce module n'existe plus." };
  const ownIds = new Set(existing?.items.map((item) => item.id) ?? []);
  const keptIds = parsed.data.items.flatMap((item) => (item.id ? [item.id] : []));
  if (keptIds.some((id) => !ownIds.has(id))) return { error: 'Élément inconnu.' };

  await prisma.$transaction(async (tx) => {
    const target = existing
      ? await tx.courseModule.update({
          where: { id: existing.id },
          data: { title: parsed.data.title },
        })
      : await tx.courseModule.create({
          data: {
            courseId: course.id,
            title: parsed.data.title,
            position: course.modules.reduce((max, item) => Math.max(max, item.position + 1), 0),
          },
        });
    await tx.courseItem.deleteMany({ where: { moduleId: target.id, id: { notIn: keptIds } } });
    for (const [position, item] of parsed.data.items.entries()) {
      if (item.id) {
        await tx.courseItem.update({
          where: { id: item.id },
          data: { title: item.title, kind: item.kind, position },
        });
      } else {
        await tx.courseItem.create({
          data: { moduleId: target.id, title: item.title, kind: item.kind, position },
        });
      }
    }
  });
  revalidateLearning();
  return {};
}

export async function moveCourseModule(moduleId: string, delta: -1 | 1): Promise<void> {
  const user = await requireUser();
  const courseModule = await prisma.courseModule.findFirst({
    where: { id: moduleId, course: { userId: user.id } },
  });
  if (!courseModule) throw new Error('Module not found');
  const modules = await prisma.courseModule.findMany({
    where: { courseId: courseModule.courseId },
    orderBy: { position: 'asc' },
  });
  const index = modules.findIndex((item) => item.id === moduleId);
  const target = index + delta;
  if (target < 0 || target >= modules.length) return;
  [modules[index], modules[target]] = [modules[target], modules[index]];
  await prisma.$transaction(
    modules.map((item, position) =>
      prisma.courseModule.update({ where: { id: item.id }, data: { position } })
    )
  );
  revalidateLearning();
}

export async function deleteCourseModule(moduleId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const deleted = await prisma.courseModule.deleteMany({
    where: { id: moduleId, course: { userId: user.id } },
  });
  if (deleted.count === 0) return { error: "Ce module n'existe plus." };
  revalidateLearning();
  return {};
}

// GitHub projects done for this course (only Alex's own projects can be linked).
export async function setCourseProjects(courseId: string, projectIds: string[]): Promise<void> {
  const user = await requireUser();
  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) throw new Error('Course not found');
  const projects = await prisma.project.findMany({
    where: { id: { in: z.array(z.string()).parse(projectIds) }, userId: user.id },
    select: { id: true },
  });
  await prisma.course.update({ where: { id: course.id }, data: { projects: { set: projects } } });
  revalidateLearning();
  redirect(`/career/courses/${course.id}`);
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
  const itemId = values.itemId
    ? (
        await prisma.courseItem.findFirst({
          where: { id: values.itemId, module: { courseId: course.id } },
          select: { id: true },
        })
      )?.id
    : undefined;
  await prisma.courseNote.create({
    data: { courseId: course.id, itemId: itemId ?? null, ...parsed.data },
  });
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
  return renderMarkdownWithCode(z.string().max(20_000).parse(source));
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
