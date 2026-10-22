// Skills whose reference list comes from MDN. Kept apart from mdn.ts, which loads the
// whole MDN data set: pages can check a slug without bundling it.
export const MDN_SKILLS = ['html', 'css', 'javascript'] as const;
export type MdnSkill = (typeof MDN_SKILLS)[number];

export function isMdnSkill(slug: string): slug is MdnSkill {
  return (MDN_SKILLS as readonly string[]).includes(slug);
}
