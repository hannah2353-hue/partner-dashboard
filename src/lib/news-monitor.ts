import { searchNews } from "./naver-search";
import { classifyArticles, type ClassifiedArticle } from "./gemini";
import type { NewsData, ChannelNewsData } from "./news-data";
import { getNewsData, saveNewsData } from "./news-data";

interface ChannelInfo {
  channel_code: string;
  company_name: string;
  service_name: string;
}

interface CompanyGroup {
  company_name: string;
  service_name: string;
  channel_codes: string[];
}

const RETENTION_DAYS = 10;

function isWithinRetention(dateStr: string): boolean {
  try {
    const articleDate = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    return articleDate >= cutoff;
  } catch {
    return false;
  }
}

function mergeArticles(
  existing: ClassifiedArticle[],
  incoming: ClassifiedArticle[]
): ClassifiedArticle[] {
  // Use URL as unique key to deduplicate
  const byUrl = new Map<string, ClassifiedArticle>();

  // Existing articles first
  for (const a of existing) {
    if (isWithinRetention(a.date)) {
      byUrl.set(a.url, a);
    }
  }

  // Incoming articles overwrite (fresher data)
  for (const a of incoming) {
    byUrl.set(a.url, a);
  }

  // Sort by date desc
  return Array.from(byUrl.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export async function runNewsMonitoring(
  channels: ChannelInfo[]
): Promise<NewsData> {
  // Load existing cache for merging
  const existingCache = await getNewsData();

  // Deduplicate by company_name
  const companyMap = new Map<string, CompanyGroup>();

  for (const ch of channels) {
    const key = ch.company_name;
    if (companyMap.has(key)) {
      companyMap.get(key)!.channel_codes.push(ch.channel_code);
    } else {
      companyMap.set(key, {
        company_name: ch.company_name,
        service_name: ch.service_name,
        channel_codes: [ch.channel_code],
      });
    }
  }

  const newsChannels: Record<string, ChannelNewsData> = {};
  let totalArticles = 0;

  for (const group of companyMap.values()) {
    try {
      // Build search query
      const query = `"${group.service_name}" OR "${group.company_name}"`;

      // Search Naver
      const articles = await searchNews(query);

      // Classify new articles with Gemini (only if there are new ones)
      const classified = articles.length > 0
        ? await classifyArticles(articles, group.service_name)
        : [];

      // Merge with existing cached articles for this channel
      for (const code of group.channel_codes) {
        const existingArticles = existingCache?.channels[code]?.articles ?? [];
        const merged = mergeArticles(existingArticles, classified);

        newsChannels[code] = {
          channel_code: code,
          service_name: group.service_name,
          company_name: group.company_name,
          articles: merged,
        };

        totalArticles += merged.length;
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(
        `News monitoring failed for ${group.company_name}:`,
        error
      );
      // On error, keep existing cached articles
      for (const code of group.channel_codes) {
        const existingArticles = existingCache?.channels[code]?.articles ?? [];
        const retained = existingArticles.filter((a) => isWithinRetention(a.date));

        newsChannels[code] = {
          channel_code: code,
          service_name: group.service_name,
          company_name: group.company_name,
          articles: retained,
        };

        totalArticles += retained.length;
      }
    }
  }

  const newsData: NewsData = {
    generated_at: new Date().toISOString(),
    total_articles: totalArticles,
    channels: newsChannels,
  };

  // Save to Firestore
  await saveNewsData(newsData);

  return newsData;
}
