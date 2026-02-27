// Created by Kinjal
// Generic CSV export utility — client-side download trigger
// Single Responsibility: converts data → CSV string → browser download

export function generateCSV(
  data: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): string {
  if (data.length === 0) return "";

  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[]
): void {
  const csv = generateCSV(data, columns);
  downloadCSV(csv, filename);
}
