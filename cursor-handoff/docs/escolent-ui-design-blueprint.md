# Escolent MVP — UI Design Blueprint (v3, built from scratch against the AI-native redesign)

*Covers what escolent-ux-blueprint.md deliberately doesn't: the visual system — design personality, tokens, component states, content-state visual language, and responsive specifics. Where the UX blueprint defines *what states exist* and *what screens/flows exist*, this document defines *how they look*. Not extending the pre-redesign UI blueprint or the stray v3 draft found earlier in this project — this is a genuinely new design system per the locked decision, not an inheritance.*

---

## Design Personality

Calm, trustworthy, and quietly capable — unchanged as a sentiment from before the redesign, because it was never wrong, just attached to the wrong mechanism. Sharpened for what's actually different now: **the feeling of arriving somewhere that already did the thinking for you.** A Teacher opening `/teacher` shouldn't feel like they've opened a tool; it should feel like someone already looked and is telling them what matters. Never gamified in a way that trivializes learning. Never clinical in a way that feels cold about a child's understanding. Never busy in a way that undercuts the Briefing's whole premise — if the landing screen needs visual quieting to actually read like "here's what matters," that's a design failure, not a content problem.

---

## Design Tokens — Scope Decision

**This section defines the semantic system Claude Design must satisfy — not fixed hex values or a locked typography scale.** The pre-redesign blueprint could defer color choices because it was extending an existing system; this one can't, because there is no existing system to inherit — the decision was to build fresh. But locking exact brand colors here, without the iterative visual exploration that actually produces good ones, would front-load a decision this document isn't positioned to make well. What Claude Design gets instead: the semantic relationships and distinguishability requirements the palette must satisfy, decided during the actual visual design pass in Claude Design, not invented here.

