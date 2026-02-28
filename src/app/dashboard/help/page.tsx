// Created by Kinjal
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  FileText,
  Users,
  Bot,
  Search,
  Shield,
  ExternalLink,
  BookOpen,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   ACCORDION ITEM
═══════════════════════════════════════════════════════════════════════════ */
function AccordionItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition hover:text-amber-700"
      >
        <span className="text-[13px] font-medium text-slate-800 pr-4">{question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-96 pb-4" : "max-h-0"
        }`}
      >
        <div className="text-[13px] text-slate-500 leading-relaxed">{answer}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK LINK CARD
═══════════════════════════════════════════════════════════════════════════ */
function QuickLink({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 transition group-hover:bg-amber-100">
        <Icon className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 group-hover:text-amber-700 transition">
          {title}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-amber-500 transition mt-0.5" />
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HELP PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      category: "Getting Started",
      items: [
        {
          q: "What is CivIQ?",
          a: "CivIQ is an AI-powered election management platform for county officials. It helps manage training documents, recruit poll workers from voter registration data, and provides an AI assistant (Sam) trained on your election materials.",
        },
        {
          q: "How do I get started?",
          a: (
            <>
              Start by uploading your training documents in the{" "}
              <Link href="/dashboard/documents" className="text-amber-600 hover:underline font-medium">
                Documents
              </Link>{" "}
              tab. Then use the{" "}
              <Link href="/dashboard/test" className="text-amber-600 hover:underline font-medium">
                AI Center
              </Link>{" "}
              to test Sam&apos;s responses, and the{" "}
              <Link href="/dashboard/recruit" className="text-amber-600 hover:underline font-medium">
                Recruit
              </Link>{" "}
              tab to find poll worker candidates.
            </>
          ),
        },
        {
          q: "What format should my documents be in?",
          a: "Training documents should be uploaded as PDF files. The system will automatically parse, chunk, and index them for AI retrieval. Each document is split into sections for precise source attribution.",
        },
      ],
    },
    {
      category: "Poll Worker Recruitment",
      items: [
        {
          q: "How does candidate scoring work?",
          a: "Candidates are scored on a 0-100 scale based on multiple factors: previous poll worker experience, bilingual ability, years of voter registration (civic engagement), age, and availability. Higher scores indicate stronger candidates.",
        },
        {
          q: "What CSV format is required for recruitment?",
          a: (
            <>
              Required columns:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-amber-700">
                id, first_name, last_name, age, city, precinct, languages, registered_since, previous_poll_worker, availability
              </code>
              . Optional columns: address, zip, party, email, phone.
            </>
          ),
        },
        {
          q: "Why are some candidates filtered out?",
          a: "The system uses rigorous eligibility criteria to surface the most qualified candidates. Voters must meet age requirements (25-68), have 3+ years of registration, and demonstrate at least two qualifying signals such as bilingual ability, previous experience, or long-term civic engagement.",
        },
        {
          q: "Can I re-upload a different CSV?",
          a: "Yes. Click \"Re-upload CSV\" in the Recruit tab header. This takes you to the full upload screen where you can start fresh with a new or updated file. The previous results will be replaced.",
        },
      ],
    },
    {
      category: "AI Assistant (Sam)",
      items: [
        {
          q: "What can Sam answer?",
          a: "Sam answers questions based on your uploaded training documents. It can help with poll worker procedures, voter check-in protocols, equipment setup, accessibility requirements, and any topic covered in your materials.",
        },
        {
          q: "Does Sam support Spanish?",
          a: "Yes. Sam supports both English and Spanish. You can toggle the language in the chat interface, and Sam will respond in the selected language while still referencing your English-language documents.",
        },
        {
          q: "What happens if Ollama is offline?",
          a: "If the local Ollama server is unavailable, Sam automatically falls back to Groq cloud API. This ensures uninterrupted service. You can check service status in Settings.",
        },
        {
          q: "How accurate are Sam's responses?",
          a: "Sam uses Retrieval-Augmented Generation (RAG) — it retrieves relevant sections from your actual documents before generating answers. Every response includes source attribution so you can verify the information.",
        },
      ],
    },
    {
      category: "Documents & Data",
      items: [
        {
          q: "How do I manage training documents?",
          a: (
            <>
              Go to{" "}
              <Link href="/dashboard/documents" className="text-amber-600 hover:underline font-medium">
                Documents
              </Link>{" "}
              to upload, view, activate, or deactivate training materials. Only active documents are used by Sam for answering questions.
            </>
          ),
        },
        {
          q: "Is my data stored locally?",
          a: "Yes. All document processing, vector indexing, and candidate scoring happen locally through the RAG sidecar. No data is sent to external servers unless Groq cloud fallback is triggered for AI responses.",
        },
        {
          q: "Can I export candidate data?",
          a: "Yes. Use the \"Export All\" button or select specific candidates and export them from the Recruit tab. Data is exported as a CSV file with all candidate details and scores.",
        },
      ],
    },
  ];

  // Filter FAQs based on search
  const filteredFaqs = searchQuery.trim()
    ? faqs
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (typeof item.a === "string" && item.a.toLowerCase().includes(searchQuery.toLowerCase()))
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : faqs;

  return (
    <div className="space-y-7 pt-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
            Help Center
          </h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          Find answers and get the most out of CivIQ.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-[13px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink
            icon={FileText}
            title="Manage Documents"
            description="Upload and organize training materials"
            href="/dashboard/documents"
          />
          <QuickLink
            icon={Users}
            title="Recruit Workers"
            description="Upload CSV and find candidates"
            href="/dashboard/recruit"
          />
          <QuickLink
            icon={Bot}
            title="Test AI Assistant"
            description="Ask Sam questions about your docs"
            href="/dashboard/test"
          />
          <QuickLink
            icon={Shield}
            title="Settings"
            description="Service status and system info"
            href="/dashboard/settings"
          />
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-6">
        <h2 className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">
          Frequently Asked Questions
        </h2>

        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-slate-700">No results found</p>
            <p className="mt-1 text-[12px] text-slate-400">
              Try a different search term or{" "}
              <button onClick={() => setSearchQuery("")} className="text-amber-600 hover:underline font-medium">
                clear the search
              </button>
            </p>
          </div>
        ) : (
          filteredFaqs.map((category) => (
            <div key={category.category} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
                <h3 className="text-[13px] font-[family-name:var(--font-playfair)] font-semibold text-slate-800">
                  {category.category}
                </h3>
              </div>
              <div className="px-6">
                {category.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    question={item.q}
                    answer={item.a}
                    defaultOpen={i === 0 && category.category === "Getting Started"}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Source Code */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="h-4 w-4 text-amber-600" />
          <h2 className="text-[15px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
            Source Code
          </h2>
        </div>
        <p className="text-[12px] text-slate-500 mb-3">
          CivIQ is open source. View the full codebase, report issues, or contribute on GitHub.
        </p>
        <a
          href="https://github.com/SankrityaT/civIQ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-600 hover:text-amber-700 transition"
        >
          github.com/SankrityaT/civIQ
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Ask Sam CTA */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200">
              <BookOpen className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-[14px] font-[family-name:var(--font-playfair)] font-semibold text-slate-900">
                Need more help?
              </p>
              <p className="text-[12px] text-slate-500">
                Ask Sam directly — our AI assistant can answer questions about your election materials.
              </p>
            </div>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <MessageSquare className="h-4 w-4" />
            Ask Sam
          </Link>
        </div>
      </div>
    </div>
  );
}
