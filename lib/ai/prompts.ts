import {
  LENSES,
  NO_SOLUTION_PROBLEM,
  SCHEDULE_DAYS,
  SCHEDULE_ITEMS,
  TIER_STYLE,
  TODAY_SHORT_LABEL,
  TWO_STEP_PROBLEMS,
  VARIABLES_BOTH_SIDES_PROBLEMS,
  getDemoSpace,
  prerequisiteOf,
  type PracticeProblem,
} from "@/lib/demo-data";
import { OVERVIEW_SKILL_COLUMNS } from "@/lib/demo-data/overview-skills";
import { buildMasteryOverview } from "@/lib/mastery-overview-store";
import {
  buildTeacherBriefing,
  briefingAskGroundingLines,
} from "@/lib/briefing-store";
import {
  buildAdminAnalytics,
  adminAnalyticsAskGroundingLines,
  type AdminAnalyticsDateRangePreset,
} from "@/lib/admin-analytics-store";
import {
  buildAdminBriefing,
  adminBriefingAskGroundingLines,
} from "@/lib/admin-briefing-store";
import {
  buildAdminTodaySchedule,
  adminTodayAskGroundingLines,
} from "@/lib/admin-today-store";
import {
  adminBillingAskGroundingLines,
  getAdminBillingSnapshot,
} from "@/lib/admin-billing-store";
import {
  computeWeeklyDigestMetrics,
  weeklyDigestGroundingLines,
} from "@/lib/digest-store";
import {
  buildPedleadBriefing,
  pedleadBriefingAskGroundingLines,
} from "@/lib/pedlead-briefing-store";
import {
  buildTeacherTodaySchedule,
  teacherTodayAskGroundingLines,
} from "@/lib/teacher-today-store";

/**
 * Every prompt below is the prototype's prompt, moved server-side unchanged.
 * The grounding data is read from the shared demo-data module rather than
 * accepted from the client, so a caller cannot rewrite what the model is told
 * about Mia, the schedule, or the skill graph.
 */

export type SkillKey = "two_step" | "variables_both_sides";

export function problemsFor(skillKey: SkillKey): PracticeProblem[] {
  return skillKey === "variables_both_sides"
    ? VARIABLES_BOTH_SIDES_PROBLEMS
    : TWO_STEP_PROBLEMS;
}

function skillPhrase(skillKey: SkillKey): string {
  return skillKey === "variables_both_sides"
    ? "equation with variables on both sides"
    : "two-step equation";
}

/**
 * Requirement 34.2: bridge back to the prerequisite whenever it is anything
 * other than durable. Struggling, emerging, tentative and not-attempted all
 * qualify — only durable is excluded.
 */
function bridgingPrerequisite(skillId: string) {
  const prereq = prerequisiteOf(skillId);
  if (!prereq || prereq.tier === "durable") return null;
  return {
    name: prereq.name.toLowerCase(),
    tierLabel: TIER_STYLE[prereq.tier].label.toLowerCase(),
  };
}

export function introPrompt(): string {
  const problem = VARIABLES_BOTH_SIDES_PROBLEMS[0];
  const lens = LENSES.concrete_analogy;
  const prereq = bridgingPrerequisite("s5");

  const prereqClause = prereq
    ? ` Her direct prerequisite, ${prereq.name}, is currently rated "${prereq.tierLabel}" (not yet solid).`
    : "";
  const bridgeClause = prereq
    ? `, and (2) weaves in a short bridge reconnecting to ${prereq.name} specifically, since that prerequisite isn't solid yet. Integrate the bridge naturally into the same explanation — do not write a separate review section.`
    : ".";

  return `You are the platform's instruction engine, about to teach a grade 8 student "variables on both sides of an equation" for the very first time — she has never attempted this skill before.${prereqClause}

Explanation style for this introduction (a fixed platform Lens — follow it exactly): ${lens.styleInstruction}

Write a brief first-exposure instruction (3-5 sentences) that: (1) introduces the new idea — variables appearing on both sides of the equation — using that style${bridgeClause} Ground it in the actual upcoming problem: "${problem.text}". Grade-appropriate, warm, plain. Respond with ONLY the plain instruction text — no markdown, no headers, no labels, no emojis.`;
}