**Semantic color roles needed (names, not values):**
- `surface` / `surface-raised` — base and elevated surfaces
- `content-primary` / `content-secondary` — text hierarchy
- `accent` — the product's primary brand color, used sparingly (per "calm," not a saturated UI)
- `urgent` / `informational` — the two Briefing item tiers (Requirement 10.1's distinction) — must read as different in kind, not just different in intensity of the same hue
- Five distinct token families for the five state dimensions below that need color (mastery, content-status, coverage, sync, escalation) — each family internally ordered (e.g., mastery's five states read as a progression) but never sharing a hue family with another dimension

**Typography:** a scale with enough steps to distinguish a Briefing item's headline from its supporting detail from a full Mastery Overview data table — three-to-four sizes is likely enough, exact values decided in Claude Design. One requirement worth stating here because it's structural, not aesthetic: Briefing and Today items need to read at a glance, so their primary text size floor should be set generously, not squeezed to fit more items per screen.

**Spacing:** a consistent scale (e.g., 4px base unit), applied so that structured destination screens (Mastery Overview, Skill Graph Editor) can be denser than Briefing/Today, which should stay generously spaced — density is earned by the task (scanning many data points) not applied uniformly.

---

## Content-State Visual Language

*Directly implements the UX blueprint's nine-dimension state inventory. Per that document's own requirement, none of these should share visual language with each other — restated here as the actual design constraint, not just a principle.*

| Dimension | States | Visual requirement |
|---|---|---|
| Mastery | not-attempted, struggling, emerging, tentative, durable | An ordered progression (5 steps) — the only dimension here that should read as a gradient/sequence, since it genuinely is one |
| Content status | draft, pending_approval, validated (+ in-progress-edit flag) | Three discrete states, not a progression read as urgency — draft isn't "worse" than validated, it's "not ready yet." The in-progress-edit flag is an overlay/badge on `validated`, not a fourth base state |
| Coverage | rich, thin, gap, not-assessed | Discrete, four states |
| Sync/connectivity | fresh, stale, syncing, unavailable | Needs a distinct treatment from all color-based states above — this is the one place an icon/animation (a sync glyph, not a color swatch) is more honest than color, since "stale" isn't a hue, it's a freshness signal |
| Escalation | unacknowledged, viewed, acknowledged, backup-escalated, resolved | The one dimension where "urgent" (unacknowledged) must be immediately, unmistakably distinguishable from every other state and every other dimension in this table — this is the safety-critical one, get it least-clever, most-obvious |
| Briefing state | populated, no-data-yet, insufficient-data, all-clear | Not really a "state color" dimension — these are whole-screen empty/loaded states, not a badge; see Empty & All-Clear States below |
| Entry state (Student) | returning, first-time, nothing-due | Same as above — whole-screen states, not badges |
| Command Layer resolution | resolved, ambiguous, not-groundable | Interaction-feedback states (see Conversational Surface Components below), not persistent badges |
| Shared record access | another user has this open, or not | A small, unobtrusive presence indicator (avatar/initials + "viewing"), never alarming — this is coordination information, not a warning |

---

## Component Library — Full State Matrix

*Every component below needs each listed state actually designed, not assumed from the default. New components (no pre-redesign equivalent) are marked explicitly.*

| Component | States needed | Notes |
|---|---|---|
| **Briefing item card** *(new)* | urgent, informational; tapped/active | The single most-repeated component in the product — appears on all three staff Briefings. Urgent vs. informational must be distinguishable without reading the text |
| **Today/Week item** *(new)* | source: escolent (actionable) / lms (reference-only, `action_route: null`); sync: fresh/stale/syncing/unavailable | The reference-only variant needs a visually distinct affordance from the actionable one — tapping it should never feel like a dead click. Admin's Today (Requirement 15b.1) never uses the `lms` variant at all — only Teacher's and Student's do — worth knowing so it isn't built for a screen that never shows it |
| **Entry continuation card** (Student) *(new)* | returning, first-time, nothing-due | Framing text changes per state (UX blueprint flow); the card's visual weight should stay consistent across all three — "nothing due" isn't a lesser state, it's a different message |
| **Mastery Overview grid** | not-attempted, struggling, emerging, tentative, durable (per cell); aggregated-default with a single-Space *switcher* | Carries over the pre-redesign color-coding approach for the five mastery states — still correct, just now explicitly the *destination*, not the landing screen. Teacher's aggregation is specifically a switcher (narrow to one Space, a real mode change) — a different shape from Admin Analytics' drill-down below, not the same pattern reused |
| **Practice problem card + scaffold ladder** | worked-example, partial-scaffold, hint-on-demand, independent; hint-just-used | Structured tiers, not a chat thread — the ladder's rungs should be visually legible as a sequence a Student is progressing through, not a single undifferentiated "hint box" |
| **Escalation card/detail** | unacknowledged, viewed, acknowledged, backup-escalated, resolved; presence indicator overlay | Highest-priority visual treatment in the whole system per the constraint above — design this one first, let everything else calibrate against it, not the other way around. This is the detail view (Teacher's primary response); Admin's oversight framing (an aging count, Requirement 15.7) is just a Briefing item card, not a second instance of this component |
| **Content-status badge** | draft, pending_approval, validated; edit-in-progress overlay on validated | Never shown to Students under any state (Requirement 32.6) — this badge should not exist in any Student-facing component variant at all, not just be hidden by a flag |
| **Override modal** | structured entry, conversational-pre-filled entry (visually identical once open — Requirement 11.2's confirmation is the same either way); ambiguity-clarification sub-state | One component, two entry paths, per the UX blueprint's explicit note to Claude Design |
| **LMS setup wizard** *(new)* | per-step (credential entry varies by `lms_type`); not_configured / authorized / error | Structured only — no chat affordance anywhere in this component, not even a disabled one (Requirement 37.1's carve-out should be invisible by omission, not shown-and-blocked) |
| **Skill Graph Editor** | node states (per Skill's content_status + mastery-adjacent coverage_status); edge/prerequisite states | Spatial/structural component, carried forward as correctly CRUD per the original brainstorm — chat-operable *on top* (filtering, not editing topology by voice) |
| **Presence indicator** *(new)* | 0, 1, 2+ other viewers | Small, calm, informational — never styled as a warning or lock icon, since it isn't restricting anyone |
| **Student Progress view** *(new — distinct from Mastery Overview, not the same component at a different scale)* | not-attempted, struggling, emerging, tentative, durable (per own-Skill) | Compact status strip or expandable tree, proportionate to one Student's own Skill set — explicitly not a shrunk version of Teacher's dense grid; found missing during pressure-testing |
| **Global Navigation Shell** *(new — added during the Student Shell deep-completion pass, found missing on review, independently confirmed by an outside review)* | default (full weight, all non-practice screens); minimal-weight (during active practice) | Top bar (wordmark, connectivity indicator) + Today/Learn/Progress tabs, wraps every Student screen. The minimal-weight variant during practice should be genuinely quiet — smaller, lower-contrast, not just the same component slightly shrunk — reusing the same "available but not asking for attention" treatment as the Command Layer's entry point |
| **Learn / Course Map** *(new — the concrete screen for Requirements 32.5 and 34, previously specified but never designed)* | skill row (collapsed/expanded); content loading / loaded | Skills in progression order, matching Progress's ordering logic. Expanded state shows the Lens-generated instructional content Requirement 34 already specifies — a fixed, skill_type-driven explanation, not a generic AI summary invented at this screen — plus a quiet source-citation link. Same "generated content, source stays visible" pattern as Space creation's review step, not a novel pattern |
| **Space card + creation/editing flow** *(new — the founding instance of "AI proposes, human reviews," everything else in this document generalizes from this pattern)* | draft-from-description (AI-proposed), reviewed/edited, saved; list view (space cards) vs. edit view | Natural-language-first: description in, structured result underneath for review — same governance shape as the Conversational Command Layer's resolved-and-confirming state, but this is the original, not a derivative; found missing during pressure-testing |
| **Admin Analytics view** *(new — distinct from Mastery Overview; charts/aggregate metrics, not a per-student grid)* | populated, insufficient-data (shared framing with Admin Briefing's own insufficient-data state); school-wide default with drill-down | Adoption + mastery distribution metrics, school-wide by default, with drill-down into a Teacher/class/date-range — not a switcher like Teacher's Mastery Overview above; same "aggregate wide, narrow on demand" principle, opposite starting scope, per the interaction model's own distinction between these two patterns. Found missing during pressure-testing |
| **Admin Pilot & Subject-Activation view** *(new)* | class enabled/disabled; subject not-yet-activated / activated (with `available_from`) | Admin only ever sees `validated` content as an on/off/when toggle here, never edits it (Requirement 14.6) — the component itself should have no edit affordance for Skill/Misconception content, not just a permission check preventing one; found missing during pressure-testing |
| **Admin User/Role management view** *(new)* | invite form, role-change, ambiguity-clarification sub-state (shared with Override modal's pattern) | Same "one component, two entry paths" shape as the Override modal; found missing during pressure-testing |
| **Admin Data Requests view** *(new)* | pending, verified, processing, complete; guardian-initiated vs. admin-initiated (visually identical — the distinction is in the data, not the UI) | Structured, no Conversational Command Layer affordance for the deletion action itself, only for finding/viewing a request (Requirement 37.1-style carve-out on the destructive action specifically); found missing during pressure-testing |
| **Admin Billing view** *(new)* | plan/seats/renewal display; plan-change form (structured-only, same carve-out as LMS setup) | Found missing during pressure-testing |
| **Unmatched Error card** (Pedagogical_Lead) *(new — distinct from the Content-status badge, which only indicates status, not the review action itself)* | unreviewed, AI-pre-drafted-for-promotion, reviewed | Shows anonymized student response + the AI-drafted misconception entry inline, not as a separate screen; found missing during pressure-testing |
| **Content review queue/detail** (Pedagogical_Lead) *(new — the actual approve/reject screen, distinct from the badge that only labels status)* | pending_approval item shown with content_status, presence indicator; approve sub-state, reject sub-state (feedback field), edit-live-content sub-state (distinct confirmation) | This is where the three Pedagogical_Lead content-validation flows from the UX blueprint actually live visually; found missing during pressure-testing |

---

## Conversational Surface Components

*New category, no pre-redesign equivalent — these implement the Conversational Command Layer (design.md §20) visually. One shared component set used everywhere a plain-language entry point exists, not reinvented per screen.*

- **Persistent entry point:** a low-key, consistently-placed affordance available within any screen that has one (per Requirement 37.1's per-screen carve-outs) — should read as "you can also just say what you want," not as a prominent chatbot invitation competing with the screen's actual content
- **Resolved-and-confirming state:** the Command Layer's output is never its own distinct UI — it pre-fills the *existing* structured component (the Override modal, the invite-user form) and hands off to that component's own confirmation step. There is no separate "AI did this, confirm?" screen distinct from the structured one
- **Ambiguous-clarification state:** presents the real candidates as tappable options (not a re-prompt asking the person to type more precisely) — resolving ambiguity should take one tap, not a second guess
- **Honest-limits state:** a plain, brief statement that the request can't be answered from available data — visually calm, not an error state (nothing went wrong; the system is being honest about a boundary)

---

## Empty, All-Clear, and Cold-Start States

*Per-role Briefing/Entry states from the UX blueprint's inventory — each needs distinct, intentional copy and visual treatment, not a shared generic "nothing here" placeholder reused across all of them.*

- **Teacher/Admin/Pedagogical_Lead — no data yet** (`no_spaces` / `no_rollout` / `no_content`): routes to the relevant setup flow, framed as a beginning, not an absence
- **Teacher/Admin/Pedagogical_Lead — insufficient data**: states plainly that data is still accumulating; defaults to the structured destination screen (Mastery Overview / Analytics / — Pedagogical_Lead has no direct equivalent, defaults to the authoring flow) rather than showing an empty Briefing
- **Teacher/Admin/Pedagogical_Lead — all-clear**: genuinely calm, not a false triumph — "nothing urgent today" is informational, not a celebration
- **Student — first-time**: fresh-start framing, explicitly never implies returning progress that doesn't exist
- **Student — nothing due**: honest, with optional enrichment offered but not pushed

---

## Responsive and Device Guidance

- **Primary target: low-end Android, narrow viewport, 2Mbps connection** — design and evaluate every screen against this first, per the UX blueprint's accessibility section. Briefing and Today, being the landing surfaces for three of four roles, matter most here — they're the first thing rendered on the worst connection.
- **Secondary: standard desktop/tablet** for Teacher/Admin/Pedagogical_Lead, who are more likely on a laptop than Students are — but no interaction pattern depends on hover for any of the three (Pedagogical_Lead most consistently desktop-primary of the three, per the interaction model, but held to the same no-hover rule for product-wide consistency).
- **Content centers rather than staying pinned to one edge** on any viewport wider than its natural reading width — applies to every screen, not just wide dashboard-style views (Mastery Overview, Analytics).
- **Structured destination screens may be denser than Briefing/Today** on wider viewports (more of the Mastery Overview grid visible at once, for instance) — density scales with viewport on screens where scanning more data is the point; Briefing/Today stay generously spaced regardless of viewport, since their point is a fast read, not more content per screen.

---

## What to Hand to Claude Design, and What Not To

**Hand over:** the screen inventory and routes (UX blueprint), the full component state matrix above, the content-state visual requirements (which dimensions must never share visual language), the conversational-surface component set, and the empty/all-clear state list — with explicit instruction to design a genuinely new visual system, not extend or reference the pre-redesign one.

**Don't hand over:** fixed hex values, a locked typography scale, or exact spacing numbers — those are semantic requirements here, real decisions in Claude Design's own iterative visual pass. Also don't hand over the old design system's actual tokens or components as a starting point, even for reference — the instruction is to start fresh, and having the old system in view risks anchoring on it by habit.



