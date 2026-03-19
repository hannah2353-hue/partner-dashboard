import { adminDb } from "./firebase-admin";
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

const NEWS_CACHE_DOC = "news_cache/latest";

export async function saveNewsData(newsData: NewsData): Promise<void> {
  try {
    await adminDb.doc(NEWS_CACHE_DOC).set(newsData);
  } catch (error) {
    console.error("Failed to save news cache to Firestore:", error);
  }
}

export async function getNewsData(): Promise<NewsData | null> {
  try {
    const doc = await adminDb.doc(NEWS_CACHE_DOC).get();
    if (!doc.exists) return null;
    return doc.data() as NewsData;
  } catch {
    return null;
  }
}

export async function getChannelNews(channelCode: string): Promise<ClassifiedArticle[]> {
  const data = await getNewsData();
  if (!data) return [];
  return data.channels[channelCode]?.articles ?? [];
}

export async function getNewsStats(): Promise<NewsStats> {
  const data = await getNewsData();
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

export async function getAllArticlesFlat(): Promise<
  Array<ClassifiedArticle & { channel_code: string; service_name: string }>
> {
  const data = await getNewsData();
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

export async function getNewsCacheGeneratedAt(): Promise<string | null> {
  const data = await getNewsData();
  return data?.generated_at ?? null;
}

export type { NewsCategory };
