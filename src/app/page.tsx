import { getStats, getChannels, getAlertLevel } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard-client";
import { getAllArticlesFlat } from "@/lib/news-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getStats();
  const channels = await getChannels();

  const alertChannels = channels
    .map((ch) => ({
      channel: ch,
      level: getAlertLevel(ch),
    }))
    .filter((item) => item.level !== null)
    .sort((a, b) => {
      if (a.level === "CRITICAL" && b.level !== "CRITICAL") return -1;
      if (a.level !== "CRITICAL" && b.level === "CRITICAL") return 1;
      return a.channel.contract.remaining_days - b.channel.contract.remaining_days;
    });

  // Get top news highlights (prioritize RISK and REGULATORY)
  const allNews = await getAllArticlesFlat();
  const newsHighlights = allNews.slice(0, 5).map((a) => ({
    category: a.category,
    title: a.title,
    date: a.date,
    serviceName: a.service_name,
    url: a.url,
  }));

  return (
    <DashboardClient
      stats={stats}
      alertChannels={alertChannels.map((a) => ({
        channelCode: a.channel.channel_code,
        serviceName: a.channel.service_name,
        channelType: a.channel.channel_type,
        level: a.level!,
        remainingDays: a.channel.contract.remaining_days,
        alerts: a.channel.alerts,
        products: a.channel.products,
      }))}
      generatedAt={stats.generatedAt}
      newsHighlights={newsHighlights}
    />
  );
}
