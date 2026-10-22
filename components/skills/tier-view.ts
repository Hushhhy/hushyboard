// A level milestone as the client components see it (no dates, no Prisma types).
export type TierView = {
  id: string;
  level: number;
  title: string;
  notions: { id: string; label: string; checked: boolean }[];
};

type TierRow = {
  id: string;
  level: number;
  title: string;
  notions: { id: string; label: string; checkedAt: Date | null }[];
};

export function toTierViews(tiers: TierRow[]): TierView[] {
  return tiers.map((tier) => ({
    id: tier.id,
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({
      id: notion.id,
      label: notion.label,
      checked: notion.checkedAt !== null,
    })),
  }));
}

export function toTierInputs(tiers: TierView[]) {
  return tiers.map((tier) => ({
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({ label: notion.label, checked: notion.checked })),
  }));
}
