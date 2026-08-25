# Escolent — Claude Design Build Tracker (live document)

*Mirrors tasks.md's role as a live tracking artifact. Updated after every screen that gets prompted, built, reviewed, or confirmed. Build against a NEW Claude Design project — not the old "design-system-extensions" project, to avoid anchoring on the pre-redesign visual language.*

**Confirmed decisions this phase:** mock data fully realistic (real names, populated multi-week history); Conversational Command Layer built with real dynamic AI processing, same as the earlier AI co-authoring screens; build order Student → Teacher → Admin → Pedagogical_Lead.

## Demo Data Reference (keep identical across every screen — decided once, here, not re-invented per prompt)

- **School:** Teneo (the actual pilot school), Grade 8, IEB, algebraic equations
- **Demo timeline:** pilot in its 6th week — enough for genuine multi-week history without implying a finished term
- **Primary demo student:** Mia Ndlovu — struggling on two-step equations, tentatively mastered one-step equations, one flagged prerequisite gap (integer operations)
- **Secondary students** (for Teacher/Admin multi-student views): Thabo Mahlangu (durably mastered, ahead of pace), Zainab Osei (emerging, recent misconception on negative coefficients), Marcus Diaz (stuck on two-step equations alongside Mia, 4+ days), Noah Whitfield (Grade 8A Remediation — active escalation demo), Elena Cruz (integer operations override, ~30 days old, due for a confirm/reassess check), Aiden Foster (Grade 8A Algebra — resolved historical escalation, acknowledged and resolved same day, 12 days ago), plus a realistic-sized class roster (~24 students) for anything needing scale (Mastery Overview, Analytics)
- **Other Teneo teachers** (not yet onboarded, for Admin's rollout-oversight screens): Ms. Alvarez, Mr. Chibale, Ms. Osborne — 6 weeks into the pilot, still no Space set up
- **Teacher:** Sarah Mokoena, teaches 2 Spaces (Grade 8A Algebra, Grade 8A Remediation)
- **Admin:** David Chen
- **Pedagogical_Lead:** Charti Reddy
- **Second tenant** (for Pedagogical_Lead's cross-tenant screens only): a second fictional pilot school, "Brightwater Academy," so cross-tenant aggregation has genuine multi-school data to show

## Build Log

- **2026-08-16** — Phase kicked off. Tracker created. Foundation phase (design tokens + core component primitives) starting before any full screen.
- **2026-08-16** — Phase 0 complete and signed off. Went through several rounds: initial foundation (strong, one bug — error-state color reused the reserved escalation red, fixed); extended with 6 more primitives (Modal, Avatar/presence, Toggle, Textarea, table row, full Conversational Surface Components) after checking the 4-primitive original against the full 20-component matrix and finding real gaps; primary color corrected from an initial too-muted value to the true logo color (`oklch(48.8% 0.217 264.4)`, from `#1D4ED8`) after reading the actual logo SVG directly — hue/lightness were right from round one, saturation was half what it should've been; fonts set to Crimson Pro (headings) / Geist (body). Escalation remains the one other fully-saturated color, now distinguished from the vivid accent by hue + usage pattern rather than saturation alone.

## Phase 0: Visual Foundation — COMPLETE

- [x] Color palette (semantic roles per UI blueprint: surface/surface-raised, content-primary/secondary, accent, urgent/informational, 5 state-dimension families)
- [x] Typography scale (Crimson Pro headings / Geist body, 5 sizes xs-xl)
- [x] Spacing scale
- [x] Core primitives: button, input, badge, card shell
- [x] Extended primitives: modal, avatar/presence, toggle, textarea, table row, conversational surface components

## Phase 1: Student (3 screens)

- [x] `/practice` — Entry + practice problem + scaffold ladder. Full test script run, passed, Phase 1 checkpoint passed. Went through a math-keypad detour during Phase 2 (built to solve a real UX concern, found a real bug in it, then deliberately reverted to a simple native `<input>`/`<textarea>` wrapper switched by `evaluation_strategy`, strictly matching Requirement 7.8) — reversion confirmed. Production requirement carried forward: the real Claude Code build still needs an actual math-input library for symbolic_equivalence-type skills; the underlying concern was never invalidated, just correctly relocated out of the prototype.
- [x] `/student/today`, `/student/week` — merges Escolent-native (actionable) and Canvas-sourced (reference-only) items across 5 days, all three sync-freshness states represented, ask box grounded in real due-items data with honest-limits behavior. Full test script run, passed. No outstanding items.
- [x] `/student/progress` — compact expandable skill list (not a grid), 7 skills with realistic tier distribution, next-review card, recent session history, grounded ask box with the fractions honest-limits test case explicitly built into the prompt. Full test script run, passed. Built under a usage-limit constraint (less self-review than the other two) but held up under independent testing regardless. **Real gap found after this was marked passed:** no mechanism (button or working conversational action) let a Student deliberately practice a specific skill regardless of its current tier — a genuine unfulfilled requirement (7.1b: honor a Student's specific practice request immediately, no menu), not a nice-to-have. Fix sent back: a "Practice this now" action from each skill's expanded detail view. Not yet independently re-confirmed.
- [x] Checkpoint: cross-screen consistency pass on all 3 Student screens — PASSED, genuinely coherent. Verified real consistency, not just individually-plausible content: Today/Week's Friday "One-step equations" due matches Progress's "Next review, in 2 days"; Practice Session's actual 4-problem set matches Progress's Aug 18 session log; Progress's own session history (Aug 12 Integer operations flagged, Aug 15 One-step crossed to tentative) correctly explains its own current skill-tier badges; Today/Week's "Integer operations refresher" assignment matches Progress's flagged-gap skill. All three screens use the same ask-box pattern (not reinvented per screen) and the same warm, name-light tone. One architectural note carried forward (not a bug): none of this consistency comes from a shared data source — each screen was independently prompted with consistent facts because the demo-data reference stayed disciplined, not because there's shared underlying state. Will need real attention once Teacher's Mastery Overview has to show this same Mia data from a 4th, separately-built screen. Two items still open, found after this checkpoint ran: the `componentDidUpdate` live-entryVariant fix on `/practice` (low priority, testing-harness-only), and the "Practice this now" gap on `/student/progress` (real, not low priority — fulfills an existing requirement).

**PHASE 1 COMPLETE — both outstanding items ("Practice this now," componentDidUpdate) confirmed resolved by user, not independently re-verified against a new export this round.**

## Phase 2: Teacher (7 screens)

- [x] `/teacher` — Briefing. Built: 3 correctly-distinguished severity tiers (Escalation reserved-red/Urgent-orange/Informational-blue, not just two), genuine cross-Space aggregation, fresh escalation name per instruction, aging-framed items, 4 states via one prop, honest per-destination stub messages for not-yet-built tap targets. Full test script run, passed.
- [x] `/teacher/today`, `/teacher/week` — correctly distinguishes internal-actionable Escolent items from external-reference Canvas items (different rule than Student's version, correctly applied), Noah's escalation correctly reused from the Briefing. Week-view Canvas "View in Canvas" bug fixed and confirmed. Full test script run, passed.
- [x] `/teacher/overview` — Mastery Overview. Built: exact cell-by-cell match to Mia's Progress screen states, Elena's override gets its own ring treatment distinct from gap-alerts, genuine Space switcher (not drill-down), grounded ask box, realistic 25-student roster with staggered activity. Tier-distinguishability fix confirmed applied. Ask-box "failure" traced to Present-mode viewing context, not a real bug — confirmed working correctly in the normal editing canvas. Full test script run, passed.
- [x] `/teacher/spaces`, `/teacher/spaces/new`, `/teacher/spaces/:id/edit` — the founding AI-proposes-human-reviews instance. Built with genuinely strong grounding: AI-drafted rosters are validated in code against the real candidate pool (not just prompted, actually filtered post-response), reason tags per suggested student, honest fallback draft on AI failure. Sensible existing-Space defaults (Algebra=classroom-pacing, Remediation=self-paced). Cancel-button fix confirmed. Full test script run, passed.
- [x] `/teacher/escalations/:id`, `/teacher/escalations` — Escalation detail and list. Built with real precision: scripted safeguarding message reproduced exactly, backup-escalation to David Chen correctly shown as already-happened (not offerable), first genuine record_views/presence component (Sarah + David, distinct timestamps, "(you)" label). Unrequested but sensible addition: Mark Resolved disabled until Acknowledge clicked. Full test script run, passed.

**All 7 Teacher screens built and individually confirmed. Before the Phase 2 cross-screen checkpoint: content-width standardization across all screens built so far (Phase 1 + Phase 2), not just Teacher's.**

- [x] Width standardization: all 8 focused/narrow screens confirmed at 720px (verified directly against uploaded files, not just the screenshot). Mastery Overview confirmed untouched at 1280px.
- [x] Cross-screen checkpoint reconnection: Teacher Briefing's 3 stub links (escalation → Escalation Detail; struggling-students + misconception → Mastery Overview) and Teacher Today's escalation stub now genuinely navigate via `window.location.href`, verified directly in the code, not just described. Dead stub-toast code cleanly removed as part of the fix (not requested, but good hygiene). Teacher Today's override stub correctly left untouched — that destination still doesn't exist.

## PHASE 2 COMPLETE — all 7 Teacher screens built, individually tested, cross-screen consistent, widths standardized, and genuinely wired together (not just individually functional).
- [x] Checkpoint: bulletproofing pass on Teacher screens

## Phase 3: Admin (9 screens)

- [x] `/admin` — Briefing. Built correctly oversight-scoped (escalation as aging count, not per-case detail, explicitly pointing to Teacher's Briefing for full detail — not duplicating it). Reused the exact 4-state pattern from Teacher's Briefing as instructed. Correctly at 720px without being told again. Escalation duration bug fixed and confirmed. Full test script run, passed.
- [x] `/admin/today`, `/admin/week` — correctly excludes LMS/Canvas items entirely, correctly reused the exact escalation/data-request/billing items and framing from the Briefing, escalation duration consistent at "3 hours," data-subject request correctly placed on Friday. Two issues from first test round, both resolved: Week view's missing toast-display block (real bug, fixed and verified directly in code) and the "missing billing card" report (confirmed a Present-mode viewing artifact, not a code bug — no code change was needed for it to pass on retest, consistent with the Mastery Overview ask-box precedent). Judgment call (billing grouped under "Today" in Week's day-list) remains open/deferred, not blocking. Full test script run, passed.
- [x] `/admin/analytics` — genuine drill-down (3 independently-combinable filters + breadcrumb scope label), not the switcher pattern — correctly distinct from Mastery Overview. Metrics are real computed math over the exact same 25-student roster (verified Mia's row is an exact match), not invented numbers. Ask box is scope-aware, respecting active filters. Thoughtful unrequested addition: real empty-state for the 3 not-yet-onboarded teachers. Full test script run, passed.
- [x] `/admin/pilot` — class toggle and subject activation, correctly zero content-edit affordance anywhere (verified by deliberate scan, the actual point of this screen's access boundary). Geometry introduced as a sensible second subject to demo the activation flow. Deactivate/reactivate bug fixed and confirmed. Full test script run, passed.
- [x] `/admin/users` — first screen in this prototype demonstrating the Conversational Command Layer for an action, not just Q&A. E/H boundary (Req 14a.3/17.1) genuinely well-built: the classification prompt explicitly encodes the exact ambiguity it exists to catch (casual "remove" phrasing on a person's data must classify as data_deletion, never invite/role_change), and it's enforced at the code level too — data_deletion returns immediately with a refusal, no path falls through to executing a roster change. Natural-language invite correctly pre-fills the structured form for review rather than sending directly. Sensible unrequested addition: David can't change his own role. Invited teachers correctly show "Invited" status, consistent with their established "no Space yet" status elsewhere. No issues found on review; user self-tested and reported passing. Test script written for the record (stress-tests the E/H boundary with more phrasings than the prompt's single built-in example).
- [ ] `/admin/lms-setup`
- [ ] `/admin/data-requests`
- [ ] `/admin/billing`
- [ ] Checkpoint: bulletproofing pass on Admin screens

## Phase 4: Pedagogical_Lead (5 screens)

- [ ] `/pedagogical-lead` — Briefing
- [ ] `/pedagogical-lead/skills` — Skill Graph Editor
- [ ] `/pedagogical-lead/errors`
- [ ] `/pedagogical-lead/review`
- [ ] Checkpoint: bulletproofing pass on Pedagogical_Lead screens

## Phase 5: Cross-Role Consistency Pass

- [ ] Final pass across all 26 screens, mirroring the interaction model's cross-role check
