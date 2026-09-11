export type RegistrationProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  referralSource?: string;
  termsAccepted: boolean;
};

export function normalizeIranianMobile(value: string): string {
  const normalized = value.replace(/\s+/g, "").replace(/^\+98/, "0");
  if (!/^09\d{9}$/.test(normalized)) {
    throw new Error("MOBILE_INVALID");
  }
  return normalized;
}

export function validateRegistrationProfile(
  input: RegistrationProfile,
): RegistrationProfile & { phone: string } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (firstName.length < 2 || firstName.length > 60) {
    throw new Error("FIRST_NAME_INVALID");
  }
  if (lastName.length < 2 || lastName.length > 80) {
    throw new Error("LAST_NAME_INVALID");
  }
  if (!input.termsAccepted) {
    throw new Error("TERMS_REQUIRED");
  }

  return {
    ...input,
    firstName,
    lastName,
    phone: normalizeIranianMobile(input.phone),
    referralSource: input.referralSource?.trim() || undefined,
  };
}

export function verificationComplete(input: {
  emailVerified: boolean;
  phoneVerified: boolean;
}): boolean {
  return input.emailVerified && input.phoneVerified;
}
