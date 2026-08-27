/**
 * Teacher Space catalog + student assignment overrides — Redis-backed.
 * Seed baseline is SEED_TEACHER_SPACES; membership layers over roster.spaceId.
 */

import { randomUUID } from "crypto";
import { ROSTER, getRosterStudent } from "@/lib/demo-data/roster";
import { OVERVIEW_SKILL_COLUMNS, OVERVIEW_SKILL_IDS } from "@/lib/demo-data/overview-skills";
import { DEMO_SESSION_STAFF_ID } from "@/lib/demo-data/staff";
import { SEED_TEACHER_SPACES } from "@/lib/demo-data/teacher-spaces";
import { getRedis } from "@/lib/rate-limit";

export interface ManagedTeacherSpace {
  id: string;
  name: string;
  shortName: string;
  description: string;
  grade: string;
  teacherId: string;
  includedSkillIds: string[];
  difficultyMin: number;
  difficultyMax: number;
  classroomPacingMode: boolean;
  createdAt: string;
  updatedAt: string;
}

/** studentId → spaceId when a Teacher has reassigned membership. */
export type SpaceAssignments = Record<string, string>;

export const SPACES_CATALOG_KEY = "escolent:spaces:catalog";
export const SPACES_ASSIGNMENTS_KEY = "escolent:spaces:assignments";

const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 5;

function seedCatalogEntries(): ManagedTeacherSpace[] {
  const now = new Date().toISOString();
  return SEED_TEACHER_SPACES.map((space) => ({
    ...space,
    createdAt: now,
    updatedAt: now,
  }));
}

function normalizeSpace(raw: unknown): ManagedTeacherSpace | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<ManagedTeacherSpace>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.name !== "string" ||
    typeof entry.shortName !== "string" ||
    typeof entry.description !== "string"
  ) {
    return null;
  }
  const includedSkillIds = Array.isArray(entry.includedSkillIds)
    ? entry.includedSkillIds.filter(
        (id): id is string => typeof id === "string" && OVERVIEW_SKILL_IDS.includes(id),
      )
    : [];
  const difficultyMin =
    typeof entry.difficultyMin === "number" ? entry.difficultyMin : DIFFICULTY_MIN;
  const difficultyMax =
    typeof entry.difficultyMax === "number" ? entry.difficultyMax : DIFFICULTY_MAX;
  return {
    id: entry.id,
    name: entry.name,
    shortName: entry.shortName,
    description: entry.description,
    grade: typeof entry.grade === "string" ? entry.grade : "Grade 8",
    teacherId: typeof entry.teacherId === "string" ? entry.teacherId : DEMO_SESSION_STAFF_ID,
    includedSkillIds,
    difficultyMin: Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, difficultyMin)),
    difficultyMax: Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, difficultyMax)),
    classroomPacingMode: Boolean(entry.classroomPacingMode),
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

function normalizeAssignments(raw: unknown): SpaceAssignments {
  if (!raw || typeof raw !== "object") return {};
  const result: SpaceAssignments = {};
  for (const [studentId, spaceId] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof spaceId === "string" && spaceId.length > 0) {
      result[studentId] = spaceId;
    }
  }
  return result;
}

/** Seed catalog into Redis on first empty read — same pattern as distress/override. */
export async function seedSpacesIfEmpty(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const existing = await redis.get<string | ManagedTeacherSpace[]>(SPACES_CATALOG_KEY);
    if (existing != null) {
      const parsed =
        typeof existing === "string" ? (JSON.parse(existing) as unknown) : existing;
      if (Array.isArray(parsed) && parsed.length > 0) return;
    }

    const seeds = seedCatalogEntries();
    await redis.set(SPACES_CATALOG_KEY, JSON.stringify(seeds));
    const assignmentsRaw = await redis.get(SPACES_ASSIGNMENTS_KEY);
    if (assignmentsRaw == null) {
      await redis.set(SPACES_ASSIGNMENTS_KEY, JSON.stringify({}));
    }
    console.info(`[space-store] seeded ${seeds.length} demo Spaces`);
  } catch (error) {
    console.error("[space-store] failed to seed Spaces", error);
  }
}

