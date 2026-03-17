import { getStats, getChannels, getAlertLevel } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard-client";

export default function DashboardPage() {
  const stats = getStats();
  const channels = getChannels();

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
    />
  );
}
