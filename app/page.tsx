import { redirect } from "next/navigation";

/**
 * Investor / school demo entry: guided Today path, not bare Practice.
 * `?pitch=1` seeds a clean state and dims non-Variables CTAs.
 */
export default function Home() {
  redirect("/student/today?pitch=1");
}
