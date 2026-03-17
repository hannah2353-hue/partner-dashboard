"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Pencil,
  Plus,
  Send,
  Newspaper,
  X,
  Check,
} from "lucide-react";
import type { Contract, Product, Alert, NewsItem } from "@/lib/types";
import type { ClassifiedArticle } from "@/lib/gemini";
import { InlineEditField } from "@/components/inline-edit-field";
import { DiffConfirmModal, type DiffChange } from "@/components/diff-confirm-modal";

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
  classifiedNews?: ClassifiedArticle[];
}

const NEWS_CATEGORY_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  RISK: { bg: "bg-news-risk", border: "border-l-news-risk", label: "리스크" },
  REGULATORY: { bg: "bg-news-regulatory", border: "border-l-news-regulatory", label: "규제" },
  MANAGEMENT: { bg: "bg-news-management", border: "border-l-news-management", label: "경영변동" },
  GROWTH: { bg: "bg-news-growth", border: "border-l-news-growth", label: "사업확장" },
  COMPETITION: { bg: "bg-news-competition", border: "border-l-news-competition", label: "제휴경쟁" },
};

const PRODUCT_OPTIONS = ["신용대출", "햇살론", "오토론", "회생상품", "대환대출"];
const INTEGRATION_OPTIONS = ["API", "전용회선", "WEB", "쿠콘연동"];
const VAT_OPTIONS = ["VAT별도", "VAT면세", "VAT포함"];

