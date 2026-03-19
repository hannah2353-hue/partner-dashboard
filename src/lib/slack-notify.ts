import { getNewsData } from "./news-data";
import type { ClassifiedArticle } from "./gemini";
import type { Channel } from "./types";
import { getAlertLevel } from "./data";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string }>;
}

interface AlertItem {
  serviceName: string;
  channelType: string;
  level: "CRITICAL" | "WARNING";
  messages: string[];
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case "RISK": return "🔴";
    case "REGULATORY": return "🟠";
    case "MANAGEMENT": return "🟡";
    case "GROWTH": return "🟢";
    case "COMPETITION": return "🔵";
    default: return "⚪";
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case "RISK": return "리스크";
    case "REGULATORY": return "규제";
    case "MANAGEMENT": return "경영변동";
    case "GROWTH": return "사업확장";
    case "COMPETITION": return "제휴경쟁";
    default: return category;
  }
}

function buildAlertItems(channels: Channel[]): AlertItem[] {
  const items: AlertItem[] = [];

  for (const ch of channels) {
    const level = getAlertLevel(ch);
    if (!level) continue;

    const messages: string[] = [];

    // Contract alerts
    if (ch.contract.remaining_days <= 0) {
      messages.push(`계약 만료됨`);
    } else if (ch.contract.remaining_days <= 30) {
      messages.push(`계약 만료 ${ch.contract.remaining_days}일 전`);
    } else if (ch.contract.remaining_days <= 90) {
      messages.push(`계약 만료 ${ch.contract.remaining_days}일 전`);
    }

    // Ad review alerts
    for (const p of ch.products) {
      if (p.ad_review && p.ad_review.compliance_remaining_days !== null) {
        if (p.ad_review.compliance_remaining_days <= 0) {
          messages.push(`${p.product} 광고심의 만료됨`);
        } else if (p.ad_review.compliance_remaining_days <= 30) {
          messages.push(`${p.product} 광고심의 만료 ${p.ad_review.compliance_remaining_days}일 전`);
        } else if (p.ad_review.compliance_remaining_days <= 90) {
          messages.push(`${p.product} 광고심의 만료 ${p.ad_review.compliance_remaining_days}일 전`);
        }
      }
    }

    if (messages.length > 0) {
      items.push({
        serviceName: ch.service_name,
        channelType: ch.channel_type,
        level,
        messages,
      });
    }
  }

  // CRITICAL first, then WARNING
  items.sort((a, b) => {
    if (a.level === "CRITICAL" && b.level !== "CRITICAL") return -1;
    if (a.level !== "CRITICAL" && b.level === "CRITICAL") return 1;
    return 0;
  });

  return items;
}

export async function sendSlackNotification(
  channels: Channel[]
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not configured, skipping notification");
    return;
  }

  // Always read from Firestore cache — same data as dashboard
  const newsData = await getNewsData();
  const today = new Date().toISOString().slice(0, 10);
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📋 제휴채널 일일 리포트", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*일자:* ${today}  |  *전체 채널:* ${channels.length}개` },
    },
  ];

  // ── Section 1: Critical/Warning Alerts ──
  const alertItems = buildAlertItems(channels);
  const criticalItems = alertItems.filter((a) => a.level === "CRITICAL");
  const warningItems = alertItems.filter((a) => a.level === "WARNING");

  blocks.push(
    { type: "divider" } as SlackBlock,
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🚨 계약·심의 경고*  —  CRITICAL ${criticalItems.length}건  |  WARNING ${warningItems.length}건`,
      },
    }
  );

  if (criticalItems.length > 0) {
    for (const item of criticalItems.slice(0, 8)) {
      const msgs = item.messages.map((m) => `  • ${m}`).join("\n");
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔴 *${item.serviceName}* (${item.channelType})\n${msgs}`,
        },
      });
    }
    if (criticalItems.length > 8) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 CRITICAL ${criticalItems.length - 8}건 더...` }],
      });
    }
  }

  if (warningItems.length > 0) {
    const warningLines = warningItems.slice(0, 5).map((item) => {
      const msg = item.messages[0];
      return `🟡 *${item.serviceName}* — ${msg}`;
    });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: warningLines.join("\n") },
    });
    if (warningItems.length > 5) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 WARNING ${warningItems.length - 5}건 더...` }],
      });
    }
  }

  if (criticalItems.length === 0 && warningItems.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "✅ 경고 없음 — 모든 계약·심의 정상" },
    });
  }

  // ── Section 2: News Monitoring ──
  const allArticles: Array<ClassifiedArticle & { company_name: string }> = [];
  if (newsData) {
    for (const ch of Object.values(newsData.channels)) {
      for (const article of ch.articles) {
        const exists = allArticles.some(
          (a) => a.title === article.title && a.company_name === ch.company_name
        );
        if (!exists) {
          allArticles.push({ ...article, company_name: ch.company_name });
        }
      }
    }
  }

  const categoryCounts: Record<string, number> = {
    RISK: 0, REGULATORY: 0, MANAGEMENT: 0, GROWTH: 0, COMPETITION: 0,
  };
  for (const a of allArticles) {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  }

  const summaryParts = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${getCategoryEmoji(cat)} ${getCategoryLabel(cat)} ${count}건`);

  const newsSummary = summaryParts.length > 0
    ? summaryParts.join("  |  ")
    : "최근 10일 내 뉴스 없음";

  blocks.push(
    { type: "divider" } as SlackBlock,
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📰 뉴스 모니터링*  —  총 ${allArticles.length}건\n${newsSummary}`,
      },
    }
  );

  // Urgent news (RISK + REGULATORY)
  const urgentArticles = allArticles.filter(
    (a) => a.category === "RISK" || a.category === "REGULATORY"
  );

  if (urgentArticles.length > 0) {
    for (const article of urgentArticles.slice(0, 5)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${getCategoryEmoji(article.category)} *[${article.company_name}]* <${article.url}|${article.title}>\n${article.summary}\n📋 _${article.action_needed}_`,
        },
      });
    }
    if (urgentArticles.length > 5) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 ${urgentArticles.length - 5}건 더...` }],
      });
    }
  }

  // Other news
  const otherArticles = allArticles.filter(
    (a) => a.category !== "RISK" && a.category !== "REGULATORY"
  );

  if (otherArticles.length > 0) {
    const otherLines = otherArticles.slice(0, 3).map(
      (a) => `${getCategoryEmoji(a.category)} *[${a.company_name}]* <${a.url}|${a.title}>`
    );
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: otherLines.join("\n") },
    });
    if (otherArticles.length > 3) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 ${otherArticles.length - 3}건 더...` }],
      });
    }
  }

  // ── Footer ──
  blocks.push(
    { type: "divider" } as SlackBlock,
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `🔗 <${process.env.NEXT_PUBLIC_BASE_URL || "https://your-app.vercel.app"}|대시보드에서 전체 보기>` }],
    }
  );

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!res.ok) {
      console.error(`Slack notification failed: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error("Slack notification error:", error);
  }
}
