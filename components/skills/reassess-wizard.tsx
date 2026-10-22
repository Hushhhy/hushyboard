'use client';

import { useRef, useState, useTransition } from 'react';
import { saveAssessment } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { computeSkillLevel, formatSkillLevel } from '@/lib/skills';
import type { TierView } from './tiers-card';

// Guided re-evaluation: one tier at a time, an honest yes/no per notion,
// then the answers replace the checks and a dated snapshot is saved.
export function ReassessWizard({ skillId, tiers }: { skillId: string; tiers: TierView[] }) {
  const steps = tiers.filter((tier) => tier.notions.length > 0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tiers.flatMap((tier) => tier.notions.map((n) => [n.id, n.checked])))
  );
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (steps.length === 0) {
    return (
      <p className="text-body-14 text-fg-2">
        Aucune notion à évaluer. Ajoute d&apos;abord des notions en mode édition.
      </p>
    );
  }

  const tier = steps[step];
  const isLast = step === steps.length - 1;
  const result = computeSkillLevel(
    tiers.map((item) => ({
      level: item.level,
      title: item.title,
      notions: item.notions.map((n) => ({ label: n.label, checked: answers[n.id] ?? false })),
    }))
  );

  function goTo(next: number) {
    setStep(next);
    // Keep keyboard and screen reader users at the top of the new step.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function save() {
    const known = Object.entries(answers)
      .filter(([, value]) => value)
      .map(([id]) => id);
    startTransition(async () => {
      await saveAssessment(skillId, known);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption-12 text-fg-3 tabular">
        Étape {step + 1} sur {steps.length}
      </p>
      <h3 ref={headingRef} tabIndex={-1} className="text-body-16 font-semibold">
        Palier {tier.level} · {tier.title}
      </h3>
      <p className="text-body-14 text-fg-2">
        Sais-tu faire ça sans aide, sans tutoriel et sans IA ?
      </p>

      <div className="flex flex-col gap-2">
        {tier.notions.map((notion) => (
          <fieldset
            key={notion.id}
            className="flex items-center gap-3 rounded-control bg-surface-raised px-3 py-2"
          >
            <legend className="sr-only">{notion.label}</legend>
            <span aria-hidden="true" className="min-w-0 flex-1 text-body-14">
              {notion.label}
            </span>
            {[
              { value: true, label: 'Oui' },
              { value: false, label: 'Non' },
            ].map((option) => (
              <label key={option.label} className="flex items-center gap-1.5 text-body-14">
                <input
                  type="radio"
                  name={notion.id}
                  checked={answers[notion.id] === option.value}
                  onChange={() =>
                    setAnswers((current) => ({ ...current, [notion.id]: option.value }))
                  }
                  className="size-4 accent-career"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      <p className="text-body-14 text-fg-2" aria-live="polite">
        Niveau avec ces réponses :{' '}
        <span className="font-semibold text-fg-1 tabular">{formatSkillLevel(result)}</span>
      </p>

      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button onOverlay onClick={() => goTo(step - 1)}>
            Précédent
          </Button>
        ) : null}
        {isLast ? (
          <Button onOverlay pending={isPending} onClick={save}>
            Enregistrer l&apos;évaluation
          </Button>
        ) : (
          <Button onOverlay onClick={() => goTo(step + 1)}>
            Suivant
          </Button>
        )}
      </div>
    </div>
  );
}
