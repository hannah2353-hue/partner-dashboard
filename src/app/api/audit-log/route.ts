import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("audit_log")
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    const logs = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit log read error:", error);
    return NextResponse.json([]);
  }
}
