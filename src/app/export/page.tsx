"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

export default function ExportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          엑셀 다운로드
        </h1>
        <p className="text-sm text-muted-custom mt-1">
          채널 데이터를 엑셀 파일로 다운로드합니다
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border-custom">
          <CardContent className="py-6 px-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} className="text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">
                  전체 채널 데이터
                </h3>
                <p className="text-xs text-muted-custom mb-3">
                  모든 채널의 계약 정보, 상품, 수수료율을 포함합니다
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border-custom"
                  disabled
                >
                  <Download size={14} />
                  다운로드 (준비 중)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-custom">
          <CardContent className="py-6 px-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} className="text-critical" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">
                  경고 채널 리포트
                </h3>
                <p className="text-xs text-muted-custom mb-3">
                  계약 만료 임박, 심의 만료 등 주의 필요 채널만 포함합니다
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border-custom"
                  disabled
                >
                  <Download size={14} />
                  다운로드 (준비 중)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
