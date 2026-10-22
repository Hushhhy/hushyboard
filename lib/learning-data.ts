import type { CertificationStatus, CourseStatus } from '@/generated/prisma/client';
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
  return prisma.course.findMany({
    where: { userId, status: { in: statuses } },
    include: courseInclude,
    // Enum order is PLANNED, IN_PROGRESS, COMPLETED: descending puts "in progress" before "planned".
    // Inside a status, the closest deadline first.
    orderBy: [{ status: 'desc' }, { nextDeadline: 'asc' }, { updatedAt: 'desc' }],
  });
}

export type CourseItem = Awaited<ReturnType<typeof getCourses>>[number];

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

export async function getCourseNotes(userId: string) {
  return prisma.courseNote.findMany({
    where: { course: { userId } },
    include: { course: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

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
