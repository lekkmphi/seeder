import { AdminProjectsList } from "@/components/admin/admin-projects-list";
import { requireRole } from "@/lib/auth-server";
import { listAllProjects } from "@/lib/data-admin";
import { getRequestLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  await requireRole(["owner", "admin"]);
  const [projects, locale] = await Promise.all([
    listAllProjects(),
    getRequestLocale(),
  ]);

  return (
    <div className="space-y-6">
      <section className="ui-panel ui-header p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {locale === "vi" ? "Quản trị · Dự án" : "Admin · Projects"}
        </p>
        <h1 className="mt-2 text-[24px] font-medium tracking-[-0.022em] text-foreground">
          {locale === "vi" ? "Tất cả dự án" : "All projects"}
        </h1>
        <p className="mt-1 max-w-prose text-[13px] leading-6 text-muted">
          {locale === "vi"
            ? "Mọi dự án của tất cả người dùng, sắp theo hoạt động mới nhất. Tìm theo dự án, khách hàng, chủ sở hữu hoặc tóm tắt, rồi mở trực tiếp không gian làm việc."
            : "Every project across all users, newest activity first. Search by project, client, owner, or summary, and open any workspace directly."}
        </p>
      </section>

      <AdminProjectsList projects={projects} />
    </div>
  );
}
