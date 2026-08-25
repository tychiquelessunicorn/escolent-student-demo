import { Suspense } from "react";
import { PracticeSession } from "@/components/practice-session";

export const metadata = { title: "Practice · Escolent" };

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeSession />
    </Suspense>
  );
}
