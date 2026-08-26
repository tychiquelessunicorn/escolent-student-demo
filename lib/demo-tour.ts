/** Guided Demo walkthrough — full Student shell, one step at a time. */

export const DEMO_TOUR_TOTAL_STEPS = 6;

export type DemoTourStepId = 1 | 2 | 3 | 4 | 5 | 6;

export interface DemoTourStep {
  id: DemoTourStepId;
  title: string;
  instruction: string;
  /** Primary path the student should be on for this step. */
  href: string;
  ctaLabel: string;
}

/**
 * Perfect shell order:
 * Today → Practice → Today (proof) → Progress → Learn → Week
 */
export const DEMO_TOUR_STEPS: DemoTourStep[] = [
  {
    id: 1,
    title: "Today",
    instruction: "Start today’s adaptive skill — Variables on both sides.",
    href: "/practice?skill=variables_both_sides",
    ctaLabel: "Start practice",
  },
  {
    id: 2,
    title: "Practice",
    instruction: "Try a wrong answer once, then submit 5 to finish.",
    href: "/practice?skill=variables_both_sides",
    ctaLabel: "Keep practicing",
  },
  {
    id: 3,
    title: "Today",
    instruction: "See Today update — the skill is marked complete.",
    href: "/student/today",
    ctaLabel: "Back to Today",
  },
  {
    id: 4,
    title: "Progress",
    instruction: "Check mastery — Variables should read Durable (85%).",
    href: "/student/progress",
    ctaLabel: "Open Progress",
  },
  {
    id: 5,
    title: "Learn",
    instruction: "Open a lesson, then switch Spaces (Geography or English).",
    href: "/student/learn",
    ctaLabel: "Open Learn",
  },
  {
    id: 6,
    title: "Week",
    instruction: "Scan the week ahead — then you’re done with the Demo.",
    href: "/student/week",
    ctaLabel: "Open Week",
  },
];

export function resolveDemoTourStep(
  pathname: string,
  mastered: boolean,
): DemoTourStepId {
  const onPractice = pathname.startsWith("/practice");
  const onToday = pathname.startsWith("/student/today");
  const onWeek = pathname.startsWith("/student/week");
  const onProgress = pathname.startsWith("/student/progress");
  const onLearn = pathname.startsWith("/student/learn");

  if (!mastered) {
    if (onPractice) return 2;
    return 1;
  }

  if (onWeek) return 6;
  if (onLearn) return 5;
  if (onProgress) return 4;
  if (onPractice) return 3;
  if (onToday) return 3;
  return 3;
}

export function demoTourStep(id: DemoTourStepId): DemoTourStep {
  return DEMO_TOUR_STEPS[id - 1];
}

export function demoTourNextHref(
  stepId: DemoTourStepId,
  pathname: string,
): string {
  if (stepId === 1) return "/practice?skill=variables_both_sides";
  if (stepId === 2) return "/practice?skill=variables_both_sides";
  if (stepId === 3) {
    if (pathname.startsWith("/student/today")) return "/student/progress";
    return "/student/today";
  }
  if (stepId === 4) {
    if (pathname.startsWith("/student/progress")) return "/student/learn";
    return "/student/progress";
  }
  if (stepId === 5) {
    if (pathname.startsWith("/student/learn")) return "/student/week";
    return "/student/learn";
  }
  return "/student/week";
}

export function demoTourCtaLabel(
  stepId: DemoTourStepId,
  pathname: string,
): string {
  if (stepId === 1) return "Start practice";
  if (stepId === 2) return "You’re on the practice step";
  if (stepId === 3) {
    if (pathname.startsWith("/student/today")) return "Next: Progress";
    return "Back to Today";
  }
  if (stepId === 4) {
    if (pathname.startsWith("/student/progress")) return "Next: Learn";
    return "Open Progress";
  }
  if (stepId === 5) {
    if (pathname.startsWith("/student/learn")) return "Next: Week";
    return "Open Learn";
  }
  if (stepId === 6) return "Demo complete";
  return demoTourStep(stepId).ctaLabel;
}
