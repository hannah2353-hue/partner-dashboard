import { NextResponse } from "next/server";
import { getNewsData } from "@/lib/news-data";
import { runNewsMonitoring } from "@/lib/news-monitor";
import { sendSlackNotification } from "@/lib/slack-notify";
import { getChannels } from "@/lib/data";
import rawData from "@/data/integrated.json";

export const dynamic = "force-dynamic";

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Check cache freshness
    const cached = await getNewsData();

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.generated_at).getTime();

      if (cacheAge < CACHE_MAX_AGE_MS) {
        return NextResponse.json({
          refreshed: false,
          reason: "cache_fresh",
          cache_age_minutes: Math.floor(cacheAge / 60000),
          generated_at: cached.generated_at,
          total_articles: cached.total_articles,
        });
      }
    }

    // Cache is stale or missing — run monitoring
    const data = rawData as { channels: Array<{ channel_code: string; company_name: string; service_name: string }> };

    const channels = data.channels.map((ch) => ({
      channel_code: ch.channel_code,
      company_name: ch.company_name,
      service_name: ch.service_name,
    }));

    const result = await runNewsMonitoring(channels);

    // Get full channel data for alert info
    const allChannels = await getChannels();

    // Send Slack notification
    await sendSlackNotification(result, allChannels);

    return NextResponse.json({
      refreshed: true,
      reason: cached ? "cache_stale" : "no_cache",
      generated_at: result.generated_at,
      total_articles: result.total_articles,
      channels_processed: Object.keys(result.channels).length,
    });
  } catch (error) {
    console.error("News refresh error:", error);
    return NextResponse.json(
      { error: "News refresh failed", details: String(error) },
      { status: 500 }
    );
  }
}
