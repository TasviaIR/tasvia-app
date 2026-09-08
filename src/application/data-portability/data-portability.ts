import { createHash } from "node:crypto";

export type ImportMode = "DRY_RUN" | "COMMIT";

export type ImportRowError = {
  row: number;
  field?: string;
  code: string;
  message: string;
};

export type ImportPreview<T> = {
  mode: "DRY_RUN";
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  rows: T[];
  errors: ImportRowError[];
};

export type ExportDocument = {
  filename: string;
  mimeType: "text/csv";
  sha256: string;
  content: string;
};

export function normalizeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function createCsvExport(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>,
): ExportDocument {
  if (!filename.trim()) {
    throw new Error("export filename is required");
  }

  if (headers.length === 0) {
    throw new Error("export headers are required");
  }

  const content = [
    headers.map(normalizeCsvCell).join(","),
    ...rows.map((row) => row.map(normalizeCsvCell).join(",")),
  ].join("\n");

  return {
    filename: filename.endsWith(".csv") ? filename : `${filename}.csv`,
    mimeType: "text/csv",
    sha256: createHash("sha256").update(content).digest("hex"),
    content,
  };
}

export function previewImport<T>(
  rows: T[],
  validate: (row: T, rowNumber: number) => ImportRowError[],
): ImportPreview<T> {
  const accepted: T[] = [];
  const errors: ImportRowError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors = validate(row, rowNumber);

    if (rowErrors.length === 0) {
      accepted.push(row);
    } else {
      errors.push(...rowErrors);
    }
  });

  return {
    mode: "DRY_RUN",
    totalRows: rows.length,
    acceptedRows: accepted.length,
    rejectedRows: rows.length - accepted.length,
    rows: accepted,
    errors,
  };
}