async function readCatalog(): Promise<ManagedTeacherSpace[]> {
  await seedSpacesIfEmpty();
  const redis = getRedis();
  if (!redis) return seedCatalogEntries();

  try {
    const raw = await redis.get<string | ManagedTeacherSpace[]>(SPACES_CATALOG_KEY);
    if (raw == null) return seedCatalogEntries();
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!Array.isArray(parsed)) return seedCatalogEntries();
    const spaces = parsed
      .map((entry) => normalizeSpace(entry))
      .filter((entry): entry is ManagedTeacherSpace => Boolean(entry));
    return spaces.length > 0 ? spaces : seedCatalogEntries();
  } catch (error) {
    console.error("[space-store] failed to read catalog", error);
    return seedCatalogEntries();
  }
}

async function writeCatalog(spaces: ManagedTeacherSpace[]): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(SPACES_CATALOG_KEY, JSON.stringify(spaces));
      return true;
    } catch (error) {
      console.error("[space-store] redis catalog write failed, falling back to log", error);
    }
  }
  console.error(`[SPACE CATALOG] ${JSON.stringify(spaces)}`);
  return false;
}

export async function readAssignments(): Promise<SpaceAssignments> {
  await seedSpacesIfEmpty();
  const redis = getRedis();
  if (!redis) return {};

  try {
    const raw = await redis.get<string | SpaceAssignments>(SPACES_ASSIGNMENTS_KEY);
    if (raw == null) return {};
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return normalizeAssignments(parsed);
  } catch (error) {
    console.error("[space-store] failed to read assignments", error);
    return {};
  }
}

async function writeAssignments(assignments: SpaceAssignments): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(SPACES_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      return true;
    } catch (error) {
      console.error("[space-store] redis assignments write failed, falling back to log", error);
    }
  }
  console.error(`[SPACE ASSIGNMENTS] ${JSON.stringify(assignments)}`);
  return false;
}

export async function listSpaces(): Promise<ManagedTeacherSpace[]> {
  const spaces = await readCatalog();
  return [...spaces].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSpace(spaceId: string): Promise<ManagedTeacherSpace | null> {
  const spaces = await readCatalog();
  return spaces.find((space) => space.id === spaceId) ?? null;
}

export async function isKnownSpaceId(spaceId: string): Promise<boolean> {
  return Boolean(await getSpace(spaceId));
}

export async function teacherSpaceScopeLabelAsync(
  spaceFilter: string | null,
): Promise<string> {
  const spaces = await listSpaces();
  if (!spaceFilter || spaceFilter === "all") {
    if (spaces.length === 0) return "No Spaces yet";
    if (spaces.length === 1) return `Across ${spaces[0].name}`;
    return `Aggregated across ${spaces.map((space) => space.name).join(" and ")}`;
  }
  const space = spaces.find((entry) => entry.id === spaceFilter);
  return space ? `${space.name} only` : "All Spaces";
}

/** Effective Space id: assignment override layered on roster baseline. */
export async function getEffectiveSpaceId(studentId: string): Promise<string | null> {
  const base = getRosterStudent(studentId);
  if (!base) return null;
  const assignments = await readAssignments();
  if (Object.prototype.hasOwnProperty.call(assignments, studentId)) {
    return assignments[studentId] ?? null;
  }
  return base.spaceId;
}

export async function listStudentIdsForSpace(spaceId: string): Promise<string[]> {
  const assignments = await readAssignments();
  const ids: string[] = [];
  for (const student of ROSTER) {
    const assigned = Object.prototype.hasOwnProperty.call(assignments, student.id)
      ? assignments[student.id]
      : student.spaceId;
    if (assigned === spaceId) ids.push(student.id);
  }
  return ids;
}

export interface SpaceInput {
  name: string;
  description: string;
  shortName?: string;
  grade?: string;
  includedSkillIds: string[];
  difficultyMin: number;
  difficultyMax: number;
  classroomPacingMode: boolean;
  studentIds: string[];
}

export type SpaceWriteResult =
  | { ok: true; space: ManagedTeacherSpace }
  | { ok: false; error: string; status: number };

/**
 * Filter an AI co-author draft to real skill ids and a valid difficulty range.
 * Unknown skill ids are dropped — never silently accepted.
 */
export function sanitizeSpaceCoauthorDraft(raw: {
  skillIds?: unknown;
  difficultyMin?: unknown;
  difficultyMax?: unknown;
}): {
  includedSkillIds: string[];
  difficultyMin: number;
  difficultyMax: number;
} | null {
  const skillIds = Array.isArray(raw.skillIds)
    ? [
        ...new Set(
          raw.skillIds.filter(
            (id): id is string => typeof id === "string" && OVERVIEW_SKILL_IDS.includes(id),
          ),
        ),
      ]
    : [];
  if (skillIds.length === 0) return null;

  let difficultyMin =
    typeof raw.difficultyMin === "number" && Number.isFinite(raw.difficultyMin)
      ? Math.round(raw.difficultyMin)
      : DIFFICULTY_MIN;
  let difficultyMax =
    typeof raw.difficultyMax === "number" && Number.isFinite(raw.difficultyMax)
      ? Math.round(raw.difficultyMax)
      : DIFFICULTY_MAX;

  difficultyMin = Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, difficultyMin));
  difficultyMax = Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, difficultyMax));
  if (difficultyMin > difficultyMax) {
    const swap = difficultyMin;
    difficultyMin = difficultyMax;
    difficultyMax = swap;
  }

  return { includedSkillIds: skillIds, difficultyMin, difficultyMax };
}

