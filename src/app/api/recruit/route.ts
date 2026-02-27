import { NextRequest, NextResponse } from "next/server";
import { RecruitFilters } from "@/types";
import { scanVoters } from "@/lib/voter-scanner";
import sampleVoters from "../../../../public/sample-data/voter-registration.json";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const filters: RecruitFilters = body.filters ?? {};

  // TODO: in production, load from county voter registration DB / CSV
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = scanVoters(sampleVoters as any, filters);

  return NextResponse.json({
    candidates,
    totalScanned: sampleVoters.length,
    totalMatched: candidates.length,
  });
}
