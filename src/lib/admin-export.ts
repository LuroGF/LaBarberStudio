export type CsvValue = string | number | boolean | null | undefined;

function csvCell(value: CsvValue) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[;"\r\n]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function createCsv(headers: string[], rows: CsvValue[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvDownload(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function exportDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
