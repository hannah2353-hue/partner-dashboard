"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sampleLogs = [
  {
    id: 1,
    timestamp: "2026-03-17 08:45:00",
    user: "admin@company.com",
    channel: "제휴_TOSS",
    method: "NL",
    changes: [
      {
        field: "수수료율 (신용대출)",
        oldValue: "1.50%",
        newValue: "1.70%",
      },
    ],
  },
  {
    id: 2,
    timestamp: "2026-03-16 14:20:00",
    user: "manager@company.com",
    channel: "제휴_카카오뱅크",
    method: "MANUAL",
    changes: [
      {
        field: "계약 종료일",
        oldValue: "2026-04-30",
        newValue: "2026-05-17",
      },
      {
        field: "자동연장",
        oldValue: "아니오",
        newValue: "예",
      },
    ],
  },
  {
    id: 3,
    timestamp: "2026-03-15 11:00:00",
    user: "init-pipeline",
    channel: "제휴_네이버파이낸셜",
    method: "PIPELINE",
    changes: [
      {
        field: "심의번호 (신용대출)",
        oldValue: "제2024-518호",
        newValue: "제2025-118호",
      },
    ],
  },
  {
    id: 4,
    timestamp: "2026-03-14 16:30:00",
    user: "admin@company.com",
    channel: "리브메이트",
    method: "NL",
    changes: [
      {
        field: "연동방식",
        oldValue: "API",
        newValue: "쿠콘연동",
      },
    ],
  },
  {
    id: 5,
    timestamp: "2026-03-14 09:15:00",
    user: "manager@company.com",
    channel: "제휴_현대카드",
    method: "MANUAL",
    changes: [
      {
        field: "수수료율 (신용대출)",
        oldValue: "1.20%",
        newValue: "1.30%",
      },
      {
        field: "VAT",
        oldValue: "VAT포함",
        newValue: "VAT별도",
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  NL: "bg-accent-red text-white",
  MANUAL: "bg-foreground text-white",
  PIPELINE: "bg-blue-500 text-white",
};

export default function AuditLogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          변경 이력
        </h1>
        <p className="text-sm text-muted-custom mt-1">
          채널 정보 변경 이력을 확인합니다
        </p>
      </div>

      <div className="space-y-3">
        {sampleLogs.map((log) => (
          <Card key={log.id} className="border-border-custom">
            <CardContent className="py-4 px-5">
              <div className="flex items-start gap-6">
                {/* Left: timestamp + user */}
                <div className="w-48 shrink-0">
                  <p className="text-sm font-mono text-foreground">
                    {log.timestamp}
                  </p>
                  <p className="text-xs text-muted-custom mt-0.5">
                    {log.user}
                  </p>
                </div>

                {/* Right: channel + method + diffs */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">
                      {log.channel}
                    </span>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${methodColors[log.method] ?? "bg-gray-500 text-white"}`}
                    >
                      {log.method}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {log.changes.map((change, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-custom w-40 shrink-0">
                          {change.field}
                        </span>
                        <span className="text-critical line-through">
                          {change.oldValue}
                        </span>
                        <span className="text-muted-custom">→</span>
                        <span className="text-success font-medium">
                          {change.newValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
