# Implementation Plan: Escolent MVP Adaptive Learning Platform

## Overview

This implementation plan breaks down the Escolent MVP into discrete, testable coding tasks. The platform is a TypeScript/Next.js PWA with Supabase backend, implementing five core adaptive learning components: Skill Graph, Knowledge Tracing, Misconception Detection, Spaced Repetition, and Scaffolding. The system supports four user roles (Student, Teacher, Admin, Pedagogical_Lead) with multi-tenant isolation enforced via Row Level Security.

The implementation follows an incremental approach: infrastructure → authentication → core adaptive learning engines → Briefing/Entry interaction layer → offline support → compliance features.

## Build Log

*Updated after every completed task or checkpoint. This is the authoritative live status — checkboxes below reflect it.*

- **2026-08-15** — Task 1 (1.1–1.6) + Task 2 checkpoint complete. PR #1 (project infra, Next.js/PWA scaffold, full DB schema, RLS policies) merged; PR #2 (missing `skills.subject` column + 4 additional negative-path RLS tests) merged. 84/84 DB tests passing, including confirmed negative-path RLS coverage for all four roles (student cross-tenant, teacher cross-tenant and cross-space, admin cross-tenant write, Pedagogical_Lead scope limits). Next: Task 3 (authentication, all four roles).

## Tasks

- [x] 1. Set up project infrastructure and core database schema
  - [x] 1.1 Initialize Next.js 14+ project with TypeScript, Tailwind CSS, and PWA configuration
    - Initialize Next.js 14 project with App Router
    - Configure TypeScript with strict mode
    - Set up Tailwind CSS
    - Configure Workbox for service worker generation
    - Set up PWA manifest with offline support configuration
    - _Requirements: 23.1, 23.2, 8.1_

  - [x] 1.2 Configure Supabase connection and create multi-tenancy foundation tables
    - Set up Supabase client with environment variables
    - Create `tenants` table with billing status
    - Create `users` table with tenant_id foreign key and LMS integration fields
    - Create `user_roles` table for role-based access control
    - Enable Row Level Security (RLS) on all tenant-scoped tables
    - _Requirements: 21.1, 21.2, 21.3, 1.1, 1.2, 1A.1_

  - [x] 1.3 Create skill graph and mastery state database tables
    - Create `skills` table with prerequisite_ids JSON array, skill_type enum, subject field, evaluation_strategy enum (default 'exact_match'), rubric JSONB (nullable), and content_status enum (default 'draft') — these subject-agnostic fields (Requirement 31, design.md Section 14a/14d) are created here, in the initial schema, not deferred to Task 28, so the content-approval gate exists before any content or pilot launch
    - Create `mastery_states` table with probability, response_history JSONB, and mastery flags
    - Create indexes for skill graph traversal queries
    - Create indexes for mastery state lookups by student and skill
    - _Requirements: 2.1, 2.2, 2.5, 3.2, 3.3, 31.1, 31.6_

  - [x] 1.4 Create misconception taxonomy and spaced repetition database tables
    - Create `misconceptions` table with error_pattern JSONB, classification enum, and content_status enum (default 'draft') — same rationale as 1.3, created upfront rather than deferred to Task 28
    - Create `student_misconceptions` table tracking occurrence counts
    - Create `unmatched_errors` table with anonymized student IDs
    - Create `spaced_repetition_schedules` table with SM-2 algorithm fields
    - Create indexes for due review queries
    - _Requirements: 4.1, 4.2, 4.7, 4.8, 5.1, 31.6_

  - [x] 1.5 Create session, space, and escalation database tables
    - Create `sessions` table with status enum and problems JSONB array
    - Create `spaces` table with included_skill_ids array and classroom_pacing_mode
    - Create `space_enrollments` junction table
    - Create `mastery_overrides` table with reason validation constraint
    - Create `distress_escalations` table with detection_method enum
    - Create `audit_logs` table for POPIA compliance
    - Create indexes for active sessions and unacknowledged escalations
    - _Requirements: 7.7, 9.1, 9.2, 11.1, 11.2, 18.5, 29.1_

  - [x] 1.6 Implement Row Level Security (RLS) policies for all tenant-scoped tables
    - Create RLS policies for students (own data access only)
    - Create RLS policies for teachers (tenant-scoped read access)
    - Create RLS policies for admins (tenant-scoped full access)
    - Create special RLS policies for Pedagogical_Lead (cross-tenant read for unmatched_errors, cross-tenant INSERT and UPDATE for misconceptions)
    - Test RLS enforcement with sample queries
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 2. Checkpoint - Database schema validation
  - Run database migrations and verify all tables created successfully
  - Test RLS policies with sample tenant data
  - Ensure all indexes created and foreign key constraints enforced
  - Ask the user if questions arise

- [ ] 3. Implement authentication system for all four user roles
  - [ ] 3.1 Create LTI 1.3 authentication flow for Canvas/Moodle
    - Implement `POST /api/auth/lti/login` endpoint for OIDC initiation
    - Implement `POST /api/auth/lti/launch` endpoint for JWT validation
    - Implement `GET /api/auth/lti/jwks` endpoint for public key publishing
    - Extract user role, tenant ID, and course context from LTI JWT claims
    - Create or retrieve Supabase user and set session with tenant_id context
    - Store LMS configuration per tenant in `lms_configs` table
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [ ] 3.2 Write unit tests for LTI JWT validation and session creation
    - Test valid LTI JWT creates session successfully
    - Test tampered JWT signature rejected
    - Test expired JWT rejected
    - Test missing required claims rejected
    - Test correct tenant_id extracted and set in session
    - _Requirements: 1.1, 1.4_

  - [ ] 3.3 Create Google Classroom API authentication flow
    - Implement `GET /api/auth/google/callback` endpoint for OAuth callback
    - Implement `POST /api/auth/google/launch` endpoint for token validation
    - Extract user role and course context from Google Classroom API
    - Infer tenant from course ownership mapping
    - Create or retrieve Supabase user and set session
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 3.4 Create Admin direct authentication flow
    - Implement `POST /api/auth/admin/login` endpoint with SSO validation
    - Implement `POST /api/auth/admin/logout` endpoint for session termination
    - Create `/admin/login` page with credential input form
    - Validate user has `admin` role in `user_roles` table
    - Set RLS context with tenant_id from user's school association
    - Redirect to Admin's Entry experience on success (design.md Section 22) — not a dashboard
    - _Requirements: 1A.1, 1A.2, 1A.3, 1A.4, 1A.5_

  - [ ] 3.5 Create Pedagogical_Lead authentication flow
    - Implement `/pedagogical-lead/login` page
    - Validate user has `pedagogical_lead` role (global, no tenant constraint)
    - Set session without tenant_id constraint for cross-tenant access
    - Redirect to Pedagogical_Lead's Entry experience on success (design.md Section 23) — not a curation dashboard
    - _Requirements: 31a.1_

  - [ ] 3.6 Write integration tests for all authentication flows
    - Test Student LTI launch from Canvas creates session and begins Entry (Requirement 7) directly, with no intermediate menu
    - Test Teacher LTI launch begins the Teacher Briefing (Requirement 10)
    - Test Admin direct login begins the Admin Briefing (Requirement 15)
    - Test Pedagogical_Lead login grants cross-tenant read access and begins the Pedagogical_Lead Briefing (Requirement 31a)
    - Test authentication failures display error messages with support contact
    - _Requirements: 1.1, 1.2, 1.3, 1A.1, 1A.3_

- [ ] 4. Implement skill graph system and prerequisite traversal
  - [ ] 4.1 Create skill graph data loader and prerequisite traversal functions
    - Implement breadth-first search (BFS) for prerequisite identification
    - Implement topological sort for skill unlock sequencing
    - Implement cycle detection validation for skill creation/modification
    - Create TypeScript interfaces for Skill and traversal results
    - Load a small test dataset (5-10 skills, IEB Grade 8 algebra) to validate the traversal logic against real-shaped data — this is a development fixture, not the pilot's actual content; the full curriculum load is task 25 and should not be duplicated here. *(Clarification added during pressure-testing: this line and task 25's were previously indistinguishable, risking either double-loading content or task 25 being skipped as apparently redundant.)*
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ] 4.2 Write property test for skill unlock on mastery
    - **Property 1: Skill Unlock on Mastery**
    - **Validates: Requirements 2.3**
    - Generate random skill DAGs with 10-50 nodes
    - For any skill marked mastered, verify all dependent skills become available
    - Run with 100+ iterations using fast-check

  - [ ] 4.3 Write property test for prerequisite identification via graph traversal
    - **Property 2: Prerequisite Identification via Graph Traversal**
    - **Validates: Requirements 2.4**
    - Generate random skill DAGs with varying depths
    - For any skill with mastery < 0.5, verify BFS returns transitive closure of prerequisites
    - Run with 100+ iterations using fast-check

  - [ ] 4.4 Create Pedagogical_Lead UI for skill graph modification
    - Create `/pedagogical-lead/skills` page listing all platform skills
    - Create form for adding new skills with prerequisite selection
    - Create form for editing existing skills (name, description, prerequisites)
    - Implement cycle detection validation on skill save
    - Display visual skill graph using React Flow or similar
    - _Requirements: 2.5_

- [ ] 5. Implement knowledge tracing engine with Bayesian Knowledge Tracing
  - [ ] 5.1 Create mastery state update function implementing simplified BKT algorithm
    - Implement BKT update logic (correct answers increase probability, incorrect decrease)
    - Weight updates by problem difficulty (1-5 scale)
    - Track response history (last 10 responses per skill)
    - Calculate and update tentative mastery flag based on skill-type threshold (0.85 procedural, 0.90 conceptual)
    - Track mastered_session_count for durable mastery calculation
    - Store response_time_ms for diagnostic visibility WITHOUT using in calculation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8_

  - [ ] 5.2 Create API endpoint for submitting student responses and updating mastery
    - Implement `POST /api/session/submit-response` endpoint
    - Validate response correctness (exact match, symbolic equivalence, or LLM evaluation)
    - Fetch current mastery state and response history from database
    - Call mastery update function with response data
    - Update `mastery_states` table with new probability and flags
    - Return feedback, next problem, and updated mastery state (target < 2 seconds)
    - _Requirements: 3.1, 3.3, 3.6_

  - [ ] 5.3 Write property test for mastery state update following BKT rules
    - **Property 3: Mastery State Update Follows BKT Rules**
    - **Validates: Requirements 3.1, 3.3**
    - Generate random current mastery probabilities [0, 1] and problem difficulties [1, 5]
    - For correct answers, verify probability increases
    - For incorrect answers, verify probability decreases
    - Verify updates weighted by difficulty
    - Run with 100+ iterations using fast-check

  - [ ] 5.4 Write property test for mastery state isolation between students
    - **Property 4: Mastery State Isolation Between Students**
    - **Validates: Requirements 3.2**
    - Generate two distinct student IDs and skill IDs
    - Update mastery state for student A
    - Verify student B's mastery state unchanged
    - Run with 100+ iterations using fast-check

  - [ ] 5.5 Write property test for mastery threshold detection
    - **Property 5: Mastery Threshold Detection**
    - **Validates: Requirements 3.4, 3.5**
    - Generate random mastery probabilities and skill types (procedural/conceptual)
    - Verify correct threshold applied (0.85 procedural, 0.90 conceptual)
    - Verify tentative mastery flag set if and only if probability >= threshold
    - Run with 100+ iterations using fast-check

  - [ ] 5.6 Write property test for durable mastery requiring multi-session confirmation
    - **Property 6: Durable Mastery Requires Multi-Session Confirmation**
    - **Validates: Requirements 3.6**
    - Generate session histories with varying mastery levels across days
    - Verify durable mastery flag set if and only if threshold exceeded in 2+ sessions on different days
    - Run with 100+ iterations using fast-check

  - [ ] 5.7 Write property test for response time invariance in mastery calculation
    - **Property 7: Response Time Invariance in Mastery Calculation**
    - **Validates: Requirements 3.8**
    - Generate pairs of responses identical except for response_time_ms
    - Verify identical mastery state updates produced
    - Run with 100+ iterations using fast-check

