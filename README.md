# Escolent — Student demo

**Canonical investor / school demo:** the deployed Next.js app on Vercel  
(`escolent-student-demo.vercel.app`). That is the single coherent Student shell.

`cursor-handoff/claude-design-source/` is an **archived Claude Design prototype**
used as the visual/logic reference during porting. Do not present those `.dc.html`
files as the live demo.

A deployed version of the four Student screens: Practice Session, Today / Week,
Learn, and Progress, plus the global nav shell.

## Guided tour (recommended)

Open `/` or `/student/today?tour=1`. An overlay dims the app, rings one real
element, and explains why that element matters. **The only thing a viewer ever
does is click Next**, or turn on auto-play and do nothing — no step asks for a
typed value or a guessed click, and the app underneath is deliberately blocked
while the tour runs.

Six chapters, forward only. A chapter's screen is never shown again once it
ends, which is why Practice carries three chapters back to back:

| Chapter | Screen | Shows |
| --- | --- | --- |
| 1. Daily awareness | Today | The unified due-items list; the ask box answering a due-date question |
| 2. Learning the material | Learn | The skill map; a skill opened to its Lens-generated instruction; the ask box |
| 3. Adaptive practice | Practice | First-exposure intro → wrong-answer scaffold → the mastery moment → the rubric-graded problem |
| 4. The safety net | Practice | The help button and what pressing it shows; a passive-detection example |
| 5. Staying resilient | Practice | Offline continuation → session resume → direct-open auth → the review notification |
| 6. Progress and mastery | Progress → Week | Skill tiers, next review, then Week as the closing wide-angle view |

Every state the tour shows is a route: states that used to need a real
interaction are reached by the tour setting the demo param below and navigating
there, so the walkthrough never depends on anyone knowing the app.

Chapter 4 never touches the live escalation path. It renders its own card from
the same scripted constant the product uses, makes no request, and therefore
cannot create a record — and it carries the on-screen label *"Demo mode — this
is what the platform shows when it notices a student needs support"* throughout,
so nobody watching can read it as a real one.

Canonical URL: `/student/today?tour=1`. Code: `lib/tour.ts` (chapters),
`components/tour-provider.tsx` (state and navigation),
`components/tour-overlay.tsx` (spotlight and callout).

The `?demo=1` harness below is a separate system and shares nothing with it;
loading `?demo=1` ends the tour rather than stacking on top of it.

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
| `/` | Redirects to `/student/today?tour=1` — guided tour entry |
| `/practice` | Practice Session |
| `/student/today`, `/student/week` | Today / Week |
| `/student/learn` | Learn / Course Map |
| `/student/progress` | Progress |
| `/gate` | Shared-password gate |

## Demo controls

Query params drive every harness variant, so any state is linkable. The control
panel that writes them opens with `?demo=1` or <kbd>Ctrl/Cmd</kbd> +
<kbd>Shift</kbd> + <kbd>E</kbd>, and is absent from the DOM otherwise.
Investor-facing chrome (e.g. Simulate Diagnostic Gap) stays hidden until demo
controls are enabled.

| Param | Values |
| --- | --- |
| `entryVariant` | `first_exposure` (default), `returning`, `first_time`, `nothing_due` |
| `connectivityDemo` | `auto` (default), `fresh`, `stale`, `syncing`, `unavailable` |
| `interruptionDemo` | `none` (default), `recent`, `expired` |
| `directOpenDemo` | `not_applicable` (default), `valid_session`, `no_valid_session` |
| `problemDemo` | `standard` (default), `no_solution_rubric`, `wrong_answer_scaffold`, `mastery_moment` |
| `notificationPreviewDemo` | `not_applicable` (default), `shown` |
| `aiHintsEnabled` | `true` (default), `false` |
| `skill` | Any skill slug, e.g. `two_step`, `variables_both_sides`, `one_step` |
| `seed` | `fresh` or `mastered` — resets local demo persistence |
| `tour` | `1` — the guided chapter tour |
| `demo` | `1` — open harness / demo tools panel |

`wrong_answer_scaffold` and `mastery_moment` exist because those two practice
states were otherwise reachable only by answering, which put them out of reach
of a walkthrough that never types. The scaffold seeds two attempts, so the
ladder shows its guided-step rung with the hint a real second attempt would have
produced; neither is faked further along than the attempt count implies. The
panel's dropdowns list the two originals only — they are the ones worth clicking
through by hand.

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

Student-initiated help is an **I need help** menu in the shell (not on Practice,
where the header control opens the hint drawer). It lists five fixed reasons;
choosing one IS sending — no confirmation step and no free-text field. The
chosen label is stored on the same `EscalationRecord` as `helpReason` for
teacher review.

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
