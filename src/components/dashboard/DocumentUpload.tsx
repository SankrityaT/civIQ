"use client";
import { Upload } from "lucide-react";

export default function DocumentUpload() {
  return (
    <button className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
      <Upload className="h-3.5 w-3.5" />
      Upload Document
    </button>
  );
}
