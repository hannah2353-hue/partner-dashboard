"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface AddChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddChannelModal({
  open,
  onOpenChange,
  onSuccess,
}: AddChannelModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [channelCode, setChannelCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [channelType, setChannelType] = useState<"비교대출" | "광고배너">(
    "비교대출"
  );
  const [integrationType, setIntegrationType] = useState("API");
  const [isRecruitmentCorp, setIsRecruitmentCorp] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRenewal, setAutoRenewal] = useState(false);

  function resetForm() {
    setChannelCode("");
    setCompanyName("");
    setServiceName("");
    setChannelType("비교대출");
    setIntegrationType("API");
    setIsRecruitmentCorp(false);
    setStartDate("");
    setEndDate("");
    setAutoRenewal(false);
    setError("");
  }

  async function handleSubmit() {
    if (!channelCode.trim() || !companyName.trim() || !serviceName.trim()) {
      setError("접수경로코드명, 업체명, 서비스명은 필수 항목입니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_code: channelCode.trim(),
          company_name: companyName.trim(),
          service_name: serviceName.trim(),
          channel_type: channelType,
          integration_type: integrationType,
          is_recruitment_corp: isRecruitmentCorp,
          start_date: startDate,
          end_date: endDate,
          auto_renewal: autoRenewal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "채널 추가에 실패했습니다.");
        return;
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">채널 추가</DialogTitle>
          <DialogDescription>
            새로운 제휴 채널 정보를 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {error && (
            <p className="text-xs text-critical bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* 접수경로코드명 */}
          <div className="grid gap-1">
            <label className="text-xs font-medium text-foreground">
              접수경로코드명 <span className="text-critical">*</span>
            </label>
            <Input
              placeholder="예: 제휴_새채널명"
              value={channelCode}
              onChange={(e) => setChannelCode(e.target.value)}
              className="border-border-custom"
            />
          </div>

          {/* 업체명 */}
          <div className="grid gap-1">
            <label className="text-xs font-medium text-foreground">
              업체명 <span className="text-critical">*</span>
            </label>
            <Input
              placeholder="예: ㈜회사명"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="border-border-custom"
            />
          </div>

          {/* 서비스명 */}
          <div className="grid gap-1">
            <label className="text-xs font-medium text-foreground">
              서비스명 <span className="text-critical">*</span>
            </label>
            <Input
              placeholder="예: 서비스명"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="border-border-custom"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 제휴사유형 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                제휴사유형
              </label>
              <select
                value={channelType}
                onChange={(e) =>
                  setChannelType(e.target.value as "비교대출" | "광고배너")
                }
                className="h-8 rounded-md border border-border-custom bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="비교대출">비교대출</option>
                <option value="광고배너">광고배너</option>
              </select>
            </div>

            {/* 연동방식 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                연동방식
              </label>
              <select
                value={integrationType}
                onChange={(e) => setIntegrationType(e.target.value)}
                className="h-8 rounded-md border border-border-custom bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="API">API</option>
                <option value="전용회선">전용회선</option>
                <option value="WEB">WEB</option>
                <option value="쿠콘연동">쿠콘연동</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 모집법인여부 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                모집법인여부
              </label>
              <button
                type="button"
                onClick={() => setIsRecruitmentCorp(!isRecruitmentCorp)}
                className={`h-8 rounded-md border text-sm px-3 text-left transition-colors ${
                  isRecruitmentCorp
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-border-custom bg-background text-muted-foreground"
                }`}
              >
                {isRecruitmentCorp ? "예" : "아니오"}
              </button>
            </div>

            {/* 자동연장 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                자동연장
              </label>
              <button
                type="button"
                onClick={() => setAutoRenewal(!autoRenewal)}
                className={`h-8 rounded-md border text-sm px-3 text-left transition-colors ${
                  autoRenewal
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-border-custom bg-background text-muted-foreground"
                }`}
              >
                {autoRenewal ? "예" : "아니오"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 계약시작일 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                계약시작일
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-border-custom"
              />
            </div>

            {/* 계약종료일 */}
            <div className="grid gap-1">
              <label className="text-xs font-medium text-foreground">
                계약종료일
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-border-custom"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" className="border-border-custom" />}
          >
            취소
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-foreground text-white hover:bg-foreground/90 gap-1.5"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
