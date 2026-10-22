'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { parseDateInput } from '@/lib/dates';
import { parseEurosToCents } from '@/lib/finance';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { grantXp, revokeXp } from '@/lib/xp-events';

function revalidateLearning() {
  revalidatePath('/career/certifications');
  revalidatePath('/career/courses', 'layout');
  revalidatePath('/career/profile', 'layout');
  revalidatePath('/');
}

const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Donne un nom à la certification.').max(160),
  issuer: z.string().trim().min(1, 'Indique l’organisme, par exemple « Coursera · IBM ».').max(120),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'OBTAINED']),
  totalCourses: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/, 'Saisis un nombre de cours, par exemple 13.'),
  plannedFor: z.string(),
  obtainedAt: z.string(),
  credentialUrl: z.union([z.literal(''), z.url('Saisis une adresse complète (https://…).')]),
  cost: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const cents = parseEurosToCents(value);
      return cents !== null && cents >= 0;
    }, 'Saisis un montant, par exemple 49,99.'),
});

export async function saveCertification(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = certificationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const errors: Record<string, string> = {};
  const plannedFor = data.plannedFor ? parseDateInput(data.plannedFor) : null;
  if (data.plannedFor && !plannedFor) errors.plannedFor = 'Choisis une date valide.';
  let obtainedAt = data.obtainedAt ? parseDateInput(data.obtainedAt) : null;
  if (data.obtainedAt && !obtainedAt) errors.obtainedAt = 'Choisis une date valide.';
  const costCents = data.cost ? parseEurosToCents(data.cost) : null;
  if (Object.keys(errors).length > 0) return { fieldErrors: errors, values };

  if (data.status === 'OBTAINED') obtainedAt ??= new Date();
  else obtainedAt = null;

  const skillIds = formData.getAll('skillIds').map(String);
  const skills = await prisma.skill.findMany({
    where: { id: { in: skillIds }, userId: user.id },
    select: { id: true },
  });

  const fields = {
    name: data.name,
    issuer: data.issuer,
    status: data.status,
    totalCourses: data.totalCourses ? Number(data.totalCourses) : null,
    plannedFor,
    obtainedAt,
    credentialUrl: data.credentialUrl || null,
    costCents,
  };

  let certificationId: string;
  if (data.id) {
    const existing = await prisma.certification.findFirst({
      where: { id: data.id, userId: user.id },
    });
    if (!existing) return { error: "Cette certification n'existe plus.", values };
    await prisma.certification.update({
      where: { id: existing.id },
      data: { ...fields, skills: { set: skills } },
    });
    certificationId = existing.id;
  } else {
    const created = await prisma.certification.create({
      data: { userId: user.id, ...fields, skills: { connect: skills } },
    });
    certificationId = created.id;
  }

  // Obtaining grants CERTIFICATION_OBTAINED once; going back to another status removes it.
  let levelUp = null;
  if (data.status === 'OBTAINED') {
    levelUp = await grantXp(
      user.id,
      'CERTIFICATION_OBTAINED',
      certificationId,
      `Certification obtenue · ${data.name}`
    );
  } else {
    await revokeXp(user.id, 'CERTIFICATION_OBTAINED', certificationId);
  }

  revalidateLearning();
  return { done: Date.now(), levelUp };
}

export async function deleteCertification(certificationId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  // Its courses stay (unlinked); XP already earned stays.
  const deleted = await prisma.certification.deleteMany({
    where: { id: certificationId, userId: user.id },
  });
  if (deleted.count === 0) return { error: "Cette certification n'existe plus." };
  revalidateLearning();
  redirect('/career/certifications');
}
