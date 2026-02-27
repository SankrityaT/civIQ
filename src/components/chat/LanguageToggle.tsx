"use client";
// TODO (Sanki): Wire toggle to parent state; update system prompt language on change
import { useState } from "react";
import { Language } from "@/types";

interface Props {
  onChange?: (lang: Language) => void;
}

export default function LanguageToggle({ onChange }: Props) {
  const [lang, setLang] = useState<Language>("en");

  function toggle() {
    const next: Language = lang === "en" ? "es" : "en";
    setLang(next);
    onChange?.(next);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {lang === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}
    </button>
  );
}
