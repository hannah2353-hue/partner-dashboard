import fs from "fs";
import path from "path";
import type { ClassifiedArticle, NewsCategory } from "./gemini";

export interface ChannelNewsData {
  channel_code: string;
  service_name: string;
  company_name: string;
  articles: ClassifiedArticle[];
}

export interface NewsData {
  generated_at: string;
  total_articles: number;
  channels: Record<string, ChannelNewsData>;
}

export interface NewsStats {
  total: number;
  byCategory: Record<string, number>;
}

const NEWS_CACHE_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "news-cache.json"
);

export function getNewsData(): NewsData | null {
  try {
    if (!fs.existsSync(NEWS_CACHE_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(NEWS_CACHE_PATH, "utf-8");
    return JSON.parse(raw) as NewsData;
  } catch {
    return null;
  }
}

export function getChannelNews(channelCode: string): ClassifiedArticle[] {
  const data = getNewsData();
  if (!data) return [];
  return data.channels[channelCode]?.articles ?? [];
}

export function getNewsStats(): NewsStats {
  const data = getNewsData();
  if (!data) {
    return { total: 0, byCategory: {} };
  }

  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const ch of Object.values(data.channels)) {
    for (const article of ch.articles) {
      total++;
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }
  }

  return { total, byCategory };
}

export function getAllArticlesFlat(): Array<
  ClassifiedArticle & { channel_code: string; service_name: string }
> {
  const data = getNewsData();
  if (!data) return [];

  const result: Array<
    ClassifiedArticle & { channel_code: string; service_name: string }
  > = [];

  for (const [channelCode, chData] of Object.entries(data.channels)) {
    for (const article of chData.articles) {
      result.push({
        ...article,
        channel_code: channelCode,
        service_name: chData.service_name,
      });
    }
  }

  // Sort by date desc
  result.sort((a, b) => b.date.localeCompare(a.date));
  return result;
}

export function getNewsCacheGeneratedAt(): string | null {
  const data = getNewsData();
  return data?.generated_at ?? null;
}

export { NEWS_CACHE_PATH };
export type { NewsCategory };