export function ChannelDetailClient({ channel: initialChannel, classifiedNews = [] }: Props) {
  const router = useRouter();
  const [ch, setCh] = useState(initialChannel);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    apiChanges: { field: string; value: unknown; productIndex?: number }[];
    diffChanges: DiffChange[];
    method: string;
  } | null>(null);

  // Add product state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product: "신용대출",
    commission_rate: "",
    vat: "VAT별도",
  });

  // NL edit state
  const [nlText, setNlText] = useState("");
  const [nlError, setNlError] = useState("");
  const [nlLoading, setNlLoading] = useState(false);

  const showConfirmModal = useCallback(
    (
      apiChanges: { field: string; value: unknown; productIndex?: number }[],
      diffChanges: DiffChange[],
      method = "MANUAL"
    ) => {
      setPendingChanges({ apiChanges, diffChanges, method });
      setModalOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!pendingChanges) return;
    setModalLoading(true);
    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(ch.channel_code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: pendingChanges.apiChanges,
          method: pendingChanges.method,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "저장 실패");
        return;
      }
      const data = await res.json();
      // Update local state with returned channel data
      const updated = data.channel;
      setCh({
        channel_code: updated.channel_code,
        channel_type: updated.channel_type,
        service_name: updated.service_name,
        company_name: updated.company_name,
        contract: updated.contract,
        products: updated.products,
        alerts: updated.alerts,
        news: updated.news,
        alert_level: updated.alerts?.some(
          (a: Alert) => a.level === "CRITICAL" || a.level === "EXPIRED"
        )
          ? "CRITICAL"
          : updated.alerts?.some((a: Alert) => a.level === "WARNING")
          ? "WARNING"
          : null,
        updated_at: updated.updated_at,
      });
      setModalOpen(false);
      router.refresh();
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setModalLoading(false);
    }
  }, [pendingChanges, ch.channel_code, router]);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
    setPendingChanges(null);
  }, []);

  // Generic field edit handler
  const handleFieldEdit = useCallback(
    (
      field: string,
      newValue: string,
      displayLabel: string,
      oldDisplayValue: string,
      productIndex?: number
    ) => {
      let apiValue: unknown = newValue;
      let displayNewValue = newValue;

      // Convert boolean fields
      if (field === "auto_renewal" || field === "is_recruitment_corp") {
        apiValue = newValue === "예";
        displayNewValue = newValue;
      }

      const apiChanges = [{ field, value: apiValue, productIndex }];
      const diffChanges: DiffChange[] = [
        {
          fieldLabel: displayLabel,
          oldValue: oldDisplayValue,
          newValue: displayNewValue,
        },
      ];

      showConfirmModal(apiChanges, diffChanges);
    },
    [showConfirmModal]
  );

  // Handle add product
  const handleAddProduct = useCallback(() => {
    if (!newProduct.product) return;
    if (!newProduct.commission_rate.trim()) {
      alert("수수료율을 입력해주세요.");
      return;
    }
    // Check duplicate
    if (ch.products.some((p) => p.product === newProduct.product)) {
      alert(`상품 '${newProduct.product}'이(가) 이미 존재합니다.`);
      return;
    }

    const rateValue = newProduct.commission_rate.includes("%")
      ? newProduct.commission_rate
      : `${newProduct.commission_rate}%`;

    const apiChanges = [
      {
        field: "add_product",
        value: {
          product: newProduct.product,
          commission_rate: rateValue,
          vat: newProduct.vat,
        },
      },
    ];
    const diffChanges: DiffChange[] = [
      {
        fieldLabel: "상품 추가",
        oldValue: "-",
        newValue: `${newProduct.product} (${rateValue}, ${newProduct.vat})`,
      },
    ];
    showConfirmModal(apiChanges, diffChanges);
    setAddingProduct(false);
    setNewProduct({ product: "신용대출", commission_rate: "", vat: "VAT별도" });
  }, [newProduct, ch.products, showConfirmModal]);

  // Handle NL edit
  const handleNlEdit = useCallback(async () => {
    if (!nlText.trim()) return;
    setNlError("");
    setNlLoading(true);
    try {
      const res = await fetch("/api/nl-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: nlText,
          products: ch.products.map((p) => ({ product: p.product })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNlError(data.error || "처리 실패");
        return;
      }

      const { changes } = data as {
        changes: {
          field: string;
          value: unknown;
          productIndex?: number;
          displayField: string;
          displayValue: string;
        }[];
      };

      // Build diff changes for modal
      const apiChanges = changes.map((c) => ({
        field: c.field,
        value: c.value,
        productIndex: c.productIndex,
      }));

      const diffChanges: DiffChange[] = changes.map((c) => {
        let oldValue = "";
        if (c.field === "commission_rate" && c.productIndex !== undefined) {
          oldValue = ch.products[c.productIndex]?.commission?.rate ?? "-";
        } else if (c.field === "end_date") {
          oldValue = ch.contract.end_date;
        } else if (c.field === "start_date") {
          oldValue = ch.contract.start_date;
        } else if (c.field === "auto_renewal") {
          oldValue = ch.contract.auto_renewal ? "예" : "아니오";
        } else if (c.field === "integration_type") {
          oldValue = ch.contract.integration_type;
        } else if (c.field === "company_name") {
          oldValue = ch.company_name;
        }
        return {
          fieldLabel: c.displayField,
          oldValue,
          newValue: c.displayValue,
        };
      });

      showConfirmModal(apiChanges, diffChanges, "NL");
      setNlText("");
    } catch {
      setNlError("네트워크 오류가 발생했습니다.");
    } finally {
      setNlLoading(false);
    }
  }, [nlText, ch, showConfirmModal]);

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
                <InlineEditField
                  label="업체명"
                  value={ch.company_name}
                  type="text"
                  onSave={(v) =>
                    handleFieldEdit("company_name", v, "업체명", ch.company_name)
                  }
                />
                <InlineEditField
                  label="연동방식"
                  value={ch.contract.integration_type}
                  type="select"
                  options={INTEGRATION_OPTIONS}
                  onSave={(v) =>
                    handleFieldEdit(
                      "integration_type",
                      v,
                      "연동방식",
                      ch.contract.integration_type
                    )
                  }
                />
                {/* Contract period: start + end dates side by side */}
                <div className="col-span-2 grid grid-cols-2 gap-x-8">
                  <InlineEditField
                    label="계약기간 (시작)"
                    value={ch.contract.start_date}
                    type="date"
                    onSave={(v) =>
                      handleFieldEdit(
                        "start_date",
                        v,
                        "계약 시작일",
                        ch.contract.start_date
                      )
                    }
                  />
                  <InlineEditField
                    label="계약기간 (종료)"
                    value={ch.contract.end_date}
                    type="date"
                    onSave={(v) =>
                      handleFieldEdit(
                        "end_date",
                        v,
                        "계약 종료일",
                        ch.contract.end_date
                      )
                    }
                  />
                </div>
                <InfoField
                  label="잔여일"
                  value={`${ch.contract.remaining_days}일`}
                  highlight={ch.contract.remaining_days <= 90}
                />
                <InlineEditField
                  label="자동연장"
                  value={ch.contract.auto_renewal ? "예" : "아니오"}
                  type="toggle"
                  onSave={(v) =>
                    handleFieldEdit(
                      "auto_renewal",
                      v,
                      "자동연장",
                      ch.contract.auto_renewal ? "예" : "아니오"
                    )
                  }
                />
                <InlineEditField
                  label="모집법인여부"
                  value={ch.contract.is_recruitment_corp ? "예" : "아니오"}
                  type="toggle"
                  onSave={(v) =>
                    handleFieldEdit(
                      "is_recruitment_corp",
                      v,
                      "모집법인여부",
                      ch.contract.is_recruitment_corp ? "예" : "아니오"
                    )
                  }
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
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs border-border-custom"
                onClick={() => setAddingProduct(!addingProduct)}
              >
                {addingProduct ? <X size={14} /> : <Plus size={14} />}
                {addingProduct ? "취소" : "상품 추가"}
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-3">
              {/* Add product form */}
              {addingProduct && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
                  <h4 className="text-sm font-semibold text-blue-700">새 상품 추가</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-custom mb-1 block">상품명</label>
                      <select
                        value={newProduct.product}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, product: e.target.value })
                        }
                        className="w-full text-sm border border-border-custom rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent-red"
                      >
                        {PRODUCT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-custom mb-1 block">수수료율</label>
                      <input
                        type="text"
                        value={newProduct.commission_rate}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, commission_rate: e.target.value })
                        }
                        placeholder="예: 1.70%"
                        className="w-full text-sm border border-border-custom rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent-red"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-custom mb-1 block">VAT구분</label>
                      <select
                        value={newProduct.vat}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, vat: e.target.value })
                        }
                        className="w-full text-sm border border-border-custom rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent-red"
                      >
                        {VAT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-accent-red hover:bg-accent-red/90 text-white gap-1"
                      onClick={handleAddProduct}
                    >
                      <Check size={14} />
                      추가
                    </Button>
                  </div>
                </div>
              )}

              {ch.products.map((p, productIndex) => (
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
                    <InlineEditField
                      label="수수료율"
                      value={p.commission?.rate ?? "-"}
                      type="text"
                      onSave={(v) =>
                        handleFieldEdit(
                          "commission_rate",
                          v,
                          `수수료율 (${p.product})`,
                          p.commission?.rate ?? "-",
                          productIndex
                        )
                      }
                    />
                    <InlineEditField
                      label="VAT"
                      value={p.commission?.vat ?? "-"}
                      type="select"
                      options={VAT_OPTIONS}
                      onSave={(v) =>
                        handleFieldEdit(
                          "vat",
                          v,
                          `VAT구분 (${p.product})`,
                          p.commission?.vat ?? "-",
                          productIndex
                        )
                      }
                    />
                    <InfoField
                      label="심의번호"
                      value={p.ad_review?.compliance_number ?? "-"}
                    />
                    <InlineEditField
                      label="심의만료"
                      value={p.ad_review?.compliance_expiry ?? "-"}
                      type="date"
                      highlight={
                        p.ad_review?.compliance_remaining_days !== undefined &&
                        p.ad_review?.compliance_remaining_days !== null &&
                        p.ad_review.compliance_remaining_days <= 30
                      }
                      onSave={(v) =>
                        handleFieldEdit(
                          "compliance_expiry",
                          v,
                          `심의만료일 (${p.product})`,
                          p.ad_review?.compliance_expiry ?? "-",
                          productIndex
                        )
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
              {classifiedNews.length > 0 ? (
                <div className="space-y-2">
                  {classifiedNews.slice(0, 5).map((article, i) => {
                    const catInfo = NEWS_CATEGORY_COLORS[article.category] ?? NEWS_CATEGORY_COLORS.COMPETITION;
                    return (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block border-l-3 ${catInfo.border} rounded-r-md p-2.5 hover:bg-gray-50 transition-colors`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${catInfo.bg} mr-1`} />
                            {catInfo.label}
                          </Badge>
                          <span className="text-[10px] text-muted-custom ml-auto">
                            {article.date}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-2">
                          {article.title}
                        </p>
                        {article.action_needed && (
                          <p className="text-[10px] text-[#FF8C00] mt-1 font-medium">
                            {article.action_needed}
                          </p>
                        )}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Newspaper size={28} className="text-gray-300 mb-2" />
                  <p className="text-sm text-muted-custom">
                    뉴스 데이터 없음
                  </p>
                </div>
              )}
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
                  value={nlText}
                  onChange={(e) => {
                    setNlText(e.target.value);
                    setNlError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNlEdit();
                  }}
                  disabled={nlLoading}
                />
                <Button
                  size="icon"
                  className="bg-accent-red hover:bg-accent-red/90 shrink-0"
                  onClick={handleNlEdit}
                  disabled={nlLoading || !nlText.trim()}
                >
                  <Send size={16} className="text-white" />
                </Button>
              </div>
              {nlError && (
                <p className="text-xs text-red-500 mt-2">{nlError}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <DiffConfirmModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        channelName={ch.service_name}
        changes={pendingChanges?.diffChanges ?? []}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={modalLoading}
      />
    </div>
  );
}

function InfoField({
  label,
  value,
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
      </div>
    </div>
  );
}
