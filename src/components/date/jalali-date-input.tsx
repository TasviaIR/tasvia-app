"use client";

import { TASVIN_DATE_PLACEHOLDER } from "../../lib/tasvin-date";

type JalaliDateInputProps = {
  name: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
  id?: string;
};

export function JalaliDateInput({
  name,
  required,
  defaultValue = "",
  className,
  id,
}: JalaliDateInputProps) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      dir="ltr"
      autoComplete="off"
      required={required}
      defaultValue={defaultValue}
      placeholder={TASVIN_DATE_PLACEHOLDER}
      pattern="[0-9۰-۹٠-٩]{4}/[0-9۰-۹٠-٩]{1,2}/[0-9۰-۹٠-٩]{1,2}"
      aria-label="تاریخ شمسی"
      className={className}
    />
  );
}
