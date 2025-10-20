/**
 * Schedule-related utility functions
 */

// --- Provider search helpers: rank closest names ---
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export function levenshteinCapped(a: string, b: string, cap = 2): number {
  if (a === b) return 0;
  const la = a.length,
    lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  const max = cap + 1;
  const prev = new Array(lb + 1).fill(0).map((_, j) => (j <= cap ? j : max));
  for (let i = 1; i <= la; i++) {
    const curr = new Array(lb + 1).fill(max);
    const jStart = Math.max(1, i - cap);
    const jEnd = Math.min(lb, i + cap);
    curr[jStart - 1] = max;
    curr[jStart] = Math.min(
      prev[jStart] + (a[i - 1] !== b[jStart - 1] ? 1 : 0),
      prev[jStart] + 1,
      curr[jStart - 1] + 1,
    );
    for (let j = jStart + 1; j <= jEnd; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    if (curr.slice(jStart, jEnd + 1).every((v) => v > cap)) return cap + 1;
    for (let j = 0; j <= lb; j++) prev[j] = curr[j] ?? max;
  }
  return prev[lb];
}

export function scoreName(name: string, q: string): number {
  const n = normalize(name);
  const query = normalize(q);
  if (!query) return 0;
  if (n === query) return 1_000_000; // exact
  let score = 0;
  if (n.startsWith(query)) score += 500_000; // prefix
  const idx = n.indexOf(query);
  if (idx > 0 && /\W/.test(n[idx - 1] ?? "")) score += 300_000; // word-start
  // subsequence bonus
  let i = 0;
  for (const ch of n) if (ch === query[i]) i++;
  if (i === query.length)
    score += 100_000 - Math.max(0, n.length - query.length);
  const ed = levenshteinCapped(n, query, 2);
  if (ed <= 2) score += 50_000 - 10_000 * ed; // small typos
  score += Math.max(0, 10_000 - n.length); // shorter names slight boost
  return score;
}

// Helper function to format dates as local ISO (YYYY-MM-DD) in local time
export const toLocalISODate = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).toLocaleDateString("sv-SE");

// Local date helper to avoid UTC drift when handling YYYY-MM-DD strings
export const parseLocalYMD = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m as number) - 1, d as number, 12, 0, 0, 0);
};

// Distinct color helpers and color map state
export const getTextColorForBackground = (hex: string) => {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  // Adjusted threshold for better readability
  return luminance > 155 ? "#1f2937" : "#ffffff"; // gray-800 or white
};

export const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const generateDistinctColors = (count: number) => {
  // Predefined vibrant and readable colors for better consistency
  const baseColors = [
    { h: 200, s: 75, l: 55 },  // Blue
    { h: 160, s: 70, l: 50 },  // Emerald/Teal
    { h: 280, s: 65, l: 55 },  // Purple
    { h: 30, s: 75, l: 55 },   // Orange
    { h: 340, s: 70, l: 55 },  // Rose/Pink
    { h: 120, s: 65, l: 50 },  // Green
    { h: 260, s: 70, l: 60 },  // Violet
    { h: 50, s: 75, l: 55 },   // Amber
    { h: 180, s: 70, l: 50 },  // Cyan
    { h: 320, s: 65, l: 55 },  // Magenta
  ];

  const colors = [];

  for (let i = 0; i < count; i++) {
    if (i < baseColors.length) {
      // Use predefined colors for first providers
      const { h, s, l } = baseColors[i];
      colors.push(hslToHex(h, s, l));
    } else {
      // Generate additional colors using golden angle with better parameters
      const h = (i * 137.508) % 360;
      const s = 70 + (i % 3) * 5;  // Vary saturation slightly
      const l = 50 + (i % 2) * 8;  // Vary lightness slightly
      colors.push(hslToHex(h, s, l));
    }
  }

  return colors;
};