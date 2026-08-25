# Escolent — Student Shell: Complete Specification

*Method, stated plainly: everything in this document is synthesized from requirements.md, design.md, the UX/UI blueprints, and what was actually built and tested in Claude Design's Student screens (`/practice`, `/student/today`+`/student/week`, `/student/progress`). Nothing here is invented. Where this audit finds something implied by our own locked principles but not yet formally specified or built, it's called out explicitly as a gap — not silently filled in.*

---

## Part 1: Student User Stories (requirements.md format, verbatim source)

### Requirement 1: LMS Launch and Authentication (Student-relevant ACs)
**User Story:** As a Student, I want to launch the Platform from my school's LMS using my existing credentials, so that I don't need to manage separate login credentials.
1. WHEN a Student clicks the Platform link in Canvas, THE Platform SHALL authenticate via LTI 1.3 and begin the Student's Entry experience.
2. WHEN a Student clicks the Platform link in Moodle, THE Platform SHALL authenticate via LTI 1.3 and begin Entry.
3. WHEN a Student clicks the Platform link in Google Classroom, THE Platform SHALL authenticate via Google Classroom API and begin Entry.
4. WHEN authentication fails, THE Platform SHALL display an error message with support contact information.
5. Authentication completes within 3 seconds at 95th percentile on 2Mbps+.

### Requirement 6: Cognitive Load-Aware Scaffolding
**User Story:** As a Student, I want the Platform to provide more support when I'm learning something new and less support as I gain confidence, so that I develop independent problem-solving skills.
1. First encounter with a new Skill → worked examples with step-by-step explanations.
2. Scaffolding fades as Mastery_State increases.
3. Emerging-but-not-mastered → partially completed problems with hints.
4. Likely mastery → independent problems, no hints.
5. Hint requested during independent practice → given, but affects Mastery_State calculation.
6. Incorrect after exhausting all scaffolding (including independent) → flagged for Teacher review, not repeated indefinitely; routed to Misconception matching or logged as unmatched.

### Requirement 7: Adaptive Practice Session Experience
**User Story:** As a Student, I want practice sessions that adapt to my current understanding, so that I'm neither bored nor overwhelmed.
1. Opening the Platform → next Skill determined from Mastery_State + Spaced_Repetition, within enrolled Space boundaries, Session begins directly, no menu.
1a. One-line reason accompanies the auto-selected Skill.
1b. A Student's explicit request for different practice is honored immediately, no menu, subject to that Space's boundaries.
1c. No prior history → begins on the first Skill with no unmet prerequisites; framing never implies returning progress.
1d. Nothing due → honest "nothing due" state, optional enrichment offered, never required.
1e. The recommendation *decision* uses only cached/synced data (no live round trip); loading a brand-new Session's content still needs connectivity (distinct from 8.4).
1f. Multiple Space enrollments → candidates considered across all of them together, each still bound by its own Space's rules.
2. No hard time limit on Sessions.
3. 10-15 problems or 15-20 minutes → natural stopping point suggested.
4. Prerequisite gap demonstrated mid-practice → remediation auto-introduced.
5. Classroom pacing mode on → Space-defined Skills prioritized over individual remediation.
6. Classroom pacing preventing remediation → gap flagged to Teacher.
7. Progress saved every 30s or after each response, whichever first.
8. Response input is a structured field matched to Evaluation_Strategy — never a general chat input.

### Requirement 7a: Student Daily Awareness — Today and Calendar
**User Story:** As a Student, I want to see what's due today and this week — including my school's actual assignment due-dates — without separately checking the LMS, so Escolent can be where I actually keep track of things.
1. Today combines Escolent-native recommendations + LMS assignments/due-dates.
2. Every LMS due item included regardless of subject; only Escolent items get "start practice"; LMS-only items link back to source.
3. Week view reachable from Today; Today is the prominent default.
4. Stale/unavailable/syncing LMS data visibly indicated, not shown with false certainty.
5. Same information obtainable via plain-language request.

### Requirement 8: Offline Session Resilience
**User Story:** As a Student in an area with unreliable connectivity, I want to continue practicing even when my connection drops, so that my learning is not constantly interrupted.
1. Connectivity lost mid-Session → Student can continue answering already-loaded problems.
2. Responses queue locally while offline.
3. Connectivity restored → queued responses sync within 10 seconds.
4. Starting a *new* Session with no connectivity → message that connectivity is required to load new content.
5. Connectivity status visibly indicated throughout.

