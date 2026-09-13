import {
  format as formatJalali,
  parse as parseJalali,
  isValid,
} from "date-fns-jalali";

export const TASVIN_DATE_FORMAT = "yyyy/MM/dd";
export const TASVIN_DATE_PLACEHOLDER = "۱۴۰۵/۰۱/۰۱";

function normalizePersianDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function formatTasvinDate(value: Date): string {
  if (!isValid(value)) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatTasvinDateTime(value: Date): string {
  if (!isValid(value)) return "—";

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function toJalaliInputValue(value: Date): string {
  if (!isValid(value)) return "";

  return formatJalali(value, TASVIN_DATE_FORMAT);
}

export function parseJalaliDate(
  rawValue: string,
  options?: { endOfDay?: boolean },
): Date {
  const normalized = normalizePersianDigits(rawValue.trim()).replace(/-/g, "/");

  if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(normalized)) {
    throw new Error("INVALID_JALALI_DATE");
  }

  const parsed = parseJalali(normalized, TASVIN_DATE_FORMAT, new Date());

  if (!isValid(parsed)) {
    throw new Error("INVALID_JALALI_DATE");
  }

  // Reject values that date-fns may normalize instead of accepting exactly.
  if (
    formatJalali(parsed, TASVIN_DATE_FORMAT) !==
    normalized
      .split("/")
      .map((part, index) =>
        index === 0 ? part.padStart(4, "0") : part.padStart(2, "0"),
      )
      .join("/")
  ) {
    throw new Error("INVALID_JALALI_DATE");
  }

  if (options?.endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}
