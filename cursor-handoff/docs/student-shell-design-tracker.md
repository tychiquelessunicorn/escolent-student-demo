# Escolent — Student Shell Design Tracker (live document)

*Dedicated to the Student Shell deep-completion effort specifically — distinct from claude-design-build-tracker.md, which tracks the original role-by-role first pass (Student's 3 original screens are marked complete there and carried over as Foundation below, not re-tracked here). This tracker exists because this is a genuinely different kind of work: closing gaps and deepening what exists, not building from zero. Same discipline as the main tracker: nothing marked complete without a written test script and a passed test.*

**Source of truth for what's being tracked:** student-shell-complete-spec.md (Parts 2-5). Nothing in this tracker should diverge from what that document found — if a new gap surfaces during build/test that isn't in the spec, add it to the spec first, then here.

**Demo data:** same reference as claude-design-build-tracker.md (Mia Ndlovu, Teneo, week 6 of the pilot) — not duplicated here, to avoid two sources of truth drifting apart. One addition specific to this tracker: the distress-detection work item (below) reuses **Noah Whitfield's** already-established scenario end-to-end (same trigger text already locked on the Teacher/Admin Escalation screens: *"I don't really see the point in trying anymore. Nothing I do makes a difference, at school or at home. I don't want to talk about it."*) — deliberately not Mia, who stays the everyday-struggling-but-fine character throughout.

---

## Build Log

- **2026-08-18** — Tracker created. Student Shell deep-completion phase begins.

---

## Foundation (carried over from claude-design-build-tracker.md, already complete — not re-tracked here)

- [x] `/practice` — Entry (returning/first-time/nothing-due), scaffold ladder, mastery signal, natural stopping point
- [x] `/student/today`, `/student/week`
- [x] `/student/progress`, including "Practice this now" per-skill

---

## Work Items (from student-shell-complete-spec.md's gap analysis and second pass)

### 1. Student-facing distress detection and escalation (Req 18, 18.6-18.6a, 19.5) — HIGHEST PRIORITY — COMPLETE
*The single most safety-relevant gap found in either audit pass, now fully closed. Real AI classification calibrated against ordinary academic frustration, detection runs in parallel with actually answering the student's question (not instead of), the "I need help" button has zero friction, both paths converge on the identical scripted message with distinct detection_method logging. Persistence bug (message clearing on panel-close/problem-advance) fixed and confirmed.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 2. Session interruption and resume (Req 30) — COMPLETE
*Reviewed directly against source code and tested — no bugs found. Correctly excludes first_exposure from ever triggering a resume prompt. Resume needed no new tier-restoration logic — the ladder's tier already derived purely from wrongAnswers.length, so restoring the saved array automatically cascades correctly. 24h expiry test harness behaves exactly as specified.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 3. Offline continuation flow (Req 8) — COMPLETE
*Reviewed directly against source code and tested — no real bugs found. Correctly reuses the existing componentDidUpdate lifecycle hook (from the Phase 1 live-entryVariant fix) to detect "starting fresh while offline," rather than a parallel mechanism. Auto-recovery on reconnect is genuinely automatic, no retry button anywhere. Unrequested safeguard: single-source-of-truth rule so the header indicator and queue banner can never contradict each other during a sync.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 4a. Inline first-exposure instruction and Lens-switching (Req 34.1-34.2, 34.4-34.5) — COMPLETE
*Reviewed directly against source code, tested, confirmed correct: bridging woven into the same instruction, not a separate section; the Lens-switch architecture is genuinely "one ladder, not two" — mutually exclusive with the ordinary worked example at the same tier position, correctly scoped to only fire on a first-exposure skill's first wrong attempt. Never asks for a style preference.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 4. Skill instruction content and Q&A — the Learn / Course Map screen (Req 32.5, 32.7, 34) — COMPLETE
*Reviewed directly against source code, tested, and content quality independently verified — genuinely excellent. Reuses the exact same Lens mechanism as Practice Session's first-exposure instruction, correctly carries over the `s5→s3` prerequisite override, ask-box correctly handles both the out-of-scope redirect and the answer-seeking redirect (Req 32.7), content_status correctly never shown. The one prerequisite-check bug found and fixed, confirmed via direct diff. Content itself verified for real: independently re-solved the two word-problems with concrete numbers (Two-step equations' notebook problem, Multi-step's allowance problem) and confirmed both mathematically correct, not just plausible-sounding. Bridging on "Variables on both sides" correctly names the prerequisite by name, woven into one explanation. Caveat noted, not blocking: this is prototype content, real production content should still get a pedagogy pass from Charti eventually.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 5. A `rubric_llm`-evaluated practice problem, shown end-to-end — COMPLETE
*Reviewed directly against source and tested — no bugs found. Genuine 3-tier AI grading, AI call confirmed primary with the regex fallback only activating on invalid JSON or a real call failure. Correctly bypasses the ladder and every other Entry state.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

---

## ALL 8 WORK ITEMS COMPLETE — Student Shell deep-completion effort closed out.

### 6. Direct-open authentication (Req 1.7-1.8, added to requirements.md/design.md this phase) — COMPLETE
*Reviewed directly against source and tested — no bugs found. valid_session routes through the exact same shared proceedToEntry() function a normal LMS launch uses. no_valid_session correctly short-circuits, honest message naming Canvas as the real path back in, no login form. not_applicable (default) confirmed unaffected.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 7. Global Navigation Shell — COMPLETE
*Reviewed directly against source across all 4 screens, width fix confirmed via direct diff: rail now uniformly `width:250px` with generously-padded items (`12px 16px`) across all four files, matching Claude's own sidebar per direct user instruction. Practice Session's rail no longer narrower than the other three. Bottom-tab/rail responsive split confirmed correct (760px breakpoint, 56px touch targets). Viewport-squeeze concern from last round resolved by inspection, not just assumed: content area uses flex:1/min-width:0, gracefully narrows rather than breaking in the 760-970px range.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

### 8. Skill-specific "Practice this now" routing (found during the whole-shell audit, not previously tracked) — COMPLETE
*Reviewed directly against source and tested — correctly implemented. Progress's practiceHref is genuinely per-skill; unsupported skills get an honest, correctly-named fallback rather than silent mislabeling; both the direct entryVariant test path and the new URL-param path converge on the same real content.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Test script written
- [x] Tested
- [x] Confirmed complete

---

## Decisions from outside-review incorporation (not build items, for the record)

- **Adopted:** Global Nav Shell (item 7, new), Learn/Course Map as the concrete design for item 4, answer-seeking redirect (folded into item 4's scope, Req 32.7)
- **Declined:** reverting to a custom math-aware input — already tried, found a real bug (dead "x" key), deliberately reverted to the simple native wrapper for good, documented reasons; nothing about that reasoning changed
- **Not adopted, unresolved:** a "Lens-switching" pedagogical-framing mechanism — doesn't correspond to anything in requirements.md; not carried forward without it being grounded in something real first

---

## Pending Decisions (from Part 5's softer findings — need a yes/no before becoming build items, not yet scheduled)

- [ ] Scaffold ladder's first-ever-appearance light framing — decide whether this needs a specific designed moment, or is adequately covered by the ladder's existing self-explanatory tier labels
- [ ] "No onboarding tutorial, by design" — decide whether to formally lock this as a stated principle somewhere (UX blueprint addendum) or leave it as the implicit, already-consistent pattern it currently is

## Known Limitations (deliberate scope notes, not work items — carried from Part 5 for reference)

- The "reference-only, tap to leave" tone for other-subject LMS items is correct for this MVP's actual capability; worth revisiting tone as subject coverage expands, not now
- The text/textarea input wrapper is proven-sufficient for this pilot; an acknowledged limit, not a claim it covers all future K-12 subjects

---

## Phase 2: Visual Elevation (started after Phase 1's 8 work items closed)

*User request: current UI reads too calm/professional for a 13-14yo audience. Aligned direction: "sticky through genuine warmth and quality," explicitly NOT gamification or dark-pattern engagement mechanics — that line from the original design principles stays firm. Sequenced foundation-first, same as the original Phase 0.*

### 9. Foundation-level visual warming (Foundation.dc.html) — COMPLETE
*Neutral base hue shifted 264.4→55 (warm gold-cream), new achievement accent (hue 215) explicitly scoped to exactly 2 moments (mastery-tier crossing, first-exposure click), border-radius expanded to a differentiated 8/14/18/22/26 scale, typography kept as Crimson Pro + Geist with a diagnosed, targeted fix (headline weight/scale up, uppercase label spacing tightened) rather than a blind swap. Illustration and gamification mechanics both correctly stayed out of scope. Visual sign-off item, not a functional test script — same standard the original Phase 0 foundation got: verified via direct code review, approved via user's own visual judgment on the rendered result ("it lands").*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Confirmed complete (visual sign-off, no test script applicable)

### 10. Propagate foundation changes to all 5 Student screens — COMPLETE
*Reviewed directly against source across all 4 screens plus the Nav Shell. Achievement accent precisely scoped: exactly 2 uses in Practice Session (mastery + breakthrough), zero elsewhere, zero leakage into any Teacher/Admin file. Neutral base and typography weight confirmed uniform across all 4 screens. Border-radius mostly landed correctly, including a genuinely good judgment call (Learn's skill list correctly uses the "table shells" 18px category rather than "cards" 22px, since it's structurally a continuous list, not separate boxed cards). One minor, non-blocking nuance carried forward: Today's left-border-accent item cards still show slightly older asymmetric radius values (4px/14px, 6px/20px) rather than being updated in lockstep with the new scale — low visual stakes, optional polish, not required before considering this phase done.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Confirmed complete (visual propagation, no functional test script applicable)

### 11. Illustration/character-design (DECIDED — Option A: abstract/geometric, learning-universal, no characters)
*User decision: figurative artwork, yes. Direction chosen: Option A, corrected once already for a subject-specific-imagery mistake in the first proposal (a math-specific "balance scale" motif) — motifs must be drawn from the learning process itself (something clicking into place, a path, a spark), never from any one subject's content, so they hold up identically whether Math stays the pilot subject or another one gets built later. Not yet prompted.*
- [ ] Prompted
- [ ] Built
- [ ] Reviewed against source
- [ ] Confirmed complete

### 12. Notification/re-engagement (DECIDED — must be attended to and closed) — COMPLETE
*Fixed at the root: Requirement 5a + matching design.md section. Reviewed directly against source: mockup correctly and honestly labeled "not a live send," tap-through correctly reuses the existing `?skill=` routing, properly integrated into the established test-harness override pattern. One process note, not a build bug: the example text ("Variables on both sides is ready for review") traced back to the prompt itself defaulting to a math example without framing it as "chosen pilot subject, not an assumption" — the underlying Requirement 5a mechanism was already correctly subject-agnostic throughout (says "a Skill," never "a Math skill"); the gap was in how the prompt was worded, not the spec or the build.*
- [x] Prompted
- [x] Built
- [x] Reviewed against source
- [x] Confirmed complete
