import type { MasteryTier, SessionRecord, SyncFreshness } from "./types";
import { OVERVIEW_SKILL_IDS } from "./overview-skills";

export interface StudentMisconception {
  skillId: string;
  skillName: string;
  label: string;
  observedAt: string;
}

export interface MasteryOverrideRecord {
  skillId: string;
  reason: string;
  appliedAt: string;
  teacherId: string;
}

export interface RosterStudent {
  id: string;
  fullName: string;
  /** Baseline Space id — effective membership may be overridden via space-store. */
  spaceId: string;
  /** Ordered tiers aligned with OVERVIEW_SKILL_IDS (s0–s6). */
  tiers: MasteryTier[];
  /** Skill ids flagged as prerequisite gaps underneath the current unit. */
  flaggedSkillIds: string[];
  activityLabel: string;
  isLive: boolean;
  lastActivityAt: string;
  misconceptions: StudentMisconception[];
  override: MasteryOverrideRecord | null;
  recentSessions: SessionRecord[];
  /** Continuity hook for the Escalations screen — not shown on every row. */
  escalationNote: string | null;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function row(
  id: string,
  fullName: string,
  spaceId: string,
  tiers: MasteryTier[],
  options: Partial<
    Pick<
      RosterStudent,
      | "flaggedSkillIds"
      | "activityLabel"
      | "isLive"
      | "lastActivityAt"
      | "misconceptions"
      | "override"
      | "recentSessions"
      | "escalationNote"
    >
  > = {},
): RosterStudent {
  return {
    id,
    fullName,
    spaceId,
    tiers,
    flaggedSkillIds: options.flaggedSkillIds ?? [],
    activityLabel: options.activityLabel ?? "Yesterday",
    isLive: options.isLive ?? false,
    lastActivityAt: options.lastActivityAt ?? daysAgo(1),
    misconceptions: options.misconceptions ?? [],
    override: options.override ?? null,
    recentSessions: options.recentSessions ?? [],
    escalationNote: options.escalationNote ?? null,
  };
}

/**
 * Sarah's full roster — 17 in Grade 8A Algebra, 8 in Grade 8A Remediation.
 * Named students carry the established demo stories; fillers are plausible
 * but unremarkable.
 */
export const ROSTER: RosterStudent[] = [
  row("mia_ndlovu", "Mia Ndlovu", "algebra_8a", [
    "durable",
    "struggling",
    "tentative",
    "struggling",
    "emerging",
    "not_attempted",
    "not_attempted",
  ], {
    flaggedSkillIds: ["s1"],
    activityLabel: "12 min ago",
    lastActivityAt: minutesAgo(12),
    recentSessions: [
      {
        date: "Aug 18",
        title: "Two-step equations",
        result: "4 problems · used a hint once",
        durationMinutes: 22,
        problemsAttempted: 4,
      },
      {
        date: "Aug 16",
        title: "Two-step equations",
        result: "3 problems · first attempt",
        durationMinutes: 18,
        problemsAttempted: 3,
      },
      {
        date: "Aug 15",
        title: "One-step equations",
        result: "5 of 5 correct — crossed to tentative",
        durationMinutes: 25,
        problemsAttempted: 5,
      },
      {
        date: "Aug 12",
        title: "Integer operations",
        result: "1 of 3 correct — flagged as a gap",
        durationMinutes: 14,
        problemsAttempted: 3,
      },
    ],
    escalationNote: "Active escalation records exist in the shared distress store.",
  }),
  row("thabo_mahlangu", "Thabo Mahlangu", "algebra_8a", [
    "durable",
    "durable",
    "durable",
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
  ], {
    activityLabel: "Practicing now",
    isLive: true,
    lastActivityAt: minutesAgo(2),
    recentSessions: [
      {
        date: "Aug 19",
        title: "Variables on both sides",
        result: "2 of 3 correct — emerging",
        durationMinutes: 16,
        problemsAttempted: 3,
      },
      {
        date: "Aug 17",
        title: "Multi-step equations",
        result: "4 of 4 first-try — crossed to tentative",
        durationMinutes: 28,
        problemsAttempted: 4,
      },
    ],
  }),
  row("zainab_osei", "Zainab Osei", "algebra_8a", [
    "durable",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "2 hr ago",
    lastActivityAt: hoursAgo(2),
    misconceptions: [
      {
        skillId: "s3",
        skillName: "Two-step equations",
        label: "Treats negative coefficients as positive when dividing",
        observedAt: daysAgo(3),
      },
    ],
    recentSessions: [
      {
        date: "Aug 17",
        title: "Two-step equations",
        result: "3 of 5 correct — sign errors on negatives",
        durationMinutes: 24,
        problemsAttempted: 5,
      },
      {
        date: "Aug 14",
        title: "One-step equations",
        result: "4 of 4 correct",
        durationMinutes: 20,
        problemsAttempted: 4,
      },
    ],
  }),
  row("marcus_diaz", "Marcus Diaz", "algebra_8a", [
    "durable",
    "tentative",
    "tentative",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Practicing now",
    isLive: true,
    lastActivityAt: minutesAgo(1),
    recentSessions: [
      {
        date: "Aug 19",
        title: "Two-step equations",
        result: "1 of 4 correct — stuck 4+ days",
        durationMinutes: 21,
        problemsAttempted: 4,
      },
      {
        date: "Aug 15",
        title: "Two-step equations",
        result: "2 of 4 correct",
        durationMinutes: 19,
        problemsAttempted: 4,
      },
    ],
  }),
  row("elena_cruz", "Elena Cruz", "algebra_8a", [
    "durable",
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Yesterday",
    lastActivityAt: daysAgo(1),
    override: {
      skillId: "s1",
      reason: "Observed fluent integer work in class — platform still showed struggling.",
      appliedAt: daysAgo(31),
      teacherId: "sarah_mokoena",
    },
    recentSessions: [
      {
        date: "Aug 16",
        title: "One-step equations",
        result: "3 of 4 correct",
        durationMinutes: 17,
        problemsAttempted: 4,
      },
      {
        date: "Aug 10",
        title: "Integer operations",
        result: "Override applied after class observation",
        durationMinutes: 12,
        problemsAttempted: 3,
      },
    ],
  }),
  row("priya_chen", "Priya Chen", "algebra_8a", [
    "durable",
    "durable",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "38 min ago",
    lastActivityAt: minutesAgo(38),
  }),
  row("jamal_reed", "Jamal Reed", "algebra_8a", [
    "durable",
    "tentative",
    "tentative",
    "tentative",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Yesterday",
    lastActivityAt: daysAgo(1),
  }),
  row("sofia_torres", "Sofia Torres", "algebra_8a", [
    "durable",
    "durable",
    "durable",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
  ], {
    activityLabel: "Practicing now",
    isLive: true,
    lastActivityAt: minutesAgo(3),
  }),
  row("ken_watanabe", "Ken Watanabe", "algebra_8a", [
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "2 days ago",
    lastActivityAt: daysAgo(2),
  }),
  row("aaliyah_brooks", "Aaliyah Brooks", "algebra_8a", [
    "durable",
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "45 min ago",
    lastActivityAt: minutesAgo(45),
  }),
  row("ravi_patel", "Ravi Patel", "algebra_8a", [
    "durable",
    "tentative",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "1 hr ago",
    lastActivityAt: hoursAgo(1),
  }),
  row("grace_kim", "Grace Kim", "algebra_8a", [
    "durable",
    "durable",
    "tentative",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
  ], {
    activityLabel: "20 min ago",
    lastActivityAt: minutesAgo(20),
  }),
  row("ibrahim_nasser", "Ibrahim Nasser", "algebra_8a", [
    "durable",
    "struggling",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    flaggedSkillIds: ["s1"],
    activityLabel: "3 days ago",
    lastActivityAt: daysAgo(3),
  }),
  row("chloe_dubois", "Chloe Dubois", "algebra_8a", [
    "durable",
    "durable",
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "5 hr ago",
    lastActivityAt: hoursAgo(5),
  }),
  row("omar_farouk", "Omar Farouk", "algebra_8a", [
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "2 hr ago",
    lastActivityAt: hoursAgo(2),
  }),
  row("lily_zhang", "Lily Zhang", "algebra_8a", [
    "durable",
    "durable",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Yesterday",
    lastActivityAt: daysAgo(1),
  }),
  row("aiden_foster", "Aiden Foster", "algebra_8a", [
    "durable",
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Yesterday",
    lastActivityAt: daysAgo(1),
    escalationNote:
      "Resolved escalation from 12 days ago — acknowledged and closed the same day. Historical record for continuity with Escalations.",
    recentSessions: [
      {
        date: "Aug 18",
        title: "One-step equations",
        result: "3 of 4 correct",
        durationMinutes: 18,
        problemsAttempted: 4,
      },
      {
        date: "Aug 15",
        title: "Integer operations",
        result: "4 of 5 correct",
        durationMinutes: 16,
        problemsAttempted: 5,
      },
    ],
  }),
  row("noah_whitfield", "Noah Whitfield", "remediation_8a", [
    "tentative",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    flaggedSkillIds: ["s1"],
    activityLabel: "3 hr ago",
    lastActivityAt: hoursAgo(3),
    escalationNote: "Open escalation from Tuesday's check-in — see Escalations.",
    recentSessions: [
      {
        date: "Aug 17",
        title: "Integer operations",
        result: "1 of 3 correct — flagged",
        durationMinutes: 15,
        problemsAttempted: 3,
      },
      {
        date: "Aug 14",
        title: "Equation basics",
        result: "2 of 4 correct",
        durationMinutes: 18,
        problemsAttempted: 4,
      },
    ],
  }),
  row("destiny_moore", "Destiny Moore", "remediation_8a", [
    "tentative",
    "tentative",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "1 hr ago",
    lastActivityAt: hoursAgo(1),
  }),
  row("carlos_mendez", "Carlos Mendez", "remediation_8a", [
    "durable",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "25 min ago",
    lastActivityAt: minutesAgo(25),
  }),
  row("fatima_ali", "Fatima Ali", "remediation_8a", [
    "tentative",
    "struggling",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    flaggedSkillIds: ["s1", "s2"],
    activityLabel: "4 hr ago",
    lastActivityAt: hoursAgo(4),
  }),
  row("tyler_brooks", "Tyler Brooks", "remediation_8a", [
    "durable",
    "tentative",
    "tentative",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "Yesterday",
    lastActivityAt: daysAgo(1),
  }),
  row("amina_yusuf", "Amina Yusuf", "remediation_8a", [
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "2 days ago",
    lastActivityAt: daysAgo(2),
  }),
  row("jordan_lee", "Jordan Lee", "remediation_8a", [
    "durable",
    "tentative",
    "struggling",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "50 min ago",
    lastActivityAt: minutesAgo(50),
  }),
  row("nadia_hassan", "Nadia Hassan", "remediation_8a", [
    "tentative",
    "tentative",
    "emerging",
    "not_attempted",
    "not_attempted",
    "not_attempted",
    "not_attempted",
  ], {
    activityLabel: "3 hr ago",
    lastActivityAt: hoursAgo(3),
  }),
];

/** Aggregated misconceptions for the overview sidebar — counts from roster. */
export const OVERVIEW_MISCONCEPTION_AGGREGATES = [
  {
    id: "negative_coefficients",
    label: "Negative coefficients when solving two-step equations",
    skillId: "s3",
    skillName: "Two-step equations",
    studentIds: ["zainab_osei", "ravi_patel", "grace_kim", "marcus_diaz", "destiny_moore"],
  },
  {
    id: "inverse_order",
    label: "Reversing the order of inverse operations",
    skillId: "s3",
    skillName: "Two-step equations",
    studentIds: ["marcus_diaz", "fatima_ali", "omar_farouk"],
  },
  {
    id: "sign_distribution",
    label: "Sign errors when distributing",
    skillId: "s4",
    skillName: "Multi-step equations",
    studentIds: ["ken_watanabe", "amina_yusuf"],
  },
] as const;

/** Canvas roster sync indicator — LMS-sourced enrollment list freshness. */
export const ROSTER_LMS_FRESHNESS: SyncFreshness = "fresh";

const ROSTER_BY_ID = new Map(ROSTER.map((student) => [student.id, student]));

export function getRosterStudent(studentId: string): RosterStudent | null {
  return ROSTER_BY_ID.get(studentId) ?? null;
}

export function rosterStudentsForSpace(spaceFilter: string | null): RosterStudent[] {
  if (!spaceFilter || spaceFilter === "all") return ROSTER;
  return ROSTER.filter((student) => student.spaceId === spaceFilter);
}

export function masteryForStudent(student: RosterStudent, skillId: string): MasteryTier | null {
  const index = OVERVIEW_SKILL_IDS.indexOf(skillId);
  if (index < 0) return null;
  return student.tiers[index] ?? null;
}

/**
 * Drill-down misconceptions: personal entries plus any aggregate the student
 * is counted in. Prefer a personal entry when both cover the same skill so
 * Zainab keeps her specific wording while aggregate counts stay consistent.
 */
export function misconceptionsForStudent(student: RosterStudent): StudentMisconception[] {
  const merged: StudentMisconception[] = [...student.misconceptions];
  const seen = new Set(
    merged.map((entry) => `${entry.skillId}::${entry.label.toLowerCase()}`),
  );
  const personalSkillIds = new Set(merged.map((entry) => entry.skillId));

  for (const aggregate of OVERVIEW_MISCONCEPTION_AGGREGATES) {
    if (!(aggregate.studentIds as readonly string[]).includes(student.id)) continue;
    if (personalSkillIds.has(aggregate.skillId)) continue;
    const key = `${aggregate.skillId}::${aggregate.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      skillId: aggregate.skillId,
      skillName: aggregate.skillName,
      label: aggregate.label,
      observedAt: daysAgo(4),
    });
  }

  return merged;
}
