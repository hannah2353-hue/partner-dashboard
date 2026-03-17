import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data/integrated.json");
const AUDIT_LOG_PATH = path.join(process.cwd(), "src/data/audit-log.json");

function readData() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: Record<string, unknown>) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function readAuditLog(): Record<string, unknown>[] {
  try {
    const raw = fs.readFileSync(AUDIT_LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendAuditLog(entry: Record<string, unknown>) {
  const logs = readAuditLog();
  logs.unshift(entry);
  fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), "utf-8");
}

function calcRemainingDays(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      channel_code,
      company_name,
      service_name,
      channel_type,
      integration_type,
      is_recruitment_corp,
      start_date,
      end_date,
      auto_renewal,
    } = body as {
      channel_code: string;
      company_name: string;
      service_name: string;
      channel_type: "비교대출" | "광고배너";
      integration_type: string;
      is_recruitment_corp: boolean;
      start_date: string;
      end_date: string;
      auto_renewal: boolean;
    };

    // Validate required fields
    if (!channel_code || !company_name || !service_name) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요." },
        { status: 400 }
      );
    }

    const data = readData();
    const channels = data.channels as Record<string, unknown>[];

    // Check uniqueness
    const exists = channels.some(
      (c) => (c.channel_code as string) === channel_code
    );
    if (exists) {
      return NextResponse.json(
        { error: "이미 존재하는 접수경로코드명입니다." },
        { status: 400 }
      );
    }

    const remainingDays = end_date ? calcRemainingDays(end_date) : 0;

    const newChannel = {
      channel_code,
      channel_type: channel_type || "비교대출",
      company_name,
      service_name,
      active_products: [],
      contract: {
        status: remainingDays > 0 ? "유효" : "만료",
        start_date: start_date || "",
        end_date: end_date || "",
        remaining_days: remainingDays,
        auto_renewal: auto_renewal ?? false,
        integration_type: integration_type || "API",
        is_recruitment_corp: is_recruitment_corp ?? false,
        contract_exists: "Y",
        commission_rate_avg: "-",
        first_contract_date: start_date || "",
        renewal_review: "X",
        memo: "-",
      },
      products: [],
      news: null,
      alerts: [],
      updated_at: new Date().toISOString(),
      updated_by: "dashboard-user",
    };

    channels.push(newChannel);
    data.total_channels = channels.length;

    // Recalculate summary
    data.summary = {
      비교대출: channels.filter(
        (c) => (c.channel_type as string) === "비교대출"
      ).length,
      광고배너: channels.filter(
        (c) => (c.channel_type as string) === "광고배너"
      ).length,
    };

    writeData(data);

    // Audit log
    appendAuditLog({
      timestamp: new Date().toISOString(),
      user: "dashboard-user",
      channel_code,
      method: "MANUAL",
      changes: [
        {
          field: "채널 추가",
          old_value: "-",
          new_value: `${service_name} (${company_name})`,
        },
      ],
    });

    return NextResponse.json({ success: true, channel: newChannel });
  } catch (error) {
    console.error("POST channels error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
