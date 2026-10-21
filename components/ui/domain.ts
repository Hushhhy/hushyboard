// Color classes of each area. Written in full so Tailwind finds them in the source.
// A domain color always comes with an icon and a label, never alone.
export type Domain = 'career' | 'habits' | 'leisure' | 'finance';

export const DOMAIN_CLASSES: Record<
  Domain,
  { text: string; fill: string; deepFill: string; stroke: string; label: string }
> = {
  career: {
    text: 'text-career',
    fill: 'bg-career',
    deepFill: 'fill-career-deep',
    stroke: 'stroke-career',
    label: 'Carrière',
  },
  habits: {
    text: 'text-habits',
    fill: 'bg-habits',
    deepFill: 'fill-habits-deep',
    stroke: 'stroke-habits',
    label: 'Habitudes',
  },
  leisure: {
    text: 'text-leisure',
    fill: 'bg-leisure',
    deepFill: 'fill-leisure-deep',
    stroke: 'stroke-leisure',
    label: 'Loisirs',
  },
  finance: {
    text: 'text-finance',
    fill: 'bg-finance',
    deepFill: 'fill-finance-deep',
    stroke: 'stroke-finance',
    label: 'Finances',
  },
};
