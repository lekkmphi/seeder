import Link from "next/link";
import { notFound } from "next/navigation";

import { requireViewer } from "@/lib/auth-server";
import { getRequestLocale } from "@/lib/i18n-server";
import { getSpaceDetail } from "@/lib/services/spaces";
import { PageHeader } from "@/components/app/page-header";
import { SpaceDetailView } from "@/components/spaces/space-detail-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ teamId: string }> };

export default async function TeamDetailPage({ params }: Props) {
  const viewer = await requireViewer();
  const { teamId } = await params;
  const detail = await getSpaceDetail(viewer, teamId);
  if (!detail) notFound();
  const locale = await getRequestLocale();
  const vi = locale === "vi";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={
          detail.kind === "company"
            ? vi
              ? "Nhóm"
              : "Team"
            : vi
              ? "Cá nhân"
              : "Personal"
        }
        title={detail.name}
        description={
          detail.kind === "company"
            ? detail.leadName
              ? vi
                ? `Dẫn dắt bởi ${detail.leadName} · thành viên mở các dự án mà họ được mời.`
                : `Led by ${detail.leadName} · members open the projects they're invited to.`
              : vi
                ? "Chưa có trưởng nhóm."
                : "No lead assigned."
            : vi
              ? "Riêng tư với bạn."
              : "Private to you."
        }
        action={
          <Link href="/team" className="ui-button-secondary">
            {vi ? "Tất cả nhóm" : "All teams"}
          </Link>
        }
      />
      <SpaceDetailView detail={detail} />
    </div>
  );
}
