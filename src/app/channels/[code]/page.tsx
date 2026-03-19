import { getChannelByCode, getAlertLevel } from "@/lib/data";
import { ChannelDetailClient } from "@/components/channel-detail-client";
import { notFound } from "next/navigation";
import { getChannelNews } from "@/lib/news-data";

// Make this page dynamic so it always reads fresh data after edits
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ChannelDetailPage({ params }: PageProps) {
  const { code } = await params;
  const decodedCode = decodeURIComponent(code);
  const channel = await getChannelByCode(decodedCode);

  if (!channel) {
    notFound();
  }

  const alertLevel = getAlertLevel(channel);
  const channelNews = await getChannelNews(decodedCode);

  return (
    <ChannelDetailClient
      channel={{
        channel_code: channel.channel_code,
        channel_type: channel.channel_type,
        service_name: channel.service_name,
        company_name: channel.company_name,
        contract: channel.contract,
        products: channel.products,
        alerts: channel.alerts,
        news: channel.news,
        alert_level: alertLevel,
        updated_at: channel.updated_at,
      }}
      classifiedNews={channelNews}
    />
  );
}