function validateSpaceInput(input: SpaceInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (name.length > 80) return "Name must be at most 80 characters.";
  if (input.description.trim().length < 1) return "Description is required.";
  if (input.description.trim().length > 500) return "Description must be at most 500 characters.";
  if (!Array.isArray(input.includedSkillIds) || input.includedSkillIds.length === 0) {
    return "Select at least one skill.";
  }
  for (const skillId of input.includedSkillIds) {
    if (!OVERVIEW_SKILL_IDS.includes(skillId)) {
      return `Unknown skill: ${skillId}`;
    }
  }
  if (
    !Number.isInteger(input.difficultyMin) ||
    !Number.isInteger(input.difficultyMax) ||
    input.difficultyMin < DIFFICULTY_MIN ||
    input.difficultyMax > DIFFICULTY_MAX ||
    input.difficultyMin > input.difficultyMax
  ) {
    return `Difficulty must be integers from ${DIFFICULTY_MIN}–${DIFFICULTY_MAX} with min ≤ max.`;
  }
  for (const studentId of input.studentIds) {
    if (!getRosterStudent(studentId)) return `Unknown student: ${studentId}`;
  }
  return null;
}

function deriveShortName(name: string, explicit?: string): string {
  const trimmed = (explicit ?? "").trim();
  if (trimmed) return trimmed.slice(0, 24);
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 16);
  return words[words.length - 1].slice(0, 16);
}

async function applyEnrollments(spaceId: string, studentIds: string[]): Promise<void> {
  const assignments = await readAssignments();
  const selected = new Set(studentIds);

  for (const [studentId, assignedSpaceId] of Object.entries(assignments)) {
    if (assignedSpaceId === spaceId && !selected.has(studentId)) {
      delete assignments[studentId];
    }
  }
  for (const studentId of studentIds) {
    assignments[studentId] = spaceId;
  }
  await writeAssignments(assignments);
}

