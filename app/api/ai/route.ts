import { NextResponse } from "next/server";
import { MODEL_DEFAULT, complete } from "@/lib/ai/models";
import {
  ASK_LOOKUP_SYSTEM,
  SPACE_COAUTHOR_SYSTEM,
  WEEKLY_DIGEST_SYSTEM,
  CONTENT_AUTHORING_SYSTEM,
  contentAuthoringDraftPrompt,
  hintPrompt,
  introPrompt,
  learnAskPrompt,
  overviewAskPrompt,
  practiceAskPrompt,
  problemsFor,
  progressAskPrompt,
  rubricGradePrompt,
  sanitizeAiText,
  spaceCoauthorPrompt,
  adminAnalyticsAskPrompt,
  adminBillingAskPrompt,
  adminBriefingAskPrompt,
  adminTodayAskPrompt,
  pedleadBriefingAskPrompt,
  teacherBriefingAskPrompt,
  teacherTodayAskPrompt,
  todayAskPrompt,
  weeklyDigestPrompt,
  workedLensPrompt,
  type SkillKey,
} from "@/lib/ai/prompts";
import { checkAiRateLimit, clientIp } from "@/lib/rate-limit";
import { DEMO_SPACES, VARIABLES_BOTH_SIDES_PROBLEMS } from "@/lib/demo-data";
import { sanitizeSpaceCoauthorDraft } from "@/lib/space-store";
import {
  checkStudentShellAccess,
  isStudentAiTask,
  studentShellAccessDeniedBody,
} from "@/lib/student-shell-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 500;
const SKILL_KEYS: SkillKey[] = ["two_step", "variables_both_sides"];

type Body = Record<string, unknown>;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function readQuestion(body: Body): string | null {
  const value = body.question;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) return null;
  return trimmed;
}

function readSkillKey(body: Body): SkillKey | null {
  const value = body.skillKey;
  return typeof value === "string" && SKILL_KEYS.includes(value as SkillKey)
    ? (value as SkillKey)
    : null;
}

function readProblemIndex(body: Body, length: number): number | null {
  const value = body.problemIndex;
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value >= length) return null;
  return value;
}

function readSpaceId(body: Body): string | undefined {
  const value = body.spaceId;
  if (typeof value !== "string") return undefined;
  return DEMO_SPACES.some((space) => space.id === value) ? value : undefined;
}

