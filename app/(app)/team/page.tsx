import { requireViewer } from "@/lib/auth-server";
import { getRequestLocale } from "@/lib/i18n-server";
import { listSpaces } from "@/lib/services/spaces";
import { PageHeader } from "@/components/app/page-header";
import { SpacesList } from "@/components/spaces/spaces-list";

export const dynamic = "force-dynamic";

// Workspace "Teams": the company teams the viewer belongs to. Personal is not
// listed. Each opens to its detail (members + projects).
export default async function TeamsPage() {
  const viewer = await requireViewer();
  const locale = await getRequestLocale();
  const spaces = (await listSpaces(viewer))
    .filter((s) => s.kind === "company")
    .map((s) => ({
      id: s.id,
      name: s.name,
      leadName: s.leadName,
      memberCount: s.memberCount,
      projectCount: s.projectCount,
    }));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={locale === "vi" ? "Không gian · Đội nhóm" : "Workspace · Teams"}
        title={locale === "vi" ? "Đội nhóm" : "Teams"}
        description={
          locale === "vi"
            ? "Các đội bạn tham gia. Mở một đội để xem thành viên và dự án."
            : "Teams you belong to. Open one to see its members and projects."
        }
      />
      <section className="ui-panel p-5 sm:p-6">
        <SpacesList spaces={spaces} canCreate={false} />
      </section>
    </div>
  );
}
