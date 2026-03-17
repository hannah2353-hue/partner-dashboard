import { getAllArticlesFlat, getNewsCacheGeneratedAt, getNewsStats } from "@/lib/news-data";
import { NewsPageClient } from "@/components/news-page-client";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  const articles = getAllArticlesFlat();
  const generatedAt = getNewsCacheGeneratedAt();
  const stats = getNewsStats();

  return (
    <NewsPageClient
      articles={articles}
      generatedAt={generatedAt}
      stats={stats}
    />
  );
}
