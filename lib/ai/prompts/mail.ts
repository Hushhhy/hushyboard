import { z } from 'zod';

// "mail-classify": is this mail from a company an interview invitation, a refusal, or other?
// Only mails that matched one of Alex's applications are sent (see lib/gmail/match.ts).

const MAX_BODY_CHARS = 4000;

export const mailClassificationSchema = z.object({
  classification: z
    .enum(['INTERVIEW', 'REJECTION', 'OTHER'])
    .describe(
      'INTERVIEW: invitation to an interview or a call, or a request for availability; REJECTION: the application is declined; OTHER: anything else (acknowledgement, newsletter, job alert)'
    ),
  confidence: z.number().min(0).max(1).describe('0 to 1'),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .describe(
      'One short French sentence saying what the mail says, e.g. "Le mail propose un premier entretien."'
    ),
});
export type MailClassificationAnswer = z.infer<typeof mailClassificationSchema>;

export function mailClassifyPrompt(input: {
  from: string;
  subject: string;
  body: string;
  company: string;
  position: string | null;
}): string {
  return `A candidate applied to "${input.position ?? 'a spontaneous application'}" at ${input.company}.
Classify this mail received from that company. Be strict: an automatic acknowledgement
("nous avons bien reçu votre candidature") is OTHER.

From: ${input.from}
Subject: ${input.subject}
"""
${input.body.slice(0, MAX_BODY_CHARS)}
"""`;
}
