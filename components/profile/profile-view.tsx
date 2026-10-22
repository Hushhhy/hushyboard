import { requireUser } from '@/lib/session';
import { getProfileData } from '@/lib/profile-data';
import { PageHeader } from '@/components/app-shell/page-header';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { IdentityCard } from './identity-card';
import { ObjectivesCard } from './objectives-card';
import { SkillsCard } from './skills-card';
import { TimelineCard } from './timeline-card';
import { ToolsCard } from './tools-card';

// "Full stack et/ou data engineer · 18 compétences suivies"
function profileSummary(targetRoles: string | undefined, skillCount: number): string {
  const skills = `${skillCount} compétence${skillCount > 1 ? 's' : ''} suivie${skillCount > 1 ? 's' : ''}`;
  return targetRoles ? `${targetRoles} · ${skills}` : skills;
}

export async function ProfileView() {
  const user = await requireUser();
  const data = await getProfileData(user.id);

  return (
    <>
      <PageHeader
        breadcrumb="Carrière · Profil"
        title={profileSummary(data.profile?.targetRoles, data.skills.length)}
      />
      <div className="grid items-start gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <IdentityCard name={user.name} profile={data.profile} />
          <ToolsCard tools={data.tools} />
          <TimelineCard entries={data.timeline} />
        </div>
        <div className="flex flex-col gap-3">
          <SkillsCard skills={data.skills} />
          <ObjectivesCard objectives={data.objectives} />
        </div>
      </div>
    </>
  );
}

// Static placeholder with the shape of the page.
export function ProfileSkeleton() {
  return (
    <LoadingRegion label="Chargement du profil…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <div className="grid gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Skeleton surface="card" className="h-90" />
          <Skeleton surface="card" className="h-60" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton surface="card" className="h-120" />
          <Skeleton surface="card" className="h-70" />
        </div>
      </div>
    </LoadingRegion>
  );
}