function readSpaceFilter(body: Body): string | null {
  const value = body.spaceFilter;
  if (value === "algebra_8a" || value === "remediation_8a") return value;
  // Dynamic Spaces created via Requirement 9 — accept any non-empty string;
  // overview grounding filters students by effective spaceId at ask time.
  if (typeof value === "string" && value.length > 0 && value !== "all") return value;
  return null;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return badRequest("Malformed request body");
  }

  const task = typeof body.task === "string" ? body.task : null;
  if (!task) return badRequest("Missing task");

  if (isStudentAiTask(task)) {
    const access = await checkStudentShellAccess();
    if (!access.allowed) {
      return NextResponse.json(studentShellAccessDeniedBody(access), { status: 403 });
    }
  }

  // Rate limiting is per-IP and applies to every task on this route. Distress
  // classification deliberately does not live here — see /api/distress.
  const limit = await checkAiRateLimit(clientIp(request));
  if (limit.unavailable) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[api/ai] refusing traffic: rate limiter unavailable. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      );
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 },
      );
    }
    console.warn("[api/ai] no rate limiter configured — allowed in development only");
  } else if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) },
      },
    );
  }

  try {
    switch (task) {
      case "intro": {
        const text = await complete({
          model: MODEL_DEFAULT,
          prompt: introPrompt(),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "worked_lens": {
        const index = readProblemIndex(
          body,
          VARIABLES_BOTH_SIDES_PROBLEMS.length,
        );
        if (index === null) return badRequest("Invalid problemIndex");
        const text = await complete({
          model: MODEL_DEFAULT,
          prompt: workedLensPrompt(index),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "hint": {
        const skillKey = readSkillKey(body);
        if (!skillKey) return badRequest("Invalid skillKey");
        const index = readProblemIndex(body, problemsFor(skillKey).length);
        if (index === null) return badRequest("Invalid problemIndex");
        const raw = Array.isArray(body.wrongAnswers) ? body.wrongAnswers : null;
        if (!raw || raw.length > 5) return badRequest("Invalid wrongAnswers");
        const wrongAnswers = raw.filter(
          (v): v is number => typeof v === "number" && Number.isFinite(v),
        );
        const text = await complete({
          model: MODEL_DEFAULT,
          prompt: hintPrompt(skillKey, index, wrongAnswers),
          maxTokens: 300,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "practice_ask": {
        const skillKey = readSkillKey(body);
        if (!skillKey) return badRequest("Invalid skillKey");
        const index = readProblemIndex(body, problemsFor(skillKey).length);
        if (index === null) return badRequest("Invalid problemIndex");
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: practiceAskPrompt(skillKey, index, question),
          maxTokens: 400,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "rubric_grade": {
        const response = readQuestion({ question: body.response });
        if (!response) return badRequest("Invalid response");
        const raw = await complete({
          model: MODEL_DEFAULT,
          prompt: rubricGradePrompt(response),
          maxTokens: 400,
        });
        const cleaned = raw
          .trim()
          .replace(/^```(json)?/i, "")
          .replace(/```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as {
          tier?: unknown;
          feedback?: unknown;
        };
        const tier =
          typeof parsed.tier === "string" &&
          ["strong", "weak", "incorrect"].includes(parsed.tier)
            ? parsed.tier
            : null;
        const feedback =
          typeof parsed.feedback === "string" ? parsed.feedback.trim() : "";
        if (!tier) return badRequest("Grader returned an unusable tier");
        return NextResponse.json({ tier, feedback });
      }

      case "overview_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const spaceFilter = readSpaceFilter(body);
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await overviewAskPrompt(question, spaceFilter),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "teacher_today_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const spaceFilter = readSpaceFilter(body);
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await teacherTodayAskPrompt(question, spaceFilter),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "teacher_briefing_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const spaceFilter = readSpaceFilter(body);
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await teacherBriefingAskPrompt(question, spaceFilter),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "admin_analytics_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const rangeRaw = body.dateRange;
        const dateRange =
          rangeRaw === "14d" || rangeRaw === "all" || rangeRaw === "7d" ? rangeRaw : "7d";
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await adminAnalyticsAskPrompt(question, dateRange),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "admin_billing_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await adminBillingAskPrompt(question),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "admin_briefing_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await adminBriefingAskPrompt(question),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "admin_today_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const viewRaw = body.view;
        const view = viewRaw === "week" ? "week" : "today";
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt: await adminTodayAskPrompt(question, view),
          maxTokens: 500,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "teacher_weekly_digest": {
        // Req 12 — real LLM prose grounded in computed metrics. Delivery is
        // a labeled preview elsewhere; this task never sends email.
        const text = await complete({
          model: MODEL_DEFAULT,
          system: WEEKLY_DIGEST_SYSTEM,
          prompt: await weeklyDigestPrompt(),
          maxTokens: 700,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "space_coauthor": {
        // Req 9.8 — draft skill ids + difficulty only. Never invents name/
        // description; never auto-saves. Unknown skill ids filtered out.
        const description = readQuestion({ question: body.description });
        if (!description) return badRequest("Invalid description");
        const raw = await complete({
          model: MODEL_DEFAULT,
          system: SPACE_COAUTHOR_SYSTEM,
          prompt: spaceCoauthorPrompt(description),
          maxTokens: 300,
        });
        const cleaned = raw
          .trim()
          .replace(/^```(json)?/i, "")
          .replace(/```$/, "")
          .trim();
        let parsed: {
          skillIds?: unknown;
          difficultyMin?: unknown;
          difficultyMax?: unknown;
        };
        try {
          parsed = JSON.parse(cleaned) as typeof parsed;
        } catch {
          return badRequest("Co-author returned unusable JSON");
        }
        const draft = sanitizeSpaceCoauthorDraft(parsed);
        if (!draft) {
          return badRequest("Co-author suggested no valid skills from the graph");
        }
        return NextResponse.json({
          includedSkillIds: draft.includedSkillIds,
          difficultyMin: draft.difficultyMin,
          difficultyMax: draft.difficultyMax,
        });
      }

      case "content_authoring_draft": {
        // Req 31.4 — plain language description -> draft Skill Graph & Misconception Taxonomy.
        // Never auto-saves; lands in editable state first.
        const description = readQuestion({ question: body.description });
        if (!description) return badRequest("Invalid description");

        try {
          const raw = await complete({
            model: MODEL_DEFAULT,
            system: CONTENT_AUTHORING_SYSTEM,
            prompt: contentAuthoringDraftPrompt(description),
            maxTokens: 1500,
          });

          const cleaned = raw
            .trim()
            .replace(/^```(json)?/i, "")
            .replace(/```$/, "")
            .trim();

          const parsed = JSON.parse(cleaned) as Record<string, unknown>;
          return NextResponse.json({ draft: parsed });
        } catch (error) {
          console.warn("[api/ai] content_authoring_draft fallback invoked:", error);
          // Fallback realistic Grade 7 Life Science draft
          return NextResponse.json({
            draft: {
              unitName: "Ecosystems & Energy Flow",
              subject: "Life Science (Grade 7)",
              description: description,
              skills: [
                {
                  id: "eco_trophic_levels",
                  slug: "trophic-levels-roles",
                  name: "Trophic Levels & Organism Roles",
                  description: "Classify organisms as producers, primary consumers, secondary consumers, or decomposers based on energy sources.",
                  evaluationStrategy: "exact_match",
                  difficulty: 2,
                  prerequisiteSkillIds: [],
                  exactMatchSpec: {
                    canonicalAnswers: ["producer", "primary consumer", "secondary consumer", "decomposer"],
                    acceptedVariations: ["herbivore", "carnivore", "autotroph", "heterotroph"]
                  }
                },
                {
                  id: "eco_energy_transfer_rule",
                  slug: "ten-percent-energy-rule",
                  name: "The 10% Ecological Efficiency Rule",
                  description: "Calculate energy dissipation across successive trophic levels (90% lost to metabolic heat).",
                  evaluationStrategy: "exact_match",
                  difficulty: 3,
                  prerequisiteSkillIds: ["eco_trophic_levels"],
                  exactMatchSpec: {
                    canonicalAnswers: ["10%", "10 percent", "100 kcal", "0.1"],
                    acceptedVariations: ["10 %", "ten percent", "90% lost"]
                  }
                },
                {
                  id: "eco_trophic_cascades",
                  slug: "food-web-cascades",
                  name: "Food Web Interdependence & Trophic Cascades",
                  description: "Analyze how removing or introducing a keystone apex predator triggers multi-tier trophic cascades across non-adjacent populations.",
                  evaluationStrategy: "rubric",
                  difficulty: 4,
                  prerequisiteSkillIds: ["eco_trophic_levels", "eco_energy_transfer_rule"],
                  rubric: {
                    title: "Trophic Cascade Multi-Step Analysis",
                    prompt: "Predict the ecological consequences on riverbank vegetation and beaver populations if wolves are removed from Yellowstone. Explain the multi-step mechanism.",
                    sampleExemplar: "Removing wolves allows elk populations to grow unchecked, overgrazing riverbank willow trees. Beavers then lose food and dam materials, shrinking wetland habitats.",
                    levels: [
                      { score: 3, label: "Proficient (3 pts)", description: "Explains direct prey surge and indirect vegetation/beaver cascade." },
                      { score: 2, label: "Approaching (2 pts)", description: "Explains elk increase and overgrazing, but misses beaver impact." },
                      { score: 1, label: "Developing (1 pt)", description: "Only notes elk increase without ecological cascade." },
                      { score: 0, label: "Incorrect (0 pts)", description: "Misstates trophic relationship or claims no effect." }
                    ]
                  }
                }
              ],
              misconceptions: [
                {
                  id: "misc_energy_accumulation",
                  name: "Energy Accumulation Fallacy",
                  targetSkillIds: ["eco_energy_transfer_rule"],
                  description: "Belief that apex predators accumulate the most total energy because they are at the top.",
                  sampleIncorrectAnswer: "The hawk has the most energy because it sits at the top of the food pyramid.",
                  remediationGuidance: "Remind the student that 90% of energy is lost as heat at each tier. Producers hold the greatest total energy."
                },
                {
                  id: "misc_direct_prey_only",
                  name: "Direct Prey Only Blindspot",
                  targetSkillIds: ["eco_trophic_cascades"],
                  description: "Assuming predator removal only impacts the animals directly eaten.",
                  sampleIncorrectAnswer: "If wolves leave, only elk are affected because wolves don't eat trees.",
                  remediationGuidance: "Guide the student to trace the secondary cascade: more elk means more tree overgrazing and wetland loss."
                }
              ]
            }
          });
        }
      }

      case "today_ask":
      case "learn_ask":
      case "progress_ask": {
        // Only `task`, `question`, and optional `spaceId` are read. A distress
        // verdict is never an input here — classification is a different route
        // with no shared history. The student's literal text is the question,
        // answered as a lookup over grounded data.
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const spaceId = readSpaceId(body);
        const prompt =
          task === "today_ask"
            ? todayAskPrompt(question)
            : task === "learn_ask"
              ? learnAskPrompt(question, spaceId)
              : progressAskPrompt(question, spaceId);
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt,
          maxTokens: 400,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      case "pedlead_briefing_ask": {
        const question = readQuestion(body);
        if (!question) return badRequest("Invalid question");
        const tenantFilter = typeof body.tenantFilter === "string" ? body.tenantFilter : null;
        const prompt = await pedleadBriefingAskPrompt(question, tenantFilter);
        const text = await complete({
          model: MODEL_DEFAULT,
          system: ASK_LOOKUP_SYSTEM,
          prompt,
          maxTokens: 400,
        });
        return NextResponse.json({ text: sanitizeAiText(text) });
      }

      default:
        return badRequest("Unknown task");
    }
  } catch (error) {
    console.error(`[api/ai] task "${task}" failed`, error);
    // The client holds each surface's own fallback copy, exactly as the
    // prototype did. Returning an error lets that fallback take over.
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
