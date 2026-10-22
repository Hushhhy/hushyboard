import { formatShortDate } from '@/lib/dates';
import { formatSkillLevel } from '@/lib/skills';

type Assessment = { id: string; level: number; started: boolean; assessedAt: Date };

// Dated snapshots saved after each guided re-evaluation, newest first.
export function HistoryList({ assessments }: { assessments: Assessment[] }) {
  if (assessments.length === 0) {
    return (
      <p className="text-body-14 text-fg-2">
        Aucune évaluation enregistrée. Lance « Me réévaluer » pour garder une trace de ton niveau.
      </p>
    );
  }
  return (
    <table className="w-full text-body-14">
      <caption className="sr-only">Historique des évaluations</caption>
      <thead>
        <tr className="text-left text-caption-12 text-fg-3">
          <th scope="col" className="pb-2 font-medium">
            Date
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            Niveau
          </th>
        </tr>
      </thead>
      <tbody>
        {assessments.map((assessment) => (
          <tr key={assessment.id} className="border-t border-line-subtle">
            <td className="py-2">{formatShortDate(assessment.assessedAt)}</td>
            <td className="py-2 text-right font-semibold tabular">
              {formatSkillLevel(assessment)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
