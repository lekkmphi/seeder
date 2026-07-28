import { notFound } from "next/navigation";

import { ActivityFeed } from "@/components/projects/activity-feed";
import {
  ProjectBoardSurface,
  ProjectMetricsStrip,
  ProjectNotesSurface,
  ProjectOverviewQuickLinks,
} from "@/components/projects/project-workspace";
import { ProjectWorkspaceClientShell } from "@/components/projects/project-workspace-ui";
import { requireViewer } from "@/lib/auth-server";
import { getProjectWorkspace } from "@/lib/data";
import { branchPath } from "@/lib/branch-path";
import { getRequestLocale } from "@/lib/i18n-server";

type ProjectOverviewPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ branch?: string }>;
};

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: ProjectOverviewPageProps) {
  const viewer = await requireViewer();
  const locale = await getRequestLocale();
  const { projectId } = await params;
  const { branch } = await searchParams;
  const workspace = await getProjectWorkspace(projectId, viewer, branch);

  if (!workspace) {
    notFound();
  }

  const currentPath = branchPath(
    `/projects/${projectId}`,
    workspace.branches,
    workspace.currentBranchId,
  );

  return (
    <ProjectWorkspaceClientShell
      workspace={workspace}
      currentPath={currentPath}
      viewer={viewer}
    >
      <ProjectMetricsStrip workspace={workspace} locale={locale} />

      {/* minmax(0,…) is required: the board's flex track uses a percent-based
          flex-basis on shrink-0 columns. A bare `1.45fr` track gives the grid
          item `min-width:auto`, which lets that percentage run away to the
          browser's max width. minmax(0,…) pins the min to 0 and breaks the loop. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]">
        <ProjectBoardSurface
          workspace={workspace}
          currentPath={currentPath}
          preview
          locale={locale}
        />
        <ProjectNotesSurface
          workspace={workspace}
          currentPath={currentPath}
          locale={locale}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <ProjectOverviewQuickLinks projectId={projectId} locale={locale} />
        <ActivityFeed
          title={locale === "vi" ? "Hoạt động gần đây" : "Recent activity"}
          description={
            locale === "vi"
              ? "Dòng thời gian ngắn của những thay đổi mới nhất trong không gian này."
              : "Small timeline of the latest changes inside this workspace."
          }
          items={workspace.activity}
        />
      </div>
    </ProjectWorkspaceClientShell>
  );
}
