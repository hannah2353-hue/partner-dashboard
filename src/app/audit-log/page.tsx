"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditChange {
  field: string;
  old_value: string;
  new_value: string;
}

interface AuditEntry {
  timestamp: string;
  user: string;
  channel_code: string;
  method: string;
  changes: AuditChange[];
}

const methodColors: Record<string, string> = {
  NL: "bg-accent-red text-white",
  MANUAL: "bg-foreground text-white",
  PIPELINE: "bg-blue-500 text-white",
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch {
    return ts;
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-log")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-custom">로딩 중...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-custom">변경 이력이 없습니다.</p>
          <p className="text-xs text-muted-custom mt-1">
            채널 정보를 수정하면 이력이 자동으로 기록됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <Card key={index} className="border-border-custom">
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-6">
                  {/* Left: timestamp + user */}
                  <div className="w-48 shrink-0">
                    <p className="text-sm font-mono text-foreground">
                      {formatTimestamp(log.timestamp)}
                    </p>
                    <p className="text-xs text-muted-custom mt-0.5">
                      {log.user}
                    </p>
                  </div>

                  {/* Right: channel + method + diffs */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">
                        {log.channel_code}
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
                            {change.old_value}
                          </span>
                          <span className="text-muted-custom">&rarr;</span>
                          <span className="text-success font-medium">
                            {change.new_value}
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
      )}
    </div>
  );
}
