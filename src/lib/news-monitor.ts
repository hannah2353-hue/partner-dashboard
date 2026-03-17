import fs from "fs";
import { searchNews } from "./naver-search";
import { classifyArticles } from "./gemini";
import type { NewsData, ChannelNewsData } from "./news-data";
import { NEWS_CACHE_PATH } from "./news-data";

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

export async function runNewsMonitoring(
  channels: ChannelInfo[]
): Promise<NewsData> {
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

      if (articles.length === 0) {
        // Still register channel with empty articles
        for (const code of group.channel_codes) {
          newsChannels[code] = {
            channel_code: code,
            service_name: group.service_name,
            company_name: group.company_name,
            articles: [],
          };
        }
        continue;
      }

      // Classify with Gemini
      const classified = await classifyArticles(articles, group.service_name);
      totalArticles += classified.length * group.channel_codes.length;

      // Map results to all related channel codes
      for (const code of group.channel_codes) {
        newsChannels[code] = {
          channel_code: code,
          service_name: group.service_name,
          company_name: group.company_name,
          articles: classified,
        };
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(
        `News monitoring failed for ${group.company_name}:`,
        error
      );
      // Register with empty articles on error
      for (const code of group.channel_codes) {
        newsChannels[code] = {
          channel_code: code,
          service_name: group.service_name,
          company_name: group.company_name,
          articles: [],
        };
      }
    }
  }

  const newsData: NewsData = {
    generated_at: new Date().toISOString(),
    total_articles: totalArticles,
    channels: newsChannels,
  };

  // Save to cache file
  try {
    fs.writeFileSync(NEWS_CACHE_PATH, JSON.stringify(newsData, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write news cache:", error);
  }

  return newsData;
}
