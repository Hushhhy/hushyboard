import type { LabelTone } from '@/lib/gmail/labels';

// Dot colour of a label, from its tone (never Gmail's own hex colours).
export const TONE_DOTS: Record<LabelTone, string> = {
  career: 'bg-career',
  info: 'bg-info',
  habits: 'bg-habits',
  finance: 'bg-finance',
  leisure: 'bg-leisure',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-fg-3',
};
