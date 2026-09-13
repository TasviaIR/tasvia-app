import type { CounterpartyType } from "@prisma/client";
import type { ImportRowError } from "./data-portability";

export type CounterpartyImportRow = {
  type: CounterpartyType;
  name: string;
  nationalId?: string;
  economicCode?: string;
  phone?: string;
  email?: string;
};

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

const MAX_CSV_BYTES = 2_000_000;
const MAX_CSV_ROWS = 10_000;
const REQUIRED_HEADERS = ["type", "name"] as const;
const OPTIONAL_HEADERS = [
  "nationalId",
  "economicCode",
  "phone",
  "email",
] as const;

export function parseCsv(content: string): ParsedCsv {
  if (Buffer.byteLength(content, "utf8") > MAX_CSV_BYTES) {
    throw new Error("CSV_TOO_LARGE");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);
      cell = "";

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }

      row = [];

      if (rows.length > MAX_CSV_ROWS + 1) {
        throw new Error("CSV_TOO_MANY_ROWS");
      }

      continue;
    }

    cell += char;
  }

  if (quoted) {
    throw new Error("CSV_UNTERMINATED_QUOTE");
  }

  row.push(cell);

  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("CSV_EMPTY");
  }

  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );

  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      throw new Error(`CSV_HEADER_REQUIRED:${required}`);
    }
  }

  const allowed = new Set<string>([
    ...REQUIRED_HEADERS,
    ...OPTIONAL_HEADERS,
  ]);

  for (const header of headers) {
    if (!allowed.has(header)) {
      throw new Error(`CSV_HEADER_UNSUPPORTED:${header}`);
    }
  }

  return {
    headers,
    rows: rows.slice(1),
  };
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function mapCounterpartyImportRows(
  parsed: ParsedCsv,
): {
  rows: CounterpartyImportRow[];
  errors: ImportRowError[];
} {
  const errors: ImportRowError[] = [];
  const rows: CounterpartyImportRow[] = [];

  const indexOf = (header: string) => parsed.headers.indexOf(header);

  parsed.rows.forEach((sourceRow, index) => {
    const rowNumber = index + 2;
    const rawType = sourceRow[indexOf("type")]?.trim().toUpperCase();
    const name = sourceRow[indexOf("name")]?.trim();

    if (rawType !== "CUSTOMER" && rawType !== "SUPPLIER" && rawType !== "BOTH") {
      errors.push({
        row: rowNumber,
        field: "type",
        code: "INVALID_TYPE",
        message: "type must be CUSTOMER, SUPPLIER or BOTH",
      });
    }

    if (!name) {
      errors.push({
        row: rowNumber,
        field: "name",
        code: "REQUIRED",
        message: "name is required",
      });
    }

    const email = normalizeOptional(sourceRow[indexOf("email")]);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push({
        row: rowNumber,
        field: "email",
        code: "INVALID_EMAIL",
        message: "email is invalid",
      });
    }

    const rowHasErrors = errors.some((error) => error.row === rowNumber);

    if (!rowHasErrors && name) {
      rows.push({
        type: rawType as CounterpartyType,
        name,
        nationalId: normalizeOptional(sourceRow[indexOf("nationalId")]),
        economicCode: normalizeOptional(sourceRow[indexOf("economicCode")]),
        phone: normalizeOptional(sourceRow[indexOf("phone")]),
        email,
      });
    }
  });

  return { rows, errors };
}
