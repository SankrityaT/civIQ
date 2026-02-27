import { NextRequest, NextResponse } from "next/server";
import { getAuditEntries, getAuditStats } from "@/lib/audit-logger";
import { Language, UserType } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userType = searchParams.get("userType") as UserType | null;
  const flagged = searchParams.get("flagged");
  const language = searchParams.get("language") as Language | null;
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  const entries = getAuditEntries({
    startDate,
    endDate,
    userType: userType ?? undefined,
    flagged: flagged === "true" ? true : undefined,
    language: language ?? undefined,
  });

  const stats = getAuditStats();

  return NextResponse.json({ entries, stats });
}
