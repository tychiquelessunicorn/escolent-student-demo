/** Canonical Student practice route — `/practice` redirects here for legacy links. */
export const STUDENT_PRACTICE_PATH = "/student/practice";

export function studentPracticeHref(query?: Record<string, string | undefined>): string {
  if (!query || Object.keys(query).length === 0) return STUDENT_PRACTICE_PATH;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value);
  }
  return `${STUDENT_PRACTICE_PATH}?${params.toString()}`;
}
