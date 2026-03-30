/** Keep in sync with backend `RegisterRequest` validation in `auth.py`. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Shown on registration (and documentation). */
export const USERNAME_REQUIREMENTS: string[] = [
  `${USERNAME_MIN}–${USERNAME_MAX} characters`,
  'Only letters, numbers, underscores (_), and hyphens (-)',
];

export const PASSWORD_REQUIREMENTS: string[] = [
  `At least ${PASSWORD_MIN} characters (max ${PASSWORD_MAX})`,
  'At least one letter',
  'At least one number',
];

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

export type RegisterFieldErrors = {
  username?: string;
  password?: string;
};

export function validateRegisterFields(
  username: string,
  password: string
): RegisterFieldErrors | null {
  const u = username.trim();
  const errors: RegisterFieldErrors = {};

  if (u.length < USERNAME_MIN) {
    errors.username = `Username must be at least ${USERNAME_MIN} characters.`;
  } else if (u.length > USERNAME_MAX) {
    errors.username = `Username must be at most ${USERNAME_MAX} characters.`;
  } else if (!USERNAME_RE.test(u)) {
    errors.username =
      'Username may only use letters, numbers, underscores, and hyphens.';
  }

  if (password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (password.length > PASSWORD_MAX) {
    errors.password = `Password must be at most ${PASSWORD_MAX} characters.`;
  } else if (!/[A-Za-z]/.test(password)) {
    errors.password = 'Password must contain at least one letter.';
  } else if (!/\d/.test(password)) {
    errors.password = 'Password must contain at least one number.';
  }

  return Object.keys(errors).length ? errors : null;
}

/** First message from FastAPI 422 `detail` array (Pydantic). */
export function firstValidationMessage(detail: unknown): string | null {
  if (!Array.isArray(detail) || detail.length === 0) return null;
  const row = detail[0] as { msg?: unknown };
  return typeof row.msg === 'string' ? row.msg : null;
}
