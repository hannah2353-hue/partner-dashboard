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

export async function searchNews(query: string): Promise<NaverNewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Naver API credentials not configured");
    return [];
  }

  const params = new URLSearchParams({
    query,
    display: "10",
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

    return data.items.map((item) => ({
      ...item,
      title: stripHtml(item.title),
      description: stripHtml(item.description),
    }));
  } catch (error) {
    console.error("Naver search error:", error);
    return [];
  }
}
