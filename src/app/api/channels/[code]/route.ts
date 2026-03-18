import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function calcRemainingDays(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function recalcAlerts(channel: Record<string, unknown>): Record<string, unknown>[] {
  const alerts: Record<string, unknown>[] = [];
  const contract = channel.contract as Record<string, unknown>;
  const remainingDays = contract.remaining_days as number;

  if (remainingDays <= 0) {
    alerts.push({
      type: "CONTRACT_EXPIRED", level: "EXPIRED",
      message: `계약 만료됨`, remaining_days: remainingDays,
      target: "contract", product: "-",
    });
  } else if (remainingDays <= 30) {
    alerts.push({
      type: "CONTRACT_EXPIRING", level: "CRITICAL",
      message: `계약 만료 ${remainingDays}일 전`, remaining_days: remainingDays,
      target: "contract", product: "-",
    });
  } else if (remainingDays <= 90) {
    alerts.push({
      type: "CONTRACT_EXPIRING", level: "WARNING",
      message: `계약 만료 ${remainingDays}일 전`, remaining_days: remainingDays,
      target: "contract", product: "-",
    });
  }

  const products = channel.products as Record<string, unknown>[];
  for (const p of products) {
    const adReview = p.ad_review as Record<string, unknown> | null;
    if (adReview && adReview.compliance_expiry) {
      const compDays = calcRemainingDays(adReview.compliance_expiry as string);
      adReview.compliance_remaining_days = compDays;
      if (compDays <= 0) {
        alerts.push({
          type: "AD_REVIEW_EXPIRED", level: "EXPIRED",
          message: `${p.product} 심의 만료됨`, remaining_days: compDays,
          target: "ad_review", product: p.product as string,
        });
      } else if (compDays <= 30) {
        alerts.push({
          type: "AD_REVIEW_EXPIRING", level: "CRITICAL",
          message: `${p.product} 심의 만료 ${compDays}일 전`, remaining_days: compDays,
          target: "ad_review", product: p.product as string,
        });
      } else if (compDays <= 90) {
        alerts.push({
          type: "AD_REVIEW_EXPIRING", level: "WARNING",
          message: `${p.product} 심의 만료 ${compDays}일 전`, remaining_days: compDays,
          target: "ad_review", product: p.product as string,
        });
      }
    }
  }

  return alerts;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const decodedCode = decodeURIComponent(code);
    const body = await request.json();
    const { changes, method = "MANUAL", user_email = "dashboard-user" } = body as {
      changes: { field: string; value: unknown; productIndex?: number }[];
      method?: string;
      user_email?: string;
    };

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const docId = decodedCode.replace(/\//g, "_");
    const docRef = adminDb.collection("channels").doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channel = doc.data() as Record<string, unknown>;
    const contract = channel.contract as Record<string, unknown>;
    const products = channel.products as Record<string, unknown>[];
    const auditChanges: { field: string; old_value: string; new_value: string }[] = [];

    for (const change of changes) {
      const { field, value, productIndex } = change;

      switch (field) {
        case "company_name": {
          const oldVal = channel.company_name as string;
          channel.company_name = value;
          auditChanges.push({ field: "업체명", old_value: oldVal, new_value: String(value) });
          break;
        }
        case "integration_type": {
          const oldVal = contract.integration_type as string;
          contract.integration_type = value;
          auditChanges.push({ field: "연동방식", old_value: oldVal, new_value: String(value) });
          break;
        }
        case "start_date": {
          const oldVal = contract.start_date as string;
          contract.start_date = value;
          contract.remaining_days = calcRemainingDays(contract.end_date as string);
          auditChanges.push({ field: "계약 시작일", old_value: oldVal, new_value: String(value) });
          break;
        }
        case "end_date": {
          const oldVal = contract.end_date as string;
          contract.end_date = value;
          contract.remaining_days = calcRemainingDays(value as string);
          auditChanges.push({ field: "계약 종료일", old_value: oldVal, new_value: String(value) });
          break;
        }
        case "auto_renewal": {
          const oldVal = contract.auto_renewal ? "예" : "아니오";
          contract.auto_renewal = value;
          auditChanges.push({ field: "자동연장", old_value: oldVal, new_value: value ? "예" : "아니오" });
          break;
        }
        case "is_recruitment_corp": {
          const oldVal = contract.is_recruitment_corp ? "예" : "아니오";
          contract.is_recruitment_corp = value;
          auditChanges.push({ field: "모집법인여부", old_value: oldVal, new_value: value ? "예" : "아니오" });
          break;
        }
        case "commission_rate": {
          if (productIndex !== undefined && products[productIndex]) {
            const product = products[productIndex];
            const commission = product.commission as Record<string, unknown> | null;
            const oldVal = commission?.rate ? String(commission.rate) : "-";
            if (!commission) {
              product.commission = { rate: value, vat: "VAT별도" };
            } else {
              commission.rate = value;
            }
            auditChanges.push({ field: `수수료율 (${product.product})`, old_value: oldVal, new_value: String(value) });
          }
          break;
        }
        case "vat": {
          if (productIndex !== undefined && products[productIndex]) {
            const product = products[productIndex];
            const commission = product.commission as Record<string, unknown> | null;
            const oldVal = commission?.vat ? String(commission.vat) : "-";
            if (!commission) {
              product.commission = { rate: "-", vat: value };
            } else {
              commission.vat = value;
            }
            auditChanges.push({ field: `VAT구분 (${product.product})`, old_value: oldVal, new_value: String(value) });
          }
          break;
        }
        case "compliance_expiry": {
          if (productIndex !== undefined && products[productIndex]) {
            const product = products[productIndex];
            const adReview = product.ad_review as Record<string, unknown> | null;
            const oldVal = adReview?.compliance_expiry ? String(adReview.compliance_expiry) : "-";
            if (adReview) {
              adReview.compliance_expiry = value;
              adReview.compliance_remaining_days = calcRemainingDays(value as string);
            }
            auditChanges.push({ field: `심의만료일 (${product.product})`, old_value: oldVal, new_value: String(value) });
          }
          break;
        }
        case "add_product": {
          const newProduct = value as Record<string, unknown>;
          const exists = products.some((p) => (p.product as string) === (newProduct.product as string));
          if (exists) {
            return NextResponse.json({ error: `상품 '${newProduct.product}'이(가) 이미 존재합니다.` }, { status: 400 });
          }
          products.push({
            product: newProduct.product,
            original_names: [],
            commission: { rate: newProduct.commission_rate || "-", vat: newProduct.vat || "VAT별도" },
            settlement_exclusion: null,
            ad_review: null,
          });
          auditChanges.push({ field: "상품 추가", old_value: "-", new_value: String(newProduct.product) });
          break;
        }
      }
    }

    // Recalculate alerts
    channel.alerts = recalcAlerts(channel);

    // Recalc avg commission
    const rates: number[] = [];
    for (const p of products) {
      const commission = p.commission as Record<string, unknown> | null;
      if (commission?.rate) {
        const rateStr = String(commission.rate).replace("%", "");
        const rateNum = parseFloat(rateStr);
        if (!isNaN(rateNum)) rates.push(rateNum);
      }
    }
    if (rates.length > 0) {
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      contract.commission_rate_avg = `${avg.toFixed(1)}%`;
    }

    // Update timestamp
    channel.updated_at = new Date().toISOString();

    // Write to Firestore
    await docRef.set(channel);

    // Audit log
    if (auditChanges.length > 0) {
      await adminDb.collection("audit_log").add({
        timestamp: new Date().toISOString(),
        user: user_email,
        channel_code: decodedCode,
        method,
        changes: auditChanges,
      });
    }

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