export function workedLensPrompt(problemIndex: number): string {
  const problem = VARIABLES_BOTH_SIDES_PROBLEMS[problemIndex];
  const lens = LENSES.procedural_steps;

  return `A grade 8 student just got her first attempt wrong on "${problem.text}" (correct answer x = ${problem.answer}) — the first time she's ever practiced "variables on both sides of an equation." She was introduced to this skill moments ago using a concrete/analogy explanation.

Re-explain how to solve THIS specific problem using a genuinely different style (a fixed platform Lens): ${lens.styleInstruction}

Ground it in the real steps for solving "${problem.text}". 3-5 sentences or short step lines, grade-appropriate and plain. End by inviting her to try again. Respond with ONLY the plain text — no markdown, no headers, no labels, no emojis.`;
}

export function hintPrompt(
  skillKey: SkillKey,
  problemIndex: number,
  wrongAnswers: number[],
): string {
  const problem = problemsFor(skillKey)[problemIndex];

  return `A grade 8 student is solving this ${skillPhrase(skillKey)} for x: "${problem.text}" (correct answer x = ${problem.answer}). Her wrong attempts so far: ${wrongAnswers.join(", ")}. Write ONE short Socratic-style hint (a guiding question, not the answer) responding to her likely mistake. 1-2 sentences, warm, plain, grade-appropriate. Respond with ONLY the plain sentence(s) of the hint itself — no markdown, no headers, no "#", no labels like "Hint:", no emojis.`;
}

/**
 * System turn for every student ask-box completion. The answer route never
 * receives a distress verdict — /api/distress is a separate call — but it
 * still sees the student's literal text. Without this, the default model
 * treats hopelessness language as something to counsel on. Only
 * DISTRESS_SCRIPTED_MESSAGE may acknowledge that anything was noticed.
 */
export const ASK_LOOKUP_SYSTEM = `You are a factual lookup over the data in the user message, not a counselor, friend, or trusted adult. Answer only from that data. If the input is not a question about that data, say plainly that nothing in the data matches; you may briefly name what is listed, then stop. Do not discuss feelings, offer reassurance, suggest talking to anyone, or comment on the wording of the input.`;

export function practiceAskPrompt(
  skillKey: SkillKey,
  problemIndex: number,
  question: string,
): string {
  const problem = problemsFor(skillKey)[problemIndex];

  return `A grade 8 student is working on this ${skillPhrase(skillKey)}: "${problem.text}" (correct answer x = ${problem.answer}). She asked: "${question}". Answer her question directly and briefly (2-3 sentences max), grade-appropriate and warm. Only state the final answer if she explicitly asked for it. Respond with ONLY the plain sentence(s) of your answer — no markdown, no headers, no "#", no labels, no emojis.`;
}

export function rubricGradePrompt(response: string): string {
  return `A grade 8 student was asked to solve this equation and explain her reasoning: "${NO_SOLUTION_PROBLEM.text}". This equation has NO SOLUTION: subtracting 2x from both sides leaves 3 = 7, a false statement, so no value of x works.

Grade her response against this rubric only:
- "strong": she correctly concludes there is no solution AND her explanation shows real reasoning (e.g. the x-terms cancel, leaving a false/contradictory statement like 3 = 7).
- "weak": she reaches the correct conclusion (no solution / can't be solved / etc.) but her explanation is missing, incorrect, or too vague to show she understands why.
- "incorrect": she does not reach the correct conclusion (e.g. states a numeric value for x, or says it has one solution).

Student's response: "${response}"

Respond with ONLY strict JSON, no markdown: {"tier": "strong"|"weak"|"incorrect", "feedback": "2-3 sentence warm, grade-appropriate feedback addressed directly to the student, referencing what she got right or should reconsider."}`;
}

