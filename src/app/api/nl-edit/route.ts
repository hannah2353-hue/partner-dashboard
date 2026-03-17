import { NextRequest, NextResponse } from "next/server";

interface ParsedChange {
  field: string;
  value: unknown;
  productIndex?: number;
  displayField: string;
  displayValue: string;
}

function parseNaturalLanguage(
  text: string,
  products: { product: string }[]
): ParsedChange[] {
  const changes: ParsedChange[] = [];
  const normalized = text.trim();

  // 수수료 변경: "수수료 1.8%로 변경", "수수료율을 1.5%로"
  const commissionMatch = normalized.match(
    /수수료(?:율)?(?:을|를)?\s*(\d+\.?\d*)%?\s*(?:로|으로)?\s*변경/
  );
  if (commissionMatch) {
    const rate = `${commissionMatch[1]}%`;
    // Apply to first product with commission by default
    const targetIdx = products.findIndex((p) => p.product === "신용대출");
    const idx = targetIdx >= 0 ? targetIdx : 0;
    if (products[idx]) {
      changes.push({
        field: "commission_rate",
        value: rate,
        productIndex: idx,
        displayField: `수수료율 (${products[idx].product})`,
        displayValue: rate,
      });
    }
    return changes;
  }

  // 특정 상품 수수료: "신용대출 수수료 1.8%로 변경"
  const productCommissionMatch = normalized.match(
    /(신용대출|햇살론|오토론|회생상품|대환대출)\s*수수료(?:율)?(?:을|를)?\s*(\d+\.?\d*)%?\s*(?:로|으로)?\s*변경/
  );
  if (productCommissionMatch) {
    const productName = productCommissionMatch[1];
    const rate = `${productCommissionMatch[2]}%`;
    const idx = products.findIndex((p) => p.product === productName);
    if (idx >= 0) {
      changes.push({
        field: "commission_rate",
        value: rate,
        productIndex: idx,
        displayField: `수수료율 (${productName})`,
        displayValue: rate,
      });
    }
    return changes;
  }

  // 계약 종료일 변경: "계약 종료일 2027-03-31로 변경"
  const endDateMatch = normalized.match(
    /계약\s*종료일(?:을|를)?\s*(\d{4}-\d{2}-\d{2})\s*(?:로|으로)?\s*변경/
  );
  if (endDateMatch) {
    changes.push({
      field: "end_date",
      value: endDateMatch[1],
      displayField: "계약 종료일",
      displayValue: endDateMatch[1],
    });
    return changes;
  }

  // 계약 시작일 변경
  const startDateMatch = normalized.match(
    /계약\s*시작일(?:을|를)?\s*(\d{4}-\d{2}-\d{2})\s*(?:로|으로)?\s*변경/
  );
  if (startDateMatch) {
    changes.push({
      field: "start_date",
      value: startDateMatch[1],
      displayField: "계약 시작일",
      displayValue: startDateMatch[1],
    });
    return changes;
  }

  // 자동연장 해제/설정
  if (/자동연장\s*해제/.test(normalized) || /자동연장\s*(?:을|를)?\s*아니오/.test(normalized)) {
    changes.push({
      field: "auto_renewal",
      value: false,
      displayField: "자동연장",
      displayValue: "아니오",
    });
    return changes;
  }
  if (/자동연장\s*설정/.test(normalized) || /자동연장\s*(?:을|를)?\s*예/.test(normalized)) {
    changes.push({
      field: "auto_renewal",
      value: true,
      displayField: "자동연장",
      displayValue: "예",
    });
    return changes;
  }

  // 연동방식 변경
  const integrationMatch = normalized.match(
    /연동방식(?:을|를)?\s*(API|전용회선|WEB|쿠콘연동)\s*(?:로|으로)?\s*변경/
  );
  if (integrationMatch) {
    changes.push({
      field: "integration_type",
      value: integrationMatch[1],
      displayField: "연동방식",
      displayValue: integrationMatch[1],
    });
    return changes;
  }

  // 업체명 변경
  const companyMatch = normalized.match(
    /업체명(?:을|를)?\s*(.+?)\s*(?:로|으로)\s*변경/
  );
  if (companyMatch) {
    changes.push({
      field: "company_name",
      value: companyMatch[1],
      displayField: "업체명",
      displayValue: companyMatch[1],
    });
    return changes;
  }

  return changes;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, products } = body as {
      text: string;
      products: { product: string }[];
    };

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "텍스트를 입력해주세요." },
        { status: 400 }
      );
    }

    const changes = parseNaturalLanguage(text, products || []);

    if (changes.length === 0) {
      return NextResponse.json(
        { error: "이해하지 못했습니다. 직접 수정해주세요." },
        { status: 422 }
      );
    }

    return NextResponse.json({ changes });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
