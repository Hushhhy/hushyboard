export type Option = { id: string; name: string };

// "Compétences liées": the course or certification then shows on those skill pages.
export function SkillCheckboxes({ skills, selected }: { skills: Option[]; selected: string[] }) {
  if (skills.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-body-14 font-medium">Compétences liées</legend>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <label
            key={skill.id}
            className="flex items-center gap-1.5 rounded-control bg-surface-raised px-2 py-1 text-caption-12 has-checked:bg-surface-control has-checked:text-fg-1"
          >
            <input
              type="checkbox"
              name="skillIds"
              value={skill.id}
              defaultChecked={selected.includes(skill.id)}
              className="size-3.5 accent-career"
            />
            {skill.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
