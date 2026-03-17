"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Search as SearchIcon } from "lucide-react";
import { useState } from "react";

const categories = [
  { key: "전체", label: "전체", color: "" },
  { key: "리스크", label: "리스크", color: "bg-news-risk" },
  { key: "규제", label: "규제", color: "bg-news-regulatory" },
  { key: "경영변동", label: "경영변동", color: "bg-news-management" },
  { key: "사업확장", label: "사업확장", color: "bg-news-growth" },
  { key: "제휴경쟁", label: "제휴경쟁", color: "bg-news-competition" },
];

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState("전체");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          뉴스 모니터링
        </h1>
        <p className="text-sm text-muted-custom mt-1">
          마지막 검색: -
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
        <TabsList className="bg-gray-100">
          {categories.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key} className="text-sm gap-1.5">
              {cat.color && (
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
              )}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Empty State */}
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
              실행 후 채널별 관련 뉴스가 여기에 표시됩니다.
            </p>

            {/* Preview cards showing what it would look like */}
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
    </div>
  );
}
