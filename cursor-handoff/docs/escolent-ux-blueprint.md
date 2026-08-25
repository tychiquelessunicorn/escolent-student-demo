# Escolent MVP — UX Design Blueprint (v2, built against the AI-native redesign)

*This document translates escolent-interaction-model.md, requirements.md, design.md, and tasks.md into a concrete screen inventory, navigation model, and set of user flows — the level of detail Claude Design actually needs to build from. Built fresh against the current redesign, not extending the pre-redesign escolent-ux-blueprint.md or any stray earlier draft — those reflect a design the user explicitly moved past (a "keep it CRUD" correction and the full AI-native pivot both happened after them).*

---

## Screen Inventory

*Built by systematically cross-referencing every UI-facing piece in design.md and tasks.md. Doing this surfaced a real, systemic gap: no task for any role's Briefing or Today/Week ever specified an actual page route — only the API endpoints behind them. Resolved here, since defining the concrete route inventory is this document's job; the missing routes below are called out explicitly, not silently assumed.*

### Student

| Route | Screen | Source |
|---|---|---|
| `/practice` | Entry / active practice session — auto-starts, no menu | design.md §7, tasks.md 19.1 |
| `/student/today`, `/student/week` | Today & Week — daily quests + LMS due-dates + calendar | Req 7a, design.md §7, tasks.md 19.3 *(route names newly defined here — task 19.3 only specified the API)* |
| `/student/progress` | Compact mastery status, own Skills only | tasks.md 19.2 |
| `/student/learn` | **Course Map — new, added during the Student Shell deep-completion pass, refined during a second review pass.** Skills in progression order; expanding one shows the same Lens-generated instructional content Requirement 34 already specifies (not a separately-generated summary), with a quiet link back to the original LMS source. Concrete screen for Requirement 32.5 (general Skill-content Q&A, whole-Space scope) and Requirement 34 (the actual instructional content itself) together — distinct from the practice ladder's "ask a specific question," scoped to the current problem only. | Req 32.1-32.3, 32.5, 34 (already specified, never had a screen) |

*No standalone `/student/login` — Student authentication is LTI-first (Requirement 1), same as Teacher; found missing during pressure-testing since every other role's table addressed login explicitly and Student's silently didn't.*

**Global Navigation Shell — new, added during the Student Shell deep-completion pass.** Found missing during a second review, and independently confirmed by an outside review of this same shell: nothing previously specified the actual mechanism connecting Today/Learn/Progress, despite the Navigation Model below already stating the principle that they should be one tap away from anywhere. A persistent shell wraps all four Student screens: a minimal top bar (wordmark + connectivity indicator) and a tab bar (bottom on mobile, rail on desktop) for Today/Learn/Progress. Visible on every screen including `/practice` — but during active practice specifically, rendered at minimal visual weight, never competing with the problem itself, same "quiet, available, not asking for attention" principle already used for the Command Layer's entry point elsewhere in this product. Not hidden during practice, just deliberately quiet.

### Teacher

