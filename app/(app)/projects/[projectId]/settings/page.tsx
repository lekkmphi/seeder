import { notFound } from "next/navigation";

import {
  ProjectSettingsSurface,
} from "@/components/projects/project-workspace";
import { ProjectWorkspaceClientShell } from "@/components/projects/project-workspace-ui";
import { requireViewer } from "@/lib/auth-server";
import { getProjectWorkspace } from "@/lib/data";
import { getRequestLocale } from "@/lib/i18n-server";

type ProjectSettingsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const viewer = await requireViewer();
  const locale = await getRequestLocale();
  const { projectId } = await params;
  const workspace = await getProjectWorkspace(projectId, viewer);

  if (!workspace) {
    notFound();
  }

  const currentPath = `/projects/${projectId}/settings`;

  return (
    <ProjectWorkspaceClientShell
      workspace={workspace}
      currentPath={currentPath}
      viewer={viewer}
    >
      <ProjectSettingsSurface
        workspace={workspace}
        currentPath={currentPath}
        locale={locale}
      />
    </ProjectWorkspaceClientShell>
  );
}
