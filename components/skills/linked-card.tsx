import Link from 'next/link';
import { CourseIcon, PlusIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SidePanel } from '@/components/ui/side-panel';
import type { SkillPageData } from '@/lib/profile-data';
import { CourseLinkForm } from './course-link-form';

function LinkedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption-12 text-fg-3">{label}</dt>
      <dd className="text-body-14">{value}</dd>
    </div>
  );
}

// Courses, projects and certifications linked to the skill.
export function LinkedCard({ data }: { data: SkillPageData }) {
  const { skill, allCourses } = data;
  return (
    <section
      aria-labelledby="linked-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2 id="linked-title" className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        <CourseIcon className="size-4" />
        Lié à {skill.name}
      </h2>
      <dl className="flex flex-col gap-3">
        <LinkedRow
          label="Cours"
          value={
            skill.courses.length > 0
              ? skill.courses.map((course) => course.title).join(' · ')
              : 'Aucun cours lié pour l’instant.'
          }
        />
        <LinkedRow
          label="Projets"
          value={skill.projects.length > 0 ? skill.projects.join(' · ') : '—'}
        />
        <LinkedRow
          label="Certifications"
          value={
            skill.certifications.length > 0
              ? skill.certifications.map((certification) => certification.name).join(' · ')
              : '—'
          }
        />
      </dl>
      <Link
        href={`/career/profile/${skill.slug}?panel=link-course`}
        scroll={false}
        className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
      >
        <PlusIcon className="size-4" />
        Lier un cours
      </Link>

      <SidePanel name="link-course" title={`Cours liés à ${skill.name}`}>
        {allCourses.length === 0 ? (
          <EmptyState
            title="Aucun cours pour l'instant."
            description="Ajoute tes cours dans la page Cours, puis reviens les lier à cette compétence."
            action={{ label: 'Ouvrir les cours', href: '/career/courses' }}
          />
        ) : (
          <CourseLinkForm
            skillId={skill.id}
            courses={allCourses}
            linkedIds={skill.courses.map((course) => course.id)}
          />
        )}
      </SidePanel>
    </section>
  );
}
