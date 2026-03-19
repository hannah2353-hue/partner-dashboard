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
  search_keywords: string[];
}

// 영문↔한글 별칭 매핑 (서비스명·법인명으로 커버 안 되는 이름)
const ALIAS_MAP: Record<string, string[]> = {
  "TOSS": ["토스"],
  "토스뱅크": ["Toss Bank"],
  "FINDA": ["핀다"],
  "NICE평가정보": ["나이스평가정보", "NICE"],
  "NH농협": ["농협은행", "농협"],
  "네이버페이": ["네이버파이낸셜", "Naver Pay"],
  "카카오뱅크": ["Kakao Bank"],
  "카카오페이": ["Kakao Pay"],
  "케이뱅크": ["K뱅크", "K Bank"],
  "뱅크샐러드": ["Banksalad"],
  "캐시노트": ["한국신용데이터"],
  "핀크": ["Finnq"],
  "알다": ["KB핀테크"],
  "KB국민카드": ["국민카드", "KB카드"],
  "리브메이트": ["Liiv Mate"],
  "오케이캐피탈": ["OK캐피탈"],
};

function buildSearchKeywords(
  serviceName: string,
  companyName: string,
  channelCodes: string[]
): string[] {
  const keywords = new Set<string>();

  // 서비스명
  keywords.add(serviceName);

  // 법인명 (㈜ 제거한 버전도 추가)
  keywords.add(companyName);
  const cleanCompany = companyName.replace(/[㈜㈜()]/g, "").trim();
  if (cleanCompany !== companyName && cleanCompany.length > 1) {
    keywords.add(cleanCompany);
  }

  // 채널코드에서 이름 추출 (제휴_ 접두사 제거)
  for (const code of channelCodes) {
    const name = code.replace(/^제휴_/, "").replace(/\(.*\)$/, "").trim();
    if (name.length > 1) {
      keywords.add(name);
    }
  }

  // 별칭 매핑
  for (const kw of [...keywords]) {
    const aliases = ALIAS_MAP[kw];
    if (aliases) {
      for (const alias of aliases) {
        keywords.add(alias);
      }
    }
  }

  return Array.from(keywords);
}

function buildSearchQuery(keywords: string[]): string {
  // 네이버 API 쿼리 길이 제한이 있으므로 최대 5개 키워드
  const selected = keywords.slice(0, 5);
  return selected.map((kw) => `"${kw}"`).join(" OR ");
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
        search_keywords: [],
      });
    }
  }

  // Build search keywords after all channel codes are grouped
  for (const group of companyMap.values()) {
    group.search_keywords = buildSearchKeywords(
      group.service_name,
      group.company_name,
      group.channel_codes
    );
  }

  const newsChannels: Record<string, ChannelNewsData> = {};
  let totalArticles = 0;

  for (const group of companyMap.values()) {
    try {
      // Build search query from all keywords
      const query = buildSearchQuery(group.search_keywords);

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