- [ ] 6. Checkpoint - Knowledge tracing validation
  - Run all property tests for knowledge tracing (Properties 3-7)
  - Verify mastery updates complete within 2 seconds for 95th percentile
  - Test with realistic response history sizes (0-10 responses)
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Implement misconception detection and remediation system
  - [ ] 7.1 Create misconception taxonomy data structure and pattern matcher
    - Implement symbolic pattern matching for exact error patterns
    - Implement regex pattern matching for common error formats
    - Implement LLM-based semantic matching for complex errors
    - Check misconception classification (repetition_confirmed vs first_occurrence_actionable)
    - Check student error history for pattern frequency
    - Return matched misconception ID and remediation strategy
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 7.2 Create API endpoint for misconception detection
    - Implement `POST /api/misconception/detect` endpoint
    - Run pattern matching sequence (symbolic → regex → semantic, target < 3 seconds)
    - Log matched misconceptions to `student_misconceptions` table
    - Log unmatched errors to `unmatched_errors` table with anonymized student ID
    - Return remediation strategy or generic Socratic prompt
    - _Requirements: 4.3, 4.5, 4.8, 4.9_

  - [ ] 7.3 Write property test for misconception pattern matching correctness
    - **Property 8: Misconception Pattern Matching Correctness**
    - **Validates: Requirements 4.3**
    - Generate random incorrect responses and error patterns (symbolic, regex, semantic)
    - Verify match returned if and only if response satisfies pattern definition
    - Run with 100+ iterations using fast-check

  - [ ] 7.4 Write property test for misconception vs slip classification
    - **Property 9: Misconception vs Slip Classification**
    - **Validates: Requirements 4.4**
    - Generate student error histories with varying frequencies
    - Verify classification as misconception if frequency meets threshold
    - Verify classification as slip otherwise
    - Run with 100+ iterations using fast-check

  - [ ] 7.5 Implement language comprehension difficulty detection
    - Detect uniform error frequency across skills with LLM language pattern analysis
    - Flag response for teacher review when language issue detected
    - Display "Possible language comprehension difficulty" in Teacher's Mastery Overview (design.md Section 10b) — not a dashboard
    - _Requirements: 4.6_

  - [ ] 7.6 Create Pedagogical_Lead unmatched error curation flow
    - Create `/pedagogical-lead/errors` page listing unmatched errors across all tenants, also reachable directly from a `pending_review`-category item in the Pedagogical_Lead Briefing task (added later in this rewrite, design.md Section 23) *(correction: this previously cited "task 22 below," which is actually the system-integration checkpoint, not the Pedagogical_Lead Briefing — that task doesn't have a number yet since it's still ahead in this rewrite; removed the wrong citation rather than leave it)*
    - Display anonymized student ID, skill, problem text, student response, correct answer
    - Implement filters (reviewed status, skill, tenant)
    - Implement "promote to misconception" action that pre-drafts the entry (name, description, classification, remediation strategy) via the LLM abstraction layer (task 17), not a blank manual form — Pedagogical_Lead reviews and edits before saving
    - Insert a `record_views` row (record_type: 'skill'/'misconception', design.md Section 12/14d/22a) when an unmatched error is opened for review, and surface if another Pedagogical_Lead has it open — same shared-visibility mechanism as content review generally, not a separate one
    - Implement `POST /api/pedagogical-lead/misconceptions` endpoint for taxonomy additions
    - Implement `POST /api/pedagogical-lead/errors/:id/mark-reviewed` endpoint
    - _Requirements: 4.8, 4.9, 31.8c_

- [ ] 8. Implement spaced repetition scheduler using SM-2 algorithm
  - [ ] 8.1 Create spaced repetition schedule creation and update functions
    - Implement schedule creation on durable mastery (initial interval 1 day, ease_factor 2.5)
    - Implement interval increase on correct review (interval * ease_factor)
    - Implement interval decrease on incorrect review (reset to 1 day minimum)
    - Ensure ease_factor remains in [1.3, 2.5] range
    - Store schedules in `spaced_repetition_schedules` table
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 8.2 Create query function for due spaced repetition reviews
    - Query `spaced_repetition_schedules` for reviews where next_review_date <= NOW()
    - Return list of skill IDs and student IDs for due reviews
    - Order by priority (shortest interval first)
    - _Requirements: 5.1, 5.4_

  - [ ] 8.3 Write property test for spaced repetition schedule creation on durable mastery
    - **Property 10: Spaced Repetition Schedule Creation on Durable Mastery**
    - **Validates: Requirements 5.1**
    - Generate skills marked as durably mastered
    - Verify schedule created with interval = 1 day and ease_factor = 2.5
    - Run with 100+ iterations using fast-check

  - [ ] 8.4 Write property test for interval increase on successful review
    - **Property 11: Spaced Repetition Interval Increase on Successful Review**
    - **Validates: Requirements 5.2**
    - Generate correct review responses with varying intervals and ease factors
    - Verify next interval = current_interval * ease_factor
    - Verify ease_factor >= 1.3
    - Run with 100+ iterations using fast-check

  - [ ] 8.5 Write property test for interval decrease on failed review
    - **Property 12: Spaced Repetition Interval Decrease on Failed Review**
    - **Validates: Requirements 5.3**
    - Generate incorrect review responses with varying intervals
    - Verify interval reset to minimum 1 day
    - Verify ease_factor decreased but >= 1.3
    - Run with 100+ iterations using fast-check

  - [ ] 8.6 Write property test for spaced repetition problem limit in sessions
    - **Property 13: Spaced Repetition Problem Limit in Sessions**
    - **Validates: Requirements 5.5**
    - Generate sessions with varying total problem counts and due reviews
    - Verify spaced repetition problems <= 20% of total (rounded down)
    - Run with 100+ iterations using fast-check

- [ ] 9. Implement cognitive load-aware scaffolding system
  - [ ] 9.1 Create scaffolding level selector based on mastery state
    - Map mastery probability to scaffolding level (worked_example < 0.3, partial_scaffold 0.3-0.7, hint_on_demand 0.7-threshold, independent >= threshold)
    - Apply skill-type-specific thresholds (0.85 procedural, 0.90 conceptual)
    - Return appropriate scaffolding level for problem generation
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 9.2 Create hint request handler with mastery penalty
    - Implement `POST /api/session/request-hint` endpoint
    - Return progressive hint based on current scaffolding level
    - Apply hint_penalty (-0.05) to mastery probability
    - Log hint request for self-regulation tracking
    - _Requirements: 6.5_

  - [ ] 9.3 Write property test for hint penalty consistent application
    - **Property 15: Hint Penalty Consistent Application**
    - **Validates: Requirements 6.5**
    - Generate hint requests during independent/hint_on_demand levels
    - Verify consistent penalty (-0.05) applied regardless of hint content
    - Run with 100+ iterations using fast-check

  - [ ] 9.4 Create problem generation service with scaffolding integration
    - Generate worked examples with step-by-step explanations for scaffolding level worked_example
    - Generate partially completed problems with hints for partial_scaffold
    - Generate independent problems without hints for independent level
    - Provide hints on demand for hint_on_demand level
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 9.5 Implement ladder-exhaustion exit (design.md Section 6)
    - When a student remains incorrect after an `independent`-level attempt with no further scaffolding tier to escalate to, flag the attempt for Teacher review instead of repeating the same tier indefinitely
    - Route the flagged attempt through existing Misconception pattern matching (task 7.1-7.2); if matched, use the existing targeted-remediation path
    - If unmatched, log via the existing `unmatched_errors` path (task 7.2) — no new mechanism, just this trigger reusing infrastructure built for a different one
    - _Requirements: 6.6_

  - [ ] 9.6 Write unit test for ladder-exhaustion routing
    - Test a student incorrect at `independent` level with a matching Misconception pattern routes to targeted remediation, not a repeated `independent` problem
    - Test a student incorrect at `independent` level with no matching pattern logs to `unmatched_errors`
    - _Requirements: 6.6_

