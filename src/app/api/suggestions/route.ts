import { NextResponse } from "next/server";
import { getKnowledgeBase, ensureKnowledgeBaseIngested } from "@/lib/knowledge-base";

export interface Suggestion {
  q: string;
  category: string;
  icon: string;
}

// Map section titles to relevant question templates
function generateQuestionFromSection(sectionTitle: string): { q: string; category: string } | null {
  const lower = sectionTitle.toLowerCase();
  
  // Check-in related
  if (lower.includes("check-in") || lower.includes("voter not found")) {
    return { q: "What should I do if I can't find a voter in the poll book?", category: "Check-In" };
  }
  
  // Voter ID
  if (lower.includes("id") || lower.includes("identification")) {
    return { q: "What forms of ID are acceptable for voters?", category: "Voter ID" };
  }
  
  // Provisional ballots
  if (lower.includes("provisional")) {
    return { q: "When should I offer a provisional ballot?", category: "Provisional" };
  }
  
  // Ballots / voting procedures
  if (lower.includes("ballot") && !lower.includes("provisional")) {
    return { q: "How do I issue ballots to voters?", category: "Ballots" };
  }
  
  // Opening
  if (lower.includes("opening") || lower.includes("before election")) {
    return { q: "What time should poll workers arrive?", category: "Opening" };
  }
  
  // Closing
  if (lower.includes("closing")) {
    return { q: "What do I do when polls close?", category: "Closing" };
  }
  
  // Accessibility
  if (lower.includes("accessible") || lower.includes("disability")) {
    return { q: "How do I assist a voter with a disability?", category: "Accessibility" };
  }
  
  // Emergency
  if (lower.includes("emergency")) {
    return { q: "What if there's an emergency at the polling place?", category: "Emergency" };
  }
  
  // Troubleshooting
  if (lower.includes("troubleshoot")) {
    return { q: "What if the voting equipment breaks?", category: "Troubleshooting" };
  }
  
  // Electioneering
  if (lower.includes("electioneer") || lower.includes("prohibited")) {
    return { q: "What are the rules about electioneering?", category: "Rules" };
  }
  
  // Welcome / overview / introduction
  if (lower.includes("welcome") || lower.includes("overview") || lower.includes("introduction") || lower.includes("training")) {
    return { q: "What does poll worker training cover?", category: "Training" };
  }

  // General fallback — extract the short section name only
  const match = sectionTitle.match(/Section\s+\d+\s*[:\-]?\s*([A-Za-z &\-]+)/i);
  if (match) {
    const topic = match[1].trim().replace(/\s+/g, " ").slice(0, 30);
    if (topic.length > 3) return { q: `What do I need to know about ${topic}?`, category: topic.slice(0, 15) };
  }

  return null;
}

// Icon mapping based on category
function getIconForCategory(category: string): string {
  const iconMap: Record<string, string> = {
    "Check-In": "Clock",
    "Voter ID": "IdentificationCard",
    "Provisional": "ClipboardText",
    "Ballots": "ClipboardText",
    "Opening": "Clock",
    "Closing": "Clock",
    "Accessibility": "Wheelchair",
    "Emergency": "Lightning",
    "Troubleshooting": "Lightning",
    "Rules": "Prohibit",
  };
  return iconMap[category] || "Question";
}

export async function GET() {
  try {
    await ensureKnowledgeBaseIngested();
    const kb = getKnowledgeBase();
    
    // Get section titles from the knowledge graph
    const sectionTitles = kb.getSectionTitles();
    
    // If no sections available, return default suggestions
    if (sectionTitles.length === 0) {
      const defaults = [
        { q: "What time should poll workers arrive?", category: "Procedures", icon: "Clock" },
        { q: "What ID do voters need to show?", category: "Voter ID", icon: "IdentificationCard" },
        { q: "How do I handle a provisional ballot?", category: "Ballots", icon: "ClipboardText" },
        { q: "What if voting equipment breaks?", category: "Emergency", icon: "Lightning" },
        { q: "How do I assist a voter with a disability?", category: "Accessibility", icon: "Wheelchair" },
        { q: "What are the electioneering rules?", category: "Rules", icon: "Prohibit" },
      ];
      return NextResponse.json({ suggestions: defaults });
    }
    
    // Generate suggestions from actual sections (deduplicate by question text)
    const suggestions: Suggestion[] = [];
    const seenQuestions = new Set<string>();
    for (const title of sectionTitles) {
      const generated = generateQuestionFromSection(title);
      if (generated && !seenQuestions.has(generated.q)) {
        seenQuestions.add(generated.q);
        suggestions.push({
          q: generated.q,
          category: generated.category,
          icon: getIconForCategory(generated.category),
        });
      }
    }
    
    // Ensure we have at least 6 suggestions, fill with defaults if needed
    const defaults = [
      { q: "What time should poll workers arrive?", category: "Procedures", icon: "Clock" },
      { q: "What ID do voters need to show?", category: "Voter ID", icon: "IdentificationCard" },
      { q: "How do I handle a provisional ballot?", category: "Ballots", icon: "ClipboardText" },
    ];
    
    while (suggestions.length < 6 && defaults.length > 0) {
      const def = defaults.shift()!;
      if (!suggestions.find(s => s.q === def.q)) {
        suggestions.push(def);
      }
    }
    
    // Limit to 6 suggestions
    const finalSuggestions = suggestions.slice(0, 6);
    
    return NextResponse.json({ suggestions: finalSuggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    // Return default suggestions on error
    const defaults = [
      { q: "What time should poll workers arrive?", category: "Procedures", icon: "Clock" },
      { q: "What ID do voters need to show?", category: "Voter ID", icon: "IdentificationCard" },
      { q: "How do I handle a provisional ballot?", category: "Ballots", icon: "ClipboardText" },
      { q: "What if voting equipment breaks?", category: "Emergency", icon: "Lightning" },
      { q: "How do I assist a voter with a disability?", category: "Accessibility", icon: "Wheelchair" },
      { q: "What are the electioneering rules?", category: "Rules", icon: "Prohibit" },
    ];
    return NextResponse.json({ suggestions: defaults });
  }
}