export function todayAskPrompt(question: string): string {
  const dataLines = SCHEDULE_ITEMS.map((item) => {
    const day = SCHEDULE_DAYS.find((d) => d.key === item.day)!;
    const src =
      item.source === "escolent"
        ? "Escolent (adaptive practice)"
        : "Canvas (LMS, reference only)";
    return `- ${item.title} | subject: ${item.subjectLine} | day: ${day.label} (${day.dateLabel}) | ${item.dueMeta} | source: ${src}`;
  }).join("\n");

  return `You are answering a grade 8 student's question about her own schedule, using ONLY this real due-items data (today is ${TODAY_SHORT_LABEL}):\n${dataLines}\n\nHer question: "${question}"\n\nAnswer directly and briefly (1-3 sentences), grounded only in the data above. If nothing matches, say so plainly rather than inventing anything. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export function learnAskPrompt(question: string, spaceId?: string): string {
  const space = getDemoSpace(spaceId ?? "math");
  const skillLines = space.skills
    .map((sk) => `- ${sk.name}: ${TIER_STYLE[sk.tier].label}`)
    .join("\n");

  return `You are answering a grade 8 student's question in the "Learn" area of her "${space.name}" Space (${space.subject}), using ONLY this real skill list. She is only tracked on this Space — nothing outside it (a different subject entirely) is tracked here.\n\nSkills in this Space:\n${skillLines}\n\nHer question: "${question}"\n\nTwo rules, both important:\n1. If the question is about a different subject entirely (not part of this Space), say plainly that it's outside what's tracked in this Space, rather than answering it.\n2. If she is directly asking for the final answer to a specific problem (e.g. "what's the answer to 3x + 5 = 20") rather than asking to understand something, do NOT give the numeric answer. Instead, ask her to share her own thinking or work so far on that problem, so you can help her from there.\n\nOtherwise, answer directly and briefly (1-3 sentences), grounded only in the skills above. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export function progressAskPrompt(question: string, spaceId?: string): string {
  const space = getDemoSpace(spaceId ?? "math");
  const skillLines = space.skills
    .map(
      (sk) =>
        `- ${sk.name}: ${TIER_STYLE[sk.tier].label}${sk.flagged ? " (flagged prerequisite gap)" : ""}`,
    )
    .join("\n");
  const sessionLines = space.recentSessions
    .map((s) => `- ${s.date}: ${s.title} — ${s.result}`)
    .join("\n");

  return `You are answering a grade 8 student's question about her own progress in the "${space.name}" Space (${space.subject}), using ONLY this real data. She is only tracked on this Space — nothing outside it is tracked or assessed here.\n\nSkills tracked:\n${skillLines}\n\nRecent sessions:\n${sessionLines}\n\nHer question: "${question}"\n\nAnswer directly and briefly (1-3 sentences), grounded only in the data above. If she asks about something not in this list, say plainly that it isn't part of what's being tracked here, rather than inventing an answer. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function overviewAskPrompt(question: string, spaceFilter: string | null): Promise<string> {
  const overview = await buildMasteryOverview(spaceFilter);
  const studentLines = overview.students
    .map((student) => {
      const cells = student.cells
        .map(
          (cell) =>
            `${cell.skillShort}=${cell.label}(${cell.fillPct}%)${cell.isGap ? " [prerequisite gap]" : ""}${cell.isOverride ? " [teacher override]" : ""}`,
        )
        .join(", ");
      const misc =
        student.misconceptions.length > 0
          ? ` | misconceptions: ${student.misconceptions.map((m) => m.label).join("; ")}`
          : "";
      return `- ${student.fullName} (${student.spaceShort}): ${cells}${misc}`;
    })
    .join("\n");
  const gapLines = overview.gapAlerts
    .map((gap) => `- ${gap.studentName}: ${gap.skillName}`)
    .join("\n");
  const miscLines = overview.misconceptions
    .map((m) => `- ${m.label} (${m.studentCount} students)`)
    .join("\n");

  return `You are answering a teacher's question about her Mastery Overview grid, using ONLY this real per-student, per-skill data. Percentages map approximate mastery depth: Durable=92%, Tentative=72%, Emerging=48%, Struggling=25%, Not attempted=0%.\n\nScope: ${overview.scopeLabel}\n\nStudents:\n${studentLines}\n\nPrerequisite gap alerts:\n${gapLines || "- none"}\n\nMisconceptions this week:\n${miscLines || "- none"}\n\nHer question: "${question}"\n\nAnswer directly using real student names from the data above. If she asks about a threshold like "below 60%", use the percentages given. If nothing matches, say so plainly rather than inventing anything. Keep it to a few sentences or a short plain list of names. Respond with ONLY the plain answer — no markdown, no labels, no emojis.`;
}

