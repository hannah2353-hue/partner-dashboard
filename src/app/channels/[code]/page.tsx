import { getChannels, getChannelByCode, getAlertLevel } from "@/lib/data";
import { ChannelDetailClient } from "@/components/channel-detail-client";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export function generateStaticParams() {
  const channels = getChannels();
  return channels.map((ch) => ({
    code: ch.channel_code,
  }));
}

export default async function ChannelDetailPage({ params }: PageProps) {
  const { code } = await params;
  const decodedCode = decodeURIComponent(code);
  const channel = getChannelByCode(decodedCode);

  if (!channel) {
    notFound();
  }

  const alertLevel = getAlertLevel(channel);

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
    />
  );
}
