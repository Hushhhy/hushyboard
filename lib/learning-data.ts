import type { CertificationStatus, CourseStatus } from '@/generated/prisma/client';
import { computeProgress, nextItem } from '@/lib/course-progress';
import { prisma } from '@/lib/prisma';

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  PLANNED: 'Prévu',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
};

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  PLANNED: 'Prévue',
  IN_PROGRESS: 'En cours',
  OBTAINED: 'Obtenue',
};

const courseInclude = {
  certification: { select: { id: true, name: true, totalCourses: true } },
  skills: { select: { id: true, name: true } },
  _count: { select: { notes: true } },
  modules: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      items: {
        orderBy: { position: 'asc' },
        select: { id: true, title: true, kind: true, completedAt: true },
      },
    },
  },
} as const;

// Options of the forms: certifications (for a course) and skills (for both).
export async function getLearningOptions(userId: string) {
  const [certifications, skills] = await Promise.all([
    prisma.certification.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.skill.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { position: 'asc' },
    }),
  ]);
  return { certifications, skills };
}

export async function getCourses(userId: string, statuses: CourseStatus[]) {
  const courses = await prisma.course.findMany({
    where: { userId, status: { in: statuses } },
    include: courseInclude,
    // Enum order is PLANNED, IN_PROGRESS, COMPLETED: descending puts "in progress" before "planned".
    // Inside a status, the closest deadline first.
    orderBy: [{ status: 'desc' }, { nextDeadline: 'asc' }, { updatedAt: 'desc' }],
  });
  return courses.map((course) => ({
    ...course,
    // Computed from the parts, quizzes and solo projects; a finished course is always 100 %.
    progress: courseProgress(course),
    next: nextItem(course.modules),
  }));
}

function courseProgress(course: {
  status: CourseStatus;
  modules: { items: { completedAt: Date | null }[] }[];
}) {
  const progress = computeProgress(course.modules.flatMap((courseModule) => courseModule.items));
  return course.status === 'COMPLETED' ? { ...progress, percent: 100 } : progress;
}

export type CourseListEntry = Awaited<ReturnType<typeof getCourses>>[number];

export async function getCourseCounts(userId: string) {
  const rows = await prisma.course.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  });
  const count = (status: CourseStatus) =>
    rows.find((row) => row.status === status)?._count._all ?? 0;
  return {
    planned: count('PLANNED'),
    inProgress: count('IN_PROGRESS'),
    completed: count('COMPLETED'),
  };
}

// "Notes" tab: every course with its plan, as a table of contents with note counts.
export async function getNotesIndex(userId: string) {
  return prisma.course.findMany({
    where: { userId },
    orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { notes: { where: { itemId: null } } } },
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          items: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              kind: true,
              completedAt: true,
              notes: { orderBy: { createdAt: 'asc' }, select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });
}

// One part, quiz or solo project with its notes, plus the course plan for the navigation.
export async function getCourseItemPage(userId: string, courseId: string, itemId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    select: {
      id: true,
      title: true,
      status: true,
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          items: { orderBy: { position: 'asc' }, select: { id: true, title: true, kind: true } },
        },
      },
    },
  });
  if (!course) return null;
  const item = await prisma.courseItem.findFirst({
    where: { id: itemId, module: { courseId: course.id } },
    include: { notes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!item) return null;
  const moduleIndex = course.modules.findIndex((courseModule) => courseModule.id === item.moduleId);
  return { course, item, moduleIndex, module: course.modules[moduleIndex] };
}

// One course with its plan (modules, items and their notes) and its general notes.
export async function getCourseWithNotes(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, userId },
    include: {
      certification: { select: { id: true, name: true, totalCourses: true } },
      skills: { select: { id: true, name: true } },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          items: {
            orderBy: { position: 'asc' },
            include: { _count: { select: { notes: true } } },
          },
        },
      },
      notes: { where: { itemId: null }, orderBy: { createdAt: 'asc' } },
      projects: {
        select: { id: true, name: true, fullName: true, isExternal: true, isPrivate: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  return course ? { ...course, progress: courseProgress(course) } : null;
}

// Projects that can be linked to a course (the ones not hidden, plus the already linked ones).
export async function getProjectOptions(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true, hidden: true, isFork: true, isArchived: true },
    orderBy: [{ pinned: 'desc' }, { pushedAt: 'desc' }],
  });
}

export type CoursePageData = NonNullable<Awaited<ReturnType<typeof getCourseWithNotes>>>;

export async function getCertifications(userId: string) {
  const certifications = await prisma.certification.findMany({
    where: { userId },
    include: {
      skills: { select: { id: true, name: true } },
      courses: { select: { status: true } },
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  });
  return certifications.map((certification) => ({
    ...certification,
    completedCourses: certification.courses.filter((course) => course.status === 'COMPLETED')
      .length,
  }));
}

export type CertificationItem = Awaited<ReturnType<typeof getCertifications>>[number];