- [ ] 10. Implement adaptive practice session engine

  - [ ] 10.1 Implement Entry / session auto-start logic (design.md Section 7 — new; did not exist before the interaction model redesign)
    - Fetch the Student's active Space enrollments (there may be more than one)
    - For each enrolled Space, compute candidate next-Skills: spaced-repetition items due (task 8.2), flagged prerequisite gaps, unattempted Skills with met prerequisites — each candidate stays scoped to its own Space's boundaries and classroom pacing mode
    - Rank candidates across all enrolled Spaces together (spaced-repetition overdue > flagged gap > new Skill) and select the single highest-priority one
    - Begin a Session directly in the winning Space/Skill, no intermediate confirmation screen, with a one-line reason surfaced (e.g., "spaced-repetition due", "you were close last time")
    - Handle three states explicitly: (a) returning student with a clear next item — the common case above; (b) no prior Session history — select the first Skill in the Skill_Graph with no unmet prerequisites, using a distinct "fresh start" copy template, not the "returning" one; (c) nothing currently due — an honest "nothing due" state with optional, non-required enrichment practice offered
    - Read the *decision* (steps 2-3) from the client's local `mastery_cache` and `spaced_repetition_cache` (task 18, IndexedDB) so it resolves without a network round trip; actually loading a brand-new Session's Practice_Problem content still follows the existing offline connectivity rule (task 18) — the decision and the content-load are two different things, not one
    - _Requirements: 7.1, 7.1a, 7.1b, 7.1c, 7.1d, 7.1e, 7.1f_

  - [ ] 10.2 Write property test for Entry respecting Space boundaries across multiple enrollments
    - **Property 26: Entry Respects Space Boundaries Across Multiple Enrollments**
    - **Validates: Requirements 7.1, 7.1f, 20.1**
    - Generate Students with 1-4 active Space enrollments, each with distinct boundaries and pacing modes
    - Verify the Skill Entry selects always falls within the boundaries of the specific Space it was drawn from
    - Verify no candidate from one Space's boundary is ever presented as belonging to a different Space
    - Run with 100+ iterations using fast-check

  - [ ] 10.3 Create session initialization and problem selection algorithm
    - Implement `POST /api/session/start` endpoint, called with the Space/Skill Entry (task 10.1) selected
    - Fetch Space boundaries (included_skill_ids, difficulty_range, classroom_pacing_mode)
    - Fetch student's mastery states for all Space skills
    - Query due spaced repetition reviews (max 20% of session)
    - Identify skills needing practice (struggling < 0.5, emerging 0.5-0.85, new with prerequisites met)
    - Handle classroom pacing mode (prioritize Space skills, flag prerequisite gaps vs. auto-inject remediation)
    - Select problem at appropriate scaffolding level based on mastery state, with a structured answer input matched to the Skill's `evaluation_strategy` (symbolic/numeric field for exact_match/symbolic_equivalence, free-text for rubric_llm) — not a general chat input
    - Return session ID and first problem
    - _Requirements: 7.2, 7.5, 7.6, 5.4, 5.5_

  - [ ] 10.4 Write property test for adaptive problem selection with all constraints
    - **Property 14: Adaptive Problem Selection with Boundary and Scaffolding Constraints**
    - **Validates: Requirements 6.2, 7.2, 7.4, 7.5, 7.6, 20.1** *(citation fix: previously cited 7.1, which after the Entry rewrite (task 10.1) now describes the auto-start decision, not in-session problem selection — see Property 26 for that)*
    - Generate random mastery states, space configurations, and due reviews
    - Verify problems only from space included_skill_ids
    - Verify problems within difficulty_range
    - Verify scaffolding level matches mastery state
    - Verify spaced repetition reviews <= 20%
    - Verify prerequisite injection when pacing mode false
    - Verify prerequisite gap flagging when pacing mode true
    - Run with 100+ iterations using fast-check

  - [ ] 10.5 Create session autosave and natural stopping point logic
    - Implement autosave every 30 seconds or after each response (whichever first)
    - Save session state to `sessions` table with status and problems array
    - After 10-15 problems or 15-20 minutes, suggest stopping point
    - Allow student to continue or end session
    - _Requirements: 7.2, 7.3_

  - [ ] 10.6 Create session completion endpoint
    - Implement `POST /api/session/complete` endpoint
    - Update session status to 'completed'
    - Check for new durable mastery achievements (threshold met in 2+ sessions on different days)
    - Create spaced repetition schedules for newly durably mastered skills
    - Return an honest session summary in the flow (what got more solid, what's still shaky) — not a bare score
    - _Requirements: 7.3, 5.1_

  - [ ] 10.7 Write unit tests for session management
    - Test session autosave triggered every 30 seconds
    - Test session autosave triggered after each response
    - Test natural stopping point suggested after 10-15 problems
    - Test natural stopping point suggested after 15-20 minutes
    - Test session completion marks status 'completed'
    - Test Entry's three states (task 10.1): returning student, no prior history, nothing due
    - _Requirements: 7.2, 7.3, 7.1c, 7.1d_

- [ ] 11. Checkpoint - Core adaptive learning validation
  - Run all property tests for spaced repetition (Properties 10-13)
  - Run property test for Entry's Space-boundary correctness (Property 26)
  - Run property test for adaptive problem selection (Property 14)
  - Run property test for hint penalty (Property 15)
  - Test complete flow: Entry auto-start → session begins → submit responses → autosave → natural stop → complete, across a Student with more than one Space enrollment
  - Verify all core adaptive learning components integrated correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 11a. Implement the Conversational Command Interpretation Layer (design.md Section 20 — new; foundational for every "or via plain-language request" capability starting at Task 12)
  - [ ] 11a.1 Implement command intent classification and resolution
    - Implement `POST /api/command/interpret` — classifies a plain-language request against the finite set of structured actions available to the requester's role (never an open-ended action space), scoped by the same RLS boundary the equivalent click-driven request would have
    - This runs *after* auth/RLS resolution, not before — the command layer never has broader access than the user issuing the command
    - Extract parameters and resolve them against real records
    - _Requirements: 37.1, 37.2_

  - [ ] 11a.2 Implement ambiguous-parameter clarification
    - WHEN a required parameter matches more than one candidate record, return a clarifying question and candidate list — never execute against a best-effort guess
    - _Requirements: 37.5_

  - [ ] 11a.3 Implement honest-limits fallback
    - WHEN a request can't be grounded in retrievable data at all, return an honest "can't answer that from available data" response
    - _Requirements: 37.4_

  - [ ] 11a.4 Route resolved commands to existing structured endpoints
    - On successful resolution, route to the *existing* endpoint with resolved parameters pre-filled — the endpoint's own confirmation step (where one exists) still fires; this layer pre-fills, it does not skip confirmation
    - Log every resulting action with `entry_method: 'conversational'`, reusing the same field already established for Overrides (task 12.6) rather than inventing a second logging convention
    - Explicitly exclude any endpoint Requirement 37.1 carves out as structured-only (LMS integration setup, task 11b; Billing plan changes, task 16.14) — these screens have no chat-entry point to begin with
    - _Requirements: 37.6_

  - [ ] 11a.5 Write property tests for command-layer governance
    - **Property 27: Conversational Commands Never Bypass Confirmation or Audit** — **Validates: Requirements 11.2, 11.3a, 14a.4, 37.5, 37.6** (test harness only; concrete assertions live alongside the specific actions it covers, e.g. task 12.8)
    - **Property 28: Ambiguous Commands Resolve to Clarification, Never a Guess**
    - **Validates: Requirements 11.1a, 14a.2, 37.5**
    - Generate plain-language requests with 2+ matching candidates for a required parameter across several action types
    - Verify every case returns a clarifying question, never an executed action
    - Run with 100+ iterations using fast-check

- [ ] 11b. Implement LMS Integration: Setup and Read/Write (design.md Section 21 — new; needed before Teacher/Student Today, Task 12.2 and 19.3)
  - [ ] 11b.1 Create `lms_integrations` table and institutional setup flow
    - Create table: tenant_id, lms_type, status, encrypted credentials, authorized_by/at, last_sync_at/error
    - Implement `POST /api/admin/lms/authorize` — structured, credential-entry flow (Canvas developer key / Moodle web-service token + enabled functions / Google Classroom domain OAuth, depending on `lms_type`) — deliberately not reachable via task 11a's Command Layer, security-sensitive
    - Encrypt `credentials` at the application layer, key held outside the database
    - Implement `GET /api/admin/lms/status`
    - _Requirements: 15b.4, 15b.5_

  - [ ] 11b.2 Implement per-platform read adapters
    - Implement thin adapters for Canvas REST, Moodle web services, Google Classroom API, normalized to a common `LMSAssignment` shape (lms_assignment_id, title, due_at, grading_deadline, space_id)
    - Each adapter exposes only the operations the tenant's actual authorized scope permits — e.g., a Moodle deployment without a given web-service function enabled simply doesn't offer that read, rather than offering it and failing at request time
    - Populate `sync_status` ('fresh' | 'stale' | 'syncing' | 'unavailable') from whether the last adapter call actually succeeded, not a guess
    - _Requirements: 36.1, 36.7_

  - [ ] 11b.3 Implement grade write-back (Phase 1 write capability)
    - Implement `POST /api/lms/grades/push` — writes an Escolent-earned score to the source LMS gradebook via the same per-platform adapter
    - _Requirements: 36.2_

  - [ ] 11b.4 Write property test for LMS capability gating
    - **Property 29: LMS Actions Never Exceed Authorized Capability**
    - **Validates: Requirements 36.1, 36.2, 36.7**
    - Generate tenants with varying authorized scopes per `lms_type`
    - Verify an action absent from the authorized scope is never offered client-side and is rejected server-side if attempted directly
    - Run with 100+ iterations using fast-check

  - [ ] 11b.5 Write unit tests for LMS integration
    - Test credential encryption at rest
    - Test authorization flow for each of the three `lms_type` values
    - Test read adapters correctly populate `sync_status` on adapter failure
    - _Requirements: 15b.4, 15b.5, 36.7_

  - Note: Phase 2/3 (posting content back, conflict resolution for concurrent edits) are explicitly out of scope here per Requirement 36.4-6 — not built until that mechanism is actually designed

- [ ] 12. Implement Teacher Entry: Briefing, Today/Week, and Mastery Overview

  - [ ] 12.1 Implement Teacher Briefing generation (design.md Section 10 — new; replaces landing on a dashboard)
    - Implement `GET /api/teacher/briefing` endpoint
    - Aggregate struggling-student, misconception-spike, and pending-Escalation signals across every Space the Teacher teaches by default — reuse existing threshold/matching logic (tasks 5, 7), this task only adds aggregation and ranking, not new detection
    - Label every Briefing item by the Space/class it concerns
    - Determine Briefing state: `no_spaces` (→ route to Space creation, task 13) when the Teacher has zero Spaces; `insufficient_data` (→ default to Mastery Overview, task 12.4) when Spaces exist but there's not yet enough Session data for confident triage; `all_clear` when aggregation finds nothing urgent; otherwise `populated`
    - Each Briefing item carries an `action_route` the client navigates to directly — a struggling-student item routes to that student's specific error patterns, not to Mastery Overview generally
    - Cache the computed Briefing client-side (extends task 18's IndexedDB work) so opening the Platform doesn't block on a live query
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 12.2 Implement Teacher Today and Week (design.md Section 10a)
    - Implement `GET /api/teacher/today` and `GET /api/teacher/week` endpoints, merging Escolent-native items (Curation Queue backlog, pending Escalations, Override follow-ups) with LMS-sourced assignment due-dates and grading deadlines (depends on task 11b's LMS read integration — stub the LMS-sourced half until that task lands, Escolent-native items can ship first)
    - Every item is navigable directly to its action, with the same immediacy as a Briefing item — not a separate, static list
    - Visibly mark LMS-sourced items as stale/syncing/unavailable when the underlying sync isn't fresh, reusing the same sync-status pattern as task 18's offline indicators
    - Support the same information via a plain-language request (depends on task 11a, the Conversational Command Layer)
    - _Requirements: 10a.1, 10a.2, 10a.3, 10a.4, 10a.5_

  - [ ] 12.3 Create Teacher Mastery Overview UI (formerly "teacher dashboard")
    - Create `/teacher/overview` page with student × skill grid (renamed from `/teacher/dashboard`; reached from the Briefing or Today, not the landing route)
    - Color-code mastery states (gray not attempted, red struggling < 0.5, yellow emerging 0.5-0.85, green tentative >= threshold, dark green durable)
    - Aggregate across the Teacher's Spaces by default, with a single-Space filter available (not required as a first step)
    - Display prerequisite gap alerts
    - Display common misconceptions tracker
    - Display live session activity indicators
    - _Requirements: 10b.1, 10b.2, 10b.3, 10b.4, 10b.5, 10b.6, 10b.7_

  - [ ] 12.4 Integrate Supabase Realtime for live Mastery Overview updates
    - Subscribe to `mastery_states` table changes for teacher's students
    - Update grid cells in real-time when students submit responses
    - Display live session activity (last activity timestamp)
    - Handle connection loss gracefully (reconnect automatically)
    - _Requirements: 10b.2_

  - [ ] 12.5 Write integration test for real-time Mastery Overview updates
    - Start student session and submit response
    - Verify Mastery Overview updates mastery state within 2 seconds
    - Verify color-coding changes when threshold crossed
    - _Requirements: 10b.2, 10b.4_

  - [ ] 12.6 Implement teacher override functionality
    - Add "Override" action on Mastery Overview cells, and support the same action via a plain-language request through the Conversational Command Layer (task 11a) — e.g., "override Jane's assessment on two-step equations, input error"
    - IF a plain-language Override request is ambiguous (named Student or Skill not uniquely resolvable) THEN return a clarifying question rather than guessing
    - Create modal prompting for reason (20-200 chars validation) and explicit confirmation — identical whether entered via click or plain language
    - Implement `POST /api/teacher/override` endpoint, with an `entry_method: 'structured' | 'conversational'` field for analytics — the audit trail itself is identical either way
    - Update mastery_states (is_durably_mastered = true, probability = 1.0)
    - Insert record to mastery_overrides table
    - Send real-time update to student's own progress view if online
    - _Requirements: 11.1, 11.1a, 11.2, 11.3, 11.3a, 11.4_

  - [ ] 12.7 Write property test for teacher override isolation
    - **Property 16: Teacher Override Isolation**
    - **Validates: Requirements 11.1, 11.3, 11.6**
    - Generate override for specific student and skill
    - Verify only that student's mastery state updated
    - Verify all other students' mastery states unchanged
    - Run with 100+ iterations using fast-check

  - [ ] 12.8 Write property test for conversational commands never bypassing confirmation or audit
    - **Property 27: Conversational Commands Never Bypass Confirmation or Audit**
    - **Validates: Requirements 11.2, 11.3a, 14a.4, 37.5, 37.6**
    - Generate equivalent Override actions via structured and conversational entry
    - Verify identical resulting database state and audit log entry except `entry_method`
    - Run with 100+ iterations using fast-check

  - [ ] 12.9 Implement override review prompts after 30 days
    - Query overrides older than 30 days for each teacher
    - Surface prompt in the Teacher's Briefing: "You marked [Student] as mastered in [Skill] 30 days ago. Confirm or reassess?"
    - Allow teacher to confirm, reset, or ignore
    - _Requirements: 11.5_

  - [ ] 12.10 Implement AI-assisted ask-a-question for Teachers (design.md Section 19)
    - Implement `POST /api/teacher/ask` (renamed from `/api/teacher/dashboard/ask`, matching Section 10's rename): accepts a plain-language question, runs a structured query against that Teacher's actual mastery_states/student_misconceptions/sessions data (never an LLM call before retrieval)
    - Pass retrieved data as context to the LLM abstraction layer (task 17), with an explicit instruction to synthesize only from provided data
    - Return the answer alongside the underlying data it was grounded in
    - If the question can't be answered from available data, say so plainly rather than allowing the LLM to guess
    - Reachable from Mastery Overview or directly — this is the general-purpose fallback for a question the Briefing didn't already answer, not the primary interaction mode
    - _Requirements: 10b.8_

  - [ ] 12.11 Write property test for ask-a-question answer grounding
    - **Property 25: Ask-a-Question Answer Grounding**
    - **Validates: Requirements 10b.8, 15a.5, 37.4**
    - Generate retrieved-data contexts and questions where the correct answer is fully determined by the context
    - Verify every fact in the generated answer is traceable to the retrieved context
    - Run with 100+ iterations using fast-check

- [ ] 13. Implement teacher space management system
  - [ ] 13.1 Create space creation wizard UI
    - Create `/teacher/spaces/new` page with multi-step form
    - Step 1: Name and description input
    - Step 2: Visual skill tree picker for included_skill_ids selection
    - Step 3: Difficulty range slider [1, 5]
    - Step 4: Classroom pacing mode toggle with explanation
    - Step 5: Student assignment checkboxes
    - Implement `POST /api/teacher/spaces` endpoint
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 13.2 Create space management and editing UI
    - Create `/teacher/spaces` page listing all teacher's spaces
    - Display space details (name, description, skill count, student count)
    - Create `/teacher/spaces/:id/edit` page for modification
    - Implement `PUT /api/teacher/spaces/:id` endpoint
    - Apply changes only to future sessions (not in-progress)
    - _Requirements: 9.6, 9.7_

  - [ ] 13.3 Write property test for space boundary enforcement in problem sets
    - **Property 18: Space Boundary Enforcement in Problem Sets**
    - **Validates: Requirements 20.1**
    - Generate random space configurations with included_skill_ids
    - Generate problem sets for sessions in those spaces
    - Verify all problems have skill_id in space's included_skill_ids
    - Run with 100+ iterations using fast-check

  - [ ] 13.4 Write unit tests for space management
    - Test space creation stores configuration correctly
    - Test space modification updates configuration
    - Test changes only apply to future sessions
    - Test student assignment creates space_enrollments records
    - _Requirements: 9.1, 9.6, 9.7, 9.5_

- [ ] 14. Implement distress signal detection and escalation system
  - [ ] 14.1 Create distress signal detection service
    - Implement pattern-based detection with regex for explicit distress keywords
    - Implement LLM-based semantic analysis for implicit distress (confidence threshold 0.6)
    - Run pattern detection first (< 100ms), then async LLM analysis
    - Return detection result with method and confidence
    - _Requirements: 18.1, 18.2, 18.4_

  - [ ] 14.2 Create escalation creation and notification flow
    - Integrate distress detection at every Student free-text input surface, not only `POST /api/session/submit-response` — this includes the Today view, progress requests, and hint requests routed through the Conversational Command Layer (task 11a). Apply detection at the point text is submitted, regardless of source component, rather than wiring it into one input only
    - Create escalation record in `distress_escalations` table on detection
    - Send real-time notification to teacher via Supabase Realtime (target < 5 seconds), deep-linking directly to the Escalation's context, not a general list
    - Send email notification to teacher
    - Display to student: "Your teacher has been notified and will follow up with you."
    - _Requirements: 18.1, 18.3, 18.5, 19.1, 19.2, 19.5_

  - [ ] 14.3 Write property test for distress pattern detection triggers escalation
    - **Property 17: Distress Pattern Detection Triggers Escalation**
    - **Validates: Requirements 18.1**
    - Generate student text responses with distress keywords, across more than one input surface from task 14.2
    - Verify escalation record created
    - Verify teacher notification triggered within 5 seconds
    - Run with 100+ iterations using fast-check

  - [ ] 14.4 Implement backup notification for unacknowledged escalations
    - Create background job checking for escalations unacknowledged for 10+ minutes
    - Send notification to backup teacher or Admin (configured per Space)
    - Set backup_notified flag in distress_escalations table
    - _Requirements: 19.3_

  - [ ] 14.5 Implement Escalation shared-visibility via record_views (design.md Section 12/14d/22a)
    - Create `record_views` table (shared mechanism, also used by tasks 7.6, 28, and 16 below — build it once, here, since Escalations are the first consumer in task sequence)
    - On opening an Escalation, insert a `record_views` row (record_type: 'escalation') for the viewing Teacher or Admin
    - Implement RLS on `record_views`: tenant-scoped access for `escalation` rows, matching whoever already has RLS access to `distress_escalations`
    - `GET /api/escalations/:id` returns the Escalation's full context plus current `record_views` entries, so a second staff member sees someone else has already looked, without restricting who can act
    - _Requirements: 19.2a_

  - [ ] 14.6 Create teacher escalation view
    - Implement `GET /api/teacher/escalations` endpoint for unacknowledged escalations
    - Create `/teacher/escalations` page displaying escalation details, and ensure the same context is reachable directly from a Briefing item (task 12.1) or Admin Briefing item (task 16.1) — not only via this list
    - Show student response text, timestamp, detection method, confidence, and current `record_views` (task 14.5)
    - Implement `POST /api/teacher/escalations/:id/acknowledge` endpoint
    - Update acknowledged_by and acknowledged_at fields on acknowledgment
    - _Requirements: 19.2_

  - [ ] 14.7 Write integration test for complete distress escalation flow
    - Submit student response with distress keyword via more than one input surface (task 14.2)
    - Verify escalation created in database
    - Verify teacher receives real-time notification
    - Verify student sees notification message
    - Verify backup notification sent after 10 minutes if unacknowledged
    - Verify a second Teacher/Admin opening the same Escalation sees the first viewer's `record_views` entry
    - _Requirements: 18.1, 18.3, 19.1, 19.2, 19.2a, 19.3_

- [ ] 15. Checkpoint - Teacher features validation
  - Test Teacher Briefing aggregates correctly across multiple Spaces, all four states (populated/no_spaces/insufficient_data/all_clear)
  - Test Today/Week merges Escolent-native and (stubbed) LMS-sourced items correctly
  - Test Mastery Overview displays correctly and updates in real time
  - Test teacher override via both structured and conversational entry updates mastery state identically
  - Test space creation and modification
  - Test distress escalation complete flow, including record_views shared-visibility
  - Run all property tests for teacher features (Properties 16, 17, 18, 25, 26, 27)
  - Ensure all tests pass, ask the user if questions arise

- [ ] 16. Implement Admin Entry: Briefing, Today/Week, Analytics, Subject Activation, User/Data Management, and Billing

  - [ ] 16.1 Implement Admin Briefing generation (design.md Section 22 — new; replaces landing on a dashboard)
    - Implement `GET /api/admin/briefing` endpoint
    - Aggregate school-wide by default: Teachers with no Space, pending data-subject requests approaching their deadline, Escalations open longer than a threshold (oversight framing — a count/age, not per-case detail, since Admin's Escalation grant is oversight, not primary response), billing events
    - Use an aging-threshold framing for backlog items ("open longer than 24 hours"), not a raw count
    - Determine Briefing state: `no_rollout` (→ route to task 16.9's LMS setup or task 16.8's first Teacher invite) when the tenant has no Teachers/Spaces yet; `insufficient_data` (→ default to School-Wide Analytics, task 16.3) when activity exists but below confident-triage threshold; `all_clear`; otherwise `populated`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 16.2 Implement Admin Today and Week (design.md Section 22)
    - Implement `GET /api/admin/today` and `GET /api/admin/week` endpoints: compliance deadlines, billing events, Curation Queue and Escalation backlog — deliberately not LMS assignment due-dates, which are Teacher's Today (task 12.2), not Admin's
    - Every item navigable directly to its action, same immediacy as a Briefing item
    - _Requirements: 15b.1, 15b.2, 15b.3_

  - [ ] 16.3 Create School-Wide Analytics UI (formerly "admin dashboard")
    - Create `/admin/analytics` page (renamed from `/admin/dashboard`; reached from the Briefing, not the landing route)
    - Implement `GET /api/admin/analytics` endpoint with filters (date range, teacher, class)
    - Display adoption metrics (active students, avg session duration, problems completed)
    - Display mastery metrics (avg skills mastered per student, mastery distribution chart)
    - Update metrics daily
    - _Requirements: 15a.1, 15a.2, 15a.3, 15a.4_

  - [ ] 16.4 Implement AI-assisted ask-a-question for Admins
    - Implement `POST /api/admin/analytics/ask` (renamed from `/api/admin/metrics/ask`, matching task 16.3's rename): accepts a plain-language question, runs a structured query against that tenant's actual adoption/mastery data (never an LLM call before retrieval)
    - Pass retrieved data as context to the LLM abstraction layer (task 17), with an explicit instruction to synthesize only from provided data
    - Return the answer alongside the underlying data it was grounded in
    - If the question can't be answered from available data, say so plainly rather than allowing the LLM to guess
    - _Requirements: 15a.5_

  - [ ] 16.5 Implement pilot scope management
    - Create `/admin/pilot` page for enabling/disabling class access
    - Implement `POST /api/admin/pilot/enable-class` endpoint
    - Implement `POST /api/admin/pilot/disable-class` endpoint
    - Display list of classes with Platform access status
    - Prevent students from accessing Platform when class disabled
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 16.6 Implement tenant-level subject/curriculum activation
    - Implement `POST /api/admin/subjects/activate` endpoint — Input: `{ subject, grade, class_ids, available_from }`
    - Only subjects/curricula a Pedagogical_Lead has curated platform-wide to Content_Status `validated` (task 28) are eligible for activation
    - Admin's action controls only whether and when already-curated content is switched on for this school — grant no write access to the Skill/Misconception content itself (enforced by existing RLS from task 1.6, not a new check here)
    - _Requirements: 14.5, 14.6_

  - [ ] 16.7 Implement day-21 pilot checkpoint summary
    - Background job triggered 21 days after a pilot's start date
    - Compile adoption and early mastery signal to date into a summary surfaced in the Admin Briefing (task 16.1) and to the Escolent team
    - _Requirements: 14.4_

  - [ ] 16.8 Implement Admin user and role management (Requirement 14a — no prior task coverage existed for this)
    - Implement `POST /api/admin/users/invite` and `PUT /api/admin/users/:id/role`, supporting both a structured form and a plain-language request through the Conversational Command Layer (task 11a) — e.g., "invite Jane Smith as a teacher for Grade 8, jane@school.edu"
    - IF the named person isn't uniquely resolvable THEN return a clarifying question rather than guessing
    - **The E/H boundary (Requirement 14a.3, 17.1):** if the request reads as deleting a person's data rather than managing access — "remove this graduated student's account" is the example that must NOT be executed here — route it to task 16.10's structured deletion flow instead
    - Log identically regardless of entry method
    - Insert a `record_views` row (record_type: 'user_role', reusing task 14.5's table) on open, so a second Admin sees the record is already being acted on
    - _Requirements: 14a.1, 14a.2, 14a.3, 14a.4, 14a.5_

  - [ ] 16.9 Implement institutional LMS integration setup (design.md Section 21a, Requirement 15b.4-5)
    - Create `lms_integrations` table (tenant_id, lms_type, status, encrypted credentials, authorized_by/at, last_sync_at/error)
    - Implement `POST /api/admin/lms/authorize` — structured, credential-entry flow (Canvas developer key, Moodle web-service token + enabled functions, or Google Classroom domain-level OAuth, depending on `lms_type`) — deliberately NOT reachable via the Conversational Command Layer, given the security-sensitive nature
    - Encrypt `credentials` at the application layer, key held outside the database
    - Implement `GET /api/admin/lms/status`, surfaced in the Admin Briefing (task 16.1) if `status: 'error'`
    - _Requirements: 15b.4, 15b.5_

  - [ ] 16.10 Implement data export functionality
    - Implement `POST /api/admin/export` endpoint with export_type parameter
    - Support export types: interactions, mastery, sessions
    - Generate CSV format for selected data
    - Support optional student_ids filter
    - Complete export within 60 seconds for up to 100 students
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ] 16.11 Implement student data deletion (extends the existing `data_rights_requests` table from task 29 rather than a parallel one)
    - **Build-order dependency, flagged rather than silently assumed:** this task ALTERs `data_rights_requests`, which task 29.1 creates. Task 29.1 must be completed before this subtask, despite the numbering — do not attempt this before task 29.1 exists. *(Confirmed this isn't already resolved: task 1's original schema, already built, does not include `guardians` or `data_rights_requests` — they genuinely don't exist yet.)*
    - Add `initiated_by` ('guardian' | 'admin'), `admin_id` columns to `data_rights_requests`; make `verification_token` nullable (an Admin-initiated request skips Guardian token verification — the Admin is already authenticated)
    - Implement `POST /api/admin/delete-student-data` — creates a `data_rights_requests` row with `initiated_by: 'admin'` rather than deleting directly, reusing the same status/completion flow as a Guardian-initiated request (task 29)
    - This is reached both directly and via task 16.8's E/H boundary routing
    - On confirmation, permanently delete mastery_states, sessions, interaction logs, student_misconceptions for the student — async job, complete within 72 hours
    - Retain anonymized aggregated statistics
    - Provide confirmation to Admin when deletion complete
    - Insert a `record_views` row (record_type: 'data_rights_request') on open, for multi-Admin concurrency
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ] 16.12 Write property test for data-deletion-shaped requests never executing as role management
    - **Property 31: Data-Deletion-Shaped Requests Never Execute as Role Management**
    - **Validates: Requirements 14a.3, 17.1**
    - Generate plain-language requests to task 16.8's endpoint that are data-deletion-shaped ("remove this account", "delete Jane's data") vs. genuinely access-shaped ("change Jane's role to admin")
    - Verify deletion-shaped requests route to task 16.11's flow and never execute as a `UserManagementAction`
    - Run with 100+ iterations using fast-check

  - [ ] 16.13 Add RLS for `record_views` covering `user_role` and `data_rights_request` (extends task 14.5's table and policies)
    - Add the third RLS policy: `record_type IN ('user_role', 'data_rights_request')`, Admin-only, scoped to their own tenant
    - Without this, rows written by tasks 16.8 and 16.11 would be invisible under RLS's default-deny — write a regression test asserting an Admin can read a `record_views` row they just wrote for these two record types
    - _Requirements: 14a.5, 17.5_

  - [ ] 16.14 Implement Billing (Requirement 15c — no prior task coverage existed for this)
    - Add `plan_tier`, `seat_count`, `seats_used`, `renewal_date` columns to the `tenants` table (extends task 1.2's schema, not a new table)
    - Implement `GET /api/admin/billing`
    - Support the same information via a plain-language request (task 11a) — dual-mode, per Requirement 37.3
    - Implement `POST /api/admin/billing/change-plan` as a structured form with explicit confirmation — deliberately NOT reachable via the Conversational Command Layer, same carve-out reasoning as task 16.9's LMS setup
    - _Requirements: 15c.1, 15c.2, 15c.3_

  - [ ] 16.15 Write unit tests for admin functionality
    - Test data export generates correct CSV format
    - Test data export completes within 60 seconds for 100 students
    - Test student data deletion removes all personal data, whether initiated by Guardian or Admin
    - Test anonymized statistics retained after deletion
    - Test class disable prevents student access
    - Test subject activation only succeeds for `validated` content and grants no content write access
    - Test billing plan-change endpoint rejects any request routed through the Conversational Command Layer
    - _Requirements: 16.1, 16.4, 17.1, 17.2, 17.4, 14.3, 14.5, 14.6, 15c.3_

- [ ] 17. Implement LLM provider abstraction layer
  - [ ] 17.1 Create LLM provider interface using Vercel AI SDK
    - Define LLMProvider interface with methods: generateResponse, classifyError, detectDistress, classifyCommandIntent (added for task 11a's Conversational Command Layer, which depends on this)
    - Implement provider selection based on environment variable (openai, anthropic, gemini)
    - Configure Vercel AI SDK with getModel() function
    - Store provider configuration in config/llm.ts
    - _Requirements: 22.1, 22.2, 22.3_

  - [ ] 17.2 Implement provider-agnostic prompt templates
    - Create Socratic tutoring prompt template
    - Create misconception remediation prompt template
    - Create distress detection prompt template
    - Create command-intent classification prompt template — classifies against the finite set of structured actions available to the requester's role (task 11a), never an open-ended action space
    - Ensure no pedagogy embedded in prompts (logic in application code)
    - _Requirements: 22.1, 37.1_

  - [ ] 17.3 Create LLM service functions for all use cases
    - Implement generateSocraticResponse for student errors
    - Implement classifyMisconception for semantic error matching
    - Implement detectDistress for free-text analysis
    - Implement classifyCommandIntent for the Conversational Command Layer (task 11a), returning resolved action + parameters, an ambiguity flag, or a not-groundable flag
    - Add error handling with retry logic (3 attempts with exponential backoff)
    - Fall back to generic templates on LLM failure
    - _Requirements: 22.1, 22.2, 22.3, 37.1_

  - [ ] 17.4 Write unit tests for LLM provider switching
    - Test switching from OpenAI to Anthropic via config change only
    - Test switching to Gemini via config change only
    - Test each provider generates valid responses
    - Test fallback to generic template on provider failure
    - _Requirements: 22.2, 22.3_

- [ ] 18. Implement offline-first PWA architecture
  - [ ] 18.1 Configure service worker with Workbox caching strategies
    - Set up cache-first strategy for static assets (JS, CSS, images)
    - Set up network-first with cache fallback for API calls
    - Exception: the Entry recommendation decision (task 10.1, Requirement 7.1e) needs cache-first, not network-first — it must resolve from `mastery_cache`/`spaced_repetition_cache` without attempting a network round trip first, since the whole point is that Entry works the moment the app opens regardless of connectivity
    - Configure background sync for queued responses
    - Register service worker in Next.js app
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 7.1e_

  - [ ] 18.2 Create IndexedDB client-side cache schema
    - Create ObjectStores: sessions, responses, problems, mastery_cache, spaced_repetition_cache — the last one added to support task 10.1's Entry logic, which needs due-date data alongside mastery data to decide the next recommended Skill offline (this closes a gap where task 10.1 assumed this store already existed before this task actually created it)
    - Implement IndexedDB wrapper functions (read, write, query)
    - Store unsynced responses with sync_status: 'pending' flag
    - Store session state for recovery
    - _Requirements: 8.2, 8.5, 30.1, 7.1e_

  - [ ] 18.3 Implement offline response queueing and sync
    - Save responses to IndexedDB when offline (connectivity check)
    - Display offline indicator in UI
    - Implement background sync task attempting sync every 10 seconds
    - Implement `POST /api/sync/responses` endpoint for bulk sync
    - Update mastery states on server, return updated data
    - Mark responses as 'synced' in IndexedDB after successful sync
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 18.4 Implement session state recovery
    - Check for interrupted sessions < 24 hours old on app load
    - Query IndexedDB for sessions with status 'interrupted'
    - Prompt user: "You have an unfinished session. Resume?"
    - Implement `POST /api/session/recover` endpoint
    - Restore exact problem and student responses from IndexedDB
    - Mark sessions > 24 hours old as 'expired'
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [ ] 18.5 Write integration tests for offline functionality
    - Test student continues practicing when network lost mid-session
    - Test responses queued in IndexedDB with sync_status: 'pending'
    - Test responses sync automatically when network restored
    - Test session state recovery restores exact problem and responses
    - Test offline indicator displays when connectivity lost
    - _Requirements: 8.1, 8.2, 8.3, 30.1, 30.2, 30.3_

- [ ] 19. Implement Student Entry, practice UI, progress, and Today/Week

  - [ ] 19.1 Create student practice session interface
    - Create `/practice` page that opens directly into the Entry-resolved Session (task 10.1) — no Space-selection screen first
    - Display the one-line entry reason (task 10.1) — e.g., "spaced-repetition due", "let's start with the basics"
    - Display scaffolding content (worked examples, hints, or independent problem)
    - Input field matched to the Skill's `evaluation_strategy` (task 10.3) — symbolic/numeric for exact_match/symbolic_equivalence, free-text for rubric_llm — not a generic chat box
    - "Request Hint" button for hint_on_demand and independent levels
    - Progress indicator (problems completed in session)
    - Connectivity status indicator
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.1a, 7.1b, 8.5_

  - [ ] 19.2 Create student progress view (compact, not a dashboard)
    - Create `/student/progress` page (interaction model Student section D) — a small status strip or expandable tree, proportionate to one Student's own Skill set, not a dense grid
    - Display mastery status for all practiced skills
    - Display recent sessions (duration, problems completed, skills practiced)
    - Display upcoming spaced repetition reviews
    - Support the same information via a plain-language request (task 11a) — e.g., "how am I doing on fractions" — without opening this page
    - _Requirements: 1.1, 1.3_

  - [ ] 19.3 Implement Student Today and Week (Requirement 7a — found missing during this rewrite; design.md Section 7)
    - Implement `GET /api/student/today` and `GET /api/student/week`, merging Escolent-native items (spaced-repetition due, Teacher-assigned content) with LMS-sourced assignment due-dates (depends on task 11b's LMS read integration — Escolent-native items can ship first, same staging as task 12.2)
    - Include every due item from the connected LMS, not filtered to Escolent-taught subjects — LMS-only items get `action_route: null` and a reference-back link (task 33), not a fabricated practice action
    - Today prominent, week one tap away; same sync-staleness treatment as task 12.2's Teacher Today
    - Support the same information via a plain-language request (task 11a)
    - _Requirements: 7a.1, 7a.2, 7a.3, 7a.4, 7a.5_

  - [ ] 19.4 Write property test for LMS-only Today items never offering unavailable practice
    - **Property 32: LMS-Only Today Items Never Offer Unavailable Practice**
    - **Validates: Requirements 7a.2**
    - Generate Today items across `source: 'escolent'` and `source: 'lms'`, with and without matching Escolent content
    - Verify LMS-sourced items for unsupported subjects always have `action_route: null` and a reference-back link
    - Run with 100+ iterations using fast-check

  - [ ] 19.5 Write unit tests for student UI
    - Test problem displays correctly based on scaffolding level
    - Test hint request button only shown for appropriate levels
    - Test hint request applies penalty to mastery state
    - Test natural stopping point suggestion displays after 10-15 problems
    - Test connectivity indicator changes when network status changes
    - Test Entry opens directly into a Session with no Space-selection step (task 10.1's three states: returning, new, nothing-due)
    - _Requirements: 6.2, 6.5, 7.2, 7.1c, 7.1d, 8.5_

- [ ] 20. Implement weekly teacher digests and parent updates
  - [ ] 20.1 Create weekly teacher digest generation
    - Implement background job running weekly (configurable day/time per teacher)
    - Query student progress for past week (new durable mastery, prerequisite gaps, common misconceptions)
    - Generate digest email content via the LLM abstraction layer (task 17), grounded in the queried real data — never a static template with values substituted in; this is the same underlying synthesis mechanism as the daily in-app Teacher Briefing (task 12.1) — the email is an additional delivery channel, not a separate mechanism to build
    - Send email to teacher via transactional email service (e.g., SendGrid)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ] 20.2 Create parent mastery update generation
    - Implement background job running weekly (default frequency)
    - Query student progress for past week per parent
    - Generate plain-language summary via the LLM abstraction layer (task 17), grounded in the queried real Mastery_State data — never a static template with values substituted in
    - Avoid technical terminology (no "mastery probability", use "understanding")
    - Deliver via school's parent communication channel (WhatsApp, SMS, school app integration)
    - Generate printable summary report for parents without digital access
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ] 20.3 Write unit tests for digest and update content
    - Test digest includes correct summary data (mastery achievements, gaps, misconceptions)
    - Test parent update uses plain language (no technical terms)
    - Test parent update includes correct student progress details
    - _Requirements: 12.2, 12.3, 12.4, 13.4, 13.5_

- [ ] 21. Implement POPIA compliance features
  - [ ] 21.1 Create parent consent mechanism and data subject rights interface
    - Create parent consent form for data processing (pending legal review for scope)
    - Display clear information about data collection and usage
    - Implement `POST /api/parent/data-access-request` endpoint
    - Implement `POST /api/parent/data-correction-request` endpoint
    - Implement `POST /api/parent/data-deletion-request` endpoint
    - Provide data access within POPIA-compliant timeframe (pending legal review)
    - Complete deletion within POPIA-compliant timeframe (pending legal review)
    - _Requirements: 24.2, 24.3, 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ] 21.2 Implement automatic data retention and deletion
    - Create background job checking for expired retention periods
    - Calculate retention period: enrollment duration + POPIA-compliant retention (pending legal review)
    - Automatically delete or anonymize student personal information after retention period
    - Retain anonymized aggregated statistics after deletion
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [ ] 21.3 Implement audit logging for all data access and modifications
    - Insert audit log record on every read of student personal information
    - Insert audit log record on every update/delete of student personal information
    - Log fields: user_id, action, table_name, record_id, changed_fields, timestamp
    - Retain audit logs for at least 2 years
    - Implement `GET /api/admin/audit-logs` endpoint with export functionality
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

  - [ ] 21.4 Implement cross-border data transfer disclosure
    - Display geographic location of data storage to Admins in settings page
    - Document cross-border transfer mechanisms (if data stored outside South Africa)
    - Provide documentation link for Admin review
    - _Requirements: 27.1, 27.2, 27.3_

  - [ ] 21.5 Create data breach notification system
    - Implement breach detection monitoring (integrate with Sentry/monitoring service)
    - Create breach notification template with required details
    - Implement `POST /api/admin/breach-notification` endpoint (internal use)
    - Send notification to Admin within POPIA-compliant timeframe (pending legal review)
    - Provide breach details (affected data, occurrence time, mitigation steps)
    - _Requirements: 28.1, 28.2, 28.3_

  - [ ] 21.6 Write unit tests for POPIA compliance features
    - Test audit log created on student data read
    - Test audit log created on student data modification
    - Test automatic data deletion after retention period
    - Test anonymized statistics retained after deletion
    - Test data export includes all student personal information
    - _Requirements: 29.1, 29.2, 26.1, 26.2, 26.4, 25.2_

  - [ ] 21.7 Validate all POPIA compliance with qualified legal counsel
    - Review consent mechanism with POPIA legal counsel
    - Confirm data subject rights procedures and timelines
    - Confirm retention periods and deletion procedures
    - Confirm breach notification procedures and timelines
    - Update implementation based on legal counsel feedback
    - _Requirements: 24.5, 25.6, 26.5, 28.4_

- [ ] 22. Checkpoint - Complete system integration
  - Test complete student journey: launch from LMS → Entry auto-starts a Session → practice → offline sync → mastery update → Today/Week shows correct due items
  - Test complete teacher journey: Briefing → tap-to-action → space creation → student progress monitoring → override (both structured and conversational entry)
  - Test complete admin journey: Briefing → pilot management → subject activation → analytics review → data export → billing view
  - Test complete Pedagogical_Lead journey: Briefing → error curation → misconception taxonomy update → content validation (approve and reject paths)
  - Test the Conversational Command Layer (task 11a) across at least one action per role, including an ambiguous-command case and an ungroundable-question case
  - Test LMS Integration (task 11b): institutional setup, a read (Today/Week population), and a write (grade push-back)
  - Run all property tests — 32 properties as of this pass, not the earlier count of 19; re-check this number when this checkpoint is actually reached, since more may exist by then
  - Run all integration tests
  - Verify performance targets met (authentication < 3s, mastery update < 2s, etc.)
  - Ensure all tests pass, ask the user if questions arise

- [ ] 23. Implement guardrail enforcement for topic boundaries
  - [ ] 23.1 Enforce Space boundaries in problem selection
    - Already implemented in task 10.3 (problem selection algorithm) and task 10.1 (Entry's candidate selection) — *(citation fix: task 10's restructuring split what was one subtask into Entry (10.1) and Problem Selection (10.3); this previously cited 10.1 alone, which after that split is no longer where "the problem selection algorithm" specifically lives)*
    - Add additional validation: reject problems outside Space boundaries
    - _Requirements: 20.1_

  - [ ] 23.2 Detect and redirect answer-seeking behavior
    - Implement pattern detection for answer-seeking in student input
    - Patterns: "what is the answer", "just tell me", "give me the solution"
    - Redirect to Socratic prompt: "Can you explain your thinking so far?"
    - Log answer-seeking attempts for teacher visibility
    - _Requirements: 20.3, 20.4_

  - [ ] 23.3 Handle student requests for help outside Space boundaries
    - Detect when student asks about topic outside Space included_skill_ids
    - Display message: "That topic is outside the current practice scope. Focus on [Space name] for now."
    - _Requirements: 20.2_

  - [ ] 23.4 Write unit tests for guardrail enforcement
    - Test problems outside Space boundaries rejected
    - Test answer-seeking patterns detected and redirected
    - Test requests outside Space boundaries show appropriate message
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 24. Implement low-end device performance optimizations
  - [ ] 24.1 Optimize client-side memory usage
    - Implement lazy loading for problem content (load on demand, not all upfront)
    - Limit IndexedDB cache size (max 50MB)
    - Clear old session data from IndexedDB after 7 days
    - Use React.memo and useMemo for expensive UI components
    - _Requirements: 23.3_

  - [ ] 24.2 Optimize API response sizes and latency
    - Implement pagination for large data sets (Briefing/analytics queries)
    - Compress API responses with gzip
    - Minimize JSON payload sizes (remove unnecessary fields)
    - Add caching headers for static data (skill graph, problem templates)
    - _Requirements: 23.1, 23.2_

  - [ ] 24.3 Run performance tests on low-end device simulation
    - Test PWA loads within 5 seconds on 2GB RAM, dual-core 1.5GHz, 2Mbps connection
    - Test UI interactions respond within 1 second for non-server actions
    - Test memory usage remains < 200MB during typical session
    - Use Chrome DevTools throttling (4x CPU slowdown, 2Mbps network)
    - _Requirements: 23.1, 23.2, 23.3_

- [ ] 25. Load IEB Grade 8 algebra curriculum and initial content — the MVP pilot's first populated subject, exercising the subject-agnostic Skill Graph/Misconception Taxonomy mechanism built in Tasks 1-4 and 28, not a math-specific build
  - [ ] 25.1 Create platform-level skill graph for Grade 8 algebra
    - Load IEB curriculum skills for algebraic equations
    - Set `subject = "Grade 8 Mathematics"` on each skill (used by the tutor prompt template, Section 13)
    - Define prerequisite relationships between skills
    - Set skill_type (procedural vs conceptual) and evaluation_strategy (exact_match/symbolic_equivalence, per Section 14a) for each skill
    - Set `content_status = 'validated'` — this content is directly authored and Charti-reviewed, not routed through the AI-draft-and-approve pipeline (Section 14c), so it is inserted already validated rather than starting as 'draft'
    - Insert into skills table with tenant_id = null (platform-level)
    - _Requirements: 2.1, 2.2, 31.6_

  - [ ] 25.2 Create initial misconception taxonomy for algebra
    - Define common misconceptions for one-step equations (e.g., "subtracting negative as adding positive")
    - Create error patterns (symbolic, regex, semantic)
    - Set classification (repetition_confirmed vs first_occurrence_actionable)
    - Write remediation strategies for each misconception
    - Set `content_status = 'validated'` — same rationale as 25.1, directly authored and Charti-reviewed
    - Insert into misconceptions table
    - _Requirements: 4.1, 4.2, 31.6_

  - [ ] 25.3 Generate initial problem set for pilot
    - Create 50-100 problems per skill for pilot
    - Cover difficulty range 1-5 for each skill
    - Include worked examples, partial scaffolds, and independent problems
    - Store in problems table or generate dynamically via LLM
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 26. Deploy to staging and production environments
  - [ ] 26.1 Set up staging environment on Vercel and Supabase
    - Create staging project on Vercel
    - Create staging Supabase instance
    - Configure environment variables for staging
    - Deploy current build to staging
    - Run smoke tests on staging

  - [ ] 26.2 Configure production environment on Vercel and Supabase
    - Create production project on Vercel
    - Create production Supabase instance in South Africa region (or nearest with documentation)
    - Configure environment variables for production
    - Set up custom domain
    - Configure Vercel Analytics and Sentry for monitoring

  - [ ] 26.3 Set up monitoring and alerting
    - Configure Sentry for client-side and server-side error tracking
    - Set up Vercel log aggregation
    - Configure alert thresholds (auth failure rate, database errors, distress detection service down)
    - Set up Supabase dashboard monitoring for RLS violations
    - Test alerts trigger correctly

  - [ ] 26.4 Deploy to production and run validation
    - Deploy current build to production
    - Run smoke tests on production
    - Test LTI integration with Canvas/Moodle sandbox
    - Test Google Classroom integration
    - Verify multi-tenancy RLS policies enforced
    - Test complete user journeys for all four roles

- [ ] 27. Final validation and pilot launch preparation
  - [ ] 27.1 Run complete end-to-end test suite
    - Run all unit tests
    - Run all property tests (32 properties as of this rewrite, 100+ iterations each — re-verify the actual count when this task is reached, since more may have been added by then)
    - Run all integration tests
    - Run performance tests on low-end device simulation
    - Verify all tests pass with 0 failures

  - [ ] 27.2 Conduct security review
    - Review RLS policies for tenant isolation
    - Test cross-tenant access attempts (should fail)
    - Test LTI JWT tampering attempts (should reject)
    - Test that Skills/Misconceptions with content_status 'draft' or 'pending_approval' are never returned by any Student-facing query or API response (Requirement 31.5, 31.7) — this is a hard gate, not a best-effort filter
    - Run npm audit and fix vulnerabilities
    - Review audit log completeness
    - _Requirements: 31.5, 31.7_

  - [ ] 27.3 Complete POPIA compliance validation with legal counsel
    - Submit all compliance documentation to POPIA legal counsel
    - Address legal counsel feedback
    - Obtain written confirmation of POPIA compliance
    - Update consent forms and data processing documentation
    - _Requirements: 24.5, 25.6, 26.5, 28.4_

  - [ ] 27.4 Prepare pilot launch documentation
    - Create teacher onboarding guide (Space creation, Briefing/Today/Mastery Overview usage, override process — both structured and conversational)
    - Create admin onboarding guide (pilot management, subject activation, Briefing/analytics/billing usage, data operations)
    - Create student quick start guide (launching from LMS, Entry/practice session walkthrough, Today/Week)
    - Create technical support contact information
    - Create incident response procedures

  - [ ] 27.5 Launch pilot at Teneo with one Grade 8 class
    - Coordinate with Teneo admin for LTI/Google Classroom integration
    - Create Teneo tenant in production database
    - Assign teacher and student accounts
    - Conduct teacher training session
    - Send parent consent forms (pending legal review)
    - Monitor first week actively for issues

- [ ] 28. Implement subject-agnostic evaluation and AI-assisted content authoring
  - [ ] 28.1 Verify evaluation_strategy, rubric, subject, and content_status fields on skills and misconceptions
    - Confirm `evaluation_strategy`, `rubric` (JSONB), `subject`, `content_status` columns exist on `skills` (created in Task 1.3) and `content_status` on `misconceptions` (created in Task 1.4) — these are created upfront, not added here, so the content-approval gate (Requirement 31.5, 31.7) is in place before pilot launch (Task 27.5), not after
    - If any pilot-loaded content (Task 25) was inserted before this task ran, confirm it has `content_status = 'validated'` and a correct `evaluation_strategy`
    - _Requirements: 31.1, 31.6_

  - [ ] 28.2 Implement pluggable answer evaluation routing
    - Fetch Skill's `evaluation_strategy` before grading a response
    - Route `exact_match`/`symbolic_equivalence` to existing correctness-check logic (task 5.1/5.2)
    - Route `rubric_llm` to a new rubric-based LLM evaluation function using the LLM abstraction layer (task 17)
    - Return a normalized correctness/partial-credit signal regardless of strategy, consumed unchanged by the BKT update (task 5.1)
    - _Requirements: 31.1, 31.2_

  - [ ] 28.2a Build the rubric-evaluated response UI
    - For Skills with evaluation_strategy = rubric_llm, render per-criterion feedback and any partial credit, never a single binary correct/incorrect result
    - Visually distinct from the exact-match correct/incorrect treatment used elsewhere
    - _Requirements: 31.10_

  - [ ] 28.2b Write property test for rubric feedback display
    - **Property 23: Rubric Feedback Display for Non-Binary Evaluation**
    - **Validates: Requirements 31.10**
    - Generate Skills with evaluation_strategy = rubric_llm and varying rubric criteria
    - Verify the Student-facing response always includes per-criterion feedback and never collapses to a single correct/incorrect value
    - Run with 100+ iterations using fast-check

  - [ ] 28.3 Write property test for evaluation strategy routing
    - **Property 20: Evaluation Strategy Routing**
    - **Validates: Requirements 31.1, 31.2**
    - Generate Skills with each evaluation_strategy value
    - Verify each routes only to its corresponding evaluator, never to another strategy's logic
    - Run with 100+ iterations using fast-check

  - [ ] 28.4 Extend misconception detection to default to semantic matching for non-symbolic skills
    - WHEN a Skill's evaluation_strategy is `rubric_llm`, default misconception detection to `semantic` matching (task 7.1)
    - Keep symbolic/regex matching as the math-specific fast path for `exact_match`/`symbolic_equivalence` skills
    - _Requirements: 31.3_

  - [ ] 28.5 Implement AI-assisted content co-authoring flow
    - Implement `POST /api/content/authoring/propose` endpoint: accepts subject/unit description, returns draft Skill_Graph and Misconception_Taxonomy via LLM abstraction layer (task 17)
    - Implement `POST /api/content/authoring/approve` endpoint: moves reviewed/edited content from `content_status = 'draft'` to `'pending_approval'` — still not servable to Students
    - Implement `POST /api/content/authoring/validate` endpoint: requires explicit sign-off from the content owner (Teacher for Space-level content, Pedagogical_Lead for platform-level content) to move `'pending_approval'` to `'validated'` — the only status servable to Students
    - Implement `POST /api/content/authoring/reject` endpoint (Requirement 31.8a — found missing during tasks.md review; exists in requirements.md and design.md but had no task here): moves a `'pending_approval'` item back to `'draft'` with specific written feedback, so review has a real reject/revise branch, not only approve
    - Implement `PUT /api/content/authoring/skills/:id` and `PUT /api/content/authoring/misconceptions/:id` for teacher edits
    - Ensure `'draft'` and `'pending_approval'` content is never servable to Students under any circumstance
    - _Requirements: 31.4, 31.5, 31.6, 31.8a, 31.9_

  - [ ] 28.5a Implement live-content-edit isolation (Requirement 31.8b — found missing during tasks.md review)
    - Add `pending_edit` (JSONB) and `pending_edit_by` columns to `skills` and `misconceptions`
    - WHEN a `validated` Skill or Misconception with active Student usage is edited, stage the changes into `pending_edit` rather than mutating the live fields (`name`, `description`, `evaluation_strategy`, `rubric`, `prerequisite_ids`) — Students currently on that Skill see no change until the edit is approved
    - Require a distinct confirmation for editing live content, separate from the confirmation used when authoring new content — the UI states plainly that this won't affect Students until approved
    - On approval, atomically apply `pending_edit`'s changes to the live fields in a single transaction and clear `pending_edit`
    - _Requirements: 31.8b_

  - [ ] 28.5b Write property test for live content edit isolation
    - **Property 30: Live Content Edits Never Affect Students Before Approval**
    - **Validates: Requirements 31.8b**
    - Generate `validated` Skills/Misconceptions with an in-progress edit (`pending_edit` non-null)
    - Verify every Student-facing read returns pre-edit values under any interleaving of read/write, until the edit is approved and applied
    - Run with 100+ iterations using fast-check

  - [ ] 28.5c Implement multi-Pedagogical_Lead concurrency on content review (Requirement 31.8c — found missing during tasks.md review; task 7.6 covers this for unmatched-error curation, but pending_approval review itself was never wired up)
    - Insert a `record_views` row (record_type: 'skill'/'misconception', reusing task 14.5's table) when a Pedagogical_Lead opens a `pending_approval` item
    - Surface if another Pedagogical_Lead already has it open, via the same RLS-scoped mechanism as task 14.5 and 16.13 — no new pattern
    - _Requirements: 31.8c_

  - [ ] 28.6 Create Teacher/Pedagogical_Lead content review and approval UI
    - Create review interface showing AI-proposed skills and misconceptions with their current Content_Status
    - Allow edit, merge, split, or removal of proposed items at `'draft'` or `'pending_approval'`
    - Require explicit sign-off action before content reaches `'validated'` and becomes servable
    - Display Content_Status to Teachers/Pedagogical_Leads/Admins; never to Students
    - _Requirements: 31.5, 31.6, 31.7, 31.9, 32.6_

  - [ ] 28.7 Implement content promotion from pending_approval to validated
    - Promotion is explicit content-owner sign-off only — never automatic, never triggered by accumulated Student interaction volume (impossible in any case, since pending_approval content is never shown to Students)
    - Require the sign-off actor to be the Teacher for Space-level content or the Pedagogical_Lead for platform-level content
    - _Requirements: 31.6, 31.8_

  - [ ] 28.8 Write integration test for full co-authoring flow
    - Submit a subject/unit description, verify draft Skill_Graph and Misconception_Taxonomy generated
    - Edit a proposed skill, verify edit persisted
    - Move content through draft → pending_approval → validated, verify it becomes servable to Students only at validated
    - Verify draft and pending_approval content is never presented to a Student at any point
    - _Requirements: 31.4, 31.5, 31.6, 31.7, 31.9_

- [ ] 28a. Implement Pedagogical_Lead Entry: Briefing and Cross-Tenant Awareness (design.md Section 23, Requirement 31a — flagged as missing during tasks.md review, same shape of gap Student's Today turned out to have; filled in now)

  - [ ] 28a.1 Implement Pedagogical_Lead Briefing generation
    - Implement `GET /api/pedagogical-lead/briefing` endpoint
    - Aggregate content-scoped signals across every school by default: items in `pending_approval` (age-threshold framing, e.g., "4 items over 3 days" — not a raw count, same lesson already applied in task 16.1), Skills with thin coverage_status, a Misconception pattern recurring across multiple tenants
    - This endpoint queries only `skills`/`misconceptions`/`unmatched_errors` — never `mastery_states`, `sessions`, or `users` — enforced by the existing RLS from task 1.6, not a new check here; the response shape itself must never name a specific school or student, only content-level counts
    - Determine Briefing state: `no_content` (→ route to task 28.5's authoring flow) when nothing is curated yet; `all_clear` when nothing is pending; otherwise `populated`
    - _Requirements: 31a.1, 31a.2, 31a.4, 31a.5, 31a.6, 31a.7_

  - [ ] 28a.2 Wire Briefing items to tap-to-action routes
    - A `pending_review`-category item routes directly to task 7.6's Unmatched Error Curation or task 28.6's content review UI, whichever the item concerns
    - A thin-coverage item routes to task 28.5's authoring flow
    - _Requirements: 31a.3_

  - [ ] 28a.3 Write unit tests for Pedagogical_Lead Briefing
    - Test Briefing aggregates across tenants without ever including a Student/Teacher/school name
    - Test the `no_content` and `all_clear` states display correctly
    - Test a `pending_review` item's action_route opens the correct existing screen (task 7.6 or 28.6), not a new one
    - _Requirements: 31a.1, 31a.2, 31a.5, 31a.6, 31a.7_

- [ ] 29. Implement parent identity verification and data rights access
  - [ ] 29.1 Create guardians and data_rights_requests database tables
    - Create `guardians` table linked to students, populated from school-provided enrollment data
    - Create `data_rights_requests` table with verification token and status tracking
    - **Build early relative to its number if practical:** task 16.11 (Admin data deletion) extends this table with `initiated_by`/`admin_id` columns and depends on it existing — flagged there too, stated here so the dependency isn't only visible from one side
    - _Requirements: 35.1_

  - [ ] 29.2 Implement verification request and token confirmation endpoints
    - Implement `POST /api/parent/verify-request`: match requester's contact value against registered Guardian records, send token to the on-file contact channel (never to a value the requester supplies fresh)
    - Ensure the response is identical in content, shape, and timing regardless of match outcome — no observable difference between a genuine non-match and a token having been sent
    - Implement `POST /api/parent/confirm-token`: confirm token, mark request `verified`
    - Gate the existing data-access/correction/deletion endpoints (task 21.1) on `verified` status
    - _Requirements: 35.2, 35.2a, 35.3_

  - [ ] 29.2a Write property test for verification request non-enumerability
    - **Property 24: Verification Request Non-Enumerability**
    - **Validates: Requirements 35.2a**
    - Generate matching and non-matching verify-request submissions
    - Verify response content, shape, and timing are indistinguishable between the two cases
    - Run with 100+ iterations using fast-check

  - [ ] 29.3 Implement multi-guardian Admin notification
    - WHEN a Student has multiple registered Guardians, notify the tenant Admin on any data rights request, without blocking the verified requester
    - _Requirements: 35.5_

  - [ ] 29.4 Write property test for parent data rights verification gate
    - **Property 21: Parent Data Rights Verification Gate**
    - **Validates: Requirements 35.2, 35.3**
    - Generate data rights requests with and without confirmed tokens
    - Verify the underlying action never processes without confirmed verification
    - Run with 100+ iterations using fast-check

  - [ ] 29.5 Build the minimal Parent data-rights request UI
    - Standalone, no full-account-login page
    - Student identifier + contact value entry, token confirmation step, clear request-status confirmation
    - _Requirements: 35.2, 35.3, 35.4_

- [ ] 30. Implement Adaptive Instruction
  - [ ] 30.1 Create lenses table and seed the initial lens library
    - Create platform-level `lenses` table
    - Seed with an initial small set (e.g., concrete/analogy, procedural, narrative, Socratic), pending Pedagogical_Lead review
    - _Requirements: 34.3_

  - [ ] 30.2 Implement prerequisite diagnostic check before initial instruction
    - Before presenting a new Skill's instruction, check Mastery_State for direct prerequisites (reuse existing skill graph/mastery data — no new collection)
    - WHEN a prerequisite is tentative/stale/unassessed, weave a brief bridge into the new lesson's opening
    - _Requirements: 34.1, 34.2_

  - [ ] 30.3 Implement default Lens selection and LLM-delivered instruction
    - Select default Lens by Skill's skill_type
    - Generate explanation via LLM abstraction layer (task 17) from Skill base description + Lens template_rules
    - _Requirements: 34.4, 34.6_

  - [ ] 30.4 Implement lens-switching remediation policy
    - WHEN a Student's first practice attempt after instruction is incorrect, select a Lens differing from the one just used, using a fixed platform-level policy
    - Regenerate remediation through the new Lens
    - Tag generated explanation content `content_status: 'draft'` on first generation; promote via the existing content-maturity mechanism (task 28.7), not a separate governance path
    - Confirm no UI or API surface ever asks a Student to select or indicate a preferred teaching style
    - _Requirements: 34.5, 34.7, 34.8_

  - [ ] 30.5 Write property test for lens switching on remediation
    - **Property 22: Lens Switching on Remediation**
    - **Validates: Requirements 34.5**
    - Generate first-incorrect-attempt scenarios across Lenses
    - Verify remediation Lens always differs from initial-instruction Lens
    - Run with 100+ iterations using fast-check

- [ ] 31. Implement LMS content ingestion and structuring
  - [ ] 31.1 Create content_sources and content_ingestion_jobs database tables
    - _Requirements: 33.1, 33.3_

  - [ ] 31.2 Implement text-based extraction (pages, PDF, Word)
    - Extract native LMS text pages directly
    - Extract PDF/Word text, OCR fallback for scanned PDFs
    - Preserve source_reference for every extracted unit; never mutate or discard the original
    - _Requirements: 33.1, 33.3, 33.4_

  - [ ] 31.3 Implement image extraction
    - OCR for text-in-images, visual description via the multimodal LLM abstraction layer for diagrams/figures
    - _Requirements: 33.2_

  - [ ] 31.4 Implement AI-driven structuring pass
    - Deduplicate redundant material across extracted sources for a topic
    - Compute per-Skill coverage_status from linked ContentSource volume/diversity
    - Generate draft Skill_Graph/Misconception_Taxonomy entries grounded in extracted content, tagged content_status = 'draft'
    - _Requirements: 31.6, 32.4_

  - [ ] 31.5 Implement fallback to description-driven authoring
    - WHEN ingested content for a Skill is sparse or absent, automatically fall back to the existing co-authoring flow (task 28.5) — no manual mode switch required
    - _Requirements: 33.5_

  - [ ] 31.6 Explicitly scope out video ingestion for this MVP
    - Document as a deferred enhancement, not a partial/best-effort implementation
    - _Requirements: 33.6_

- [ ] 32. Implement the AI-native content experience (Course/Skill Map)
  - [ ] 32.1 Implement Course/Skill Map data endpoint
    - Implement `GET /api/student/course-map`: Skills in Skill_Graph order, synthesized summary, source citation link
    - _Requirements: 32.1, 32.2_

  - [ ] 32.2 Implement Space coverage aggregation endpoint
    - Implement `GET /api/teacher/space/:id/coverage`: aggregate coverage_status across a Space's included Skills
    - Cache result, track freshness via Space's `content_summary_generated_at`
    - _Requirements: 32.4_

  - [ ] 32.3 Implement scoped free-text question handling
    - Student free-text questions answered only within the current Space's included Skills — consistent with existing guardrail enforcement (task 23)
    - _Requirements: 20.1, 20.2, 32.5_

  - [ ] 32.4 Implement Content_Status visibility rules
    - Display to Teacher, Pedagogical_Lead, and Admin views
    - Never expose in any Student-facing endpoint or view
    - _Requirements: 32.6_

  - [ ]* 32.5 Write unit tests for content experience endpoints
    - Test Course/Skill Map returns Skill_Graph-ordered results
    - Test coverage aggregation reflects underlying Skill coverage_status correctly
    - Test Content_Status never appears in Student-facing API responses
    - _Requirements: 32.4, 32.6_

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP delivery, but are strongly recommended for production quality
- Each task references specific requirements for traceability back to requirements.md
- Property-based tests validate universal correctness guarantees across all inputs (32 properties as of this rewrite — re-verify this count before relying on it, since it grew substantially during the redesign and may grow further)
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows across system boundaries
- Checkpoints ensure incremental validation at logical breaks
- All test tasks use fast-check library for property-based testing with minimum 100 iterations
- POPIA compliance tasks (21.1-21.7) MUST NOT proceed to production without qualified legal counsel validation
- Multi-tenancy isolation is architectural from day one; RLS policies enforce tenant boundaries at database level
- LLM provider is swappable via configuration only; no pedagogy embedded in provider-specific prompts
- Offline-first architecture ensures students can practice during connectivity loss with automatic sync on restore

## Task Dependency Graph

**Flagged rather than silently patched: the subtask-level graph below is stale and was not hand-regenerated at full precision.** The redesign changed what nearly every subtask ID after Task 11 means — 11a/11b didn't exist before, 12 grew from 8 to 11 subtasks with different content, 16 grew from 5 to 15, 19 restructured entirely, 28 gained three new subtasks — and hand-tracing exact dependencies across 230+ checkboxes risks introducing more errors than it fixes if rushed. What follows is a **top-level (major task number) reconstruction**, accurate at that granularity, with the major new dependencies this rewrite introduced called out explicitly. Treat subtask-level sequencing within each wave as guidance from each task's own internal ordering (subtasks are listed in build order within their task), not as a verified cross-task graph — **a fresh, tool-derived regeneration (e.g., Claude Code tracing actual `_Requirements:` and cross-references programmatically) should replace this before it's relied on for parallelization decisions.**

Major dependencies this rewrite introduced, worth knowing even before regeneration:
- Task 11a (Command Layer) depends on Task 17.1's `classifyCommandIntent` method existing, but is sequenced before Task 17 — consistent with this document's existing convention of forward-citing shared infrastructure (Task 7 already did this to Task 17 before this rewrite), not a new problem, but worth knowing this isn't strict numeric-order execution
- Task 16.11 depends on Task 29.1 (flagged explicitly in both tasks)
- Tasks 12.2, 16.2, 19.3 (the three Today/Week implementations) depend on Task 11b's LMS read integration for their LMS-sourced half; each explicitly notes the Escolent-native half can ship first as a stub

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4", "17"] },
    { "id": 3, "tasks": ["5", "6"] },
    { "id": 4, "tasks": ["7", "8", "9"] },
    { "id": 5, "tasks": ["10", "11"] },
    { "id": 6, "tasks": ["11a", "11b"] },
    { "id": 7, "tasks": ["12", "13", "18"] },
    { "id": 8, "tasks": ["14", "19"] },
    { "id": 9, "tasks": ["15"] },
    { "id": 10, "tasks": ["16", "20", "23", "30", "31"] },
    { "id": 11, "tasks": ["21", "24", "25", "28", "28a", "32"] },
    { "id": 12, "tasks": ["22", "29"] },
    { "id": 13, "tasks": ["26"] },
    { "id": 14, "tasks": ["27"] }
  ]
}
```
