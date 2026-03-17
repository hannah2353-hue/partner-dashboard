"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileCheck,
  AlertTriangle,
  Newspaper,
} from "lucide-react";
import type { Alert, Product } from "@/lib/types";

interface AlertChannel {
  channelCode: string;
  serviceName: string;
  channelType: string;
  level: "CRITICAL" | "WARNING";
  remainingDays: number;
  alerts: Alert[];
  products: Product[];
}

interface NewsHighlight {
  category: string;
  title: string;
  date: string;
  serviceName: string;
  url: string;
}

interface DashboardClientProps {
  stats: {
    totalChannels: number;
    validContracts: number;
    criticalCount: number;
    warningCount: number;
    newsCount: number;
  };
  alertChannels: AlertChannel[];
  generatedAt: string;
  newsHighlights?: NewsHighlight[];
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  RISK: { bg: "bg-news-risk", border: "border-l-news-risk", label: "리스크" },
  REGULATORY: { bg: "bg-news-regulatory", border: "border-l-news-regulatory", label: "규제" },
  MANAGEMENT: { bg: "bg-news-management", border: "border-l-news-management", label: "경영변동" },
  GROWTH: { bg: "bg-news-growth", border: "border-l-news-growth", label: "사업확장" },
  COMPETITION: { bg: "bg-news-competition", border: "border-l-news-competition", label: "제휴경쟁" },
};

export function DashboardClient({
  stats,
  alertChannels,
  generatedAt,
  newsHighlights = [],
}: DashboardClientProps) {
  const formattedTime = new Date(generatedAt).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  function getWarningMessage(ch: AlertChannel): string {
    // Check for expired reviews first
    for (const p of ch.products) {
      if (p.ad_review && p.ad_review.compliance_remaining_days !== null) {
        if (p.ad_review.compliance_remaining_days < 0) {
          return `[${p.product}] 광고심의 만료 (${Math.abs(p.ad_review.compliance_remaining_days)}일 경과)`;
        }
        if (p.ad_review.compliance_remaining_days <= 30) {
          return `[${p.product}] 광고심의 만료 ${p.ad_review.compliance_remaining_days}일 전`;
        }
      }
    }
    if (ch.remainingDays <= 30) {
      return `계약 만료 ${ch.remainingDays}일 전`;
    }
    if (ch.remainingDays <= 90) {
      return `계약 잔여 ${ch.remainingDays}일`;
    }
    if (ch.alerts.length > 0) {
      return ch.alerts[0].message;
    }
    return "주의 필요";
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          대시보드
        </h1>
        <p className="text-sm text-muted-custom mt-1">
          마지막 동기화: {formattedTime}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="border-border-custom">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-custom font-medium">
                전체 채널
              </span>
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users size={16} className="text-muted-custom" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading">
              {stats.totalChannels}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border-custom">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-custom font-medium">
                유효 계약
              </span>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <FileCheck size={16} className="text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading text-success">
              {stats.validContracts}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border-custom">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-custom font-medium">
                경고
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle size={16} className="text-critical" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold font-heading text-critical">
                {stats.criticalCount + stats.warningCount}
              </p>
              <div className="flex gap-1.5">
                {stats.criticalCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 border-0" style={{ backgroundColor: "#FF4444", color: "#FFFFFF" }}>
                    CRITICAL {stats.criticalCount}
                  </Badge>
                )}
                {stats.warningCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 border-0" style={{ backgroundColor: "#FFD700", color: "#0D0D0D" }}>
                    WARNING {stats.warningCount}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-custom">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-custom font-medium">
                뉴스 알림
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Newspaper size={16} className="text-[#FF8C00]" />
              </div>
            </div>
            <p className="text-3xl font-bold font-heading text-[#FF8C00]">
              {stats.newsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Panel & News */}
      <div className="grid grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="col-span-2">
          <Card className="border-border-custom">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="text-critical" />
                경고 채널
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {alertChannels.length === 0 ? (
                <p className="text-sm text-muted-custom py-4 text-center">
                  경고 사항이 없습니다.
                </p>
              ) : (
                alertChannels.map((ch) => (
                  <div
                    key={ch.channelCode}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border-l-4 ${
                      ch.level === "CRITICAL"
                        ? "border-l-critical bg-red-50/50"
                        : "border-l-warning bg-yellow-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        className="text-[10px] px-1.5 py-0 font-semibold border-0"
                        style={
                          ch.level === "CRITICAL"
                            ? { backgroundColor: "#FF4444", color: "#FFFFFF" }
                            : { backgroundColor: "#FFD700", color: "#0D0D0D" }
                        }
                      >
                        {ch.level}
                      </Badge>
                      <div>
                        <p className="text-sm font-semibold">{ch.serviceName}</p>
                        <p className="text-xs text-muted-custom">
                          {getWarningMessage(ch)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-custom">
                      D-{ch.remainingDays > 0 ? ch.remainingDays : 0}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* News Highlights */}
        <div className="col-span-1">
          <Card className="border-border-custom h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <Newspaper size={16} className="text-[#FF8C00]" />
                뉴스 하이라이트
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {newsHighlights.length > 0 ? (
                <div className="space-y-2">
                  {newsHighlights.map((news, i) => {
                    const catInfo = CATEGORY_COLORS[news.category] ?? CATEGORY_COLORS.COMPETITION;
                    return (
                      <a
                        key={i}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block border-l-3 ${catInfo.border} rounded-r-md p-2.5 hover:bg-gray-50 transition-colors`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {catInfo.label}
                          </Badge>
                          <span className="text-[10px] text-muted-custom">
                            {news.serviceName}
                          </span>
                          <span className="text-[10px] text-muted-custom ml-auto">
                            {news.date}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-1">
                          {news.title}
                        </p>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Newspaper size={32} className="text-gray-300 mb-3" />
                  <p className="text-sm text-muted-custom">
                    뉴스 데이터가 없습니다
                  </p>
                  <p className="text-xs text-muted-custom mt-1">
                    뉴스 모니터링 실행 후 표시됩니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
