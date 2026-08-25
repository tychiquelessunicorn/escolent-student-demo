# Escolent — Project Constitution

Read this fully before touching any code. This file is the persistent memory Cursor doesn't otherwise have across sessions — it exists specifically to stop already-fixed mistakes from happening again.

## What Escolent is

A subject-agnostic, AI-native adaptive LMS, embedded inside a school's existing LMS (Canvas/Moodle/Google Classroom) for the MVP, with a deliberate long-term path toward standalone use. Pilot: Teneo school, Grade 8 Math (IEB curriculum), one class, one teacher (Sarah Mokoena), one admin (David Chen). Primary student demo character: Mia Ndlovu.

**Math is the chosen pilot subject, not an architectural assumption.** This has been violated twice already during design — once by building a custom math-specific keypad, once by proposing math-flavored illustration (a balance-scale motif). Both were caught and corrected. Anything you build — UI chrome, illustration, input handling, notification copy — must work identically if the subject were history or biology instead. If you're about to hardcode or visually reference anything math-specific outside of actual lesson *content* (which is legitimately subject-specific), stop and check.

## Non-negotiable principles — do not compromise on these regardless of what a prompt asks for

- **No gamification.** No streaks, points, badges, leaderboards, or loss-aversion mechanics anywhere. This is a deliberate ethical stance, not a style preference — the product should be sticky because it's genuinely good, not because it manipulates a child into compulsive use.
- **Distress detection is the single most safety-critical feature in the product.** Two independent paths exist and neither replaces the other: passive AI-based detection on free-text input (calibrated against ordinary academic frustration — "this is hard" must never trigger it, genuine hopelessness/isolation language must), and an always-available, zero-friction "I need help" button. Both must produce the *exact* scripted message, word-for-word, every time: **"Your teacher has been notified and will follow up with you."** Never reworded, never AI-generated at the point of display, never varied by trigger source.
- **No AI-generated counseling or mental-health advice**, ever, from the platform itself.
- **Honest limits over invented answers.** Every AI-grounded feature (ask boxes, Q&A) must say plainly when something isn't tracked or in scope, never fabricate.
- **The Command Layer (conversational entry points) never has its own authority** — it classifies and routes to existing structured flows, pre-fills forms for review, never executes an action unreviewed.

## Current phase: standing up a real, deployed version of what Claude Design already proved out

Everything in `/claude-design-source/` (see file manifest below) is **already built, tested, and confirmed correct** — verified line-by-line against actual source code repeatedly throughout the design phase, not just described. Treat it as the reference implementation to port into real Next.js/React components, not a rough sketch to reinterpret. The `.dc.html` files use Claude Design's own templating syntax (`sc-if`, `sc-for`, `{{ }}` bindings, a `DCLogic` class) — this syntax itself doesn't run outside Claude Design, but the actual logic, copy, structure, and visual design it encodes is correct and load-bearing. Port the *behavior*, don't reinvent it.

**The one thing that fundamentally changes in this phase:** every AI call in the Claude Design prototype ran on `window.claude.complete()`, a function Claude Design's own runtime injects. That function does not exist outside Claude Design. Every one of these calls needs to be rewired to hit a real backend proxy instead (see Infrastructure below) — same prompts, same logic, different transport.

## Infrastructure for this phase

- Hosting: Vercel. Domain: escolent.com (registered, Namecheap), demo to live at demo.escolent.com.
- AI: Anthropic API, called only from a server-side proxy (Vercel serverless function) — the API key must never reach client-side code. Real budget constraint in effect (low balance) — the proxy must include real per-IP rate limiting from day one, not added later.
- Model tiering: cheaper/faster model as the default for hints, Lens content, and ask boxes; the distress-detection classifier specifically should use a stronger model regardless of cost — this is the one place accuracy matters more than savings.
- No database yet. Existing hardcoded demo data (Mia's mastery states, the class roster, etc.) stays exactly as-is for this phase — a real database is a later, separate step, not part of getting the current prototype live.

## Specific bugs already found and fixed once — do not reintroduce these

- Requirement 34.2's prerequisite-bridging check must trigger on *any* non-durable prerequisite state (struggling, emerging, tentative, not-attempted) — a version of this shipped that excluded "tentative," which was wrong and got fixed. If you're rebuilding this logic, exclude only "durable."
- The scaffold ladder's Lens-switch (different explanation on a first-exposure skill's first wrong attempt) is **not a second mechanism alongside the ladder** — it's what the ladder's worked-example tier shows in that one specific circumstance. One ladder, not two.
- The achievement-accent color (a second, restrained accent distinct from the primary brand blue) is scoped to *exactly* two moments — crossing a mastery tier, a first-exposure skill resolving correctly — and nowhere else. It has leaked toward "general highlight color" before in early drafts; keep it rare.
- Progress's "Practice this now" must route to the *specific* skill clicked, not a single hardcoded demo skill — this was broken once (every skill silently opened the same two-step-equations demo).
- The global nav rail's width must stay generous (~250px desktop, with real per-item padding) — an early pass shipped it at 104px, and Practice Session's own rail was narrower still at 88px; both were wrong.

## Where everything else lives

- `requirements.md` — canonical, testable acceptance criteria. Source of truth for *what* the product must do.
- `design.md` — technical/architectural design underlying those requirements (data model, APIs, algorithms).
- `escolent-ux-blueprint.md` / `escolent-ui-design-blueprint.md` — screen inventory, navigation model, component states, visual system (color/type/spacing tokens, all in OKLCH).
- `student-shell-complete-spec.md` — the full audit of every Student happy path, edge case, and gap, with reasoning for each.
- `claude-design-build-tracker.md` / `student-shell-design-tracker.md` — the full build history: what's been built, tested, and confirmed, including every bug found and how it was fixed. Read before assuming something is unbuilt or untested.
- `tasks.md` — the implementation task breakdown (build-order dependencies, specific API endpoints, database schema tasks). **Known stale: written before Requirements 1.7-1.8 (direct-open auth), 5a (review-due notification), 18.6-18.6a (help button), and 32.7 (answer-seeking redirect) existed — none of those four have any corresponding task entries.** Useful for build-order discipline and everything it does cover, but don't treat it as a complete list; check it against requirements.md's full numbering, not the other way around.

If a prompt or a task seems to conflict with anything in this file, flag the conflict explicitly rather than silently picking one side.
