export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/?b>/g, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

// 스포츠/연예 관련 키워드 — 제목이나 설명에 포함되면 제외
const EXCLUDE_KEYWORDS = [
  "야구", "축구", "농구", "배구", "골프", "테니스", "올림픽", "월드컵",
  "KBO", "K리그", "V리그", "프로야구", "프로축구", "프로배구", "EPL", "MLB", "NBA", "FIFA",
  "홈런", "골대", "선발투수", "타율", "승률", "감독대행", "세트스코어",
  "아이돌", "걸그룹", "보이그룹", "컴백", "팬미팅", "콘서트", "뮤직비디오",
  "드라마", "예능", "출연", "시청률", "연예인", "배우", "가수", "팬덤",
  "엔터테인먼트", "소속사", "데뷔", "음원", "앨범", "뮤직", "방송",
];

function isIrrelevantArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`;
  return EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}

function isWithinDays(pubDate: string, days: number): boolean {
  try {
    const articleDate = new Date(pubDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return articleDate >= cutoff;
  } catch {
    return false;
  }
}

export async function searchNews(query: string): Promise<NaverNewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Naver API credentials not configured");
    return [];
  }

  const params = new URLSearchParams({
    query,
    display: "30",
    sort: "date",
  });

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?${params.toString()}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );

    if (!res.ok) {
      console.error(`Naver search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: NaverSearchResponse = await res.json();

    return data.items
      .map((item) => ({
        ...item,
        title: stripHtml(item.title),
        description: stripHtml(item.description),
      }))
      .filter((item) => isWithinDays(item.pubDate, 7))
      .filter((item) => !isIrrelevantArticle(item.title, item.description));
  } catch (error) {
    console.error("Naver search error:", error);
    return [];
  }
}
