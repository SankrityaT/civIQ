"use client";
import { useState } from "react";
import { Upload, FileText, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDocuments } from "@/lib/hooks";

export default function DocumentUpload() {
  const { addDocument } = useDocuments();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sections, setSections] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  function reset() {
    setName("");
    setSections(1);
    setUploading(false);
    setProgress(0);
    setDone(false);
  }

  async function handleUpload() {
    if (!name.trim()) return;
    setUploading(true);
    setProgress(0);

    // Simulated upload progress for demo
    const steps = [20, 45, 70, 90, 100];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 300));
      setProgress(step);
    }

    const wordCount = Math.floor(Math.random() * 800) + 200;
    await addDocument(name.trim(), wordCount, sections);

    setDone(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
          <Upload className="h-3.5 w-3.5" />
          Upload Document
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-amber-500" />
            Upload Training Document
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Add a new training document for Sam to learn from.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">Document uploaded!</p>
            <p className="mt-1 text-xs text-slate-400">Sam will now reference this document.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Document Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Early Voting Procedures Guide"
                disabled={uploading}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Number of Sections
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={sections}
                onChange={(e) => setSections(Number(e.target.value))}
                disabled={uploading}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none disabled:opacity-50"
              />
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Processing document…</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !name.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload &amp; Index
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
