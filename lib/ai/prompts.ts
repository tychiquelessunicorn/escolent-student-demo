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
import { buildMasteryOverview } from "@/lib/mastery-overview-store";
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
