import type { DashboardData } from "@/lib/data";
import { t, type Locale } from "@/lib/i18n";

function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
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

export function HeroKpis({
  totals,
  locale = "en",
}: {
  totals: DashboardData["totals"];
  locale?: Locale;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t(locale, "shipped7d")}
        value={totals.shipped7d.toString()}
        detail={t(locale, "shipped7dDetail")}
      />
      <KpiCard
        label={t(locale, "shipped30d")}
        value={totals.shipped30d.toString()}
        detail={t(locale, "shipped30dDetail")}
      />
      <KpiCard
        label={t(locale, "shippedAllTime")}
        value={totals.shippedAllTime.toString()}
        detail={t(locale, "shippedAllTimeDetail")}
      />
      <KpiCard
        label={t(locale, "activeDays30d")}
        value={totals.activeDays30d.toString()}
        detail={t(locale, "activeDays30dDetail")}
      />
    </div>
  );
}
