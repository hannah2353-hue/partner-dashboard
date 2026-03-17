import rawData from "@/data/integrated.json";
import { IntegratedData, Channel } from "./types";

export function getData(): IntegratedData {
  return rawData as unknown as IntegratedData;
}

export function getChannels(): Channel[] {
  const data = getData();
  return sortChannels(data.channels);
}

export function getChannelByCode(code: string): Channel | undefined {
  const data = getData();
  return data.channels.find((c) => c.channel_code === code);
}

export function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    // 비교대출 first, then 광고배너
    if (a.channel_type !== b.channel_type) {
      return a.channel_type === "비교대출" ? -1 : 1;
    }
    // Alphabetical within groups
    return a.service_name.localeCompare(b.service_name, "ko");
  });
}

export function getAlertLevel(channel: Channel): "CRITICAL" | "WARNING" | null {
  // Check for expired ad reviews
  for (const p of channel.products) {
    if (p.ad_review && p.ad_review.compliance_remaining_days !== null) {
      if (p.ad_review.compliance_remaining_days < 0) return "CRITICAL";
    }
  }
  // Check contract remaining days
  if (channel.contract.remaining_days <= 30) return "CRITICAL";

  // Check for warnings
  for (const p of channel.products) {
    if (p.ad_review && p.ad_review.compliance_remaining_days !== null) {
      if (p.ad_review.compliance_remaining_days <= 30) return "WARNING";
    }
  }
  if (channel.contract.remaining_days <= 90) return "WARNING";

  // Check explicit alerts
  for (const alert of channel.alerts) {
    if (alert.level === "CRITICAL" || alert.level === "EXPIRED") return "CRITICAL";
    if (alert.level === "WARNING") return "WARNING";
  }

  return null;
}

export function getStats() {
  const data = getData();
  const channels = data.channels;

  let criticalCount = 0;
  let warningCount = 0;
  let validContracts = 0;

  for (const ch of channels) {
    const level = getAlertLevel(ch);
    if (level === "CRITICAL") criticalCount++;
    else if (level === "WARNING") warningCount++;

    if (ch.contract.status === "유효") validContracts++;
  }

  return {
    totalChannels: data.total_channels,
    validContracts,
    criticalCount,
    warningCount,
    newsCount: 0, // News is null for now
    generatedAt: data.generated_at,
  };
}
