/** Staff roster for the investor demo — Teneo pilot. */

export type StaffRole = "teacher" | "admin";

export interface StaffMember {
  id: string;
  fullName: string;
  shortName: string;
  role: StaffRole;
}

/** Demo session acts as Sarah unless a future harness overrides this. */
export const DEMO_SESSION_STAFF_ID = "sarah_mokoena";

/** Harness-only peer admin for data-rights concurrency demos (Req 17.5). */
export const DEMO_PEER_ADMIN_ID = "demo_peer_admin";

export const STAFF: StaffMember[] = [
  {
    id: "sarah_mokoena",
    fullName: "Sarah Mokoena",
    shortName: "Ms. Mokoena",
    role: "teacher",
  },
  {
    id: "david_chen",
    fullName: "David Chen",
    shortName: "Mr. Chen",
    role: "admin",
  },
];

const STAFF_BY_ID = new Map(STAFF.map((member) => [member.id, member]));

export function getStaffMember(staffId: string | null | undefined): StaffMember | null {
  if (!staffId) return null;
  return STAFF_BY_ID.get(staffId) ?? null;
}

export function formatStaffName(
  staffId: string | null | undefined,
  style: "short" | "full" = "short",
): string {
  if (staffId === DEMO_PEER_ADMIN_ID) return "Another administrator";
  const member = getStaffMember(staffId);
  if (!member) return "Unknown staff member";
  return style === "full" ? member.fullName : member.shortName;
}

export function getPrimaryTeacher(): StaffMember {
  return STAFF[0];
}

export function getPrimaryAdmin(): StaffMember {
  return STAFF.find((member) => member.role === "admin") ?? STAFF[1];
}
