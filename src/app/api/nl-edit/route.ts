import { NextRequest, NextResponse } from "next/server";

interface ParsedChange {
  field: string;
  value: unknown;
  productIndex?: number;
  displayField: string;
  displayValue: string;
}

interface Product {
  product: string;
  commission?: { rate?: string; vat?: string } | null;
  ad_review?: { compliance_expiry?: string } | null;
}

// Regex fallback (existing logic, used when Gemini fails)
function parseNaturalLanguageFallback(text: string, products: Product[]): ParsedChange[] {
  const changes: ParsedChange[] = [];
  const normalized = text.trim();

  const commissionMatch = normalized.match(/수수료(?:율)?(?:을|를)?\s*(\d+\.?\d*)%?\s*(?:로|으로)?\s*변경/);
  if (commissionMatch) {
    const rate = commissionMatch[1] + "%";
    const idx = products.findIndex((p) => p.product === "신용대출");
    const targetIdx = idx >= 0 ? idx : 0;
    if (products[targetIdx]) {
      changes.push({ field: "commission_rate", value: rate, productIndex: targetIdx, displayField: `수수료율 (${products[targetIdx].product})`, displayValue: rate });
    }
    return changes;
  }

  const productCommissionMatch = normalized.match(/(신용대출|햇살론|오토론|회생상품|대환대출)\s*수수료(?:율)?(?:을|를)?\s*(\d+\.?\d*)%?\s*(?:로|으로)?\s*변경/);
  if (productCommissionMatch) {
    const productName = productCommissionMatch[1];
    const rate = productCommissionMatch[2] + "%";
    const idx = products.findIndex((p) => p.product === productName);
    if (idx >= 0) {
      changes.push({ field: "commission_rate", value: rate, productIndex: idx, displayField: `수수료율 (${productName})`, displayValue: rate });
    }
    return changes;
  }

  const endDateMatch = normalized.match(/계약\s*종료일(?:을|를)?\s*(\d{4}-\d{2}-\d{2})\s*(?:로|으로)?\s*변경/);
  if (endDateMatch) {
    changes.push({ field: "end_date", value: endDateMatch[1], displayField: "계약 종료일", displayValue: endDateMatch[1] });
    return changes;
  }

  const startDateMatch = normalized.match(/계약\s*시작일(?:을|를)?\s*(\d{4}-\d{2}-\d{2})\s*(?:로|으로)?\s*변경/);
  if (startDateMatch) {
    changes.push({ field: "start_date", value: startDateMatch[1], displayField: "계약 시작일", displayValue: startDateMatch[1] });
    return changes;
  }

  if (/자동연장\s*해제/.test(normalized)) {
    changes.push({ field: "auto_renewal", value: false, displayField: "자동연장", displayValue: "아니오" });
    return changes;
  }
  if (/자동연장\s*설정/.test(normalized)) {
    changes.push({ field: "auto_renewal", value: true, displayField: "자동연장", displayValue: "예" });
    return changes;
  }

  const integrationMatch = normalized.match(/연동방식(?:을|를)?\s*(API|전용회선|WEB|쿠콘연동)\s*(?:로|으로)?\s*변경/);
  if (integrationMatch) {
    changes.push({ field: "integration_type", value: integrationMatch[1], displayField: "연동방식", displayValue: integrationMatch[1] });
    return changes;
  }

  return changes;
}

// Gemini API-based parser
async function parseWithGemini(text: string, products: Product[]): Promise<ParsedChange[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const productInfo = products.map((p, i) => ({
    index: i,
    product: p.product,
    current_rate: p.commission?.rate ?? "없음",
    current_vat: p.commission?.vat ?? "없음",
    current_compliance_expiry: p.ad_review?.compliance_expiry ?? "없음",
  }));

  const prompt = `당신은 금융 제휴채널 데이터 수정 전문가입니다. 사용자의 자연어 입력을 구조화된 변경 명령으로 변환해주세요.

현재 채널의 상품 목록:
${JSON.stringify(productInfo, null, 2)}

사용자 입력: "${text}"

아래 field 중에서 해당하는 변경사항을 JSON 배열로 반환해주세요:
- "commission_rate": 수수료율 변경 (value: "1.80%" 형식, productIndex 필수)
- "vat": VAT구분 변경 (value: "VAT별도"/"VAT면세"/"VAT포함", productIndex 필수)
- "end_date": 계약 종료일 (value: "YYYY-MM-DD" 형식)
- "start_date": 계약 시작일 (value: "YYYY-MM-DD" 형식)
- "auto_renewal": 자동연장 (value: true/false)
- "integration_type": 연동방식 (value: "API"/"전용회선"/"WEB"/"쿠콘연동")
- "company_name": 업체명 (value: 문자열)
- "compliance_expiry": 심의만료일 (value: "YYYY-MM-DD", productIndex 필수)

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "changes": [
    {
      "field": "commission_rate",
      "value": "1.80%",
      "productIndex": 0,
      "displayField": "수수료율 (신용대출)",
      "displayValue": "1.80%"
    }
  ],
  "confidence": 0.95
}

이해할 수 없는 입력이면 confidence를 0.3 이하로 설정하고 changes를 빈 배열로 반환하세요.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      console.error(`Gemini API failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as {
      changes: ParsedChange[];
      confidence: number;
    };

    if (parsed.confidence < 0.5) return null;
    if (!parsed.changes || parsed.changes.length === 0) return null;

    return parsed.changes;
  } catch (error) {
    console.error("Gemini NL parse error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, products } = body as {
      text: string;
      products: Product[];
    };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "텍스트를 입력해주세요." }, { status: 400 });
    }

    // Try Gemini first, fallback to regex
    let changes = await parseWithGemini(text, products || []);

    if (!changes || changes.length === 0) {
      changes = parseNaturalLanguageFallback(text, products || []);
    }

    if (!changes || changes.length === 0) {
      return NextResponse.json({ error: "이해하지 못했습니다. 다시 입력해주세요." }, { status: 422 });
    }

    return NextResponse.json({ changes });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