export async function teacherTodayAskPrompt(
  question: string,
  spaceFilter: string | null,
): Promise<string> {
  const schedule = await buildTeacherTodaySchedule({ spaceFilter });
  const dataLines = teacherTodayAskGroundingLines(schedule).join("\n");

  return `You are answering a teacher's question about what's due across her Spaces, using ONLY this real due-items data (today is ${schedule.todayShortLabel}).\n\nScope: ${schedule.scopeLabel}\n\nDue items:\n${dataLines || "- none listed"}\n\nHer question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the data above. If she asks about a Space like Remediation or Algebra, filter to those items. If nothing matches, say so plainly rather than inventing anything. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function teacherBriefingAskPrompt(
  question: string,
  spaceFilter: string | null,
): Promise<string> {
  const briefing = await buildTeacherBriefing({ spaceFilter, demoState: "auto" });
  const dataLines = briefingAskGroundingLines(briefing).join("\n");

  return `You are answering a teacher's question about her Daily Briefing, using ONLY these real synthesized briefing items for the current scope. Do not invent reasons, student situations, or flags that are not listed.\n\nScope: ${briefing.scopeLabel}\nBriefing state: ${briefing.state}\n\nBriefing items:\n${dataLines || "- none listed"}\n\nHer question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the items above. If she asks why a student is flagged, use only items that name that student. If nothing matches, say so plainly rather than inventing an explanation. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function adminAnalyticsAskPrompt(
  question: string,
  dateRange: AdminAnalyticsDateRangePreset,
): Promise<string> {
  const analytics = await buildAdminAnalytics({ dateRange });
  const dataLines = adminAnalyticsAskGroundingLines(analytics).join("\n");

  return `You are answering an Admin's question about school-wide pilot analytics, using ONLY these real computed metrics. Do not invent adoption numbers, mastery counts, student names, or trends absent from the data.\n\nMetrics:\n${dataLines}\n\nTheir question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the metrics above. If they ask about a teacher, class, or metric not present in the data, say plainly that the data does not include it. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function adminBillingAskPrompt(question: string): Promise<string> {
  const billing = await getAdminBillingSnapshot();
  const dataLines = adminBillingAskGroundingLines(billing).join("\n");

  return `You are answering an Admin's question about the school's Escolent subscription billing, using ONLY these real billing fields. Do not invent plan prices, seat counts, renewal dates, or dollar amounts absent from the data. If they ask to change the plan, say plainly that plan changes must use the structured form on the Billing page — you cannot change plans from this ask box.\n\nBilling data:\n${dataLines}\n\nTheir question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the billing data above. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function adminBriefingAskPrompt(question: string): Promise<string> {
  const briefing = await buildAdminBriefing({ demoState: "auto" });
  const dataLines = adminBriefingAskGroundingLines(briefing).join("\n");

  return `You are answering an Admin's question about the Daily Briefing, using ONLY these real synthesized briefing items. Do not invent escalations, data requests, rollout gaps, or billing signals absent from the data.\n\nScope: ${briefing.scopeLabel}\nBriefing state: ${briefing.state}\n\nBriefing items:\n${dataLines || "- none listed"}\n\nTheir question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the items above. If nothing matches, say so plainly rather than inventing anything. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function adminTodayAskPrompt(
  question: string,
  view: "today" | "week",
): Promise<string> {
  const schedule = await buildAdminTodaySchedule();
  const dataLines = adminTodayAskGroundingLines(schedule).join("\n");
  const viewNote =
    view === "week"
      ? schedule.weekNote
      : `Today is ${schedule.todayShortLabel}.`;

  return `You are answering an Admin's question about the school-wide backlog (${view} view), using ONLY this real backlog data. Do not invent compliance deadlines, billing events, or curation counts absent from the data.\n\nScope: ${schedule.scopeLabel}\n${viewNote}\n\nBacklog items:\n${dataLines || "- none listed"}\n\nTheir question: "${question}"\n\nAnswer directly and briefly (1-4 sentences), grounded only in the data above. If nothing matches, say so plainly rather than inventing anything. Respond with ONLY the plain sentence(s) — no markdown, no labels, no emojis.`;
}

export async function pedleadBriefingAskPrompt(
  question: string,
  tenantFilter: string | null,
): Promise<string> {
  const briefing = await buildPedleadBriefing({ tenantFilter, demoState: "auto" });
  const dataLines = pedleadBriefingAskGroundingLines(briefing).join("\n");

  return `You are answering a Pedagogical Lead's question about the synthesized Content Briefing (Requirement 31a). This role has cross-tenant read/write access to Skill Graphs and Misconception Taxonomies only (Requirement 21.5). Zero access to individual student, teacher, or operational roster data.

Scope: ${briefing.scopeLabel}
Briefing state: ${briefing.state}
Review aging policy target: ${briefing.agingThresholdBusinessDays} business days

Briefing items:
${dataLines || "- none listed"}

Their question: "${question}"

Rules:
1. Answer directly and concisely (1-4 sentences), grounded ONLY in the content items above.
2. Never invent school rankings, teacher names, or student data.
3. For cross-tenant patterns, reference the count of affected schools and the misconception name, never individual school comparisons.
4. Respond with ONLY the plain sentence(s) — no markdown headers, no labels, no emojis.`;
}

/**
 * Req 14a.1 — plain language → draft invite/role/deactivate fields only.
 * Data-deletion routing is handled before this prompt runs (parseDeletionIntent).
 */
export const ADMIN_USER_COMMAND_SYSTEM = `You draft structured user-management actions from plain language for a school admin on a Users & Roles screen. Respond with ONLY strict JSON — no markdown, no prose. Never handle student data deletion here.`;

export function adminUserCommandPrompt(text: string, rosterLines: string): string {
  return `Classify this admin request into one action and extract fields.

Known staff (for role_change or deactivate — match names only from this list):
${rosterLines}

Actions:
- invite: inviting a NEW person not already in the list (needs fullName; email if given; role teacher or admin; optional gradeLabel like "Grade 8")
- role_change: change an EXISTING listed person's role (needs resolvable fullName from list; newRole teacher or admin)
- deactivate: deactivate an EXISTING listed person's login access (needs resolvable fullName)
- unclear: read-only questions, missing critical details, or ambiguous intent

If the person is already in the known staff list, do NOT classify as invite.

Return ONLY strict JSON:
{"action":"invite"|"role_change"|"deactivate"|"unclear","fullName":string|null,"email":string|null,"role":"teacher"|"admin"|null,"newRole":"teacher"|"admin"|null,"gradeLabel":string|null,"clarificationNeeded":string|null}

Request: "${text.replace(/"/g, '\\"')}"`;
}

/**
 * Req 12 — weekly digest body. Delivery is a labeled preview; this prompt
 * produces real prose from computed metrics (never a fill-in template).
 */
export const WEEKLY_DIGEST_SYSTEM = `You write a warm, professional weekly email digest for a grade-8 math teacher summarizing progress across her Spaces. Use ONLY the metrics in the user message. Never invent a statistic, student name, misconception, Space name, or detail that is not present. If a count is zero, say so plainly rather than padding. Respond with ONLY the email body prose — no subject line, no markdown headings, no labels, no emojis.`;

export async function weeklyDigestPrompt(): Promise<string> {
  const metrics = await computeWeeklyDigestMetrics();
  const dataLines = weeklyDigestGroundingLines(metrics).join("\n");

  return `Write this week's Teacher digest email body from ONLY the grounding data below.

Grounding data:
${dataLines}

Requirements:
- Warm, professional prose a teacher would want to skim on Friday afternoon
- Cover durable mastery this week, flagged prerequisite gaps, and the most common misconceptions
- Name Spaces from the list when relevant
- You may name students only when they appear in the grounding data
- Do not invent numbers, names, or details absent above
- 2–4 short paragraphs, plain sentences only`;
}

/**
 * Req 9.8 / 31-style co-authoring: plain language → draft skill ids + difficulty
 * only. Name and description stay manual. Grounded on OVERVIEW_SKILL_COLUMNS.
 */
export const SPACE_COAUTHOR_SYSTEM = `You help a teacher draft Space skill boundaries and difficulty from a plain-language description. Suggest only from the skill list in the user message. Never invent skill ids. Respond with ONLY strict JSON — no markdown, no prose.`;

export function spaceCoauthorPrompt(description: string): string {
  const skillLines = OVERVIEW_SKILL_COLUMNS.map(
    (skill) => `- ${skill.id}: ${skill.name}`,
  ).join("\n");

  return `A grade-8 math teacher is creating a practice Space. From her description, suggest which skills from this list to include and a difficulty range (integers 1–5, min ≤ max).

Available skills (use only these ids):
${skillLines}

Her description: "${description.replace(/"/g, '\\"')}"

Respond with ONLY strict JSON:
{"skillIds":["s0","s1"],"difficultyMin":1,"difficultyMax":3}

Rules:
- skillIds must be a non-empty subset of the ids listed above
- difficultyMin and difficultyMax are integers from 1 to 5 with min ≤ max
- Do not suggest a name or description
- Do not invent skills outside the list`;
}

export const CONTENT_AUTHORING_SYSTEM = `You are a curriculum design specialist generating a draft Skill Graph and Misconception Taxonomy for middle school education from a plain-language unit description (Requirement 31.4).
Generate 3 to 5 coherent skills in a DAG progression (earlier foundational skills are listed as prerequisiteSkillIds for later synthesis skills).
Include both exact_match skills (for direct factual/computational questions) and rubric-evaluated skills (for conceptual short-answer scientific explanations, Req 31.1, 31.10).
Include 2 to 4 realistic student misconceptions with concrete sample incorrect answers and remediation advice.
Respond with ONLY valid, strict JSON — no markdown code fences, no extra prose.`;

export function contentAuthoringDraftPrompt(description: string): string {
  return `Generate a complete draft curriculum unit from this description:
"${description.replace(/"/g, '\\"')}"

Return ONLY strict JSON adhering to this exact schema:
{
  "unitName": "Short unit title (e.g. Ecosystems & Energy Flow)",
  "subject": "Subject and grade level (e.g. Life Science (Grade 7))",
  "description": "1-2 sentence unit summary",
  "skills": [
    {
      "id": "snake_case_id",
      "slug": "kebab-case-slug",
      "name": "Skill Name",
      "description": "Clear pedagogical learning outcome",
      "evaluationStrategy": "exact_match" or "rubric",
      "difficulty": 1 to 5,
      "prerequisiteSkillIds": ["id_of_earlier_skill"],
      "exactMatchSpec": {
        "canonicalAnswers": ["answer1"],
        "acceptedVariations": ["var1", "var2"]
      },
      "rubric": {
        "title": "Rubric Task Title",
        "prompt": "Specific short-answer question prompt",
        "sampleExemplar": "Ideal model student answer",
        "levels": [
          { "score": 3, "label": "Proficient (3 pts)", "description": "Criteria for full credit" },
          { "score": 2, "label": "Approaching (2 pts)", "description": "Partial understanding criteria" },
          { "score": 1, "label": "Developing (1 pt)", "description": "Minimal understanding criteria" },
          { "score": 0, "label": "Incorrect (0 pts)", "description": "Misconception or off-target criteria" }
        ]
      }
    }
  ],
  "misconceptions": [
    {
      "id": "misc_snake_case_id",
      "name": "Misconception Name",
      "targetSkillIds": ["matching_skill_id"],
      "description": "Why students form this flawed intuition",
      "sampleIncorrectAnswer": "Quotable example of student response",
      "remediationGuidance": "How a teacher or automated prompt corrects it"
    }
  ]
}`;
}

/**
 * Calibrated deliberately against ordinary academic frustration: "this is hard"
 * must not trigger, genuine hopelessness or isolation language must. Requirement
 * 18.4 says err toward over-triggering, which the uncertainty clause encodes.
 */
export function distressPrompt(text: string): string {
  return `You are a safety classifier watching a free-text field a grade 8 student types into while doing math practice. Decide whether the text suggests the student may be in genuine emotional distress — hopelessness, isolation, "what's the point" thinking, not wanting to talk about something, or similar — as opposed to ordinary academic frustration with the schoolwork itself (e.g. "I hate this", "this is so hard", "I'll never get this", "ugh"), which should NOT count.

If you are genuinely uncertain whether it's distress or just frustration, lean toward flagging it as distress.

Text: "${text}"

Respond with ONLY strict JSON, no markdown, no prose: {"distress": true or false}`;
}

/** Strips the markdown the models are told not to emit but occasionally do. */
export function sanitizeAiText(text: string): string {
  let t = (text || "").trim();
  t = t.replace(/^#{1,6}\s*.*\n+/, "");
  t = t.replace(/^(hint|answer|response)\s*:\s*/i, "");
  t = t.replace(/\*\*/g, "");
  return t.trim();
}
