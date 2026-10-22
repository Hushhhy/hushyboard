import { z } from 'zod';

// Labels and AI schemas of the job search. Client-safe (no Prisma import).

export const CONTRACT_TYPES = [
  'INTERNSHIP',
  'APPRENTICESHIP',
  'PERMANENT',
  'FIXED_TERM',
  'VIE',
  'FREELANCE',
  'OTHER',
] as const;
export type ContractTypeKey = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractTypeKey, string> = {
  INTERNSHIP: 'Stage',
  APPRENTICESHIP: 'Alternance',
  PERMANENT: 'CDI',
  FIXED_TERM: 'CDD',
  VIE: 'VIE',
  FREELANCE: 'Freelance',
  OTHER: 'Autre',
};

export const KIND_LABELS: Record<'OFFER' | 'SPONTANEOUS', string> = {
  OFFER: 'Sur offre',
  SPONTANEOUS: 'Spontanées',
};

// « Ajouter une offre »: what Gemini reads from the pasted text.
export const offerExtractSchema = z.object({
  title: z.string().trim().min(1).max(160).describe('Job title as written in the offer'),
  company: z.string().trim().min(1).max(120).describe('Hiring company, not the job board'),
  location: z.string().trim().max(120).describe('City or area, empty if absent'),
  contractType: z
    .enum(CONTRACT_TYPES)
    .describe(
      'INTERNSHIP = stage, APPRENTICESHIP = alternance, PERMANENT = CDI, FIXED_TERM = CDD, VIE, FREELANCE, OTHER if unclear'
    ),
  remotePolicy: z
    .string()
    .trim()
    .max(80)
    .describe('Remote work in short French, e.g. "télétravail 2 j/sem.", empty if absent'),
  requiredSkills: z
    .array(z.string().trim().min(1).max(40))
    .max(15)
    .describe('Technologies and skills asked, short names, e.g. "React", "PostgreSQL"'),
  summary: z
    .string()
    .trim()
    .max(400)
    .describe('Two lines in French: the team, the product and the main missions'),
});
export type OfferExtract = z.infer<typeof offerExtractSchema>;

// « Analyse du CV » card.
export const cvAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100).describe('Honest match between the CV and the offer'),
  strengths: z
    .array(z.string().trim().min(1).max(40))
    .max(8)
    .describe('Skills of the offer the CV already proves, short names'),
  gaps: z
    .array(z.string().trim().min(1).max(40))
    .max(8)
    .describe('Skills of the offer missing or weak in the CV, short names'),
  changes: z
    .array(z.string().trim().min(1).max(160))
    .min(1)
    .max(5)
    .describe('3 to 5 concrete changes the adapted CV makes, in French, one sentence each'),
});
export type CvAnalysis = z.infer<typeof cvAnalysisSchema>;

// Stored on JobOffer.analysis.
export const storedAnalysisSchema = cvAnalysisSchema.extend({
  baseResumeId: z.string(),
  baseResumeName: z.string(),
  model: z.string(),
});
export type StoredAnalysis = z.infer<typeof storedAnalysisSchema>;

export function parseStoredAnalysis(value: unknown): StoredAnalysis | null {
  const result = storedAnalysisSchema.safeParse(value);
  return result.success ? result.data : null;
}
