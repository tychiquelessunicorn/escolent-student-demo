import { NextResponse } from "next/server";
import { MODEL_DEFAULT, complete } from "@/lib/ai/models";
import {
  ASK_LOOKUP_SYSTEM,
  SPACE_COAUTHOR_SYSTEM,
  WEEKLY_DIGEST_SYSTEM,
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

export const runtime = "nodejs";

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
