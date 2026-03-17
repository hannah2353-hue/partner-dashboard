"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClassifiedArticle } from "@/lib/gemini";
import type { NewsStats } from "@/lib/news-data";

type ArticleWithChannel = ClassifiedArticle & {
  channel_code: string;
  service_name: string;
};

interface Props {
  articles: ArticleWithChannel[];
  generatedAt: string | null;
  stats: NewsStats;
}

const CATEGORY_MAP: Record<string, { key: string; label: string; color: string; borderColor: string }> = {
  RISK: { key: "RISK", label: "리스크", color: "bg-news-risk", borderColor: "border-l-news-risk" },
  REGULATORY: { key: "REGULATORY", label: "규제", color: "bg-news-regulatory", borderColor: "border-l-news-regulatory" },
  MANAGEMENT: { key: "MANAGEMENT", label: "경영변동", color: "bg-news-management", borderColor: "border-l-news-management" },
  GROWTH: { key: "GROWTH", label: "사업확장", color: "bg-news-growth", borderColor: "border-l-news-growth" },
  COMPETITION: { key: "COMPETITION", label: "제휴경쟁", color: "bg-news-competition", borderColor: "border-l-news-competition" },
};

const categories = [
  { key: "전체", label: "전체", color: "" },
  { key: "RISK", label: "리스크", color: "bg-news-risk" },
  { key: "REGULATORY", label: "규제", color: "bg-news-regulatory" },
  { key: "MANAGEMENT", label: "경영변동", color: "bg-news-management" },
  { key: "GROWTH", label: "사업확장", color: "bg-news-growth" },
  { key: "COMPETITION", label: "제휴경쟁", color: "bg-news-competition" },
];

function getCategoryInfo(category: string) {
  return CATEGORY_MAP[category] ?? CATEGORY_MAP.COMPETITION;
}

export function NewsPageClient({ articles, generatedAt, stats }: Props) {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [isPending, startTransition] = useTransition();
  const [isTriggering, setIsTriggering] = useState(false);
  const router = useRouter();

  const hasData = articles.length > 0 || generatedAt !== null;

  const filteredArticles =
    activeCategory === "전체"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  async function handleTrigger() {
    setIsTriggering(true);
    try {
      const res = await fetch("/api/news/trigger", { method: "POST" });
      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        console.error("Trigger failed:", await res.text());
      }
    } catch (error) {
      console.error("Trigger error:", error);
    } finally {
      setIsTriggering(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            뉴스 모니터링
          </h1>
          <p className="text-sm text-muted-custom mt-1">
            마지막 검색: {formattedTime}
          </p>
        </div>
        <Button
          onClick={handleTrigger}
          disabled={isTriggering || isPending}
          variant="outline"
          className="gap-2 border-border-custom"
        >
          <RefreshCw
            size={14}
            className={isTriggering || isPending ? "animate-spin" : ""}
          />
          {isTriggering ? "실행 중..." : "수동 실행"}
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="mb-6"
      >
        <TabsList className="bg-gray-100">
          {categories.map((cat) => {
            const count =
              cat.key === "전체"
                ? stats.total
                : stats.byCategory[cat.key] ?? 0;
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="text-sm gap-1.5"
              >
                {cat.color && (
                  <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                )}
                {cat.label}
                {count > 0 && (
                  <span className="text-xs text-muted-custom ml-0.5">
                    ({count})
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {!hasData ? (
        /* Empty State */
        <Card className="border-border-custom">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Newspaper size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold font-heading text-foreground mb-2">
                뉴스 모니터링 미실행
              </h3>
              <p className="text-sm text-muted-custom max-w-sm">
                뉴스 모니터링 파이프라인이 아직 실행되지 않았습니다.
                <br />
                &ldquo;수동 실행&rdquo; 버튼을 눌러 뉴스를 검색하세요.
              </p>

              {/* Preview cards */}
              <div className="mt-8 w-full max-w-lg space-y-3">
                {[
                  { cat: "리스크", color: "border-l-news-risk", title: "뉴스 기사 제목이 표시됩니다" },
                  { cat: "규제", color: "border-l-news-regulatory", title: "금융 관련 규제 변경 뉴스" },
                  { cat: "사업확장", color: "border-l-news-growth", title: "제휴사 사업 확장 소식" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`border-l-4 ${item.color} bg-gray-50 rounded-r-lg p-4 opacity-40`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {item.cat}
                      </Badge>
                      <span className="text-xs text-muted-custom">채널명</span>
                      <span className="text-xs text-muted-custom ml-auto">
                        2026-03-17
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-custom mt-1">
                      조치 필요 사항이 표시됩니다
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredArticles.length === 0 ? (
        <Card className="border-border-custom">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Newspaper size={28} className="text-gray-300 mb-3" />
              <p className="text-sm text-muted-custom">
                {activeCategory === "전체"
                  ? "검색된 뉴스가 없습니다"
                  : `"${categories.find((c) => c.key === activeCategory)?.label}" 카테고리 뉴스가 없습니다`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map((article, i) => {
            const catInfo = getCategoryInfo(article.category);
            return (
              <div
                key={`${article.url}-${i}`}
                className={`border-l-4 ${catInfo.borderColor} bg-white rounded-r-lg p-4 border border-border-custom border-l-4`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${catInfo.color} mr-1`}
                    />
                    {catInfo.label}
                  </Badge>
                  <span className="text-xs text-muted-custom">
                    {article.service_name}
                  </span>
                  <span className="text-xs text-muted-custom ml-auto">
                    {article.date}
                  </span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-accent-red transition-colors inline-flex items-center gap-1"
                >
                  {article.title}
                  <ExternalLink size={12} className="shrink-0 opacity-50" />
                </a>
                <p className="text-xs text-muted-custom mt-1">
                  {article.summary}
                </p>
                {article.action_needed && (
                  <p className="text-xs text-[#FF8C00] mt-1.5 font-medium">
                    {article.action_needed}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
