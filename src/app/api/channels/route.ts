import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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

    const docId = channel_code.replace(/\//g, "_");
    const docRef = adminDb.collection("channels").doc(docId);
    const existing = await docRef.get();

    if (existing.exists) {
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

    await docRef.set(newChannel);

    // Audit log
    await adminDb.collection("audit_log").add({
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
