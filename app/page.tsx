import { redirect } from "next/navigation";

/**
 * Student demo entry: guided Demo tour across the full shell.
 * `?tour=1` seeds a clean state and shows the sticky Demo guide.
 */
export default function Home() {
  redirect("/student/today?tour=1");
}