| Route | Screen | Source |
|---|---|---|
| `/teacher` | **Briefing — the landing route** | design.md §10, tasks.md 12.1 *(route newly defined here — 12.1 only specified `GET /api/teacher/briefing`)* |
| `/teacher/today`, `/teacher/week` | Today & Week | design.md §10a, tasks.md 12.2 *(route newly defined here)* |
| `/teacher/overview` | Mastery Overview (formerly "dashboard") | tasks.md 12.3 |
| `/teacher/spaces` | Space list | tasks.md 13.1 |
| `/teacher/spaces/new` | Space creation (natural-language-first) | tasks.md 13.1 |
| `/teacher/spaces/:id/edit` | Space editing | tasks.md 13.2 |
| `/teacher/escalations/:id` | Escalation detail — full context, safeguarding message, record_views; deep-linked directly from a notification or Briefing item | tasks.md 14.6 |
| `/teacher/escalations` | Escalation list — fallback for browsing, not the primary path (that's the deep link above) | tasks.md 14.6 |
| `/teacher/login` | LTI/OAuth handled by launch flow; no standalone login page for Teacher (LTI-first) | design.md §1 |

### Admin

| Route | Screen | Source |
|---|---|---|
| `/admin` | **Briefing — the landing route** | design.md §22, tasks.md 16.1 *(route newly defined here)* |
| `/admin/today`, `/admin/week` | Today & Week (compliance/billing/backlog — not LMS assignment due-dates, that's Teacher's) | design.md §22, tasks.md 16.2 *(route newly defined here)* |
| `/admin/analytics` | School-Wide Analytics (formerly "dashboard") | tasks.md 16.3 |
| `/admin/pilot` | Pilot scope + subject/curriculum activation | tasks.md 16.5, 16.6 |
| `/admin/users` | User & role management | tasks.md 16.8 *(route newly defined here — 16.8 only specified the API)* |
| `/admin/lms-setup` | Institutional LMS integration setup (structured, credential entry) | design.md §21a, tasks.md 11b.1 *(route newly defined here)* |
| `/admin/data-requests` | Data export / deletion, structured flow | tasks.md 16.10, 16.11 *(route newly defined here)* |
| `/admin/billing` | Billing — plan/seats/renewal, structured-only plan-change | tasks.md 16.14 *(route newly defined here)* |
| `/admin/login` | Direct credential login | tasks.md 3.4 |

### Pedagogical_Lead

| Route | Screen | Source |
|---|---|---|
| `/pedagogical-lead` | **Briefing — the landing route** | design.md §23, tasks.md 28a.1 *(route newly defined here)* |
| `/pedagogical-lead/skills` | Skill Graph Editor | tasks.md 4.4 |
| `/pedagogical-lead/errors` | Unmatched Error Curation | tasks.md 7.6 |
| `/pedagogical-lead/review` | Content review/approve/reject queue (`pending_approval` items) | tasks.md 28.6 *(route newly defined here — 28.6 described the UI but not its route)* |
| `/pedagogical-lead/login` | Global credential login, no tenant | tasks.md 3.5 |

*Note: `/pedagogical-lead/review` (content approve/reject) and Teacher's equivalent for Space-level content aren't the same screen at different mount points — Teacher approving their own Space's AI-proposed content happens inline in Space creation/editing (`/teacher/spaces/:id/edit`), not a separate review queue, since a Teacher only ever reviews their own proposals. Pedagogical_Lead's queue is cross-tenant and needs its own destination. Worth flagging to Claude Code as a small follow-up: tasks 12.1, 12.2, 14.6, 16.1, 16.2, 19.3, 16.8, 11b.1, 16.10/16.11, 16.14, 28a.1, 28.6 should each get a one-line route addition to match this table (14.6 specifically needs the list-vs-detail route split reflected, not just a single generic page), so the route names live in tasks.md too, not only here.*

---

## Navigation Model

**One shape, four roles, per the interaction model's locked pattern:**

- **Student:** landing is still Entry-only — `/practice` decides for the Student, no menu to choose from on arrival. What's new: a persistent Global Navigation Shell (top bar + Today/Learn/Progress tabs) now wraps every Student screen including `/practice`, giving concrete form to the principle already stated here — Today, Learn, and Progress reachable in one tap from anywhere, not nested in a menu. During active practice, the shell renders at minimal visual weight rather than disappearing entirely, so the practice screen stays calm and focused without trapping the Student.
- **Teacher/Admin/Pedagogical_Lead:** the role's root route is the Briefing. Every Briefing item routes directly to the specific screen/record it concerns (Mastery Overview, Escalation detail, a specific Space, a specific pending-review item) — never to a generic list the person then has to search. Today/Week sits one tap from the Briefing, same prominence logic as Entry vs. Today for Student. Structured destination screens (Mastery Overview, Skill Graph Editor, Analytics) are reached *from* the Briefing or Today, not from a persistent top-level nav bar competing with them for landing-page status.
- **Chat is not a separate screen for any role.** Per Requirement 37, the Conversational Command Layer is an input mode available *within* whatever screen the person is already on — a persistent, low-key entry point, not a distinct "chat" destination to navigate to.

---

## Key User Flows

*Not every flow in the product — the ones worth spelling out because they're either the core loop, safety-critical, or illustrate a pattern (structured vs. conversational, approve vs. reject) that recurs elsewhere and only needs showing once.*

### Student: the core practice loop

1. Student opens the Platform → `/practice` (Entry, Req 7.1) resolves the next Skill from cached mastery/spaced-repetition data, no network round trip required for the decision
2. One-line reason shown ("let's continue with two-step equations — you were close last time") — or the fresh-start / nothing-due variant if applicable (Req 7.1c, 7.1d)
3. Problem presented with a structured input matched to `evaluation_strategy` (Req 7.8) — never a chat box for the answer itself
4. **Wrong answer:** structured scaffold ladder (worked-example → partial-scaffold → hint-on-demand → independent) — a deliberate CRUD choice, not a gap (Requirement 6, locked after the "too risky" correction)
5. **Ladder exhausted, still wrong:** flagged for Teacher review (surfaces in the Teacher's Briefing, `/teacher`, task 12.1 — not a new destination), routed through existing Misconception matching or logged as unmatched (Req 6.6) — the Student sees an honest "let's come back to this" framing, not a dead end or an infinite loop on the same tier
6. **Correct, and threshold met:** mastery signal delivered in-flow ("that's three in a row with good gaps — this one's sticking"), not held for a separate screen
7. Natural stopping point suggested at 10-15 problems or 15-20 minutes; Student chooses to continue or stop

### Teacher: Override, both entry paths side by side (illustrates structured-vs-conversational generally)

**Structured path:** Mastery Overview (`/teacher/overview`) → tap a cell → "Override" → modal (reason, 20-200 chars) → confirm → applied.

**Conversational path:** anywhere on any Teacher screen → type "override Jane's assessment on two-step equations, input error" → Command Layer resolves Student + Skill → **if ambiguous** (two Janes), returns a clarifying question instead of guessing (Req 11.1a) → once resolved, pre-fills the *same* modal from the structured path → same confirm step, same audit entry, `entry_method` tagged for analytics only (Req 11.3a).

*The point of walking through both: they converge on the identical modal and audit record. Claude Design should build one Override component, not two.*

### Teacher: Escalation response (safety-critical — no navigation, no ambiguity about who's on it)

1. Distress signal detected on any free-text surface (Req 18.1, broadened past just practice responses)
2. Escalation created, Teacher notified within 5 seconds, notification deep-links straight to `/teacher/escalations/:id` — never a general list first
3. Screen shows full context, the scripted safeguarding message (unchanged, a safety property not a copy choice), and current `record_views` — who else (Teacher or Admin) has already opened this one (Req 19.2a)
4. Acknowledge / resolve / backup-escalate — same screen, no further navigation

### Admin: Subject activation (ties Pedagogical_Lead's platform-level work to a specific school going live)

1. Pedagogical_Lead validates a curriculum platform-wide (`/pedagogical-lead/review`, content_status → `validated`)
2. Admin's Briefing or `/admin/pilot` surfaces it as available to activate
3. Admin selects grade/class, sets `available_from` — Admin never gets content-edit access in this flow (Req 14.6), only the on/off/when decision
4. Activated content appears for the selected Students starting at `available_from`

### Admin: LMS integration setup (the one flow that's deliberately never conversational)

1. `/admin/lms-setup` — structured, credential-entry wizard, one step per field (Canvas dev key / Moodle token+functions / Google Workspace domain auth, depending on `lms_type`)
2. Plain-language guidance narrates each step, but there is no chat input on this screen at all — not a Command-Layer refusal, the screen simply doesn't have an entry point to route from (Req 37.1's carve-out)
3. On success, status shown; Teacher's *and Student's* Today/Week unlock for that tenant (both depend on the same read integration, task 11b — Student's was the one that fell through the cracks earlier in this redesign, worth not repeating the omission here), plus Teacher's read/write features

### Pedagogical_Lead: Content review — both branches, not just approve

1. `/pedagogical-lead/review`, reached from a Briefing item or directly
2. Item shown with AI-drafted content, current `content_status`, and `record_views` (another Lead already reviewing it, if so — Req 31.8c)
3. **Approve path:** sign-off → `pending_approval` → `validated`, now servable to Students
4. **Reject path (Req 31.8a — the branch that didn't exist before this redesign):** specific written feedback → back to `draft`, original author sees exactly what to change
5. **Editing already-`validated` content:** a distinct confirmation, separate from both paths above — "this is live, Students won't see your change until you approve it" (Req 31.8b), never a silent in-place edit

### Pedagogical_Lead: Unmatched Error → Misconception (the AI-proposes-human-decides pattern, shown once)

1. `/pedagogical-lead/errors`, an unmatched error selected
2. "Promote to misconception" — AI pre-drafts name/classification/remediation strategy from the actual error pattern, not a blank form
3. Pedagogical_Lead edits and confirms — same governance pattern as Space creation's natural-language-first flow, same pattern as content authoring generally

---

## Cross-Cutting State Inventory

*What states exist — not their visual treatment, that's the UI blueprint's job. Every state below needs a designed appearance in every screen where it can occur; none should be assumed away as "the happy path only."*

| Dimension | States | Where it appears |
|---|---|---|
| Mastery | not-attempted, struggling, emerging, tentative, durable | Mastery Overview, Student Progress, Briefings |
| Content status | draft, pending_approval, validated — plus an orthogonal in-progress-edit flag on `validated` items | Pedagogical_Lead review, Space content, Curation Queue |
| Coverage | rich, thin, gap, not-assessed | Mastery Overview, Pedagogical_Lead Briefing |
| Sync/connectivity | fresh, stale, syncing, unavailable | Any LMS-sourced Today/Week item, offline indicators |
| Escalation | unacknowledged, viewed (by whom, via `record_views`), acknowledged, backup-escalated, resolved | Escalation detail, Teacher/Admin Briefing |
| Briefing (Teacher/Admin/Pedagogical_Lead only) | populated, no-data-yet (named per role: no_spaces / no_rollout / no_content), insufficient-data, all-clear | Each role's landing route. *Student doesn't have a Briefing — Entry's state set is genuinely different in kind (returning-student / first-time / nothing-due, Req 7.1c/7.1d), not a fourth named variant of this same dimension; kept as its own row below rather than folded in here.* |
| Entry (Student only) | returning-student-with-a-clear-next-item, first-time/no-history, nothing-currently-due | `/practice` |
| LMS Integration | not_configured, authorized, error | Admin LMS setup, Today/Week staleness |
| Command Layer resolution | resolved, ambiguous (clarifying question), not-groundable (honest limits) | Any conversational entry point |
| Shared record access | whether another user currently has this record open, and who | Escalations, content review, Admin user/data management |

None of these four-or-five-state dimensions should share a visual language with each other in the UI blueprint — a person scanning quickly needs each one unambiguous at a glance, same principle as the pre-redesign blueprint already established for mastery/content/coverage/sync.

---

## Tone & Copy Principles

*Carried forward from the pre-redesign blueprint where still true, extended for the conversational surfaces that didn't exist before.*

- **Student-facing:** encouraging, never punitive, warm without being falsely cheerful. Applies identically whether the copy is structured feedback or a conversational hint.
- **Teacher/Admin/Pedagogical_Lead-facing:** precise and efficient — a Briefing item leads with the specific number/name/skill, not a full sentence before the useful information. This matters more now than before: the whole premise of a Briefing is that it's read in seconds, not studied.
- **Parent-facing:** plain language, zero jargon, unchanged.
- **Safeguarding messaging:** the scripted message is fixed, not a style choice — never varied, never "improved" creatively, regardless of which surface triggered it.
- **Conversational responses (new):** match the register of whoever's asking — Teacher/Admin/Pedagogical_Lead get precise and efficient even in chat form, Student gets warm even when the answer is structured. A clarifying question from the Command Layer states plainly what's ambiguous and lists the real candidates — never "I'm not sure what you mean," always specific enough to resolve in one reply.
- **Honest-limits responses (new):** a "can't answer that from available data" response says so plainly and briefly — never apologetic filler, never a guess dressed as an answer.
- **Empty/all-clear states:** inviting or honestly reassuring, never apologetic — "nothing urgent today" reads as good news, not a system with nothing to say.

---

## Accessibility & Device Requirements

*Unchanged from the pre-redesign blueprint — these were correct decisions independent of the interaction-model pivot.*

- Text-to-speech on all substantive Student-facing text.
- Color never the sole carrier of meaning for any state dimension above.
- Tap targets and text sizing account for shared, older, lower-spec devices in real classroom lighting.
- Primary design target: low-end Android, narrow viewport, 2Mbps connection — evaluate every screen against this first.
- No interaction pattern depends on hover, including Teacher/Admin/Pedagogical_Lead desktop views (Pedagogical_Lead is, if anything, the most consistently desktop-primary role of the four), for consistency across the product.
- Content centers rather than staying pinned to one edge on any viewport wider than its natural reading width.

