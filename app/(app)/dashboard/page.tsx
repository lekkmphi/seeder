import { requireSession } from "@/lib/auth-server";
import { getDashboardForUser } from "@/lib/data";

import { HeroKpis } from "@/components/dashboard/hero-kpis";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { VelocityBars } from "@/components/dashboard/velocity-bars";
import { PressureTable } from "@/components/dashboard/pressure-table";
import { ShippedFeed } from "@/components/dashboard/shipped-feed";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
const DASHBOARD_PAGE_VERSION = "2026-05-11.1";

export default async function DashboardPage() {
  const session = await requireSession();
  const [data, locale] = await Promise.all([
    getDashboardForUser(session.user.id),
    getRequestLocale(),
  ]);

  return (
    <div
      data-dashboard-page-version={DASHBOARD_PAGE_VERSION}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6"
    >
      <section className="ui-panel ui-header p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {t(locale, "dashboard")}
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tighter text-foreground sm:text-[40px]">
          {t(locale, "performance")}
        </h1>
        <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted sm:text-[15px]">
          {locale === "vi"
            ? "Những gì đã bàn giao, thời điểm bàn giao và nơi áp lực đang tăng lên."
            : "What you shipped, when you shipped it, and where pressure is building up."}
        </p>
      </section>

      <HeroKpis totals={data.totals} locale={locale} />

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Thông lượng" : "Throughput"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Cập nhật cho khách hàng đã đăng và việc con hoàn tất mỗi ngày trong 84 ngày gần đây."
              : "Client updates published and subtasks completed per day, last 84 days."}
          </p>
        </header>
        <ThroughputChart data={data.throughput} />
      </section>

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {t(locale, "activity")}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Mọi sự kiện dự án trong năm vừa qua."
              : "Every project event in the last year."}
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
              {locale === "vi"
                ? "Số cập nhật đã đăng theo từng dự án trong 30 ngày gần đây."
                : "Updates published per project, last 30 days."}
            </p>
          </header>
          <VelocityBars data={data.velocityByProject} locale={locale} />
        </section>

        <section className="ui-panel p-5 sm:p-6">
          <header className="mb-4">
            <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
              {locale === "vi" ? "Bảng áp lực" : "Pressure leaderboard"}
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-muted">
              {locale === "vi"
                ? "Các dự án đang mở được sắp theo mức áp lực tích lũy."
                : "Open projects sorted by accumulated pressure."}
            </p>
          </header>
          <PressureTable data={data.pressureLeaderboard} locale={locale} />
        </section>
      </div>

      <section className="ui-panel p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-[17px] font-medium tracking-[-0.022em] text-foreground">
            {locale === "vi" ? "Luồng bàn giao" : "Shipped feed"}
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {locale === "vi"
              ? "Mọi cập nhật cho khách hàng bạn đã đăng gần đây."
              : "Every client update you published recently."}
          </p>
        </header>
        <ShippedFeed data={data.shippedFeed} locale={locale} />
      </section>
    </div>
  );
}
