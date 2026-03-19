import { getAllArticlesFlat, getNewsCacheGeneratedAt, getNewsStats } from "@/lib/news-data";
import { NewsPageClient } from "@/components/news-page-client";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [articles, generatedAt, stats] = await Promise.all([
    getAllArticlesFlat(),
    getNewsCacheGeneratedAt(),
    getNewsStats(),
  ]);

  return (
    <NewsPageClient
      articles={articles}
      generatedAt={generatedAt}
      stats={stats}
    />
  );
}
