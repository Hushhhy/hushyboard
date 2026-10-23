import type { Domain } from '@/components/ui/domain';

// Trophy catalogue (every area, no XP). Unlocks are stored in TrophyUnlock by key.
// Phase 6 adds the habit streak trophies; the full catalogue and /trophies come in phase 9.

export type TrophyDefinition = {
  name: string;
  domain: Domain;
  // Shown on a locked trophy.
  condition: string;
};

export const TROPHIES: Record<string, TrophyDefinition> = {
  'habit-streak-7': {
    name: 'Semaine tenue',
    domain: 'habits',
    condition: 'Tiens une habitude 7 jours de suite.',
  },
  'habit-streak-30': {
    name: 'Mois tenu',
    domain: 'habits',
    condition: 'Tiens une habitude 30 jours de suite.',
  },
  'habit-streak-100': {
    name: 'Centurion',
    domain: 'habits',
    condition: 'Tiens une habitude 100 jours de suite.',
  },
};
