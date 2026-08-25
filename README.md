# Escolent — Student demo

A deployed version of the four confirmed Claude Design Student screens: Practice
Session, Today / Week, Learn, and Progress, plus the global nav shell.

The reference implementation lives in `cursor-handoff/claude-design-source/`.
That prototype's logic, copy, and visual design are load-bearing and were ported
rather than reinterpreted. The one thing that fundamentally changed is
transport: every `window.claude.complete()` call now goes through a server-side
Anthropic proxy.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm run dev
```

Without `DEMO_PASSWORD` the access gate is off, which is what you want locally.
Without Upstash credentials `/api/ai` still works in development but logs a
warning; in production it refuses traffic rather than running unmetered.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Redirects to `/practice` — Requirement 7.1's no-menu Entry |
| `/practice` | Practice Session |
| `/student/today`, `/student/week` | Today / Week |
| `/student/learn` | Learn / Course Map |
| `/student/progress` | Progress |
| `/gate` | Shared-password gate |

## Demo controls

Query params drive every harness variant, so any state is linkable. The control
panel that writes them opens with `?demo=1` or <kbd>Ctrl/Cmd</kbd> +
<kbd>Shift</kbd> + <kbd>E</kbd>, and is absent from the DOM otherwise.

| Param | Values |
| --- | --- |
| `entryVariant` | `first_exposure` (default), `returning`, `first_time`, `nothing_due` |
| `connectivityDemo` | `auto` (default), `fresh`, `stale`, `syncing`, `unavailable` |
| `interruptionDemo` | `none` (default), `recent`, `expired` |
| `directOpenDemo` | `not_applicable` (default), `valid_session`, `no_valid_session` |
| `problemDemo` | `standard` (default), `no_solution_rubric` |
| `notificationPreviewDemo` | `not_applicable` (default), `shown` |
| `aiHintsEnabled` | `true` (default), `false` |
| `skill` | Any skill slug, e.g. `two_step`, `variables_both_sides` |

## Distress detection

The single most safety-critical path in the product. Three properties the code
is arranged to guarantee:

- **Never rate limited.** `/api/distress` is exempt. A spend valve caps model
  cost past a high per-IP threshold by skipping classification and taking the
  fail-open path, which is indistinguishable to the student.
- **Fails open.** Any classifier failure — error, timeout, unparseable output,
  or the valve — takes the identical path to a confirmed positive.
- **Detection and record creation are inseparable.** They are one server call.
  `escalated: true` is returned only after a record is durably written: Redis
  first, a structured `[ESCALATION RECORD]` server log as the guaranteed
  fallback. A student is never told help is coming without a reviewable record.

The scripted message is a constant in `lib/distress.ts`, rendered client-side.
The API returns a boolean and nothing else, so there is no transport by which
model output could reach that text.

`GET /api/distress` reads back recent records. No Teacher screen exists this
phase, so that endpoint is how a record is actually reviewable.

## Architecture notes

- `lib/demo-data/` is the one shared source of baseline data — skill states, the
  schedule, session history, practice content. Transient per-interaction state
  stays local to the screen that owns it and must not be lifted in here.
- `lib/ai/prompts.ts` holds all nine prompts. Grounding data is read from the
  shared demo-data module rather than accepted from the client, so a caller
  cannot rewrite what the model is told.
- Design tokens are extracted from `Foundation.dc.html` into the Tailwind v4
  `@theme` block in `app/globals.css`, including deliberate omissions (see the
  comment at the top of that file).

## Deploying

1. Push to a Git remote and import the project in Vercel.
2. Set `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`, and `DEMO_PASSWORD` for Production.
3. Set a spend cap in the Anthropic console. The per-IP rate limit and the
   distress spend valve are the in-app guards; the console cap is the backstop.
4. Point `demo.escolent.com` at Vercel with the CNAME it issues.
