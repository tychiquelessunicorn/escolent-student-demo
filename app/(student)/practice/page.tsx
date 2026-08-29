import { redirect } from "next/navigation";
import { STUDENT_PRACTICE_PATH } from "@/lib/routes";

/** Legacy `/practice` deep links — query params preserved. */
export default async function LegacyPracticeRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry);
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `${STUDENT_PRACTICE_PATH}?${query}` : STUDENT_PRACTICE_PATH);
}
