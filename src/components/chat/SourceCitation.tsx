"use client";
// TODO (Sanki): Style source badge — info-blue, document icon, clickable to view doc
interface Props {
  source: string;
  cached?: boolean;
}

export default function SourceCitation({ source, cached }: Props) {
  return (
    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
      <span>📄</span>
      <span>{source}</span>
      {cached && (
        <span className="ml-2 rounded bg-green-100 px-1 py-0.5 text-green-700">
          ✓ Verified
        </span>
      )}
    </div>
  );
}
