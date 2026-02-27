import { Candidate, RecruitFilters, VoterRecord } from "@/types";

/** Score a voter record against the desired poll worker criteria (0–100) */
function scoreCandidate(voter: VoterRecord): { score: number; reason: string } {
  let score = 50;
  const reasons: string[] = [];

  // Previously served as poll worker → strong signal
  if (voter.previous_poll_worker) {
    score += 25;
    reasons.push("has previous poll worker experience");
  }

  // Bilingual is a bonus
  if (voter.languages.includes(",")) {
    score += 10;
    reasons.push("bilingual");
  }

  // Long-time registered voter → reliability signal
  const yearsRegistered =
    new Date().getFullYear() - new Date(voter.registered_since).getFullYear();
  if (yearsRegistered >= 5) {
    score += 10;
    reasons.push(`registered voter for ${yearsRegistered} years`);
  }

  // Availability check
  if (voter.availability === "available") {
    score += 5;
    reasons.push("marked as available");
  }

  return {
    score: Math.min(score, 100),
    reason: reasons.join(", ") || "meets basic eligibility",
  };
}

/** Filter and score an array of voter records */
export function scanVoters(
  voters: VoterRecord[],
  filters: RecruitFilters
): Candidate[] {
  return voters
    .filter((v) => {
      if (filters.ageRange) {
        const [min, max] = filters.ageRange;
        if (v.age < min || v.age > max) return false;
      }
      if (filters.location && v.city !== filters.location) return false;
      if (filters.languages && filters.languages.length > 0) {
        const voterLangs = v.languages.split(",").map((l) => l.trim());
        const hasLang = filters.languages.some((l) => voterLangs.includes(l));
        if (!hasLang) return false;
      }
      return true;
    })
    .map((v): Candidate => {
      const { score, reason } = scoreCandidate(v);
      return {
        id: v.id,
        name: `${v.first_name} ${v.last_name}`,
        age: v.age,
        location: v.city,
        precinct: v.precinct,
        languages: v.languages.split(",").map((l) => l.trim()),
        registeredSince: v.registered_since,
        aiScore: score,
        aiReason: reason,
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore);
}
