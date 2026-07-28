import { requireRole } from "@/lib/auth-server";
import {
  getWorkspaceDashboard,
  getWorkspaceTotals,
} from "@/lib/data-admin";
import { getRequestLocale } from "@/lib/i18n-server";

import { HeroKpis } from "@/components/dashboard/hero-kpis";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { VelocityBars } from "@/components/dashboard/velocity-bars";
import { PressureTable } from "@/components/dashboard/pressure-table";
import { ShippedFeed } from "@/components/dashboard/shipped-feed";

export const dynamic = "force-dynamic";

function WorkspaceKpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="ui-panel p-4">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-[28px] font-medium tracking-[-0.022em] text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[13px] leading-6 text-muted">{detail}</p>
    </section>
  );
}

export default async function AdminDashboardPage() {
  await requireRole(["owner", "admin"]);

  const [data, totals, locale] = await Promise.all([
    getWorkspaceDashboard(),
    getWorkspaceTotals(),
    getRequestLocale(),
  ]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="ui-panel ui-header p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {locale === "vi" ? "Quản trị · Bảng điều khiển" : "Admin · Workspace dashboard"}
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tighter text-foreground sm:text-[40px]">
          {locale === "vi" ? "Sức khỏe không gian" : "Workspace health"}
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted sm:text-[15px]">
          {locale === "vi"
            ? "Tổng hợp mọi dự án, thành viên và cập nhật đã phát hành trong đội."
            : "Every project, every member, every shipped update — aggregated across the team."}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WorkspaceKpiCard
          label={locale === "vi" ? "Thành viên" : "Members"}
          value={totals.users.toString()}
          detail={locale === "vi" ? "Người có tài khoản trong không gian này." : "People with an account in this workspace."}
        />
        <WorkspaceKpiCard
          label={locale === "vi" ? "Lời mời chờ xử lý" : "Pending invites"}
          value={totals.pendingInvites.toString()}
          detail={locale === "vi" ? "Các liên kết lời mời còn hiệu lực." : "Outstanding invitation links."}
        />
        <WorkspaceKpiCard
          label={locale === "vi" ? "Dự án đang hoạt động" : "Active projects"}
          value={totals.projectsActive.toString()}
          detail={locale === "vi" ? `Tổng cộng ${totals.projectsTotal} dự án.` : `${totals.projectsTotal} projects total.`}
        />
        <WorkspaceKpiCard
          label={locale === "vi" ? "Đã phát hành 30 ngày" : "Shipped 30d"}
          value={data.totals.shipped30d.toString()}
          detail={locale === "vi" ? "Cập nhật trạng thái đã đăng trong 30 ngày qua." : "Status updates published in the last 30 days."}
        />
      </div>

      <HeroKpis totals={data.totals} />

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Thông lượng" : "Throughput"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Cập nhật đã đăng và việc con đã hoàn tất trong toàn không gian, 84 ngày qua."
              : "Updates published and subtasks completed across the workspace, last 84 days."}
          </p>
        </header>
        <ThroughputChart data={data.throughput} />
      </section>

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Hoạt động" : "Activity"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi" ? "Mọi sự kiện trong không gian trong năm qua." : "Every workspace event in the last year."}
          </p>
        </header>
        <ActivityHeatmap data={data.heatmap} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ui-panel p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
              {locale === "vi" ? "Tốc độ theo dự án" : "Velocity by project"}
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted">
              {locale === "vi" ? "Cập nhật đã đăng theo từng dự án trong 30 ngày qua." : "Updates published per project, last 30 days."}
            </p>
          </header>
          <VelocityBars data={data.velocityByProject} />
        </section>

        <section className="ui-panel p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
              {locale === "vi" ? "Bảng áp lực" : "Pressure leaderboard"}
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted">
              {locale === "vi" ? "Dự án còn mở được sắp theo mức áp lực tích lũy." : "Open projects sorted by accumulated pressure."}
            </p>
          </header>
          <PressureTable data={data.pressureLeaderboard} locale={locale} />
        </section>
      </div>

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Luồng đã phát hành" : "Shipped feed"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi" ? "Các cập nhật trạng thái được đăng gần đây trong toàn không gian." : "Status updates published recently across the workspace."}
          </p>
        </header>
        <ShippedFeed data={data.shippedFeed} locale={locale} />
      </section>
    </div>
  );
}