export async function createSpace(input: SpaceInput): Promise<SpaceWriteResult> {
  const error = validateSpaceInput(input);
  if (error) return { ok: false, error, status: 400 };

  const spaces = await readCatalog();
  const now = new Date().toISOString();
  const space: ManagedTeacherSpace = {
    id: `space_${randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    shortName: deriveShortName(input.name, input.shortName),
    description: input.description.trim(),
    grade: (input.grade ?? "Grade 8").trim() || "Grade 8",
    teacherId: DEMO_SESSION_STAFF_ID,
    includedSkillIds: [...new Set(input.includedSkillIds)],
    difficultyMin: input.difficultyMin,
    difficultyMax: input.difficultyMax,
    classroomPacingMode: Boolean(input.classroomPacingMode),
    createdAt: now,
    updatedAt: now,
  };

  await writeCatalog([...spaces, space]);
  await applyEnrollments(space.id, input.studentIds);
  return { ok: true, space };
}

export async function updateSpace(
  spaceId: string,
  input: SpaceInput,
): Promise<SpaceWriteResult> {
  const error = validateSpaceInput(input);
  if (error) return { ok: false, error, status: 400 };

  const spaces = await readCatalog();
  const index = spaces.findIndex((space) => space.id === spaceId);
  if (index < 0) return { ok: false, error: "Space not found", status: 404 };

  const existing = spaces[index];
  const updated: ManagedTeacherSpace = {
    ...existing,
    name: input.name.trim(),
    shortName: deriveShortName(input.name, input.shortName ?? existing.shortName),
    description: input.description.trim(),
    grade: (input.grade ?? existing.grade).trim() || existing.grade,
    includedSkillIds: [...new Set(input.includedSkillIds)],
    difficultyMin: input.difficultyMin,
    difficultyMax: input.difficultyMax,
    classroomPacingMode: Boolean(input.classroomPacingMode),
    updatedAt: new Date().toISOString(),
  };

  const next = [...spaces];
  next[index] = updated;
  await writeCatalog(next);
  await applyEnrollments(spaceId, input.studentIds);
  return { ok: true, space: updated };
}

/**
 * Remove a Space from the catalog and clear assignment overrides that pointed
 * at it so those students fall back to roster baseline.
 */
export async function deleteSpace(spaceId: string): Promise<SpaceWriteResult> {
  const spaces = await readCatalog();
  const existing = spaces.find((space) => space.id === spaceId);
  if (!existing) return { ok: false, error: "Space not found", status: 404 };

  await writeCatalog(spaces.filter((space) => space.id !== spaceId));

  const assignments = await readAssignments();
  let changed = false;
  for (const [studentId, assignedSpaceId] of Object.entries(assignments)) {
    if (assignedSpaceId === spaceId) {
      delete assignments[studentId];
      changed = true;
    }
  }
  if (changed) await writeAssignments(assignments);

  return { ok: true, space: existing };
}

/** One-shot purge for leftover manual-test Spaces with gibberish names. */
export async function purgeGibberishTestSpaces(options?: {
  namePattern?: RegExp;
}): Promise<{
  removed: ManagedTeacherSpace[];
  restoredStudentIds: string[];
}> {
  const pattern = options?.namePattern ?? /^jhfkgkjujn$/i;
  const spaces = await readCatalog();
  const targets = spaces.filter(
    (space) =>
      pattern.test(space.name.trim()) &&
      space.id !== "algebra_8a" &&
      space.id !== "remediation_8a",
  );
  const restoredStudentIds: string[] = [];

  for (const target of targets) {
    const assignments = await readAssignments();
    for (const [studentId, assignedSpaceId] of Object.entries(assignments)) {
      if (assignedSpaceId === target.id) restoredStudentIds.push(studentId);
    }
    await deleteSpace(target.id);
  }

  return { removed: targets, restoredStudentIds: [...new Set(restoredStudentIds)] };
}

export async function buildSpacesListPayload() {
  const spaces = await listSpaces();
  const withCounts = await Promise.all(
    spaces.map(async (space) => {
      const studentIds = await listStudentIdsForSpace(space.id);
      return {
        ...space,
        studentCount: studentIds.length,
        skillCount: space.includedSkillIds.length,
      };
    }),
  );
  const roster = await Promise.all(
    ROSTER.map(async (student) => ({
      id: student.id,
      fullName: student.fullName,
      baselineSpaceId: student.spaceId,
      effectiveSpaceId: (await getEffectiveSpaceId(student.id)) ?? student.spaceId,
    })),
  );
  return {
    spaces: withCounts,
    roster,
    skills: OVERVIEW_SKILL_COLUMNS.map((skill) => ({
      id: skill.id,
      name: skill.name,
      short: skill.short,
    })),
    refreshedAt: new Date().toISOString(),
  };
}
