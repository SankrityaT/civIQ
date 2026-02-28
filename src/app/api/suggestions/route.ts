import { NextResponse } from "next/server";
import { getKnowledgeBase, ensureKnowledgeBaseIngested } from "@/lib/knowledge-base";

const SIDECAR_URL = process.env.RAG_SIDECAR_URL ?? "http://127.0.0.1:8000";

export interface Suggestion {
  q: string;
  qEs: string;
  category: string;
  icon: string;
  categoryEs: string;
}

// Map section titles to relevant question templates (English + Spanish)
function generateQuestionFromSection(sectionTitle: string): { q: string; qEs: string; category: string } | null {
  const lower = sectionTitle.toLowerCase();
  
  // Check-in related
  if (lower.includes("check-in") || lower.includes("voter not found")) {
    return { 
      q: "What should I do if I can't find a voter in the poll book?",
      qEs: "¿Qué hago si no encuentro a un votante en el libro?",
      category: "Check-In" 
    };
  }
  
  // Voter ID
  if (lower.includes("id") || lower.includes("identification")) {
    return { 
      q: "What forms of ID are acceptable for voters?",
      qEs: "¿Qué formas de identificación son aceptables?",
      category: "Voter ID" 
    };
  }
  
  // Provisional ballots
  if (lower.includes("provisional")) {
    return { 
      q: "When should I offer a provisional ballot?",
      qEs: "¿Cuándo debo ofrecer una boleta provisional?",
      category: "Provisional" 
    };
  }
  
  // Ballots / voting procedures
  if (lower.includes("ballot") && !lower.includes("provisional")) {
    return { 
      q: "How do I issue ballots to voters?",
      qEs: "¿Cómo entrego boletas a los votantes?",
      category: "Ballots" 
    };
  }
  
  // Opening
  if (lower.includes("opening") || lower.includes("before election")) {
    return { 
      q: "What time should poll workers arrive?",
      qEs: "¿A qué hora deben llegar los trabajadores electorales?",
      category: "Opening" 
    };
  }
  
  // Closing
  if (lower.includes("closing")) {
    return { 
      q: "What do I do when polls close?",
      qEs: "¿Qué hago cuando cierran las urnas?",
      category: "Closing" 
    };
  }
  
  // Accessibility
  if (lower.includes("accessible") || lower.includes("disability")) {
    return { 
      q: "How do I assist a voter with a disability?",
      qEs: "¿Cómo ayudo a un votante con discapacidad?",
      category: "Accessibility" 
    };
  }
  
  // Emergency
  if (lower.includes("emergency")) {
    return { 
      q: "What if there's an emergency at the polling place?",
      qEs: "¿Qué pasa si hay una emergencia en el lugar?",
      category: "Emergency" 
    };
  }
  
  // Troubleshooting
  if (lower.includes("troubleshoot")) {
    return { 
      q: "What if the voting equipment breaks?",
      qEs: "¿Qué pasa si el equipo de votación se daña?",
      category: "Troubleshooting" 
    };
  }
  
  // Electioneering
  if (lower.includes("electioneer") || lower.includes("prohibited")) {
    return { 
      q: "What are the rules about electioneering?",
      qEs: "¿Cuáles son las reglas sobre proselitismo?",
      category: "Rules" 
    };
  }
  
  // Welcome / overview / introduction
  if (lower.includes("welcome") || lower.includes("overview") || lower.includes("introduction") || lower.includes("training")) {
    return { 
      q: "What does poll worker training cover?",
      qEs: "¿Qué cubre la capacitación de trabajadores?",
      category: "Training" 
    };
  }

  // General fallback — extract the short section name only
  const match = sectionTitle.match(/Section\s+\d+\s*[:\-]?\s*([A-Za-z &\-]+)/i);
  if (match) {
    const topic = match[1].trim().replace(/\s+/g, " ").slice(0, 30);
    if (topic.length > 3) return { 
      q: `What do I need to know about ${topic}?`, 
      qEs: `¿Qué necesito saber sobre ${topic}?`,
      category: topic.slice(0, 15) 
    };
  }

  return null;
}

