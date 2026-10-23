// Gmail label colours ↔ the app's colour tokens. Pure, unit-tested.
// The app never shows Gmail's hex colours: a label is drawn with the nearest token.

export const LABEL_TONES = [
  'career',
  'info',
  'habits',
  'finance',
  'leisure',
  'warning',
  'danger',
  'neutral',
] as const;
export type LabelTone = (typeof LABEL_TONES)[number];

// Colours offered in « Nouveau libellé », with the Gmail palette pair sent to the API
// (Gmail only accepts colours from its fixed palette).
export const NEW_LABEL_COLORS: {
  tone: Exclude<LabelTone, 'neutral'>;
  name: string;
  gmail: { backgroundColor: string; textColor: string };
}[] = [
  { tone: 'career', name: 'Or', gmail: { backgroundColor: '#fad165', textColor: '#000000' } },
  { tone: 'info', name: 'Bleu', gmail: { backgroundColor: '#4a86e8', textColor: '#ffffff' } },
  { tone: 'habits', name: 'Vert', gmail: { backgroundColor: '#16a766', textColor: '#ffffff' } },
  { tone: 'finance', name: 'Lavande', gmail: { backgroundColor: '#a479e2', textColor: '#ffffff' } },
  { tone: 'leisure', name: 'Rose', gmail: { backgroundColor: '#f691b3', textColor: '#000000' } },
  { tone: 'warning', name: 'Orange', gmail: { backgroundColor: '#ffad47', textColor: '#000000' } },
  { tone: 'danger', name: 'Rouge', gmail: { backgroundColor: '#fb4c2f', textColor: '#ffffff' } },
];

export function isLabelTone(value: string): value is Exclude<LabelTone, 'neutral'> {
  return NEW_LABEL_COLORS.some((color) => color.tone === value);
}

// "#4a86e8" → "info". Greys and missing colours → "neutral".
export function nearestTone(hex: string | null | undefined): LabelTone {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!match) return 'neutral';
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.12 || max < 0.15) return 'neutral';
  let hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 15 || hue >= 345) return 'danger';
  if (hue < 42) return 'warning';
  if (hue < 70) return 'career';
  if (hue < 200) return 'habits';
  if (hue < 255) return 'info';
  if (hue < 300) return 'finance';
  return 'leisure';
}

// System labels shown in the column; the other system ones (SENT, SPAM, CATEGORY_…) are hidden.
export const INBOX = 'INBOX';
export const ALL_MAIL = 'ALL';
