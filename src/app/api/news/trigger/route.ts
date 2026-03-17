import { NextResponse } from "next/server";
import { runNewsMonitoring } from "@/lib/news-monitor";
import rawData from "@/data/integrated.json";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const data = rawData as { channels: Array<{ channel_code: string; company_name: string; service_name: string }> };

    const channels = data.channels.map((ch) => ({
      channel_code: ch.channel_code,
      company_name: ch.company_name,
      service_name: ch.service_name,
    }));

    const result = await runNewsMonitoring(channels);

    return NextResponse.json({
      success: true,
      generated_at: result.generated_at,
      total_articles: result.total_articles,
      channels_processed: Object.keys(result.channels).length,
    });
  } catch (error) {
    console.error("Manual news trigger error:", error);
    return NextResponse.json(
      { error: "News monitoring failed", details: String(error) },
      { status: 500 }
    );
  }
}
