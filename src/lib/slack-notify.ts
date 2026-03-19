import type { NewsData } from "./news-data";
import type { ClassifiedArticle } from "./gemini";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string }>;
  accessory?: { type: string; text: { type: string; text: string; emoji?: boolean }; url: string };
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

export async function sendNewsSlackNotification(newsData: NewsData): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not configured, skipping notification");
    return;
  }

  // Collect all articles with channel info
  const allArticles: Array<ClassifiedArticle & { company_name: string }> = [];
  for (const ch of Object.values(newsData.channels)) {
    for (const article of ch.articles) {
      // Avoid duplicates (same company can have multiple channel codes)
      const exists = allArticles.some(
        (a) => a.title === article.title && a.company_name === ch.company_name
      );
      if (!exists) {
        allArticles.push({ ...article, company_name: ch.company_name });
      }
    }
  }

  // Count by category
  const categoryCounts: Record<string, number> = {
    RISK: 0, REGULATORY: 0, MANAGEMENT: 0, GROWTH: 0, COMPETITION: 0,
  };
  for (const a of allArticles) {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  }

  // Build summary line
  const summaryParts = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `${getCategoryEmoji(cat)} ${getCategoryLabel(cat)} ${count}건`);

  const summaryText = summaryParts.length > 0
    ? summaryParts.join("  |  ")
    : "새로운 뉴스가 없습니다";

  // Build blocks
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📰 제휴채널 뉴스 모니터링", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*일자:* ${newsData.generated_at.slice(0, 10)}  |  *총 ${allArticles.length}건*\n${summaryText}` },
    },
  ];

  // RISK & REGULATORY articles first (urgent)
  const urgentArticles = allArticles.filter(
    (a) => a.category === "RISK" || a.category === "REGULATORY"
  );

  if (urgentArticles.length > 0) {
    blocks.push(
      { type: "divider" } as SlackBlock,
      {
        type: "section",
        text: { type: "mrkdwn", text: "*⚠️ 주의 필요 기사*" },
      }
    );

    for (const article of urgentArticles.slice(0, 10)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${getCategoryEmoji(article.category)} *[${article.company_name}]* <${article.url}|${article.title}>\n${article.summary}\n📋 _${article.action_needed}_`,
        },
      });
    }

    if (urgentArticles.length > 10) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 ${urgentArticles.length - 10}건 더...` }],
      });
    }
  }

  // Other articles summary
  const otherArticles = allArticles.filter(
    (a) => a.category !== "RISK" && a.category !== "REGULATORY"
  );

  if (otherArticles.length > 0) {
    blocks.push(
      { type: "divider" } as SlackBlock,
      {
        type: "section",
        text: { type: "mrkdwn", text: "*📌 기타 동향*" },
      }
    );

    for (const article of otherArticles.slice(0, 5)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${getCategoryEmoji(article.category)} *[${article.company_name}]* <${article.url}|${article.title}>\n${article.summary}`,
        },
      });
    }

    if (otherArticles.length > 5) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `외 ${otherArticles.length - 5}건 더...` }],
      });
    }
  }

  // Footer
  blocks.push(
    { type: "divider" } as SlackBlock,
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `🔗 <${process.env.NEXT_PUBLIC_BASE_URL || "https://your-app.vercel.app"}/news|대시보드에서 전체 보기>` }],
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
