/**
 * Plain-language deletion intent — Req 17.1.
 *
 * Heuristic only: routes into the structured deletion flow, never executes
 * deletion directly. No LLM call on this path.
 */

import { ROSTER } from "@/lib/demo-data/roster";

const DELETION_HINTS =
  /\b(remove|delete|erase|wipe|purge|graduated|account|personal data|all data)\b/i;

export interface DeletionIntentParse {
  isDeletionIntent: boolean;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  normalizedPhrase: string;
}

export function parseDeletionIntent(text: string): DeletionIntentParse {
  const normalizedPhrase = text.trim();
  if (!normalizedPhrase) {
    return {
      isDeletionIntent: false,
      matchedStudentId: null,
      matchedStudentName: null,
      normalizedPhrase,
    };
  }

  const lower = normalizedPhrase.toLowerCase();
  const isDeletionIntent = DELETION_HINTS.test(lower);

  let matchedStudentId: string | null = null;
  let matchedStudentName: string | null = null;

  for (const student of ROSTER) {
    const full = student.fullName.toLowerCase();
    const first = student.fullName.split(/\s+/)[0]?.toLowerCase();
    if (lower.includes(full) || (first && lower.includes(first))) {
      matchedStudentId = student.id;
      matchedStudentName = student.fullName;
      break;
    }
  }

  return {
    isDeletionIntent,
    matchedStudentId,
    matchedStudentName,
    normalizedPhrase,
  };
}
