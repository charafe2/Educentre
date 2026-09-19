// Local-time 'YYYY-MM' key (not UTC, to avoid off-by-one at month boundaries).
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