### Requirement 18: Distress Signal Detection (Student-facing surface)
**User Story:** *(Teacher-framed, but the detection surface is entirely on the Student's side.)*
1. Pattern-based monitoring across **every** Student free-text surface — practice responses, Today view, progress requests, hint requests — not one designated input.
2. Contextual-analysis monitoring, same surfaces.
3. Detection → immediate Escalation to the Student's Teacher.
4. Errs toward over-triggering, not under-triggering.

### Requirement 19: Distress Signal Escalation and Response (Student-facing AC)
5. THE Platform SHALL display a message to the Student indicating their Teacher has been notified and will follow up. *(The exact scripted line, already locked and built on the Teacher-facing Escalation screens: "Your teacher has been notified and will follow up with you." Never reworded.)*

### Requirement 23: Low-End Device Performance
**User Story:** As a Student using a low-end device, I want the Platform to load quickly and respond smoothly, so that I can focus on learning rather than waiting.
1. Practice interface loads within 5 seconds on 2GB RAM / dual-core 1.5GHz / 2Mbps.
2. UI actions with no server dependency respond within 1 second.
3. Minimal client-side memory footprint.

### Requirement 30: Session State Recovery
**User Story:** As a Student whose connection drops mid-session, I want to resume exactly where I left off, so that I don't lose my work.
1. Interruption (connectivity loss or browser closure) → Session state saved, including current problem and responses.
2. Returning to the Platform → offered a resume of the interrupted Session.
3. Exact problem and responses restored.
4. Saved states expire after 24 hours.

### Requirement 32: AI-Native Content Experience (Student-relevant ACs)
**User Story:** As a Student or Teacher, I want school content reorganized into a clear, skill-based structure instead of a messy file list, so that navigating and understanding course material is easier.
1. Skills presented by learning-progression order, not upload date.
2. Each Skill shows a synthesized summary alongside a visible reference to its original source.
3. Original source material never altered/deleted/replaced.
5. **A Student can ask a free-text question, scoped to Skills within their current Space boundary.**
6. Content_Status is never shown to Students.

---

## Part 2: Complete Happy Path Map

*Cross-referenced against what's actually built in Claude Design. A checkmark means it's been built and tested; a flag means requirements.md specifies it but it has no built screen or test coverage yet.*

| # | Happy Path | Built? |
|---|---|---|
| 1 | Returning Entry → auto-continuation with reason → practice → correct first-try → next problem | ✅ `/practice` |
| 2 | Nothing-due Entry → gate → "sure, let's try one" → practice | ✅ `/practice` |
| 3 | First-time Entry → fresh-start framing, no false "returning" implication | ✅ `/practice` |
| 4 | Wrong answer → full scaffold ladder (worked example → guided → hint → independent) → eventual correct | ✅ `/practice` |
| 5 | 3-in-a-row first-try correct → in-flow mastery signal | ✅ `/practice` |
| 6 | 2+ completions → natural stopping point offered, honest summary either way | ✅ `/practice` |
| 7 | Today view → tap an Escolent item → straight into practice | ✅ `/student/today` |
| 8 | Today view → LMS-only item → reference link out, no fake practice action | ✅ `/student/today` |
| 9 | Week view, same distinctions, denser | ✅ `/student/week` |
| 10 | Plain-language due-date question ("what's due Thursday") | ✅ `/student/today` |
| 11 | Progress → expand a skill → see detail | ✅ `/student/progress` |
| 12 | Progress → "Practice this now" on any skill regardless of tier | ✅ `/student/progress` |
| 13 | Progress → plain-language question about own mastery | ✅ `/student/progress` |
| 14 | Ask a free-text question about Skill *content* itself (Req 32.5) — e.g. "what does a coefficient mean," scoped to current Space | 🚩 **not built** — distinct from the ladder's "ask a specific question," which is scoped to the current problem/hint, not general Skill content |
| 15 | Mid-Session connectivity loss → continue answering loaded problems → responses queue → reconnect → sync within 10s | 🚩 **not built** — the connectivity indicator's *states* are demonstrated (`connectivityDemo` prop), but the actual continue-while-offline-then-sync flow has never been shown |
| 16 | Session interrupted (closed browser, lost connection) → return later → offered to resume the exact interrupted Session | 🚩 **not built** — Entry's three states don't include a resume-interrupted-session state at all |
| 17 | Attempt to start a brand-new Session with zero connectivity → honest "connectivity required to load new content" message | 🚩 **not built** |
| 18 | A concerning free-text response on any surface → scripted "your teacher has been notified" message shown to the Student | 🚩 **not built** — the scripted message exists and is locked (verified word-for-word on the Teacher-facing Escalation screens), but has never been shown from the *Student's* side |

---

## Part 3: Complete Edge Case Inventory

### Entry edge cases
- Returning student, but the recommended Skill differs from what they last practiced (prerequisite gap surfaced instead) — ✅ implied by 7.1a's reason framing, not separately tested.
- Multiple Space enrollments, candidates ranked across all of them (7.1f) — 🚩 not demonstrated; all Claude Design testing so far uses a single-Space Student (Mia).
- Entry decision resolving from stale cached data if the last sync was old — 🚩 not explicitly tested.

### Scaffold ladder edge cases
- Ladder exhaustion (5th wrong) → honest "let's come back to this" — ✅ built, tested.
- A hint request during *independent* level specifically affecting Mastery_State calculation differently than earlier tiers (6.5's distinction) — 🚩 the current build tracks "used a hint" generally; whether independent-tier hints are weighted differently in the mastery math specifically hasn't been surfaced as a testable, visible distinction.
- AI hint-generation failure → static fallback — ✅ built, tested (`aiHintsEnabled` toggle).

### Offline / connectivity edge cases
- All four connectivity states (fresh/stale/syncing/unavailable) as a visual indicator — ✅ built, tested.
- Actually continuing to practice while offline, queued responses, sync-on-reconnect — 🚩 not built (see Happy Path 15).
- Attempting a new Session with zero connectivity — 🚩 not built (Happy Path 17).
- Session-state recovery after interruption — 🚩 not built (Happy Path 16).

### Distress detection edge cases
- Detection triggering on the practice-response surface specifically — 🚩 not built.
- Detection triggering on Today/progress/hint-request surfaces (18.1's explicit "not only one designated input") — 🚩 not built anywhere.
- The Student-facing scripted message — 🚩 not built (Happy Path 18).

### Ask-box / honest-limits edge cases (the pattern that *is* well-covered)
- Ungroundable question → honest "not tracked here" — ✅ built and tested on both Today/Week and Progress, with the fractions test case specifically.
- AI call failure → graceful fallback message — ✅ built and tested.

### Subject-agnostic edge cases
- The math-input saga (custom keypad → reverted to native `<input>`/`<textarea>` switched by `evaluation_strategy`) directly resolved the *input* side of subject-agnosticism for this pilot's actual content — ✅ resolved, deliberately simple.
- What a **rubric_llm**-evaluated Skill's practice screen looks like (free-text response, not numeric) — 🚩 never built or demonstrated; every practice problem shown so far has been `exact_match`/`symbolic_equivalence`-style algebra. The *wrapper* component supports it per the last fix, but no actual rubric-graded problem has been shown end-to-end.

---

## Part 4: Gap Analysis — What This Audit Found

Five real gaps, in priority order by how central they are to what Escolent claims to do:

1. **The Student-facing side of distress detection and escalation has never been built.** This is the single most safety-relevant piece of the whole product, and right now it exists only on the Teacher-facing side (Briefing, Escalation Detail/List) plus the underlying data model. A Student who types something concerning into `/practice` today would see... nothing different. This is worth prioritizing.
2. **Session interruption/resume (Requirement 30) has no built screen or state.** Entry currently has exactly three states (returning/first-time/nothing-due) — a fourth, "you have an interrupted Session, resume it?" state is a distinct, specified requirement that's absent.
3. **Offline continuation (Requirement 8) is only demonstrated as a static indicator, not a real flow.** We've shown what "offline" looks like visually; we haven't shown what happens when a Student actually keeps working through it.
4. **General Skill-content Q&A (Requirement 32.5) is a different capability than what's built**, and could easily be mistaken for already-covered given how many ask-boxes exist elsewhere. The ladder's "ask a specific question" is scoped to the current problem; 32.5 is scoped to the whole Space.
5. **A `rubric_llm`-evaluated practice problem has never been shown.** Every demo problem has been algebra with a numeric answer. Nothing currently proves the free-text/textarea path actually works end-to-end with real grading.

None of these require new requirements-writing — everything above is already specified. They're missing from the *build*, not from the *spec*.

---

## Part 5: Second-Pass Pressure Test — The Standalone-Replacement Trajectory

*Different question than Part 4's. Part 4 asked "did we cover every ACs in requirements.md." This asks: does what's built and specified today assume Escolent stays a companion app clicked into from an LMS forever, or does it actually hold up as the foundation for the stated eventual goal — a standalone platform that replaces the LMS, without the Student needing to relearn anything when that happens?*

### Confirmed good: one architectural decision already generalizes correctly

The Today/Week `source: 'escolent' | 'lms'` split, with `action_route: null` for LMS-only items, is genuinely well-positioned for this. If Escolent later hosts a subject's content natively instead of just referencing it, that's simply more items flipping from `lms` to `escolent` with a real `action_route` — the Student's mental model ("Today shows me everything; some of it I can do right here") never has to change. This is worth stating plainly: it's already the right foundation, not something needing rework.

### Fixed at the root — no longer a gap

There is no way to open Escolent directly. Checked Requirement 1's exact text directly rather than from memory — every acceptance criterion was "WHEN a Student clicks the Platform link in [Canvas/Moodle/Google Classroom]," with no path for opening Escolent on its own. As written, the *only* way in was clicking through the LMS every time.

This mattered more than it might first appear: if the goal is "the room where students spend almost all their daily learning time," the entry mechanism can't be "first open Canvas, then click a link to leave it." That's the opposite of primary. **Fixed directly in requirements.md (new ACs 1.7-1.8) and design.md (new Direct-Open Authentication subsection), not left as a build-only note** — this was consequential enough to fix at the root, matching how every other real spec gap in this whole project has been handled. A Student can now open Escolent directly via a persisted session established at their last LMS launch, with an honest fallback if that session's expired or never existed.

### Real gap: no documented "day in the life"

Every individual flow is specified. Nothing ties them into a single daily narrative — what a student's actual day looks like once this replaces part of their routine. Not a new requirement, but a synthesizing artifact worth having: it's the kind of thing that catches "wait, how does the student actually get from A to B" questions that individual ACs don't surface on their own.

### Real gap: the scaffold ladder's first-ever appearance has no specified framing

The ladder itself needs no *learned* skill — it just adapts. But the very first time a Student ever sees content change shape after a wrong answer, there's no specified light explanation for why. Zero learning curve doesn't mean zero orientation — it means the orientation has to be so minimal it barely registers as one. Nothing currently specifies what that first-encounter moment looks like.

### Worth explicitly locking, not left ambiguous: no onboarding tutorial, by design

This is implied everywhere (Entry auto-starts, no menu, no setup) but never stated as a deliberate principle. Worth saying outright: Escolent has no onboarding tutorial, on purpose — the interface is supposed to be self-evident. Stating this explicitly protects it from someone later adding a tutorial "to be safe" and undermining the actual goal.

### Worth naming, not necessarily fixing yet: the "reference-only, tap to leave" tone risk

Functionally correct for this MVP — Escolent genuinely can't offer practice for a subject it hasn't been taught yet. But heavy, correct use of "here's a link to go do this elsewhere" is also exactly the pattern that reinforces Escolent-as-secondary in a Student's head, which cuts against the standalone-replacement goal. Not a bug to fix now — the reference-back principle is right for this MVP's actual capability — but worth having in mind as scope expands, so the *tone* of those reference-outs doesn't calcify into "the other subjects live somewhere else and always will."

### Worth an explicit, acknowledged scope note: input types beyond text/textarea

The current input wrapper (native `<input>`/`<textarea>`, switched by `evaluation_strategy`) is proven sufficient for this pilot's actual content. It should be stated as a deliberate, acknowledged limit — not a silent assumption that it covers every future K-12 subject. Some subjects will eventually need input types this wrapper doesn't have an answer for (diagram labeling, image-based response, etc.). Not this MVP's problem to solve now — just worth not accidentally implying it's already solved.

