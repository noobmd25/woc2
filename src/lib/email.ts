// Shared email helpers for Resend integration
// Centralizes From header sanitation/validation and plain-text builders.

export function sanitizeFromRaw(raw?: string) {
  if (!raw) return raw;
  let s = raw.trim();
  // strip surrounding straight or curly quotes if present
  const qStart = s[0];
  const qEnd = s[s.length - 1];
  const openQuotes = new Set(['"', "'", '\u2018', '\u201C']);
  const closeQuotes = new Set(['"', "'", '\u2019', '\u201D']);
  if (openQuotes.has(qStart) && closeQuotes.has(qEnd)) {
    s = s.slice(1, -1).trim();
  }
  // normalize curly apostrophes in display name
  s = s.replace(/\u2019/g, "'");
  return s;
}

export function buildFromHeader(raw: string | undefined, defaultName: string, env?: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.includes('<') && trimmed.includes('>')) {
      const inner = trimmed.substring(trimmed.indexOf('<') + 1, trimmed.indexOf('>')).trim();
      return emailRegex.test(inner) ? trimmed : null;
    }
    if (emailRegex.test(trimmed)) {
      return `${defaultName} <${trimmed}>`;
    }
    return null;
  }
  // Dev fallback allowed by Resend without domain verification
  if (env !== 'production') return 'onboarding@resend.dev';
  return null;
}

export function buildApprovalPlainText({ name, loginUrl, supportEmail }: { name: string; loginUrl: string; supportEmail: string }) {
  const safeName = name || 'there';
  return `Hi ${safeName},\n\nYour access to Who's On Call has been approved. You can now log in: ${loginUrl}\n\nIf you have questions contact ${supportEmail}.\n\n— The Who's On Call Team`;
}
