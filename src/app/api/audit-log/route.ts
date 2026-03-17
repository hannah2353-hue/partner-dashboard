import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AUDIT_LOG_PATH = path.join(process.cwd(), "src/data/audit-log.json");

export async function GET() {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) {
      return NextResponse.json([]);
    }
    const raw = fs.readFileSync(AUDIT_LOG_PATH, "utf-8");
    const logs = JSON.parse(raw);
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json([]);
  }
}