// Spanish translations for categories
const categoryTranslations: Record<string, string> = {
  "Check-In": "Registro",
  "Voter ID": "Identificación",
  "Provisional": "Provisional",
  "Ballots": "Boletas",
  "Opening": "Apertura",
  "Closing": "Cierre",
  "Accessibility": "Accesibilidad",
  "Emergency": "Emergencia",
  "Troubleshooting": "Solución",
  "Rules": "Reglas",
  "Training": "Capacitación",
  "Procedures": "Procedimientos",
};
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
    // Try sidecar first (has ALL docs including finaltestmanual)
    let sectionTitles: string[] = [];
    try {
      const res = await fetch(`${SIDECAR_URL}/chunks`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const chunks: Array<{ title: string }> = await res.json();
        sectionTitles = [...new Set(chunks.map(c => c.title).filter(Boolean))];
      }
    } catch {
      // Fall back to local KB
    }
    if (sectionTitles.length === 0) {
      await ensureKnowledgeBaseIngested();
      const kb = getKnowledgeBase();
      sectionTitles = kb.getSectionTitles();
    }
    
    // If no sections available, return default suggestions (bilingual)
    if (sectionTitles.length === 0) {
      const defaults = [
        { q: "What time should poll workers arrive?", qEs: "¿A qué hora deben llegar?", category: "Procedures", categoryEs: "Procedimientos", icon: "Clock" },
        { q: "What ID do voters need to show?", qEs: "¿Qué identificación necesitan?", category: "Voter ID", categoryEs: "Identificación", icon: "IdentificationCard" },
        { q: "How do I handle a provisional ballot?", qEs: "¿Cómo manejo una boleta provisional?", category: "Ballots", categoryEs: "Boletas", icon: "ClipboardText" },
        { q: "What if voting equipment breaks?", qEs: "¿Qué pasa si el equipo falla?", category: "Emergency", categoryEs: "Emergencia", icon: "Lightning" },
        { q: "How do I assist a voter with a disability?", qEs: "¿Cómo ayudo a votantes con discapacidad?", category: "Accessibility", categoryEs: "Accesibilidad", icon: "Wheelchair" },
        { q: "What are the electioneering rules?", qEs: "¿Cuáles son las reglas de proselitismo?", category: "Rules", categoryEs: "Reglas", icon: "Prohibit" },
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
          qEs: generated.qEs,
          category: generated.category,
          categoryEs: categoryTranslations[generated.category] || generated.category,
          icon: getIconForCategory(generated.category),
        });
      }
    }
    
    // Ensure we have at least 6 suggestions, fill with defaults if needed
    const defaults = [
      { q: "What time should poll workers arrive?", qEs: "¿A qué hora deben llegar?", category: "Procedures", categoryEs: "Procedimientos", icon: "Clock" },
      { q: "What ID do voters need to show?", qEs: "¿Qué identificación necesitan?", category: "Voter ID", categoryEs: "Identificación", icon: "IdentificationCard" },
      { q: "How do I handle a provisional ballot?", qEs: "¿Cómo manejo una boleta provisional?", category: "Ballots", categoryEs: "Boletas", icon: "ClipboardText" },
    ];
    
    while (suggestions.length < 6 && defaults.length > 0) {
      const def = defaults.shift()!;
      if (!suggestions.find(s => s.q === def.q)) {
        suggestions.push({
          q: def.q,
          qEs: def.qEs,
          category: def.category,
          categoryEs: def.categoryEs,
          icon: def.icon,
        });
      }
    }
    
    // Limit to 6 suggestions
    const finalSuggestions = suggestions.slice(0, 6);
    
    return NextResponse.json({ suggestions: finalSuggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    // Return default suggestions on error
    const defaults = [
      { q: "What time should poll workers arrive?", qEs: "¿A qué hora deben llegar?", category: "Procedures", categoryEs: "Procedimientos", icon: "Clock" },
      { q: "What ID do voters need to show?", qEs: "¿Qué identificación necesitan?", category: "Voter ID", categoryEs: "Identificación", icon: "IdentificationCard" },
      { q: "How do I handle a provisional ballot?", qEs: "¿Cómo manejo una boleta provisional?", category: "Ballots", categoryEs: "Boletas", icon: "ClipboardText" },
      { q: "What if voting equipment breaks?", qEs: "¿Qué pasa si el equipo falla?", category: "Emergency", categoryEs: "Emergencia", icon: "Lightning" },
      { q: "How do I assist a voter with a disability?", qEs: "¿Cómo ayudo a votantes con discapacidad?", category: "Accessibility", categoryEs: "Accesibilidad", icon: "Wheelchair" },
      { q: "What are the electioneering rules?", qEs: "¿Cuáles son las reglas de proselitismo?", category: "Rules", categoryEs: "Reglas", icon: "Prohibit" },
    ];
    return NextResponse.json({ suggestions: defaults });
  }
}
