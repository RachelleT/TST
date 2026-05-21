// Thin i18n wrapper — v1 is English-only. All user-facing strings pass through
// here so adding real translations later is a one-file change.
export function t(str: string, _params?: Record<string, string>): string {
  return str;
}
