import { getChannels, getAlertLevel } from "@/lib/data";
import { ChannelListClient } from "@/components/channel-list-client";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await getChannels();

  const channelData = channels.map((ch) => ({
    channel_code: ch.channel_code,
    channel_type: ch.channel_type,
    service_name: ch.service_name,
    company_name: ch.company_name,
    active_products: ch.active_products,
    remaining_days: ch.contract.remaining_days,
    alert_level: getAlertLevel(ch),
    products: ch.products.map((p) => ({
      product: p.product,
      commission_rate: p.commission?.rate ?? "-",
      commission_vat: p.commission?.vat ?? "-",
      compliance_number: p.ad_review?.compliance_number ?? "-",
      compliance_expiry: p.ad_review?.compliance_expiry ?? "-",
      compliance_remaining_days: p.ad_review?.compliance_remaining_days ?? null,
    })),
    alerts: ch.alerts,
  }));

  const counts = {
    total: channels.length,
    비교대출: channels.filter((c) => c.channel_type === "비교대출").length,
    광고배너: channels.filter((c) => c.channel_type === "광고배너").length,
  };

  return <ChannelListClient channels={channelData} counts={counts} />;
}
