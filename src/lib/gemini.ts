import type { NaverNewsItem } from "./naver-search";

export type NewsCategory =
  | "RISK"
  | "REGULATORY"
  | "MANAGEMENT"
  | "GROWTH"
  | "COMPETITION";

export interface ClassifiedArticle {
  category: NewsCategory;
  title: string;
  date: string;
  summary: string;
  source: string;
  url: string;
  action_needed: string;
}

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  RISK: "리스크",
  REGULATORY: "규제",
  MANAGEMENT: "경영변동",
  GROWTH: "사업확장",
  COMPETITION: "제휴경쟁",
};

const KEYWORD_MAP: Record<NewsCategory, string[]> = {
  RISK: ["제재", "과태료", "개인정보", "유출", "소송", "부도", "영업정지", "벌금", "사기", "횡령"],
  REGULATORY: ["금융위", "금감원", "규제", "법률", "개정", "시정명령", "감독", "인가", "허가"],
  MANAGEMENT: ["인수", "합병", "대표", "교체", "구조조정", "매각", "철수", "사임", "취임"],
  GROWTH: ["투자", "유치", "신규", "서비스", "이용자", "증가", "흑자", "성장", "출시", "확장"],
  COMPETITION: ["제휴", "독점", "계약", "경쟁사", "시장점유율", "파트너", "협약", "MOU"],
};

function formatNaverDate(pubDate: string): string {
  try {
    const d = new Date(pubDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function extractSource(link: string): string {
  try {
    const url = new URL(link);
    return url.hostname.replace("www.", "");
  } catch {
    return "뉴스";
  }
}

function keywordClassify(
  articles: NaverNewsItem[]
): ClassifiedArticle[] {
  return articles.map((article) => {
    const text = `${article.title} ${article.description}`;
    let bestCategory: NewsCategory = "COMPETITION";
    let bestScore = 0;

    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      const score = keywords.filter((kw) => text.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat as NewsCategory;
      }
    }

    return {
      category: bestCategory,
      title: article.title,
      date: formatNaverDate(article.pubDate),
      summary: article.description.slice(0, 50),
      source: extractSource(article.originallink || article.link),
      url: article.originallink || article.link,
      action_needed: bestCategory === "RISK"
        ? "리스크 검토 필요"
        : bestCategory === "REGULATORY"
        ? "규제 영향 분석 필요"
        : bestCategory === "MANAGEMENT"
        ? "경영변동 모니터링"
        : bestCategory === "GROWTH"
        ? "사업 기회 검토"
        : "경쟁 동향 파악",
    };
  });
}

export async function classifyArticles(
  articles: NaverNewsItem[],
  channelName: string
): Promise<ClassifiedArticle[]> {
  if (articles.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key not configured, using keyword fallback");
    return keywordClassify(articles);
  }

  const articleList = articles.map((a, i) => ({
    index: i,
    title: a.title,
    description: a.description,
    pubDate: a.pubDate,
    url: a.originallink || a.link,
  }));

  const prompt = `당신은 금융 뉴스 분류 전문가입니다. 아래는 "${channelName}" 관련 뉴스 기사 목록입니다.

**중요: 스포츠, 연예, 엔터테인먼트 관련 기사는 반드시 제외해주세요.** 해당 기사의 index는 "excluded": true로 표시해주세요.
금융/핀테크/제휴 비즈니스와 직접 관련된 기사만 분류해주세요.

각 기사를 다음 5가지 카테고리 중 하나로 분류해주세요:
- RISK (리스크): 제재, 과태료, 개인정보유출, 소송, 부도, 영업정지
- REGULATORY (규제): 금융위, 금감원, 규제, 법률개정, 시정명령
- MANAGEMENT (경영변동): 인수합병, 대표교체, 구조조정, 매각, 철수
- GROWTH (사업확장): 투자유치, 신규서비스, 이용자수 증가, 흑자전환
- COMPETITION (제휴경쟁): 타사제휴, 독점계약, 경쟁사, 시장점유율

기사 목록:
${JSON.stringify(articleList, null, 2)}

다음 JSON 배열 형식으로만 응답해주세요 (다른 텍스트 없이):
[
  {
    "index": 0,
    "category": "RISK",
    "summary": "50자 이내 요약",
    "action_needed": "필요한 조치 설명",
    "excluded": false
  }
]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error(`Gemini API failed: ${res.status}`);
      return keywordClassify(articles);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Could not parse Gemini response as JSON");
      return keywordClassify(articles);
    }

    const classifications: Array<{
      index: number;
      category: NewsCategory;
      summary: string;
      action_needed: string;
      excluded?: boolean;
    }> = JSON.parse(jsonMatch[0]);

    return articles
      .map((article, i) => {
        const cls = classifications.find((c) => c.index === i);
        if (cls?.excluded) return null;
        const category: NewsCategory = cls?.category ?? "COMPETITION";
        return {
          category,
          title: article.title,
          date: formatNaverDate(article.pubDate),
          summary: cls?.summary ?? article.description.slice(0, 50),
          source: extractSource(article.originallink || article.link),
          url: article.originallink || article.link,
          action_needed: cls?.action_needed ?? "모니터링 필요",
        };
      })
      .filter((a): a is ClassifiedArticle => a !== null);
  } catch (error) {
    console.error("Gemini classification error:", error);
    return keywordClassify(articles);
  }
}

export { CATEGORY_LABEL };
