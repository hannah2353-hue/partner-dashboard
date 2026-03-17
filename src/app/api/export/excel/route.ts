import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data/integrated.json");

function readData() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getAlertLevelForChannel(channel: Record<string, unknown>): string {
  const contract = channel.contract as Record<string, unknown>;
  const products = channel.products as Record<string, unknown>[];
  const remainingDays = contract.remaining_days as number;

  for (const p of products) {
    const adReview = p.ad_review as Record<string, unknown> | null;
    if (adReview && adReview.compliance_remaining_days !== null) {
      if ((adReview.compliance_remaining_days as number) < 0) return "CRITICAL";
    }
  }
  if (remainingDays <= 30) return "CRITICAL";

  for (const p of products) {
    const adReview = p.ad_review as Record<string, unknown> | null;
    if (adReview && adReview.compliance_remaining_days !== null) {
      if ((adReview.compliance_remaining_days as number) <= 30) return "WARNING";
    }
  }
  if (remainingDays <= 90) return "WARNING";

  const alerts = channel.alerts as Record<string, unknown>[];
  for (const alert of alerts) {
    if (alert.level === "CRITICAL" || alert.level === "EXPIRED") return "CRITICAL";
    if (alert.level === "WARNING") return "WARNING";
  }

  return "정상";
}

function generateFullCsv(channels: Record<string, unknown>[]): string {
  const headers = [
    "접수경로코드명",
    "제휴사유형",
    "업체명",
    "서비스명",
    "연동방식",
    "모집법인여부",
    "취급상품",
    "계약시작일",
    "계약종료일",
    "계약잔여일",
    "자동연장",
    "경고상태",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const ch of channels) {
    const contract = ch.contract as Record<string, unknown>;
    const activeProducts = ch.active_products as string[];
    const row = [
      String(ch.channel_code ?? ""),
      String(ch.channel_type ?? ""),
      String(ch.company_name ?? ""),
      String(ch.service_name ?? ""),
      String(contract.integration_type ?? ""),
      (contract.is_recruitment_corp as boolean) ? "예" : "아니오",
      activeProducts.join(", "),
      String(contract.start_date ?? ""),
      String(contract.end_date ?? ""),
      String(contract.remaining_days ?? ""),
      (contract.auto_renewal as boolean) ? "예" : "아니오",
      getAlertLevelForChannel(ch),
    ];
    rows.push(row.map(escapeCsvField).join(","));
  }

  return rows.join("\r\n");
}

function generateAlertsCsv(channels: Record<string, unknown>[]): string {
  const headers = [
    "경고유형",
    "경고레벨",
    "접수경로코드명",
    "서비스명",
    "상품명",
    "만료일",
    "잔여일",
    "조치필요사항",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(",")];

  for (const ch of channels) {
    const contract = ch.contract as Record<string, unknown>;
    const products = ch.products as Record<string, unknown>[];
    const remainingDays = contract.remaining_days as number;

    // Contract alerts
    if (remainingDays <= 90) {
      const level = remainingDays <= 30 ? (remainingDays <= 0 ? "EXPIRED" : "CRITICAL") : "WARNING";
      const row = [
        "계약만료",
        level,
        String(ch.channel_code ?? ""),
        String(ch.service_name ?? ""),
        "-",
        String(contract.end_date ?? ""),
        String(remainingDays),
        remainingDays <= 0 ? "즉시 계약 갱신 필요" : remainingDays <= 30 ? "계약 갱신 협의 필요" : "계약 갱신 검토 필요",
      ];
      rows.push(row.map(escapeCsvField).join(","));
    }

    // Ad review alerts
    for (const p of products) {
      const adReview = p.ad_review as Record<string, unknown> | null;
      if (adReview && adReview.compliance_remaining_days !== null) {
        const compDays = adReview.compliance_remaining_days as number;
        if (compDays <= 90) {
          const level = compDays <= 0 ? "EXPIRED" : compDays <= 30 ? "CRITICAL" : "WARNING";
          const row = [
            "심의만료",
            level,
            String(ch.channel_code ?? ""),
            String(ch.service_name ?? ""),
            String(p.product ?? ""),
            String(adReview.compliance_expiry ?? ""),
            String(compDays),
            compDays <= 0 ? "즉시 심의 갱신 필요" : compDays <= 30 ? "심의 갱신 신청 필요" : "심의 갱신 검토 필요",
          ];
          rows.push(row.map(escapeCsvField).join(","));
        }
      }
    }
  }

  return rows.join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "full";

    const data = readData();
    const channels = data.channels as Record<string, unknown>[];

    let csvContent: string;
    let filename: string;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    if (type === "alerts") {
      csvContent = generateAlertsCsv(channels);
      filename = `제휴채널_경고현황_${today}.csv`;
    } else {
      csvContent = generateFullCsv(channels);
      filename = `제휴채널_통합현황_${today}.csv`;
    }

    // Add BOM for Korean encoding
    const bom = "\uFEFF";
    const fullContent = bom + csvContent;

    return new NextResponse(fullContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
