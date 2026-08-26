import type { DetectionMethod, DistressSurface } from "@/lib/distress";

const METHOD_LABELS: Record<DetectionMethod, string> = {
  student_initiated: "Chose to ask directly",
  passive_pattern: "Detected automatically",
};

const SURFACE_LABELS: Record<DistressSurface, string> = {
  practice_ask: "Practice session ask box",
  practice_answer: "Practice answer field",
  practice_rubric: "Practice reasoning field",
  today_ask: "Today ask box",
  learn_ask: "Learn ask box",
  progress_ask: "Progress ask box",
  need_help_button: "I need help menu",
};

export function formatDetectionMethod(method: DetectionMethod): string {
  return METHOD_LABELS[method];
}

export function formatDistressSurface(surface: DistressSurface): string {
  return SURFACE_LABELS[surface];
}

export function formatClassifierNote(classifierFailed: boolean): string {
  if (classifierFailed) {
    return "The safety classifier could not confirm this — the system took the fail-open path and created the record anyway.";
  }
  return "The safety classifier confirmed this before the record was created.";
}

export function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatRelativeTimestamp(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return formatTimestamp(iso);
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
