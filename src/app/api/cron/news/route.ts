import { NextRequest, NextResponse } from "next/server";
import { runNewsMonitoring } from "@/lib/news-monitor";
import { sendSlackNotification } from "@/lib/slack-notify";
import { getChannels } from "@/lib/data";
import rawData from "@/data/integrated.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret (skip in dev if no header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" && !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = rawData as { channels: Array<{ channel_code: string; company_name: string; service_name: string }> };

    const channels = data.channels.map((ch) => ({
      channel_code: ch.channel_code,
      company_name: ch.company_name,
      service_name: ch.service_name,
    }));

    const result = await runNewsMonitoring(channels);

    // Get full channel data from Firestore for alert info
    const allChannels = await getChannels();

    // Send Slack notification with news + alerts
    await sendSlackNotification(result, allChannels);

    return NextResponse.json({
      success: true,
      generated_at: result.generated_at,
      total_articles: result.total_articles,
      channels_processed: Object.keys(result.channels).length,
    });
  } catch (error) {
    console.error("Cron news monitoring error:", error);
    return NextResponse.json(
      { error: "News monitoring failed", details: String(error) },
      { status: 500 }
    );
  }
}
