import { adminDb } from "./firebase-admin";
import { IntegratedData, Channel } from "./types";
import { getNewsStats } from "./news-data";

async function getNewsCountFromCache(): Promise<number> {
  try {
    const stats = await getNewsStats();
    return stats.total;
  } catch {
    return 0;
  }
}

export async function getData(): Promise<IntegratedData> {
  const snapshot = await adminDb.collection("channels").get();
  const channels: Channel[] = [];
  for (const doc of snapshot.docs) {
    channels.push(doc.data() as Channel);
  }

  const sorted = sortChannels(channels);

  return {
    generated_at: new Date().toISOString(),
    reference_date: new Date().toISOString().slice(0, 10),
    total_channels: sorted.length,
    summary: {
      비교대출: sorted.filter((c) => c.channel_type === "비교대출").length,
      광고배너: sorted.filter((c) => c.channel_type === "광고배너").length,
    },
    channels: sorted,
  };
}

export async function getChannels(): Promise<Channel[]> {
  const data = await getData();
  return data.channels;
}

export async function getChannelByCode(code: string): Promise<Channel | undefined> {
  const docId = code.replace(/\//g, "_");
  const doc = await adminDb.collection("channels").doc(docId).get();
  if (!doc.exists) return undefined;
  return doc.data() as Channel;
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

export async function getStats() {
  const data = await getData();
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
    newsCount: await getNewsCountFromCache(),
    generatedAt: data.generated_at,
  };
}
