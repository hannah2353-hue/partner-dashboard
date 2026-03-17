"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  Pencil,
  Plus,
  Send,
  Newspaper,
} from "lucide-react";
import type { Contract, Product, Alert, NewsItem } from "@/lib/types";

interface ChannelDetailData {
  channel_code: string;
  channel_type: "비교대출" | "광고배너";
  service_name: string;
  company_name: string;
  contract: Contract;
  products: Product[];
  alerts: Alert[];
  news: NewsItem[] | null;
  alert_level: "CRITICAL" | "WARNING" | null;
  updated_at: string;
}

interface Props {
  channel: ChannelDetailData;
}

export function ChannelDetailClient({ channel: ch }: Props) {
  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-custom mb-6">
        <Link href="/channels" className="hover:text-foreground transition-colors">
          채널 목록
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{ch.channel_code}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold font-heading">{ch.service_name}</h1>
        <Badge
          variant="outline"
          className={`text-xs ${
            ch.channel_type === "비교대출"
              ? "border-blue-200 text-blue-700 bg-blue-50"
              : "border-purple-200 text-purple-700 bg-purple-50"
          }`}
        >
          {ch.channel_type}
        </Badge>
        {ch.alert_level && (
          <Badge
            className={`text-[10px] px-1.5 py-0 font-semibold ${
              ch.alert_level === "CRITICAL"
                ? "bg-critical text-white"
                : "bg-warning text-foreground"
            }`}
          >
            {ch.alert_level}
          </Badge>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Contract + Products */}
        <div className="col-span-2 space-y-6">
          {/* Contract Info */}
          <Card className="border-border-custom">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-semibold">
                계약 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <InfoField label="업체명" value={ch.company_name} editable />
                <InfoField label="연동방식" value={ch.contract.integration_type} editable />
                <InfoField
                  label="계약기간"
                  value={`${ch.contract.start_date} ~ ${ch.contract.end_date}`}
                  editable
                />
                <InfoField
                  label="잔여일"
                  value={`${ch.contract.remaining_days}일`}
                  highlight={ch.contract.remaining_days <= 90}
                />
                <InfoField
                  label="자동연장"
                  value={ch.contract.auto_renewal ? "예" : "아니오"}
                  editable
                />
                <InfoField
                  label="모집법인여부"
                  value={ch.contract.is_recruitment_corp ? "예" : "아니오"}
                  editable
                />
                <InfoField
                  label="최초 계약일"
                  value={ch.contract.first_contract_date}
                />
                <InfoField
                  label="평균 수수료율"
                  value={ch.contract.commission_rate_avg}
                />
                {ch.contract.memo && ch.contract.memo !== "-" && (
                  <div className="col-span-2">
                    <InfoField label="메모" value={ch.contract.memo} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card className="border-border-custom">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-heading font-semibold">
                취급 상품
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs border-border-custom">
                <Plus size={14} />
                상품 추가
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-3">
              {ch.products.map((p) => (
                <div
                  key={p.product}
                  className="bg-gray-50 rounded-lg p-4 border border-border-custom"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">{p.product}</h4>
                    {p.original_names.length > 0 && (
                      <span className="text-xs text-muted-custom">
                        {p.original_names.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-6">
                    <InfoField
                      label="수수료율"
                      value={p.commission?.rate ?? "-"}
                      editable
                    />
                    <InfoField
                      label="VAT"
                      value={p.commission?.vat ?? "-"}
                    />
                    <InfoField
                      label="심의번호"
                      value={p.ad_review?.compliance_number ?? "-"}
                    />
                    <InfoField
                      label="심의만료"
                      value={p.ad_review?.compliance_expiry ?? "-"}
                      editable
                      highlight={
                        p.ad_review?.compliance_remaining_days !== undefined &&
                        p.ad_review?.compliance_remaining_days !== null &&
                        p.ad_review.compliance_remaining_days <= 30
                      }
                    />
                    {p.settlement_exclusion && (
                      <InfoField
                        label="정산제외"
                        value={`${p.settlement_exclusion.days}일 / ${p.settlement_exclusion.condition}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: News + NL Edit */}
        <div className="col-span-1 space-y-6">
          {/* News */}
          <Card className="border-border-custom">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <Newspaper size={16} className="text-[#FF8C00]" />
                관련 뉴스
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Newspaper size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-muted-custom">
                  뉴스 데이터 없음
                </p>
              </div>
            </CardContent>
          </Card>

          {/* NL Edit */}
          <Card className="border-border-custom">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-semibold">
                자연어 수정
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-custom mb-3">
                자연어로 채널 정보를 수정할 수 있습니다.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 수수료율을 1.5%로 변경해줘"
                  className="flex-1 text-sm border-border-custom"
                />
                <Button size="icon" className="bg-accent-red hover:bg-accent-red/90 shrink-0">
                  <Send size={16} className="text-white" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  editable,
  highlight,
}: {
  label: string;
  value: string;
  editable?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-custom mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-sm ${
            highlight ? "text-critical font-semibold" : "text-foreground"
          }`}
        >
          {value}
        </span>
        {editable && (
          <button className="text-muted-custom hover:text-accent-red transition-colors">
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
