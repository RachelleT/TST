// Input validation utilities used across auth screens.

// ── Email ─────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function emailError(value: string): string | null {
  if (!value.trim()) return 'Email is required.';
  if (!isValidEmail(value)) return 'Enter a valid email address.';
  return null;
}

// ── Password ──────────────────────────────────────────────────────────────────

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

export type PasswordStrength = 'weak' | 'fair' | 'strong';

export function checkPassword(value: string): PasswordRequirement[] {
  return [
    { key: 'length',    label: 'At least 8 characters',      met: value.length >= 8 },
    { key: 'upper',     label: 'One uppercase letter (A–Z)',  met: /[A-Z]/.test(value) },
    { key: 'lower',     label: 'One lowercase letter (a–z)',  met: /[a-z]/.test(value) },
    { key: 'number',    label: 'One number (0–9)',            met: /[0-9]/.test(value) },
    { key: 'special',   label: 'One special character (!@#…)', met: /[^A-Za-z0-9]/.test(value) },
  ];
}

export function passwordStrength(requirements: PasswordRequirement[]): PasswordStrength {
  const count = requirements.filter(r => r.met).length;
  if (count <= 2) return 'weak';
  if (count <= 4) return 'fair';
  return 'strong';
}

export function isPasswordAcceptable(requirements: PasswordRequirement[]): boolean {
  // Require at least "strong" — all 5 met.
  return requirements.every(r => r.met);
}

export const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak:   'Weak',
  fair:   'Fair',
  strong: 'Strong',
};

export const STRENGTH_COLOR: Record<PasswordStrength, string> = {
  weak:   '#DC2626',
  fair:   '#D97706',
  strong: '#16A34A',
};
