"use client";
import Link from "next/link";
import DocumentList from "@/components/dashboard/DocumentList";
import DocumentUpload from "@/components/dashboard/DocumentUpload";
import {
  FileText,
  CloudArrowUp,
  Brain,
  Flask,
  ArrowRight,
  TreeStructure,
  Lightning,
} from "@phosphor-icons/react";
import { useDocuments } from "@/lib/hooks";

const WORKFLOW_STEPS = [
  {
    num: 1,
    title: "Upload a Document",
    desc: "Drop a PDF, DOCX, or TXT file. Sam auto-detects pages, sections, and topics.",
    icon: CloudArrowUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    num: 2,
    title: "Knowledge Graph Grows",
    desc: "Sam chunks, embeds, and wires new concepts into the knowledge graph in real time.",
    icon: TreeStructure,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
  },
  {
    num: 3,
    title: "Test & Approve",
    desc: "Head to the AI Command Center to test Sam\u2019s answers and approve them for poll workers.",
    icon: Flask,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    link: "/dashboard/test",
  },
];

export default function DocumentsPage() {
  const { documents } = useDocuments();

  const activeCount = documents.filter((d) => d.status === "active").length;
  const totalWords = documents.reduce((sum, d) => sum + d.wordCount, 0);
  const totalSections = documents.reduce((sum, d) => sum + d.sections, 0);

  return (
    <div className="space-y-7 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={22} weight="duotone" className="text-amber-500" />
            <h1 className="text-2xl font-[family-name:var(--font-playfair)] font-semibold text-slate-900">Training Documents</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Everything Sam knows comes from these documents — nothing else.
          </p>
        </div>
        <DocumentUpload />
      </div>

      {/* How it works — 3-step guided workflow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
        {WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const inner = (
            <div
              key={step.num}
              className={`relative rounded-2xl border ${step.border} ${step.bg} p-4 h-full flex flex-col transition-all hover:shadow-sm group`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border ${step.border}`}>
                  <Icon size={18} weight="duotone" className={step.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Step {step.num}</p>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight size={14} weight="bold" className="text-slate-300" />
                </div>
              )}
              {step.link && (
                <div className="mt-3 ml-12">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 group-hover:underline">
                    Go to AI Center <ArrowRight size={12} />
                  </span>
                </div>
              )}
            </div>
          );
          return step.link ? (
            <Link key={step.num} href={step.link} className="block">
              {inner}
            </Link>
          ) : (
            <div key={step.num}>{inner}</div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-[family-name:var(--font-playfair)] font-medium text-slate-900">{documents.length}</span>
          <span className="text-sm text-slate-500">documents</span>
          {activeCount < documents.length && (
            <span className="text-xs text-slate-400">({activeCount} active)</span>
          )}
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Lightning size={14} weight="fill" className="text-amber-500" />
          <span className="font-[family-name:var(--font-playfair)] text-[16px] font-medium text-slate-900">{totalWords.toLocaleString()}</span> words indexed
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Brain size={14} weight="duotone" className="text-indigo-500" />
          <span className="font-[family-name:var(--font-playfair)] text-[16px] font-medium text-slate-900">{totalSections}</span> sections
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500">AI knowledge up to date</span>
        </div>
      </div>

      <DocumentList />
    </div>
  );
}
