# Technical Design Document: Escolent MVP Adaptive Learning Platform

## Overview

### System Purpose

Escolent MVP is a subject-agnostic, AI-native adaptive learning platform. The platform embeds within existing LMS ecosystems (Canvas, Moodle, Google Classroom) to provide adaptive, personalized practice with honest mastery tracking, for any subject a school teaches. The core value proposition: schools currently track completion rather than mastery—students can finish exercises without understanding the material. Escolent shifts the metric from "work completed" to "concepts mastered."

**Interaction model (supersedes the earlier "generative UI, ask-box on dashboards" framing):** conversational and structured interaction are chosen per task, not defaulted to one or the other — dialogic tasks (tutoring, remediation, open-ended creation) are genuinely conversational; scanning/spatial/comparative tasks (a mastery overview, editing Skill_Graph topology) stay structured because that's what actually serves the task; every structured screen is additionally chat-operable. The default landing surface for Teacher, Admin, and Pedagogical_Lead is a synthesized Briefing — the Platform triages and hands over a short, prioritized answer, not raw data the person has to interpret. Full detail: `escolent-interaction-model.md`, which this document is built against.

The subject-agnostic mechanisms below (Skill Graph, Knowledge Tracing, Misconception Detection, pluggable evaluation — Section 14) are validated end-to-end against one initial subject and curriculum for the MVP pilot: Grade 8 Mathematics, IEB-aligned algebraic equations. See Section 14 for how a second subject is added without architectural rework.

### Target Deployment Context

- **Initial Pilot:** Teneo (online private K-12 school, South Africa), one Grade 8 class
- **Target Market Characteristics:** Low-end devices (2GB RAM, dual-core 1.5GHz), unreliable connectivity (2Mbps typical)
- **Geographic Scope:** South African market initially, with second pilot planned (Kenya)
- **Multi-Tenancy Model:** MVP is single-school deployment but architecturally designed for multiple tenants; second school should not require architectural rewrite

### Key Design Principles

1. **Mastery over Completion:** All system behavior optimizes for accurate mastery assessment, not task completion
2. **Offline-First Resilience:** Unreliable connectivity is the norm, not the exception
3. **Low-End Device Performance:** 2GB RAM, dual-core 1.5GHz is the baseline, not a degraded experience
4. **Multi-Tenancy from Day One:** Single-tenant shortcuts are forbidden; isolation by school is architectural
5. **LLM Provider Abstraction:** No pedagogy embedded in provider-specific prompts; swappable via config
6. **Safeguarding Over-Trigger Bias:** False positives in distress detection are acceptable; false negatives are not
7. **Triage, Don't Dump:** The default view for anyone monitoring others (Teacher, Admin, Pedagogical_Lead) is a synthesized Briefing, not a dashboard requiring interpretation — the AI does the synthesis work, not the human
8. **Chat-Operable, Not Chat-Only:** Every structured screen is also drivable by a plain-language request; conversational is not the default mode, it's one of two modes chosen per task on its merits
9. **Shared Access Needs Shared Visibility:** Wherever more than one person can act on the same record (an Escalation, a pending content item, a tenant-wide Admin action), the interface shows who else has it open or has recently acted — never silent, invisible-to-each-other shared authority


## Architecture

### System Architecture Overview

Escolent employs a Progressive Web App (PWA) architecture built on Next.js 14+ (App Router), with Supabase as the backend platform providing PostgreSQL database, real-time subscriptions, authentication, and Row Level Security (RLS) for multi-tenancy enforcement.

```mermaid
graph TB
    subgraph "Client Layer (PWA)"
        PWA[Next.js PWA]
        SW[Service Worker]
        IDB[IndexedDB Cache - mastery + spaced_repetition]
    end
    
    subgraph "Authentication Layer"
        LTI[LTI 1.3 Provider]
        GC[Google Classroom API]
        SSO[Admin SSO]
    end
    
    subgraph "Application Layer (Next.js API Routes)"
        API[API Routes]
        LLM_Svc[LLM Service Abstraction]
        KT[Knowledge Tracing Engine]
        MD[Misconception Detector]
        SR[Spaced Repetition Scheduler]
        DS[Distress Signal Monitor]
        CMD[Conversational Command Layer - Sec 20]
        BRF[Briefing Generation - Sec 10/22/23]
        LMSI[LMS Integration Adapters - Sec 21]
    end
    
    subgraph "Data Layer (Supabase)"
        PG[(PostgreSQL + RLS)]
        RT[Realtime Subscriptions]
        Auth[Supabase Auth]
    end
    
    subgraph "External Services"
        LLM[LLM Provider - OpenAI/Anthropic]
        LMS[LMS - Canvas/Moodle/GClassroom]
    end
    
    PWA --> SW
    SW --> IDB
    PWA --> API
    API --> LLM_Svc
    LLM_Svc --> LLM
    API --> KT
    API --> MD
    API --> SR
    API --> DS
    API --> CMD
    API --> BRF
    API --> LMSI
    CMD --> LLM_Svc
    CMD -.routes to existing endpoints, no separate authority.-> API
    BRF --> PG
    LMSI --> LMS
    API --> PG
    API --> RT
    LTI --> Auth
    GC --> Auth
    SSO --> Auth
    Auth --> PG
    LMS --> LTI
    LMS --> GC
```

### Component Architecture

The system follows a layered architecture with clear separation of concerns:

1. **Client Layer (PWA):** Next.js 14+ application with service worker for offline support, IndexedDB for local state persistence (extended to cache Spaced_Repetition schedule alongside Mastery_State, Section 8, so Entry's recommendation decision resolves without a network round trip)
2. **Authentication Layer:** LTI 1.3 integration for LMS launches, Google Classroom API for Google Classroom, separate Admin SSO — distinct from Section 21a's institutional LMS integration setup, which authorizes read/write API access rather than authenticating a single user's launch
3. **Application Layer:** Next.js API routes implementing business logic for knowledge tracing, misconception detection, spaced repetition, distress monitoring, Briefing generation for Teacher/Admin/Pedagogical_Lead (Sections 10/22/23), the Conversational Command Layer routing plain-language requests to existing structured endpoints (Section 20), and LMS integration adapters (Section 21)
4. **Data Layer:** Supabase providing PostgreSQL with Row Level Security (RLS) for multi-tenancy, real-time subscriptions for live mastery-overview updates
5. **External Services:** LLM provider abstraction supporting OpenAI/Anthropic/others via Vercel AI SDK; LMS APIs (Canvas REST, Moodle web services, Google Classroom API) as of Section 21, distinct from the Authentication Layer's LTI/OAuth launch flow above

### Technology Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **PWA:** Workbox for service worker, IndexedDB for offline storage
- **Backend:** Next.js API Routes, Vercel AI SDK for LLM abstraction
- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth with custom LTI 1.3 provider integration
- **Real-time:** Supabase Realtime for live Mastery Overview and Briefing updates
- **Deployment:** Vercel (frontend + API routes), Supabase Cloud (database + auth)
- **Monitoring:** Vercel Analytics, Supabase logs


## Components and Interfaces

### 1. Authentication System

**Purpose:** Authenticate four distinct user roles (Student, Teacher, Admin, Pedagogical_Lead) via LMS launches or direct login.

**Role Characteristics:**
- **Student/Teacher:** LTI 1.3 (Canvas/Moodle) or Google Classroom API launch, tenant-scoped
- **Admin:** Direct login interface (SSO or username/password), tenant-scoped
- **Pedagogical_Lead:** Platform-level role (not tenant-scoped), curates misconception taxonomy and content across all schools

#### LTI 1.3 Integration

**Authentication Flow:**
1. User clicks Escolent link in Canvas/Moodle
2. LMS initiates LTI 1.3 OIDC launch with signed JWT
3. Next.js API route validates JWT signature using LMS public key
4. Extract user role (Student/Teacher), user ID, school ID (tenant), course context
5. Create or retrieve Supabase user, set RLS context with tenant_id
6. Generate session token, redirect to the Student's or Teacher's Entry experience (Requirement 7, Requirement 10) — not a dashboard

**API Endpoints:**
- `POST /api/auth/lti/login` - Initiates OIDC flow
- `POST /api/auth/lti/launch` - Validates JWT, creates session
- `GET /api/auth/lti/jwks` - Publishes platform public keys for LMS validation

**Configuration Storage (per LMS):**
- LMS client ID, deployment ID, auth endpoint, token endpoint, JWKS URL
- Stored in Supabase `lms_configs` table with `tenant_id` foreign key


#### Google Classroom API Integration

**Authentication Flow:**
1. User clicks Escolent link in Google Classroom
2. Google Classroom passes course ID, user ID via OAuth 2.0
3. Next.js API route validates OAuth token with Google
4. Extract user role, course context, infer tenant from course ownership
5. Create or retrieve Supabase user, set RLS context
6. Generate session token, redirect to the appropriate Entry experience (Requirement 7 for Student, Requirement 10 for Teacher)

**API Endpoints:**
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/google/launch` - Validates token, creates session

#### Direct-Open Authentication (Requirement 1.7-1.8 — added during the Student Shell pressure test)

**Why this exists:** every flow above requires clicking through the LMS. Without a direct-open path, Escolent can never be a Student's primary destination — only something clicked into from Canvas, which structurally works against the product's own stated goal of eventually becoming a standalone platform. This closes that gap.

**Mechanism:** on a successful LTI or Google Classroom launch (either flow above), in addition to the short-lived session token, issue a longer-lived persisted-session token (a secure, httpOnly refresh token) scoped to that Student and stored client-side — this is what a PWA install, a bookmark, or a direct URL visit authenticates against later, without needing a fresh LMS click-through each time.

**Direct-open flow:**
1. Student opens Escolent directly (PWA home-screen icon, bookmark, or URL)
2. Client presents the persisted-session token
3. IF valid → exchange for a fresh short-lived session token, begin Entry (Requirement 7) directly, same as any LMS launch
4. IF absent or expired → display a message directing the Student back to their LMS to launch from there (Requirement 1.8) — not a broken or blank state, and not a generic login form, since Students have no standalone credentials to enter

**API Endpoints:**
- `POST /api/auth/session/refresh` - Exchanges a valid persisted-session token for a fresh session token
- Persisted-session token expiry: long enough to support genuine daily/weekly direct use (exact duration a product decision, not fixed here) — re-established automatically on the Student's next LMS launch regardless of whether the prior one had expired, so normal LMS use always keeps direct-open working

#### Admin Direct Authentication

**Authentication Flow:**
1. Admin visits `/admin/login` (not LTI launch)
2. Admin enters credentials (SSO via Google/Microsoft or username/password)
3. Supabase Auth validates credentials
4. Check user has `admin` role in `user_roles` table
5. Set RLS context with tenant_id from user's school association
6. Redirect to Admin's Entry experience (Requirement 15, Section 22) — not the old Admin Dashboard

**API Endpoints:**
- `POST /api/auth/admin/login` - Admin credential validation
- `POST /api/auth/admin/logout` - Session termination


#### Pedagogical_Lead Authentication

**Special Case:** Pedagogical_Lead is NOT tenant-scoped. This role requires cross-school access to curate misconception taxonomy and content.

**Authentication Flow:**
1. Pedagogical_Lead logs in via `/pedagogical-lead/login`
2. Supabase Auth validates credentials
3. Check user has `pedagogical_lead` role (global, no tenant_id constraint)
4. RLS policies grant cross-tenant READ access to anonymized error patterns
5. Redirect to Pedagogical_Lead's Entry experience (Requirement 31a, Section 23) — not a curation dashboard

**RLS Policy Special Case:**
```sql
-- Pedagogical_Lead can read unmatched_errors across ALL tenants
CREATE POLICY "pedagogical_lead_read_errors"
ON unmatched_errors FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'pedagogical_lead'
  )
);

-- Pedagogical_Lead can INSERT/UPDATE misconceptions across all tenants
CREATE POLICY "pedagogical_lead_write_misconceptions"
ON misconceptions FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'pedagogical_lead'
  )
);

CREATE POLICY "pedagogical_lead_update_misconceptions"
ON misconceptions FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'pedagogical_lead'
  )
);
```


### 2. Skill Graph and Prerequisite System

**Purpose:** Represent the Skills of any subject/curriculum configured on the Platform as a directed acyclic graph (DAG) with prerequisite dependencies, enabling prerequisite-aware remediation. Populated for the MVP pilot with IEB Grade 8 algebra skills (see Requirement 33 / tasks.md Task 1 for initial content load).

**Data Structure:**

```typescript
interface Skill {
  id: string;              // UUID
  name: string;            // e.g., "Solving one-step linear equations"
  description: string;     // Plain-language explanation
  subject: string;         // e.g., "Grade 8 Mathematics" — used to parameterize LLM prompts/tutor voice (Section 13) and Briefing/overview grouping
  skill_type: 'procedural' | 'conceptual'; // Determines mastery threshold
  prerequisite_ids: string[];  // Array of prerequisite skill IDs (DAG edge)
  tenant_id: string | null;    // null = platform-level, else school-specific
  created_by: string;          // 'platform' | 'pedagogical_lead' | teacher_id
  evaluation_strategy: 'exact_match' | 'symbolic_equivalence' | 'rubric_llm';  // See Section 14a
  rubric?: { criterion: string; weight: number }[];  // required when evaluation_strategy = 'rubric_llm'
  content_status: 'draft' | 'pending_approval' | 'validated';  // See Section 14d
  coverage_status: 'rich' | 'thin' | 'gap' | 'not_assessed';  // See Section 18, computed from linked ContentSource records
}
```

**Storage:** `skills` table in PostgreSQL with `prerequisite_ids` as JSON array.

**Graph Traversal:**
- Breadth-first search (BFS) for prerequisite identification when student struggles
- Topological sort for determining skill unlock sequence
- Cycle detection validation on skill creation/modification

**Modification Interface:**
- Platform-level skills (tenant_id = null): only Pedagogical_Lead can modify
- School-specific skills: Teachers can extend graph within their tenant
- Graph structure stored in database, no code changes required for curriculum updates


### 3. Real-Time Knowledge Tracing Engine

**Purpose:** Maintain per-student, per-skill mastery probability estimates (Mastery_State), updated within 2 seconds of each response.

**Algorithm:** Simplified Bayesian Knowledge Tracing (BKT) with performance history weighting.

**Mastery_State Calculation:**

```typescript
interface MasteryState {
  student_id: string;
  skill_id: string;
  probability: number;     // 0.0 to 1.0
  last_updated: timestamp;
  response_history: ResponseRecord[];  // Last 10 responses
  is_tentatively_mastered: boolean;    // probability > threshold
  is_durably_mastered: boolean;        // mastered in 2+ sessions
  mastered_session_count: number;      // Sessions where probability > threshold
  tenant_id: string;       // Multi-tenancy isolation
}

interface ResponseRecord {
  is_correct: boolean;
  timestamp: timestamp;
  problem_difficulty: number;  // 1-5 scale
  response_time_ms: number;    // Tracked but NOT used in calculation
}
```

**Thresholds:**
- Procedural skills: 0.85 probability threshold for tentative mastery
- Conceptual skills: 0.90 probability threshold for tentative mastery
- Durable mastery: tentative mastery achieved in 2+ separate sessions (session separation >= 1 day)

**Note:** These specific threshold values (0.85/0.90) are provisional placeholders subject to refinement based on pilot data and pedagogical review. They represent reasonable starting points for implementation but should be validated and adjusted through real classroom use and consultation with the Pedagogical_Lead.


**Update Flow:**

1. Student submits answer
2. API route `/api/session/submit-response` receives response
3. Determine correctness (exact match, symbolic equivalence, or LLM evaluation for free-text)
4. Fetch current Mastery_State and last 10 responses from `mastery_states` table
5. Apply BKT update:
   - Correct answer: increase probability weighted by problem difficulty
   - Incorrect answer: decrease probability, check for prerequisite gaps
6. Update `mastery_states` table (target: < 2 seconds)
7. Check if threshold crossed → update `is_tentatively_mastered`
8. If offline: queue update in IndexedDB, sync when connectivity restored

**Offline Queueing:**
- All responses stored in IndexedDB with `synced: false` flag
- Background sync API attempts sync every 10 seconds when online
- Conflict resolution: server timestamp wins if multiple devices used

**Response Time Tracking:**
- Captured in `response_time_ms` for teacher diagnostic visibility
- Deliberately NOT used in mastery calculation to avoid penalizing low-end devices and ESL students


### 4. Misconception Detection and Remediation System

**Purpose:** Identify specific misconceptions within a subject (not just "wrong answers") and provide targeted remediation. Populated for the MVP pilot with Grade 8 algebra misconceptions (Task 25.2).

**Misconception Taxonomy Structure:**

```typescript
interface Misconception {
  id: string;              // UUID
  name: string;            // e.g., "Subtracting negative numbers as adding positives"
  description: string;     // Diagnostic explanation
  skill_id: string;        // Associated skill
  error_pattern: ErrorPattern;  // Pattern matching logic
  classification: 'repetition_confirmed' | 'first_occurrence_actionable';
  remediation_strategy: string;  // Plain-language guidance for LLM prompt
  example_errors: string[];      // Sample incorrect responses
  tenant_id: string | null;      // null = platform-level
  created_by: string;            // 'pedagogical_lead' | teacher_id
  content_status: 'draft' | 'pending_approval' | 'validated';  // See Section 14d
}

interface ErrorPattern {
  type: 'symbolic' | 'regex' | 'semantic';
  pattern: string;         // Pattern definition
  threshold?: number;      // For repetition_confirmed: occurrences needed
}
```


**Detection Flow:**

1. Student submits incorrect answer
2. API route `/api/misconception/detect` receives response
3. Pattern matching sequence (< 3 seconds total):
   - **Symbolic matching:** Exact symbolic pattern match (e.g., `-(-x)` → `x` instead of `+x`)
   - **Regex matching:** String pattern match for common errors
   - **Semantic matching:** LLM-based classification for complex errors
4. Check classification:
   - **first_occurrence_actionable:** Trigger remediation immediately
   - **repetition_confirmed:** Check student's error history for pattern frequency
5. If pattern matches, log to `student_misconceptions` table
6. If no match, log to `unmatched_errors` table for Pedagogical_Lead review
7. Return remediation strategy or generic Socratic prompt

**Unmatched Error Routing:**

```typescript
interface UnmatchedError {
  id: string;
  student_id_anonymized: string;  // Hashed for privacy
  skill_id: string;
  problem_text: string;
  student_response: string;
  correct_answer: string;
  timestamp: timestamp;
  tenant_id: string;       // For curation context
  reviewed: boolean;       // Pedagogical_Lead review flag
}
```

- Unmatched errors accessible to Pedagogical_Lead via the Briefing (Section 23) and `/pedagogical-lead/errors`
- WHEN a Pedagogical_Lead promotes an error to the misconception taxonomy, THE Platform pre-drafts the entry (name, description, classification, remediation strategy) via the LLM abstraction layer, using the same "propose, human approves" mechanism as the AI co-authoring flow (Section 14c) — never a blank manual form
- Meanwhile, student receives real-time Socratic-style prompt (not blocked by async curation)


**Language Comprehension Detection:**
- If student error frequency is uniform across skills but LLM detects language pattern issues, flag response for teacher review
- Flag appears in Teacher's Mastery Overview: "Possible language comprehension difficulty"
- Teacher can manually intervene or request ESL support

**Note:** This heuristic ('uniform error frequency across skills') is provisional and subject to validation by the Pedagogical_Lead during pilot. Alternative detection strategies may be needed based on real pilot data.

### 5. Spaced Repetition Scheduler

**Purpose:** Resurface mastered skills at increasing intervals to ensure long-term retention.

**Algorithm:** SM-2 algorithm variant (SuperMemo 2) adapted for math skills.

**Scheduling Logic:**

```typescript
interface SpacedRepetitionSchedule {
  student_id: string;
  skill_id: string;
  next_review_date: timestamp;
  interval_days: number;    // Days until next review
  ease_factor: number;      // 1.3 to 2.5 (SM-2 default)
  consecutive_correct: number;
  tenant_id: string;
}
```

**Review Intervals:**
- First review: 1 day after durable mastery
- Second review: 3 days
- Subsequent: interval * ease_factor
- Ease factor increases with correct reviews, decreases with errors


**Session Integration:**
- At session start, query `spaced_repetition_schedules` for due reviews
- Inject review problems (max 20% of session problems)
- Interleave with new/struggling skill problems to avoid review-only sessions
- Update schedule based on performance:
  - Correct: increase interval
  - Incorrect: reset to shorter interval, mark skill for reteaching

#### 5a. Review-Due Notification (Requirement 5a)

**Trigger:** exclusively when a `spaced_repetition_schedules` row transitions to due — no other trigger exists. No inactivity timer, no fixed cadence.

**Eligibility:** only Students with the Platform installed as a direct-open PWA (Requirement 1.7) and notification permission granted. Checked at trigger time — no separate opt-in flow beyond the OS-level permission prompt, no in-app nagging to enable notifications for a Student who's declined.

**Delivery:** Web Push API, since this only needs to reach an installed PWA, not a bare browser tab. Payload is factual only — the Skill name and that a review is ready. No streak, comparison, or loss language, enforced by using a fixed, reviewed copy template rather than freely-generated text (this is exactly the kind of message where a generated variant could accidentally drift into urgency-language, so it's templated, not AI-written).

**Tap behavior:** opens directly into a Session for that Skill — reuses the existing `?skill=` routing already built for Progress's "Practice this now" (Requirement/Task from the skill-specific-routing work), not a new mechanism.

**Deduplication:** one notification per due Skill; a second one isn't sent for the same pending review even if it stays due for a while.

**API Endpoints:**
- `POST /api/notifications/subscribe` - Registers a Student's push subscription after PWA install + permission grant
- Server-side: on marking a `spaced_repetition_schedules` row due, check subscription exists, send once, mark `notified: true` on that row to prevent duplicates

### 6. Cognitive Load-Aware Scaffolding System

**Purpose:** Fade support from worked examples → partial support → independent practice based on mastery state.

**Scaffolding Levels:**

```typescript
type ScaffoldingLevel = 
  | 'worked_example'        // Mastery < 0.3: full solution shown, explanation provided
  | 'partial_scaffold'      // Mastery 0.3-0.7: hints available, partial solution
  | 'hint_on_demand'        // Mastery 0.7-threshold: hints available only if requested (skill-type-specific threshold from Req 3)
  | 'independent'           // Mastery >= threshold: no scaffolding (skill-type-specific threshold: 0.85 for procedural, 0.90 for conceptual)

interface ScaffoldedProblem {
  problem_id: string;
  skill_id: string;
  difficulty: number;
  scaffolding_level: ScaffoldingLevel;
  worked_solution?: string;    // Full solution for worked_example
  hints?: string[];            // Progressive hints for partial_scaffold
  hint_penalty: number;        // Mastery adjustment if hint requested
}
```

**Note:** These specific scaffolding band thresholds (0.3/0.7) are provisional placeholders subject to refinement based on pilot data and pedagogical review. They represent reasonable starting points for implementation but should be validated and adjusted through real classroom use and consultation with the Pedagogical_Lead.


**Scaffolding Selection Flow:**
1. Fetch student's current Mastery_State for skill
2. Map probability to scaffolding level
3. Generate/retrieve problem at appropriate level
4. If student requests hint during `independent` or `hint_on_demand`:
   - Provide hint
   - Apply `hint_penalty` (e.g., -0.05 to mastery probability)
   - Log hint request to track self-regulation behavior
5. **Ladder exhaustion (Req 6.6):** if the student remains incorrect after an `independent`-level attempt (the highest scaffolding tier) — not just a single miss, but with no scaffolding tier left to escalate to — the Platform does not loop the student on the same tier indefinitely. Instead:
   - Flag the attempt for Teacher review (visible in the Teacher Briefing/overview, Section 10)
   - Run the response through Misconception pattern matching (Section 4) as normal; if it matches, route through the existing remediation flow (Section 4's targeted remediation)
   - If unmatched, log it via the existing Unmatched Error path (Section 4's `unmatched_errors` insert) — no new mechanism, this is the same exhaustion-exit reusing infrastructure that already exists for a different trigger

### 7. Adaptive Practice Session Engine

**Purpose:** Orchestrate practice sessions that adapt to student's current mastery state, prerequisite gaps, and space boundaries.

**Session State Machine:**

```typescript
interface Session {
  id: string;
  student_id: string;
  space_id: string;
  start_time: timestamp;
  last_activity: timestamp;
  status: 'active' | 'paused' | 'completed' | 'interrupted';
  problems_completed: number;
  problems: ProblemInstance[];
  tenant_id: string;
}

interface ProblemInstance {
  problem_id: string;
  skill_id: string;
  presented_at: timestamp;
  response?: string;
  is_correct?: boolean;
  hints_requested: number;
  problem_type: 'new_learning' | 'prerequisite_remediation' | 'spaced_review';
}
```

**Entry / Session Auto-Start (Req 7.1–1f):** this did not exist as a distinct step before this pass — the Problem Selection Algorithm below assumed a Space and Session already existed. Entry is the step before that: deciding *which* Space/Skill to start in, at the moment the Student opens the Platform, with no menu.

1. Fetch the Student's active Space enrollments (there may be more than one, Req 7.1f).
2. For each enrolled Space, compute candidate next-Skills: spaced-repetition items due (Section 5), prerequisite gaps flagged during prior practice, and unattempted Skills with met prerequisites — each candidate stays scoped to its own Space's boundaries and classroom pacing mode, exactly as the existing Problem Selection Algorithm already enforces within a session.
3. Rank candidates across all enrolled Spaces together and select the single highest-priority one (spaced-repetition overdue > flagged prerequisite gap > new Skill, ties broken by how overdue/stale).
4. Begin a Session directly in the winning Space/Skill — no intermediate confirmation screen — with a one-line reason surfaced (Req 7.1a).
5. **State: no prior Session history.** Select the first Skill in the Skill_Graph with no unmet prerequisites, within the boundaries of any Space the Student is enrolled in; the framing text is a fixed "fresh start" template, not the "returning" template — these are two different copy templates, not one template with a missing variable.
6. **State: nothing currently due.** No candidate clears the due/gap/new bar in step 2 for any enrolled Space. Return the honest "nothing due" state (Req 7.1d) with optional enrichment Skills offered, not required.
7. **Cache-vs-live boundary (Req 7.1e, and the fix to the contradiction with Section 8's Req 8.4):** steps 1–3 (the *decision* of what to recommend) read from the client's local `mastery_cache` and a new local `spaced_repetition_cache` (both extended in Section 8's IndexedDB schema) — this makes the decision itself resolvable with zero network round trips. Step 4 (actually *beginning* the Session) still follows Section 8's existing rule: if the winning Skill's Practice_Problem content isn't already cached, loading it follows the same connectivity requirement as starting any other new Session. 7.1e is about what decides, not a claim that a cold Session start works fully offline.

**Problem Selection Algorithm:**

1. Fetch Space boundaries (included skill IDs, difficulty range, classroom pacing mode)
2. Fetch student's Mastery_State for all Space skills
3. Check for due spaced repetition reviews (max 20% of session)
4. Identify skills needing practice:
   - **Struggling:** mastery < 0.5, recent errors
   - **Emerging:** mastery 0.5-0.85, needs consolidation
   - **New:** not yet attempted, prerequisites met
5. If classroom pacing mode enabled:
   - Prioritize Space-defined skills even if prerequisites not mastered
   - Flag prerequisite gaps for teacher (don't auto-remediate)
6. If classroom pacing mode disabled:
   - Auto-inject prerequisite remediation when gaps detected
   - Return to space skills after remediation
7. Select problem at appropriate scaffolding level
8. Present problem to student

**Natural Stopping Points:**
- After 10-15 problems OR 15-20 minutes elapsed
- UI suggests: "Great progress! You can stop here or keep going."
- Student chooses to continue or end session

**Autosave:**
- Every 30 seconds OR after each response (whichever first)
- Save session state to `sessions` table
- Also persist to IndexedDB for offline resilience

**Student Today and Week (Requirement 7a) — found missing during tasks.md work, not built in either prior design.md pass.** Section 12's distress-monitoring text already referenced "the Today view" for Students as if it existed; it didn't. Same shape as Teacher's Today (this section's sibling in spirit, Section 10a) and Admin's (Section 22), Student-scoped:

```typescript
interface StudentTodayItem {
  id: string;
  source: 'escolent' | 'lms';
  kind: 'spaced_repetition_due' | 'teacher_assigned' | 'lms_assignment_due';
  space_id?: string;
  due_at: timestamp;
  action_route: string | null;   // null for lms-only items with no Escolent practice available — link back to source instead (Requirement 5)
  sync_status: 'fresh' | 'stale' | 'syncing' | 'unavailable';
}
```

- `GET /api/student/today` and `GET /api/student/week` — merges Escolent-native items (spaced-repetition due, Teacher-assigned Space content) with LMS-sourced assignment due-dates, read via the same per-platform adapters as Section 21b, not a separate integration
- Includes every due item from the connected LMS, not filtered to subjects Escolent currently teaches (Requirement 7a.2) — an LMS-only item (a science quiz) shows with `action_route: null` and a reference-back link, not a fabricated "start practice" action Escolent can't fulfill
- Today prominent, week one tap away, same structured-for-scanning reasoning as every other Today view in this product
- Sync-staleness on LMS-sourced items reuses the same `sync_status` pattern as Section 10a and Section 18's offline indicators — not a new one invented here
- Fully answerable via the Conversational Command Layer (Section 20) — e.g., "what do I have due Thursday" — without opening either view


### 8. Offline-First Architecture

**Purpose:** Enable students to continue practicing during connectivity loss, with automatic sync when restored.

**Service Worker Strategy (Workbox):**

- **Cache-First:** Static assets (JS, CSS, images), skill graph data, problem templates
- **Network-First with Cache Fallback:** API calls for new problems, LLM responses
- **Background Sync:** Queued responses sync automatically when online

**IndexedDB Schema (Client-Side):**

```typescript
// ObjectStores:
- sessions: Current session state
- responses: Unsynced student responses (sync_status: 'pending' | 'synced')
- problems: Cached problem instances
- mastery_cache: Local copy of mastery states (read-only, sync from server)
- spaced_repetition_cache: Local copy of the student's Spaced_Repetition schedule (read-only, sync from server) — added to support Section 7's Entry logic, which needs due-date data alongside mastery_cache to decide the next recommended Skill without a live round trip
```

**Boundary with Section 7's Entry logic:** `mastery_cache` and `spaced_repetition_cache` make the *decision* of what to recommend resolvable offline. They do not change the rule below — loading a brand-new Session's actual Practice_Problem content still requires connectivity unless that content happens to already be cached from a prior sync.

**Offline Flow:**

1. Connectivity lost mid-session
2. Service worker intercepts API calls, returns cached data or error
3. Student continues answering loaded problems
4. Responses saved to IndexedDB `responses` store with `sync_status: 'pending'`
5. UI displays offline indicator
6. Background sync task attempts sync every 10 seconds
7. When online, sync all pending responses to `/api/sync/responses`
8. Server validates, updates mastery states, returns updated data
9. Client updates local cache, marks responses as `synced`


**Session State Recovery:**
- If browser closed or connectivity lost, session state persists in IndexedDB
- On return, check for `interrupted` sessions < 24 hours old
- Prompt: "You have an unfinished session. Resume?"
- If resumed, restore exact problem and student responses
- If expired (> 24 hours), mark session as `expired`, start fresh

### 9. Teacher Space Management System

**Purpose:** Enable teachers to create bounded practice environments with specific curriculum scope.

**Space Data Model:**

```typescript
interface Space {
  id: string;
  name: string;
  description: string;
  teacher_id: string;
  tenant_id: string;          // Multi-tenancy isolation
  included_skill_ids: string[]; // Subset of skill graph
  difficulty_range: [number, number]; // [min, max] difficulty (1-5)
  classroom_pacing_mode: boolean;  // Override prerequisite auto-remediation
  content_summary_generated_at: timestamp | null;  // See Section 18 — freshness of the cached aggregate coverage view
  created_at: timestamp;
  updated_at: timestamp;
}

interface SpaceEnrollment {
  space_id: string;
  student_id: string;
  enrolled_at: timestamp;
  tenant_id: string;
}
```


**Space Management Interface:**

- `/teacher/spaces` - List all spaces created by teacher
- `/teacher/spaces/new` - Create space wizard:
  1. Name and description
  2. Select skills from graph (visual tree picker)
  3. Set difficulty range
  4. Toggle classroom pacing mode
  5. Assign students
- `/teacher/spaces/{id}/edit` - Modify space configuration
- Changes apply to future sessions only (not in-progress sessions)

**Classroom Pacing Mode:**
- **Enabled:** Students practice only Space skills, even if prerequisites not mastered
  - Prerequisite gaps flagged in Teacher's Briefing and Mastery Overview
  - Teacher manually decides intervention
- **Disabled:** System auto-injects prerequisite remediation when gaps detected
  - Returns to Space skills after remediation
  - More adaptive but less aligned with classroom pacing

### 10. Teacher Entry: Briefing, Daily Awareness, and Mastery Overview

**Purpose:** Give teachers a synthesized answer to "what needs me today" across every class they teach, instead of a dashboard they have to interpret themselves — the mastery-scanning view still exists, but as a destination reached from the Briefing, not the landing surface. (Req 10, 10a, 10b.)

**Briefing Generation (Req 10):**

The Briefing is computed server-side on a scheduled/on-demand basis per Teacher, not assembled client-side from raw subscriptions the way the old dashboard was:

```typescript
interface TeacherBriefingItem {
  id: string;
  category: 'struggling_students' | 'misconception_spike' | 'escalation_pending' | 'trending_down';
  space_id: string;             // every item is labeled by Space (Req 10.2)
  summary: string;              // e.g., "3 students stuck on two-step equations"
  affected_student_ids: string[];
  action_route: string;         // deep link straight to the specific record (Req 10.3)
  urgency: 'urgent' | 'informational';
  computed_at: timestamp;
}

interface TeacherBriefing {
  teacher_id: string;
  tenant_id: string;
  items: TeacherBriefingItem[];
  state: 'populated' | 'no_spaces' | 'insufficient_data' | 'all_clear';
  computed_at: timestamp;
}
```

**Generation flow:**
1. Aggregate across every Space the Teacher teaches (Req 10.2) — query Mastery_State, Misconception, and Escalation data across all of the Teacher's Spaces in one pass, not per-Space then merged client-side.
2. Struggling-student and misconception-spike detection reuse existing thresholds (Section 3's mastery bands, Section 4's misconception matching) — no new detection logic, just aggregation and ranking of signals that already exist.
3. Escalation items pull from `distress_escalations` where the Teacher has RLS access (Section 12) — tenant-wide, not Space-scoped, per the existing "backup-escalated" design.
4. Determine `state`: `no_spaces` if the Teacher has zero Spaces (→ route to Space creation, Section 9); `insufficient_data` if Spaces exist but there's under a threshold of Session data for confident triage (→ state this plainly, default to the mastery overview below); `all_clear` if aggregation finds nothing urgent; otherwise `populated`.
5. Cache the computed Briefing client-side so opening the Platform doesn't block on a live query (Req 10.7) — same `mastery_cache`-style local-first pattern as Section 7/8, refreshed on sync.

**API:** `GET /api/teacher/briefing` — returns `TeacherBriefing`. Each `action_route` in the response is a real route the client navigates to directly (e.g., `/teacher/students/:id/errors?skill=:skillId`), not a generic dashboard URL.

**Today and Week (Req 10a):**

```typescript
interface TodayItem {
  id: string;
  source: 'escolent' | 'lms';
  kind: 'curation_backlog' | 'escalation' | 'override_followup' | 'lms_assignment_due' | 'lms_grading_deadline';
  space_id?: string;
  due_at: timestamp;
  action_route: string;         // same immediacy as a Briefing item (Req 10a.3)
  sync_status: 'fresh' | 'stale' | 'syncing' | 'unavailable';  // Req 10a.4, reuses the existing content-state sync/connectivity language
}
```

`GET /api/teacher/today` returns Escolent-native items plus LMS-sourced items (Section on LMS Integration, added below) merged into one list; `GET /api/teacher/week` returns the same shape for the current week. A plain-language equivalent (Req 10a.5) is handled by the Conversational Command Layer (added below), which queries the same underlying data rather than a separate index.

**Mastery Overview (Req 10b) — formerly "Teacher Dashboard":**

Unchanged in substance from the prior design — this is the screen the old Dashboard UI Components described — just repositioned as a destination, not the landing surface, and now aggregated across Spaces by default with the single-Space filter available (Req 10.2a):

1. **Mastery grid:** students (rows) × skills (columns), color-coded by mastery state, aggregated across the Teacher's Spaces by default
2. **Prerequisite Gap Alerts:** list of students with flagged gaps, skill identified
3. **Misconception Tracker:** most common misconceptions this week, student counts
4. **Session Activity:** live indicator when students practicing, last activity timestamp

**Real-Time Updates (Supabase Realtime):**

```typescript
// Subscribe to mastery_states changes for teacher's students
const subscription = supabase
  .channel('teacher_mastery_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'mastery_states',
      filter: `student_id=in.(${studentIds})`
    },
    (payload) => {
      updateOverview(payload.new);
    }
  )
  .subscribe();
```

**Filters:**
- By Space: Show only students in selected Space (Req 10.2a's single-Space filter, on top of the aggregated default)
- By Skill: Show all students' mastery for specific skill
- By Student: Drill down to individual student's full skill profile
- Plain-language equivalent (e.g., "show me who's below 60% on algebra") handled by the Conversational Command Layer

**Mastery State Visual Encoding:**
- **Gray:** Not attempted (mastery = 0)
- **Red:** Struggling (mastery < 0.5)
- **Yellow:** Emerging (mastery 0.5-0.85)
- **Green:** Tentatively mastered (mastery >= threshold, < 2 sessions)
- **Dark Green:** Durably mastered (mastery >= threshold, 2+ sessions)


### 11. Teacher Override System

**Purpose:** Allow teachers to manually mark skills as mastered based on direct observation (e.g., oral assessment, classwork).

**Override Data Model:**

```typescript
interface MasteryOverride {
  id: string;
  student_id: string;
  skill_id: string;
  teacher_id: string;
  reason: string;              // Required justification
  override_type: 'mark_mastered' | 'reset_mastery';
  entry_method: 'structured' | 'conversational';  // for analytics only — audit trail and confirmation requirements are identical either way (Req 11.3a)
  applied_at: timestamp;
  tenant_id: string;
}
```

**Override Flow:**

1. Teacher clicks "Override" on student's skill in the Mastery Overview, **or** issues a plain-language request (e.g., "override Jane's assessment on two-step equations — solved it correctly on paper, input error") through the Conversational Command Layer (added below), which resolves to the same structured action
2. IF the plain-language request is ambiguous — the named Student or Skill isn't uniquely resolvable (e.g., two students named Jane in the Teacher's Spaces) — THEN the Command Layer returns a clarifying question rather than guessing which record to act on (Req 11.1a)
3. Modal prompts for reason (free text, 20-200 chars) and requires explicit confirmation before applying — identical whether the flow was entered via click or plain language (Req 11.2)
4. Submit override to `/api/teacher/override`
5. Update `mastery_states` table: set `is_durably_mastered = true`, `probability = 1.0`
6. Insert record to `mastery_overrides` table, tagging `entry_method: 'structured' | 'conversational'` for audit purposes — the audit trail itself is identical either way (Req 11.3a); the tag exists for analytics on which entry method is actually used, not to treat the two differently
7. Real-time update to the Student's own progress view (if online) — Students have a compact progress view (interaction model, Student section D), not a dashboard

**Review Prompts:**
- After 30 days, Teacher's Briefing surfaces: "You marked [Student] as mastered in [Skill] 30 days ago. Confirm or reassess?"
- Teacher can confirm, reset, or ignore prompt


### 12. Distress Signal Detection and Escalation System

**Purpose:** Detect student distress in free-text responses and escalate to teachers immediately.

**Detection Strategy (Multi-Layer):**

**Monitored surfaces (Req 18.1–2):** every surface that accepts free-text input from a Student, not only Practice_Problem responses — this includes the Today view, progress requests, and hint requests routed through the Conversational Command Layer (added below). Detection is applied at the point text is submitted, regardless of which surface it came from, rather than being wired into one input component.

1. **Pattern-Based Detection (Fast):** Regex patterns for explicit distress language
   - Keywords: "hurt myself", "want to die", "no point", "end it all", etc.
   - Threshold: Single match triggers escalation (over-trigger bias)

2. **Contextual Analysis (LLM-Based):** Semantic analysis for implicit distress
   - Prompt: "Analyze this student response for signs of distress, hopelessness, or self-harm intent. Respond with JSON: {is_distress: boolean, confidence: number, reason: string}"
   - Confidence threshold: 0.6 (lower threshold = over-trigger bias)

**Escalation Flow:**

1. Student submits free-text input on any monitored surface
2. Run pattern detection (< 100ms)
3. If pattern match → immediate escalation
4. If no pattern match → async LLM analysis
5. If LLM detects distress → escalation
6. Escalation creation:
   - Insert to `distress_escalations` table
   - Send real-time notification to teacher (Supabase Realtime + email, optionally SMS via Twilio for production scale) — the notification deep-links directly to the Escalation's context (Req 19.2), not a general list
   - Display to student: "Your teacher has been notified and will follow up with you."


**Escalation Data Model:**

```typescript
interface DistressEscalation {
  id: string;
  student_id: string;
  session_id: string;
  response_text: string;       // Student's concerning response
  detection_method: 'pattern' | 'llm';
  confidence: number;
  created_at: timestamp;
  acknowledged_by?: string;    // Teacher ID
  acknowledged_at?: timestamp;
  backup_notified: boolean;
  tenant_id: string;
}
```

**Shared-visibility on concurrent access (Req 19.2a):** who else has opened this Escalation — any Teacher with tenant-wide `distress_escalations` access, or any Admin via their oversight grant — is tracked via the shared `record_views` mechanism (defined once, in Section 14d, alongside the identical need for concurrent content review) rather than a bespoke field on this table. `acknowledged_by` stays a dedicated field here since formal acknowledgment is a distinct, stronger action than merely viewing. `GET /api/escalations/:id` returns both `acknowledged_by` and the current `record_views` entries for this Escalation so the UI can show who's already looked, live — not to restrict who can act, just so a second staff member isn't guessing whether they're first.

**Backup Notification:**
- If primary teacher has not acknowledged within 10 minutes
- Send notification to backup teacher (configured per Space)
- If no backup configured, notify tenant Admin

**Safeguarding Constraint:**
- Platform NEVER provides counseling or mental health advice to students
- Message to student: "Your teacher has been notified and will follow up with you."
- All escalations logged with full context for teacher review
- This constraint and the scripted message apply identically regardless of which surface triggered detection (Req 37.8) — broadening the monitored surfaces above does not change the response


### 13. LLM Provider Abstraction Layer

**Purpose:** Isolate LLM provider API calls to enable swapping providers via configuration only.

**Abstraction Interface (Vercel AI SDK):**

```typescript
interface LLMProvider {
  generateResponse(prompt: string, context: LLMContext): Promise<string>;
  classifyError(response: string, correctAnswer: string): Promise<MisconceptionMatch>;
  detectDistress(text: string): Promise<DistressDetection>;
}

interface LLMContext {
  skill: Skill;
  student_mastery: number;
  scaffolding_level: ScaffoldingLevel;
  misconception_taxonomy: Misconception[];
}
```

**Provider Configuration:**

```typescript
// config/llm.ts
export const llmConfig = {
  provider: process.env.LLM_PROVIDER, // 'openai' | 'anthropic' | 'gemini'
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL,       // e.g., 'gpt-4', 'claude-3-opus'
  temperature: 0.7,
};
```

**Default Provider Selection:**
- **Primary (default):** Anthropic Claude (claude-3-5-sonnet) for general Socratic tutoring, misconception remediation, and distress detection
- **Secondary use case:** Google Gemini for Google Africa Applied AI Lab partnership requirements (specific use case to be determined based on partnership needs)
- Provider is configurable via environment variable to support experimentation and failover

**Vercel AI SDK Implementation:**

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const getModel = () => {
  switch (llmConfig.provider) {
    case 'openai': return openai(llmConfig.model);
    case 'anthropic': return anthropic(llmConfig.model);
    case 'gemini': return google(llmConfig.model);
    default: throw new Error(`Unsupported provider: ${llmConfig.provider}`);
  }
};

export const generateResponse = async (prompt: string) => {
  const { text } = await generateText({
    model: getModel(),
    prompt,
    temperature: llmConfig.temperature,
  });
  return text;
};
```


**Prompt Templates (Provider-Agnostic, Subject-Agnostic):**

```typescript
// No pedagogy embedded in prompts - all instructional logic in code.
// Subject and skill are parameters, not fixed text, so the same template
// serves any subject the Platform is configured with (Requirement 31).
const socraticPromptTemplate = (context: LLMContext, studentError: string) => `
You are a tutor for ${context.skill.subject}. The student is learning: ${context.skill.name}.
The student's current mastery level is ${context.student_mastery * 100}%.
The student provided this incorrect answer: "${studentError}"

Provide a Socratic-style hint that guides the student to discover the error without giving the answer directly.
Keep the response under 50 words, in language appropriate for this subject and grade level.
`;
```

**Key Principle:** Pedagogy lives in application code (skill graph, mastery thresholds, scaffolding levels), NOT in LLM prompts. This ensures swapping providers doesn't change educational behavior.


### 14. Subject-Agnostic Evaluation and AI-Assisted Content Authoring

**Purpose:** Generalize answer evaluation and misconception detection beyond math's structured-answer shape, and let a Teacher or Pedagogical_Lead bootstrap a new subject quickly via an AI-proposed draft that requires explicit human approval before any Student sees it.

#### 14a. Pluggable Answer Evaluation Strategy

Each Skill declares its own evaluation strategy rather than the Platform assuming one globally:

```typescript
type EvaluationStrategy = 'exact_match' | 'symbolic_equivalence' | 'rubric_llm';

interface RubricCriterion {
  criterion: string;        // e.g., "Thesis statement is clearly stated"
  weight: number;           // relative weight in overall correctness judgment
}

interface Skill {
  // ...existing fields (see Skill Graph, Section 2)
  evaluation_strategy: EvaluationStrategy;
  rubric?: RubricCriterion[];  // required when evaluation_strategy = 'rubric_llm'
}
```

**Evaluation flow:**
1. Fetch the Skill's declared `evaluation_strategy`.
2. `exact_match` / `symbolic_equivalence`: existing math-style correctness check (Section 3's Update Flow).
3. `rubric_llm`: pass the Student's response and the Skill's `rubric` to the LLM abstraction layer (Section 13); the LLM scores against each criterion, producing a correctness/partial-credit judgment and per-criterion feedback rather than a binary right/wrong.
4. The Mastery_State update (Section 3) consumes whichever judgment comes back — the BKT update logic itself doesn't need to know which strategy produced it.

**Why this doesn't touch the knowledge-tracing core:** Section 3's mastery update already operates on a correctness signal, not on the answer itself. Making evaluation pluggable is additive — it changes how the correctness signal is produced, not how it's consumed.

#### 14b. Misconception Detection Defaults for Non-Symbolic Subjects

The existing `ErrorPattern.type` (`symbolic | regex | semantic`, Section 4) already anticipates this. The addition is a stated default: **for any Skill using `rubric_llm` evaluation, misconception detection defaults to `semantic` matching** — the LLM classifies the response against the Misconception_Taxonomy's descriptions rather than attempting symbolic/regex matching, which doesn't apply to open-ended text. Symbolic and regex matching remain available as a math-specific fast-path, not the general case.

#### 14c. AI-Assisted Content Co-Authoring Flow

**Authoring flow:**
1. Teacher or Pedagogical_Lead provides a plain-language description of the subject/unit (e.g., "Grade 8 Natural Sciences, the water cycle").
2. The LLM abstraction layer generates a **draft** Skill_Graph (skills, prerequisites, skill_type, suggested evaluation_strategy) and a **draft** Misconception_Taxonomy (informed by general pedagogical knowledge and any existing similar content already on the Platform), tagged `content_status: 'draft'`.
3. Draft content is presented in a review UI — the author can edit skill names/descriptions, adjust prerequisite links, merge or split skills, edit or remove proposed misconceptions, and adjust the rubric before anything is approved.
4. **Nothing with `content_status: 'draft'` is served to Students until explicit approval** — this is the same non-negotiable human-approval gate already established for Charti's assistant, extended to any authoring teacher.
5. Once approved, draft content becomes live (servable to Students) but remains tagged `draft` for confidence-display purposes until promoted (see 14d).

**API Endpoints:**
- `POST /api/content/authoring/propose` — Input: `{ subject_description: string, grade_level: string }` — Output: `{ draft_skill_graph: Skill[], draft_misconceptions: Misconception[] }`
- `POST /api/content/authoring/approve` — Input: `{ skill_ids: string[], misconception_ids: string[] }` — moves reviewed/edited content from `content_status: 'draft'` to `'pending_approval'`, awaiting final sign-off
- `POST /api/content/authoring/sign-off` — Input: `{ skill_ids: string[], misconception_ids: string[] }` — moves `'pending_approval'` content to `'validated'`, making it servable to Students
- `PUT /api/content/authoring/skills/:id` / `PUT /api/content/authoring/misconceptions/:id` — teacher edits before or after approval

#### 14d. Content Trust Tiering

```typescript
type ContentStatus = 'draft' | 'pending_approval' | 'validated';
```

Added to both `Skill` and `Misconception` (Section 2 and Section 4 data structures, and their corresponding tables). A deliberate three-stage model, confirmed against the design system's Content Status Badge component — `draft` and `pending_approval` are kept visually and semantically distinct because they carry different responsibility: AI-proposed and untouched, versus already reviewed/edited by a human and awaiting final sign-off.

**Behavior by status:**
- `draft`: AI-proposed, not yet reviewed by a human. Never servable to Students.
- `pending_approval`: a Teacher or Pedagogical_Lead has reviewed and edited the content, awaiting final sign-off from the content owner. Still not servable to Students.
- `validated`: signed off and live to Students. Full-confidence display, no reduced-confidence flag. This is the only status under which content reaches a Student.

**This supersedes the earlier "draft content can be servable once approved" model** — `validated` is now the sole go-live gate, which is a stricter and clearer rule than the original two-state version. Promotion from `pending_approval` to `validated` requires explicit human sign-off from the content owner (Teacher for Space-level content, Pedagogical_Lead for platform-level content) — never automatic, and never based on accumulated usage volume alone.

**Reject/revise path (Req 31.8a):** promotion isn't the only outcome of review. `POST /api/content/authoring/reject` — Input: `{ skill_ids: string[], misconception_ids: string[], feedback: string }` — moves the item from `pending_approval` back to `draft` and stores `feedback` for whoever authored it to act on, rather than a silent non-approval.

**Editing already-validated content (Req 31.8b) — resolving what requirements.md flagged as a design.md question:** the risk is a `validated` Skill or Misconception with active Student usage getting its live fields mutated mid-edit, silently changing what those students see. The fix is a staged-edit field, not a full version-history table — proportionate for MVP, and it doesn't touch how `mastery_states` references `skill_id` (no new rows, no FK migration):

```sql
ALTER TABLE skills ADD COLUMN pending_edit JSONB;         -- staged field changes, not yet applied to the live row
ALTER TABLE skills ADD COLUMN pending_edit_by TEXT;
ALTER TABLE misconceptions ADD COLUMN pending_edit JSONB;
ALTER TABLE misconceptions ADD COLUMN pending_edit_by TEXT;
ALTER TABLE skills ADD COLUMN rejection_feedback TEXT;    -- Req 31.8a
ALTER TABLE misconceptions ADD COLUMN rejection_feedback TEXT;
```

When a `validated` item with active Student usage is edited, the changes are written to `pending_edit` — the live, servable fields (`name`, `description`, `evaluation_strategy`, `rubric`, `prerequisite_ids`) are untouched, so Students currently on that Skill see no change. The UI surfaces this plainly ("editing a live Skill — this won't affect students until approved") as the distinct confirmation Req 31.8b requires. On approval, the Platform atomically applies `pending_edit`'s changes onto the live fields in a single transaction and clears `pending_edit`. `content_status` never silently flips for the audience already being served.

**Multi-Pedagogical_Lead concurrency (Req 31.8c), and unified with Req 19.2a's Escalation concurrency into one mechanism rather than two bespoke ones:**

```sql
CREATE TABLE record_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_type TEXT CHECK (record_type IN ('escalation', 'skill', 'misconception', 'user_role', 'data_rights_request')),
  -- covers: distress_escalations (Req 19.2a), skills/misconceptions pending review (Req 31.8c),
  -- and Admin's role-management (Req 14a.5) and data-deletion (Req 17.5) concurrency, specified in full in Section 22a
  record_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),  -- NULL for platform-level Pedagogical_Lead content, matching the referenced skill/misconception's own tenant_id
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_record_views_record ON record_views(record_type, record_id);
```

**RLS on `record_views` (found missing during pressure-testing — this table had no tenant scoping or policy at all, which Key Design Principle 4 forbids for any tenant-touching table):** a user may read or write a `record_views` row only if they have RLS access to the underlying record it references — not a flat tenant match, since Pedagogical_Lead's content access is cross-tenant while Teacher/Admin's Escalation access is tenant-scoped. Policy is expressed per `record_type`, mirroring the referenced table's own access rule rather than introducing a new one:

```sql
ALTER TABLE record_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "record_views_escalation_access"
ON record_views FOR ALL
USING (
  record_type = 'escalation'
  AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('teacher', 'admin') AND tenant_id = record_views.tenant_id)
);

CREATE POLICY "record_views_content_access"
ON record_views FOR ALL
USING (
  record_type IN ('skill', 'misconception')
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'pedagogical_lead')
  -- Pedagogical_Lead's cross-tenant content access (Section 13 RLS Policy Special Case) applies here identically —
  -- no tenant_id filter, matching skills/misconceptions' own cross-tenant policy for this role
);

CREATE POLICY "record_views_admin_management_access"
ON record_views FOR ALL
USING (
  record_type IN ('user_role', 'data_rights_request')
  AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin' AND tenant_id = record_views.tenant_id)
  -- Section 22a — found missing during pressure-testing: record_type already allowed these two values
  -- and Section 22a now writes rows with them, but no policy covered them; without this, RLS's
  -- default-deny would have made those rows invisible to everyone, silently breaking 22a's own concurrency check
);
```


### 15. Parent Identity Verification and Data Rights

**Purpose:** Verify that a data rights requester is genuinely a registered Guardian before processing any access, correction, or deletion request — no persistent Parent account, verification scoped to a single request.

```typescript
interface Guardian {
  id: string;
  student_id: string;
  tenant_id: string;
  full_name: string;
  contact_channel: 'whatsapp' | 'sms' | 'email';
  contact_value: string;   // provided by the school at enrollment, not by the requester
  relationship: string;
  created_at: timestamp;
}

interface DataRightsRequest {
  id: string;
  student_id: string;
  tenant_id: string;
  request_type: 'access' | 'correction' | 'deletion';
  guardian_id: string;
  verification_token: string;
  verified_at: timestamp | null;
  status: 'pending_verification' | 'verified' | 'completed' | 'expired';
  created_at: timestamp;
}
```

**Verification flow:**
1. A requester submits a student identifier and their own contact value.
2. The Platform checks for a matching registered `Guardian.contact_value` for that Student — a match alone is not sufficient proof of identity.
3. A verification token is sent to that same on-file contact channel (never to a value the requester supplies fresh) — proving access to the channel, not just knowledge of it.
4. The requester enters the token; only then does `status` become `verified`, and only then can the underlying access/export/deletion action (Requirement 25, existing endpoints in tasks.md 21.1) proceed.
5. If the Student has multiple registered Guardians, the tenant's Admin is notified of the request for awareness — this does not block or delay the verified Guardian's request; final custody/access disputes remain the school's responsibility, not the Platform's to adjudicate.

**API Endpoints:**
- `POST /api/parent/verify-request` — Input: `{ student_identifier: string, contact_value: string, request_type: 'access'|'correction'|'deletion' }` — Output is identical in shape and timing whether or not a match was found (Requirement 35.2a) — a genuine non-match and a token-sent response must be indistinguishable to the caller; only the on-file contact channel ever receives a visible signal
- `POST /api/parent/confirm-token` — Input: `{ request_id: string, token: string }` — confirms verification, unlocks the underlying data-rights action


### 16. Adaptive Instruction

**Purpose:** Make first exposure to a new Skill adaptive — grounded in what the Student already knows, delivered through one of a small, fixed set of reusable teaching strategies — without any per-Skill authored variants.

```typescript
interface Lens {
  id: string;
  name: string;              // e.g., 'concrete_analogy', 'procedural', 'narrative', 'socratic'
  description: string;
  template_rules: string;    // structural guidance for the LLM: tone, structure, length, what it must accomplish
  default_for_skill_type: 'procedural' | 'conceptual' | null;
}
```

**Flow:**
1. **Prerequisite check (passive):** before presenting a new Skill's instruction, look up the Student's existing Mastery_State for its direct prerequisites — no new data collection, reuses the existing skill graph and mastery tables.
2. **If a prerequisite is tentative, stale, or unassessed:** a brief bridge is woven into the opening of the new lesson itself, not a separate detour.
3. **Default Lens selection:** derived from the Skill's `skill_type` — no per-Skill configuration needed.
4. **Delivery:** the LLM abstraction layer (Section 13) generates the explanation from the Skill's base description plus the selected Lens's `template_rules` — the Lens is structure, not content; the LLM never invents a new pedagogical approach.
5. **On a wrong first practice attempt:** a fixed, platform-level switching policy selects a Lens that differs meaningfully from the one just used, and remediation is regenerated through it — no per-Skill, per-Misconception authored mapping required.
6. **No style selection, ever:** the Student is never asked which explanation approach they prefer — Lens selection and switching are invisible to them, driven entirely by skill_type defaults and the fixed switching policy (Requirement 34.7). This is a deliberate boundary: self-reported learning-style preference is not well-evidenced, and asking would reintroduce exactly the pattern this design was built to avoid.
7. **Content maturity:** generated Lens-plus-Skill explanation content is tagged `content_status: 'draft'` on first generation and promoted to `'validated'` through the same mechanism as other AI-proposed content (Section 14d) — not a separate governance model.

**Storage:** `lenses` table — small, fixed, platform-level (not tenant- or subject-scoped), edited rarely.


### 17. LMS Content Ingestion and Structuring

**Purpose:** Ground Skill content and misconception authoring in material a school already has, without ever mutating the source.

**Extraction (Stage 1):** text pages extracted directly; PDFs/Word documents via text extraction with OCR fallback for scanned documents; images via OCR plus visual description (both via the existing multimodal LLM abstraction layer — no new dependency). Video ingestion is explicitly out of MVP scope (Requirement 33.6).

**Structuring (Stage 2):** AI-driven synthesis across the extracted corpus for a topic — deduplication of redundant material, coverage assessment per Skill, and citation-preserving summarization. Output is `draft` Content_Status, same governance as any other AI-proposed content.

```typescript
interface ContentSource {
  id: string;
  skill_id: string;
  tenant_id: string;
  source_type: 'lms_page' | 'pdf' | 'word_doc' | 'image';
  source_reference: string;   // link/path back to the original in the LMS — never discarded
  extracted_text: string;
  created_at: timestamp;
}

interface ContentIngestionJob {
  id: string;
  tenant_id: string;
  status: 'pending' | 'extracting' | 'structuring' | 'complete' | 'failed';
  source_count: number;
  started_at: timestamp;
  completed_at: timestamp | null;
}
```

**Fallback:** where ingested content for a Skill is sparse or absent, the flow falls back to the plain-language-description authoring flow (Section 14c) automatically — no separate mode a Teacher has to select.


### 18. AI-Native Content Experience (Course/Skill Map)

**Purpose:** Serve the reorganized, skill-based content view that replaces native chronological LMS browsing — the backend supporting the Course/Skill Map UX.

- Each Skill's `coverage_status` (`rich` / `thin` / `gap` / `not_assessed`) is computed from its linked `ContentSource` records — multiple sources across types → rich; a single source → thin; none → gap.
- A Space's aggregate coverage view is computed over its `included_skill_ids`' coverage statuses, cached rather than computed live on every request (Space's `content_summary_generated_at` field, Data Models section, tracks freshness).
- Content_Status (draft/validated) is visible to Teachers, Pedagogical_Leads, and Admins; never shown to Students (Requirement 32.6).

**API Endpoints:**
- `GET /api/student/course-map` — returns Skills in Skill_Graph order with synthesized summary and source citation
- `GET /api/teacher/space/:id/coverage` — aggregate per-Skill coverage view for a Space


### 19. AI-Assisted Data Interpretation (Ask-a-Question)

**Purpose:** Close the gap between AI-computed data and human understanding of it. Mastery_State, Misconception frequency, and adoption metrics are real, AI-computed data — but display alone still leaves the *interpretation* work to the human. This component lets a Teacher or Admin ask a plain-language question and get a synthesized, grounded answer, rather than reading the pattern out of a grid themselves. *(Updated: the Briefing — Section 10 for Teacher, Section 22 for Admin — is now the primary surface for "what needs my attention"; this ask-capability is the general-purpose fallback for a question a Briefing item didn't already answer, per Requirement 37's dual-mode principle, not the primary interaction mode it originally was.)*

**Design principle: retrieval-grounded generation, never free generation.** The LLM is never asked to "answer a question about a teacher's students" from its own knowledge — it is given the *actual retrieved data* as context and instructed to synthesize only from what's provided. This is the same discipline already used for content citation elsewhere in the product (Course/Skill Map's source links) applied to numeric/aggregate data instead of text content.

**Flow:**
1. Teacher or Admin submits a plain-language question — for Teacher, reachable from the Mastery Overview (Section 10) or directly, not only a dashboard-embedded box.
2. The backend runs a structured query against the actual underlying data scoped to that Teacher's Students/Spaces (or that Admin's tenant) — `mastery_states`, `student_misconceptions`, `sessions`, aggregated as needed. No LLM call happens before this retrieval step.
3. The retrieved, real data is passed to the LLM abstraction layer (Section 13) as context, along with the question and an explicit instruction: synthesize an answer only from the provided data; never state a number, name, or trend not present in it.
4. The response is returned to the Teacher/Admin, with the underlying data it drew from available on request (consistent with source-citation discipline elsewhere).

**API Endpoints:**
- `POST /api/teacher/ask` — Input: `{ question: string }` — Output: `{ answer: string, grounded_in: object }` (the retrieved data the answer was synthesized from). *(Renamed from `/api/teacher/dashboard/ask` — the underlying capability is unchanged, only the name, to match Section 10's rename from Dashboard to Briefing/Mastery Overview.)*
- `POST /api/admin/analytics/ask` — same shape, scoped to tenant-wide data (matches Section 22's naming — this endpoint is specified once, here; Section 22 references it rather than redefining it)

**Failure handling:** if the retrieved data can't answer the question (e.g., asking about a Skill outside the Teacher's Spaces), the response says so plainly rather than the LLM guessing — consistent with the "never fabricated" requirement, and with Requirement 37.4's honest-limits principle generally.


### 20. Conversational Command Interpretation Layer

**Purpose:** The single mechanism behind every "or via a plain-language request" clause already referenced throughout this document (Sections 7, 10, 11, 12, 14) — one command-interpretation path, not one per screen. Implements Requirement 37 in full.

**Why this is one component, not scattered per-screen logic:** every structured action already has a defined shape (input schema, confirmation requirement, audit record). This layer's only job is mapping a plain-language request onto an *existing* structured action and its existing validation/confirmation/audit path — it never bypasses them. It is explicitly not a general-purpose agent with its own authority to act.

```typescript
interface CommandIntent {
  raw_text: string;
  resolved_action: string | null;      // e.g., 'teacher.override', 'admin.invite_user' — matches an existing structured endpoint
  resolved_params: Record<string, unknown> | null;
  ambiguity: AmbiguityFlag | null;      // present when resolved_action is known but a parameter isn't uniquely resolvable
  groundable: boolean;                  // false when the request can't be mapped to data the Platform actually has (Req 37.4)
}

interface AmbiguityFlag {
  field: string;                        // e.g., 'student_id'
  candidates: { id: string; label: string }[];
  clarifying_question: string;
}
```

**Flow:**
1. A plain-language request arrives from any structured screen's chat-entry point.
2. The LLM abstraction layer (Section 13) classifies intent against the *finite* set of structured actions available to that user's role (never an open-ended action space) and extracts parameters, scoped by the same RLS boundary that would apply to the equivalent click-driven request — the command layer runs *after* auth/RLS resolution, not before it.
3. IF a required parameter matches more than one candidate record (e.g., two Students named "Jane" within the Teacher's Spaces) THEN return `ambiguity` with a `clarifying_question` — never execute against a best-effort guess (Req 37.5, e.g., Req 11.1a).
4. IF the request can't be grounded in retrievable data at all (asks about something outside the Platform's actual data) THEN return `groundable: false` with an honest "can't answer that from available data" response (Req 37.4) — same discipline as Section 19's retrieval-grounded generation, generalized to every conversational surface, not just dashboard Q&A.
5. IF resolution succeeds THEN route to the *existing* structured endpoint with `resolved_params` — the endpoint's own confirmation step (where one exists, e.g., Requirement 11.2's override confirmation) still fires; the command layer pre-fills, it does not skip confirmation.
6. Every resulting action is logged with `entry_method: 'conversational'` alongside the same audit fields a structured entry would produce (Req 37.6) — this reuses the `entry_method` pattern already established for Overrides (Section 11) rather than introducing a second logging convention.

**Explicitly out of scope for this layer:** anything Requirement 37.1 already carves out as structured-only (LMS integration setup, Billing plan changes) never routes through here at all — those screens have no chat-entry point to begin with, not a command layer that refuses on arrival.

**API:** `POST /api/command/interpret` — Input: `{ text: string, context: { role: string, current_view?: string } }` — Output: `CommandIntent`. The client then either shows the clarifying question, the honest-limits message, or proceeds to the resolved structured endpoint with `resolved_params` pre-filled for the user's final confirmation.


### 21. LMS Integration: Setup and Read/Write

**Purpose:** Two distinct capabilities under one component, because they have different owners and different risk profiles (Requirements 15b, 36). Setup is a one-time, Admin-only, credential-handling action. Read/write is day-to-day Teacher usage of a connection that's already been authorized.

**21a. Institutional Setup (Admin, Requirement 15b.4–5):**

```typescript
interface LMSIntegration {
  id: string;
  tenant_id: string;
  lms_type: 'canvas' | 'moodle' | 'google_classroom';
  status: 'not_configured' | 'authorized' | 'error';
  credentials: EncryptedCredential;     // shape varies by lms_type, see below
  authorized_by: string;                // Admin user_id
  authorized_at: timestamp;
  last_sync_at: timestamp | null;
  last_sync_error: string | null;
}

// Shape of `credentials` before encryption, by platform:
// canvas:  { developer_key: string, instance_url: string }              -- issued by school's Canvas admin
// moodle:  { ws_token: string, instance_url: string, enabled_functions: string[] }  -- Moodle admin enables per-function
// google_classroom: { oauth_refresh_token: string, workspace_domain: string }        -- Workspace admin domain-level auth
```

Setup is a structured, credential-entry wizard (Requirement 15b.5 — deliberately not chat-driven, security-sensitive) with plain-language guidance narrating each step. `credentials` is encrypted at rest (application-layer encryption, key held outside the database) — this is the one place in the schema where field-level encryption is used beyond Supabase's own encryption-at-rest, given the sensitivity of a credential that grants access to a school's entire LMS.

**API:** `POST /api/admin/lms/authorize` — Input varies by `lms_type` per the credential shapes above — Output: `{ integration_id: string, status: LMSIntegration['status'] }`. `GET /api/admin/lms/status` — current connection health, surfaced in the Admin Briefing (Section 22) if `status: 'error'`.

**21b. Read/Write (Teacher day-to-day, Requirement 36):**

Phase 1 (MVP launch):

```typescript
interface LMSAssignment {
  lms_assignment_id: string;    // ID in the source LMS, not an Escolent-generated one
  tenant_id: string;
  title: string;
  due_at: timestamp;
  grading_deadline: timestamp | null;
  space_id: string | null;      // null if not yet mapped to an Escolent Space
  synced_at: timestamp;
}
```

- **Read:** `GET /api/lms/assignments` and `GET /api/lms/roster` — thin adapters per `lms_type` (Canvas REST, Moodle web services, Google Classroom API), normalized to the shapes above before reaching Section 10a's Today/Week aggregation. This is where Requirement 10a's `sync_status: 'stale' | 'syncing' | 'unavailable'` gets its actual value — from whether the last adapter call succeeded, not a guess.
- **Write:** `POST /api/lms/grades/push` — Input: `{ lms_assignment_id: string, student_id: string, score: number }` — writes an Escolent-earned score back to the source LMS gradebook via the same per-platform adapter.
- **Capability gating (Requirement 36.7):** each adapter exposes only the operations the tenant's actual authorized scope permits — e.g., a Moodle deployment where the school's Moodle admin hasn't enabled the grade-write web service function simply doesn't offer that action client-side, rather than offering it and failing at request time.

**Phase 2/3 (not MVP):** posting content back to the source LMS, and the conflict-resolution mechanism Requirement 36.6 flags as still-undecided, remain out of scope for this section until that mechanism is actually designed — noting the gap here rather than silently building toward it.


### 22. Admin Entry: Briefing, Daily Awareness, Analytics, and Billing

**Purpose:** Same shape as Teacher's Section 10 — a synthesized Briefing as the landing surface rather than a dashboard — applied to Admin's genuinely different content: institutional oversight, compliance, and billing rather than instructional data (Requirements 15, 15a, 15b, 15c).

**Briefing Generation (Req 15):**

```typescript
interface AdminBriefingItem {
  id: string;
  category: 'teacher_no_space' | 'data_subject_request' | 'escalation_oversight' | 'billing_event';
  summary: string;               // e.g., "1 Escalation open longer than 24 hours" — aging-threshold framing, not a raw count (same lesson applied here as Pedagogical_Lead's Section 23)
  action_route: string;
  urgency: 'urgent' | 'informational';
  computed_at: timestamp;
}

interface AdminBriefing {
  admin_id: string;
  tenant_id: string;
  items: AdminBriefingItem[];
  state: 'populated' | 'no_rollout' | 'insufficient_data' | 'all_clear';
  computed_at: timestamp;
}
```

**Generation flow:**
1. Aggregate school-wide by default (Req 15.2) — every Teacher, every Space, not filtered until the Admin drills down.
2. `escalation_oversight` items reuse the same `record_views`/`acknowledged_by` data as Section 12, but surfaced as an aging threshold ("open longer than 24 hours") rather than per-case detail — Admin's grant is oversight, not primary response (Req 15.7).
3. `data_subject_request` items pull from `data_rights_requests` (Section 15's existing Guardian/Data-Rights model) filtered to approaching statutory deadlines.
4. `billing_event` items pull from the `tenants` billing fields (extended below) — renewal approaching, seat limit reached.
5. `state`: `no_rollout` if the tenant has no Teachers/Spaces yet (→ route to LMS integration setup, Section 21a, or Requirement 14a's first Teacher invite); `insufficient_data` if activity exists but below the confident-triage threshold (→ default to School-Wide Analytics below); `all_clear` if nothing urgent; otherwise `populated`.

**API:** `GET /api/admin/briefing` — returns `AdminBriefing`, same locally-cached pattern as Teacher's Briefing.

**Today and Week (Req 15b):**

```typescript
interface AdminTodayItem {
  id: string;
  kind: 'compliance_deadline' | 'billing_event' | 'curation_backlog' | 'escalation_backlog';
  due_at: timestamp;
  action_route: string;
}
```

`GET /api/admin/today` / `GET /api/admin/week` — deliberately does not include LMS assignment due-dates (Req 15b.1 — that's Teacher's Today, Section 10a, not Admin's).

**School-Wide Analytics (Req 15a) — same content as the original Admin dashboard, repositioned as a destination:**

1. Adoption metrics: active Students, average Session duration, total Practice_Problems completed
2. Aggregated mastery metrics: average Skills mastered per Student, Mastery_State distribution
3. Filterable by Teacher, class, or date range, including via the Conversational Command Layer (Section 20)
4. Updated daily (batch aggregation, not real-time — unlike Teacher's Mastery Overview, Admin's scale doesn't need live-subscription updates)

**API:** `GET /api/admin/analytics`, `POST /api/admin/analytics/ask` (same retrieval-grounded pattern as Section 19).

**Billing (Req 15c):**

```sql
ALTER TABLE tenants ADD COLUMN plan_tier TEXT CHECK (plan_tier IN ('core', 'ai_adaptive'));
ALTER TABLE tenants ADD COLUMN seat_count INT;
ALTER TABLE tenants ADD COLUMN seats_used INT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN renewal_date DATE;
```

Extends the existing `tenants` table rather than a new one — billing status was already partially represented there (`billing_status`), this completes it. `GET /api/admin/billing` returns plan/seats/renewal for display and for the Conversational Command Layer's dual-mode answer (Req 15c.2). `POST /api/admin/billing/change-plan` is deliberately **not** routed through the Command Layer at all (Req 15c.3, Req 37.1's carve-out) — a structured form with explicit confirmation, no plain-language path exists to this endpoint.


### 23. Pedagogical_Lead Entry: Briefing and Cross-Tenant Awareness

**Purpose:** Same Briefing pattern again, third application, content-scoped rather than operations-scoped, cross-tenant rather than tenant-scoped (Requirement 31a).

```typescript
interface PedagogicalLeadBriefingItem {
  id: string;
  category: 'pending_review' | 'thin_coverage' | 'cross_tenant_pattern';
  summary: string;                        // aging-threshold framing (Req 31a.4), not a raw backlog count
  affected_school_count?: number;         // present for cross_tenant_pattern items only — never names which schools (Req 31a.7)
  action_route: string;
  computed_at: timestamp;
}
```

**Generation flow:**
1. Aggregate across every school on the Platform by default (Req 31a.2) — this component only ever queries `skills`/`misconceptions`/`unmatched_errors`, never `mastery_states`, `sessions`, or `users`, enforced by RLS (Requirement 21.5) rather than by this component's own discipline alone — belt and suspenders.
2. `pending_review` items use an aging threshold on `content_status = 'pending_approval'`; the actual threshold value is not set by this design (Req 31a.4 already flags this as an open policy question, not a technical one).
3. `cross_tenant_pattern` items (e.g., the same Misconception recurring in multiple tenants) report a count, never the specific schools by name (Req 31a.7) — this is a content-level signal, not an operational comparison, and the response shape enforces that distinction rather than leaving it to the prompt.
4. `state` handling mirrors Sections 10/22: no content yet → route to content authoring (Section 14c); nothing pending → honest all-clear.

**API:** `GET /api/pedagogical-lead/briefing`. Tapping an item routes to Section 4's Unmatched Error Curation, Section 14c's authoring flow, or Section 14d's validation flow, matching Requirement 31a.3 exactly.


### 22a. Admin User, Role, and Data Deletion Management

**Purpose:** Requirements 14a and 17 previously had only a bare API route each in this document, with none of the actual flow — this closes that gap, found during pressure-testing rather than in either prior phase. Covers two related but distinct actions: managing who has access (Req 14a), and permanently deleting a Student's data (Req 17) — kept as one section because the boundary *between* them is itself a requirement (Req 14a.3, Req 17.1), not two unrelated features.

**User/Role Management (Req 14a):**

```typescript
interface UserManagementAction {
  action: 'invite' | 'change_role' | 'deactivate';
  target_email?: string;       // for invite
  target_user_id?: string;     // for change_role, deactivate
  new_role?: 'teacher' | 'admin';
  entry_method: 'structured' | 'conversational';  // same audit-parity pattern as Section 11's Override
}
```

**Flow:**
1. Admin submits via structured form, or a plain-language request through the Conversational Command Layer (Section 20) — e.g., "invite Jane Smith as a teacher for Grade 8, jane@school.edu."
2. IF the named person isn't uniquely resolvable THEN the Command Layer returns a clarifying question (Req 14a.2) — same mechanism as Section 11's Override, not a separate one.
3. **The E/H boundary (Req 14a.3, Req 17.1):** if the request reads as deleting a person's *data* rather than managing their *access* — "remove this graduated student's account" is the example requirements.md flags explicitly — the Command Layer routes it to the Data Deletion flow below instead of executing it as a role-management action here. This routing check happens before action resolution, not as a post-hoc correction.
4. Apply the action; log identically regardless of `entry_method` (Req 14a.4).
5. Insert a `record_views` row (`record_type: 'user_role'`, Section 12/14d/22's shared mechanism) on open, so a second Admin sees this user record is already being acted on (Req 14a.5) — this is what the `record_views` table comment already promised when Section 22 was written; fulfilling it here.

**Data Deletion (Req 17):**

Extends the existing `data_rights_requests` table (Section 15/Requirement 35) rather than introducing a parallel one — an Admin-initiated deletion and a Guardian-initiated one are the same underlying request shape, just different originators and different verification requirements:

```sql
ALTER TABLE data_rights_requests ADD COLUMN initiated_by TEXT CHECK (initiated_by IN ('guardian', 'admin')) DEFAULT 'guardian';
ALTER TABLE data_rights_requests ADD COLUMN admin_id UUID REFERENCES users(id);  -- set when initiated_by = 'admin'
ALTER TABLE data_rights_requests ALTER COLUMN verification_token DROP NOT NULL;  -- an Admin is already authenticated; the Guardian token-verification flow (Requirement 35) doesn't apply to an Admin-initiated request
```

**Flow:**
1. Structured, explicitly-confirmed flow — including when reached via the E/H boundary routing above; the plain-language request initiates it, it does not skip the confirmation step (Req 17.1).
2. On confirmation, permanently delete the Student's `mastery_states`, Session history, and interaction logs — this is an async job (not synchronous with the confirmation click) given the 72-hour completion window (Req 17.2).
3. Retain anonymized aggregated statistics after deletion (Req 17.4).
4. Notify the Admin when deletion completes (Req 17.3).
5. Same `record_views` mechanism as above (`record_type: 'data_rights_request'`) for multi-Admin concurrency (Req 17.5).

**API Endpoints:** `POST /api/admin/users/invite`, `PUT /api/admin/users/:id/role` (already listed in Admin Routes — now with the flow behind them specified), `POST /api/admin/delete-student-data` — Input: `{ student_id: string }` — creates a `data_rights_requests` row with `initiated_by: 'admin'` rather than deleting directly, so the same status tracking (`pending_verification` is skipped for Admin-initiated rows, moving straight to an equivalent "confirmed" state — `verified`) and completion flow apply uniformly regardless of who initiated it.


## Data Models

### Database Schema (PostgreSQL via Supabase)

#### Multi-Tenancy Foundation

All tables (except platform-level data) include `tenant_id` with Row Level Security (RLS) policies enforcing isolation.

```sql
-- Tenants (schools)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-safe identifier
  billing_status TEXT CHECK (billing_status IN ('trial', 'active', 'suspended')),
  plan_tier TEXT CHECK (plan_tier IN ('core', 'ai_adaptive')),  -- Section 22 / Req 15c
  seat_count INT,
  seats_used INT DEFAULT 0,
  renewal_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Students, Teachers, Admins, Pedagogical_Lead)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for Pedagogical_Lead
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  lms_user_id TEXT,  -- LTI user ID from Canvas/Moodle
  google_classroom_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin', 'pedagogical_lead')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL for pedagogical_lead
  PRIMARY KEY (user_id, role)
);
```

#### LMS Integration (Section 21a)

```sql
CREATE TABLE lms_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lms_type TEXT CHECK (lms_type IN ('canvas', 'moodle', 'google_classroom')),
  status TEXT CHECK (status IN ('not_configured', 'authorized', 'error')) DEFAULT 'not_configured',
  credentials_encrypted BYTEA,  -- application-layer encrypted; shape varies by lms_type (Section 21a). Key held outside the database, not in Supabase config.
  authorized_by UUID REFERENCES users(id),
  authorized_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  UNIQUE (tenant_id, lms_type)
);
```


#### Skill Graph

```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,  -- e.g., "Grade 8 Mathematics"; parameterizes LLM prompts/tutor voice (Section 13) and Briefing/overview grouping. (Drift fix: present in the TypeScript interface above and in the actual deployed schema per PR #2, but missing from this SQL block until now.)
  skill_type TEXT CHECK (skill_type IN ('procedural', 'conceptual')),
  prerequisite_ids UUID[] DEFAULT '{}',  -- Array of prerequisite skill IDs
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = platform-level
  created_by TEXT,  -- 'platform' | 'pedagogical_lead' | teacher user_id
  evaluation_strategy TEXT CHECK (evaluation_strategy IN ('exact_match', 'symbolic_equivalence', 'rubric_llm')) DEFAULT 'exact_match',
  rubric JSONB,  -- [{criterion, weight}], required when evaluation_strategy = 'rubric_llm'
  content_status TEXT CHECK (content_status IN ('draft', 'pending_approval', 'validated')) DEFAULT 'draft',
  coverage_status TEXT CHECK (coverage_status IN ('rich', 'thin', 'gap', 'not_assessed')) DEFAULT 'not_assessed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_tenant ON skills(tenant_id);
CREATE INDEX idx_skills_prerequisites ON skills USING GIN(prerequisite_ids);
```

#### Mastery States

```sql
CREATE TABLE mastery_states (
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  probability NUMERIC(4, 3) CHECK (probability >= 0 AND probability <= 1),  -- 0.000 to 1.000
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  response_history JSONB DEFAULT '[]',  -- Last 10 responses [{is_correct, timestamp, difficulty, response_time_ms}]
  is_tentatively_mastered BOOLEAN DEFAULT FALSE,
  is_durably_mastered BOOLEAN DEFAULT FALSE,
  mastered_session_count INT DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, skill_id)
);

CREATE INDEX idx_mastery_student ON mastery_states(student_id, tenant_id);
CREATE INDEX idx_mastery_skill ON mastery_states(skill_id, tenant_id);
```


#### Misconception Taxonomy

```sql
CREATE TABLE misconceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  error_pattern JSONB NOT NULL,  -- {type: 'symbolic'|'regex'|'semantic', pattern: string, threshold?: number}
  classification TEXT CHECK (classification IN ('repetition_confirmed', 'first_occurrence_actionable')),
  remediation_strategy TEXT,
  example_errors TEXT[],
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = platform-level
  created_by TEXT,
  content_status TEXT CHECK (content_status IN ('draft', 'pending_approval', 'validated')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_misconceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  misconception_id UUID REFERENCES misconceptions(id) ON DELETE CASCADE,
  occurrence_count INT DEFAULT 1,
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE unmatched_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id_anonymized TEXT NOT NULL,  -- Hashed student ID for privacy
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  problem_text TEXT,
  student_response TEXT,
  correct_answer TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id)  -- Pedagogical_Lead
);
```


#### Spaced Repetition

```sql
CREATE TABLE spaced_repetition_schedules (
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  next_review_date TIMESTAMPTZ NOT NULL,
  interval_days INT NOT NULL,
  ease_factor NUMERIC(3, 2) CHECK (ease_factor >= 1.3 AND ease_factor <= 2.5),
  consecutive_correct INT DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, skill_id)
);

CREATE INDEX idx_spaced_rep_due ON spaced_repetition_schedules(student_id, next_review_date) 
  WHERE next_review_date <= NOW();
```

#### Sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'interrupted', 'expired')),
  problems_completed INT DEFAULT 0,
  problems JSONB DEFAULT '[]',  -- Array of ProblemInstance
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_student_active ON sessions(student_id, status, tenant_id) 
  WHERE status IN ('active', 'interrupted');
```


#### Spaces

```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  included_skill_ids UUID[] NOT NULL,
  difficulty_range INT[] CHECK (array_length(difficulty_range, 1) = 2),  -- [min, max]
  classroom_pacing_mode BOOLEAN DEFAULT FALSE,
  content_summary_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE space_enrollments (
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (space_id, student_id)
);
```

#### Teacher Overrides

```sql
CREATE TABLE mastery_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) >= 20 AND length(reason) <= 200),
  override_type TEXT CHECK (override_type IN ('mark_mastered', 'reset_mastery')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);
```


#### Distress Escalations

```sql
CREATE TABLE distress_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  detection_method TEXT CHECK (detection_method IN ('pattern', 'llm')),
  confidence NUMERIC(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  backup_notified BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_escalations_unacknowledged ON distress_escalations(tenant_id, created_at) 
  WHERE acknowledged_at IS NULL;
```

#### Audit Logs (POPIA Compliance)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,  -- 'read', 'update', 'delete', 'export'
  table_name TEXT,
  record_id UUID,
  changed_fields JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, timestamp);
```

#### Parent Identity Verification

```sql
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  contact_channel TEXT CHECK (contact_channel IN ('whatsapp', 'sms', 'email')),
  contact_value TEXT NOT NULL,  -- provided by the school, not the requester
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_rights_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  request_type TEXT CHECK (request_type IN ('access', 'correction', 'deletion')),
  guardian_id UUID REFERENCES guardians(id),
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending_verification', 'verified', 'completed', 'expired')) DEFAULT 'pending_verification',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guardians_student ON guardians(student_id, tenant_id);
```

#### Adaptive Instruction — Lenses

```sql
-- Platform-level, not tenant-scoped: a small, fixed library shared across all schools and subjects
CREATE TABLE lenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  template_rules TEXT NOT NULL,
  default_for_skill_type TEXT CHECK (default_for_skill_type IN ('procedural', 'conceptual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### LMS Content Ingestion

```sql
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('lms_page', 'pdf', 'word_doc', 'image')),
  source_reference TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'extracting', 'structuring', 'complete', 'failed')) DEFAULT 'pending',
  source_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_content_sources_skill ON content_sources(skill_id, tenant_id);
```


### Row Level Security (RLS) Policies

All tenant-scoped tables enforce multi-tenancy isolation via RLS:

```sql
-- Example: mastery_states RLS
ALTER TABLE mastery_states ENABLE ROW LEVEL SECURITY;

-- Students can read/update only their own mastery states within their tenant
CREATE POLICY "students_own_mastery"
ON mastery_states FOR ALL
USING (
  student_id = auth.uid() 
  AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- Teachers can read mastery states for students in their tenant
CREATE POLICY "teachers_read_tenant_mastery"
ON mastery_states FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'teacher')
);

-- Admins can read/modify all data within their tenant
CREATE POLICY "admins_tenant_access"
ON mastery_states FOR ALL
USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
);
```

Similar RLS policies applied to all tenant-scoped tables: `sessions`, `spaces`, `student_misconceptions`, etc.

**Pedagogical_Lead Exception:** Separate policies grant cross-tenant READ access to `unmatched_errors` and `misconceptions`, and cross-tenant INSERT/UPDATE to `misconceptions` (Section 13, RLS Policy Special Case) and to `lenses` (platform-level, no `tenant_id` — write access restricted to Pedagogical_Lead, read access open to the application generally since lenses are used to render lessons for any Student).

**Guardian/Data-Rights Exception:** `guardians` and `data_rights_requests` are tenant-scoped like any other table, but neither is readable by Teachers or Students under any policy — only Admin (within their tenant) and the specific verification API routes (Section 15) may read or write them, since these tables hold sensitive contact information distinct from ordinary student/teacher records. `data_rights_requests` additionally supports an Admin-initiated origin (Section 22a, `initiated_by = 'admin'`) alongside the original Guardian-initiated one; the RLS policy is unchanged either way — Admin-within-tenant, never Teacher or Student.

**Concurrency/Presence Exception:** `record_views` (Section 12/14d — shared-visibility tracking for Escalations and pending content review; Section 22a — Admin's user-role and data-deletion management) has no single tenant-flat policy; its RLS mirrors whatever record it references (tenant-scoped for Escalations and Admin management actions, cross-tenant for Pedagogical_Lead content), specified in full where the table is defined.

**LMS Integration Exception:** `lms_integrations` (Section 21a) is readable and writable only by Admin, scoped to their own tenant — not Teachers, not Students, given it holds encrypted LMS credentials. Teacher's read/write usage (Section 21b) goes through the API layer's adapters, which use the stored credentials server-side; Teachers never receive the credentials themselves, only the data the adapter returns.


## API Design

### API Routes (Next.js)

All API routes are Next.js API route handlers under `/app/api/`.

#### Authentication Routes

- `POST /api/auth/lti/login` - Initiates LTI 1.3 OIDC login
- `POST /api/auth/lti/launch` - Validates LTI JWT, creates session
- `GET /api/auth/lti/jwks` - Returns platform public keys
- `GET /api/auth/google/callback` - Google Classroom OAuth callback
- `POST /api/auth/google/launch` - Validates Google token, creates session
- `POST /api/auth/admin/login` - Admin credential validation
- `POST /api/auth/admin/logout` - Session termination
- `POST /api/auth/pedagogical-lead/login` - Pedagogical_Lead login

#### Session Routes

- `POST /api/session/start` - Start new practice session
  - Input: `{ space_id?: string }` — omitted, THE Platform resolves it via Entry (Section 7's auto-start logic, Requirement 7.1); provided, behaves as an explicit override (Requirement 7.1b) *(fixed during tasks.md work: this previously required space_id, which contradicted Entry's entire premise that a Student shouldn't have to choose)*
  - Output: `{ session_id: string, first_problem: Problem, entry_reason: string }` — `entry_reason` is the one-line "why this" framing (Requirement 7.1a)
- `POST /api/session/submit-response` - Submit answer, get next problem
  - Input: `{ session_id: string, problem_id: string, response: string }`
  - Output: `{ is_correct: boolean, feedback: string, next_problem: Problem, mastery_update: MasteryState }`
- `POST /api/session/request-hint` - Request hint during problem
  - Input: `{ session_id: string, problem_id: string }`
  - Output: `{ hint: string, hint_penalty: number }`
- `POST /api/session/complete` - Mark session as completed
  - Input: `{ session_id: string }`
- `GET /api/session/resume` - Check for interrupted sessions
  - Output: `{ interrupted_sessions: Session[] }`
- `POST /api/session/recover` - Restore interrupted session state
  - Input: `{ session_id: string }`
  - Output: `{ session: Session, current_problem: Problem }`

#### Student Routes

- `GET /api/student/today` / `GET /api/student/week` - Today/week view merging Escolent-native and LMS-sourced items (Section 7, Requirement 7a)
- `GET /api/student/progress` - Compact mastery status across the Student's own Skills (interaction model Student section D)


#### Teacher Routes

- `GET /api/teacher/spaces` - List all spaces for teacher
- `POST /api/teacher/spaces` - Create new space
  - Input: `{ name: string, description: string, included_skill_ids: string[], difficulty_range: [number, number], classroom_pacing_mode: boolean, student_ids: string[] }`
- `PUT /api/teacher/spaces/:id` - Update space configuration
- `GET /api/teacher/briefing` - Get synthesized Briefing (Section 10, Req 10) — replaces the earlier ask-a-question-only pattern as the default landing surface
  - Output: `TeacherBriefing` (Section 10)
- `GET /api/teacher/today` / `GET /api/teacher/week` - Today/week view merging Escolent-native and LMS-sourced items (Section 10, Req 10a)
- `GET /api/teacher/mastery-overview` - Get mastery grid data (formerly named `/api/teacher/dashboard`; renamed when Section 10 was rewritten from "Dashboard" to "Mastery Overview" — a destination reached from the Briefing, not the landing route)
  - Query: `?space_id=uuid&student_id=uuid&skill_id=uuid` (filters optional; omitting `space_id` aggregates across all the Teacher's Spaces per Req 10.2)
  - Output: `{ students: Student[], skills: Skill[], mastery_matrix: MasteryState[][] }`
- `POST /api/teacher/override` - Override student mastery
  - Input: `{ student_id: string, skill_id: string, override_type: 'mark_mastered' | 'reset_mastery', reason: string, entry_method: 'structured' | 'conversational' }`
- `GET /api/teacher/escalations` - Get unacknowledged distress escalations
  - Output: `{ escalations: DistressEscalation[] }`
- `POST /api/teacher/escalations/:id/acknowledge` - Acknowledge escalation
- `GET /api/escalations/:id` - Get a single Escalation's full context plus `record_views` (Section 12, Req 19.2a)

#### Admin Routes

- `GET /api/admin/briefing` - Get synthesized Briefing (Section 22, Req 15)
- `GET /api/admin/today` / `GET /api/admin/week` - Compliance/billing/backlog Today-week view (Section 22, Req 15b)
- `GET /api/admin/analytics` - Get adoption and mastery metrics (formerly `/api/admin/dashboard`; renamed alongside Teacher's equivalent rename, Section 22)
  - Query: `?start_date=ISO8601&end_date=ISO8601&teacher_id=uuid` (filters optional)
  - Output: `{ active_students: number, avg_session_duration_min: number, problems_completed: number, avg_skills_mastered: number, mastery_distribution: object }`
- `POST /api/admin/analytics/ask` - Plain-language question over tenant-wide data (Section 19)
- `GET /api/admin/billing` / `POST /api/admin/billing/change-plan` - Billing view and structured-only plan change (Section 22, Req 15c — `change-plan` is never reachable via the Conversational Command Layer)
- `POST /api/admin/lms/authorize` / `GET /api/admin/lms/status` - Institutional LMS integration setup (Section 21a, Req 15b.4-5)
- `POST /api/admin/pilot/enable-class` - Enable platform access for class
  - Input: `{ class_id: string }`
- `POST /api/admin/pilot/disable-class` - Disable platform access
  - Input: `{ class_id: string }`
- `POST /api/admin/subjects/activate` - Activate a platform-curated subject/curriculum for this tenant (Requirement 14.5-6) — read-only on the underlying Skill/Misconception content itself, per Requirement 21.5's boundary
  - Input: `{ subject: string, grade: string, class_ids: string[], available_from: timestamp }`
- `POST /api/admin/users/invite` / `PUT /api/admin/users/:id/role` - Invite or change a Teacher/Admin account (Requirement 14a), including via the Conversational Command Layer
- `POST /api/admin/export` - Export student data
  - Input: `{ export_type: 'interactions' | 'mastery' | 'sessions', student_ids?: string[] }`
  - Output: CSV download stream
- `POST /api/admin/delete-student-data` - Request student data deletion
  - Input: `{ student_id: string }`


#### Pedagogical_Lead Routes

- `GET /api/pedagogical-lead/briefing` - Get synthesized cross-tenant content Briefing (Section 23, Req 31a)
- `GET /api/pedagogical-lead/unmatched-errors` - Get errors not in taxonomy
  - Query: `?reviewed=false&skill_id=uuid` (filters optional)
  - Output: `{ errors: UnmatchedError[] }`
- `POST /api/pedagogical-lead/misconceptions` - Add misconception to taxonomy
  - Input: `{ name: string, description: string, skill_id: string, error_pattern: ErrorPattern, classification: string, remediation_strategy: string }`
- `PUT /api/pedagogical-lead/misconceptions/:id` - Update misconception
- `POST /api/content/authoring/reject` - Reject a `pending_approval` item back to `draft` with feedback (Section 14d, Req 31.8a)
- `POST /api/pedagogical-lead/errors/:id/mark-reviewed` - Mark error as reviewed

#### Sync Route (Offline Support)

- `POST /api/sync/responses` - Bulk sync offline responses
  - Input: `{ responses: OfflineResponse[] }` where `OfflineResponse = { session_id, problem_id, response, timestamp }`
  - Output: `{ synced_count: number, mastery_updates: MasteryState[], errors: SyncError[] }`


## Error Handling

### Error Response Format

All API routes return consistent error format:

```typescript
interface APIError {
  error: {
    code: string;        // Machine-readable error code
    message: string;     // Human-readable message
    details?: object;    // Optional additional context
  };
  status: number;        // HTTP status code
}
```

### Error Categories

1. **Authentication Errors (401):**
   - `AUTH_INVALID_LTI_JWT` - LTI JWT signature validation failed
   - `AUTH_EXPIRED_SESSION` - Session token expired
   - `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required role

2. **Validation Errors (400):**
   - `VALIDATION_MISSING_FIELD` - Required field missing
   - `VALIDATION_INVALID_FORMAT` - Field format invalid
   - `VALIDATION_PREREQUISITE_NOT_MET` - Skill prerequisites not satisfied

3. **Not Found Errors (404):**
   - `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
   - `SESSION_NOT_FOUND` - Session ID invalid or expired

4. **Conflict Errors (409):**
   - `SESSION_ALREADY_ACTIVE` - Student already has active session
   - `SPACE_SKILL_CONFLICT` - Skill not available in space

5. **Rate Limit Errors (429):**
   - `RATE_LIMIT_EXCEEDED` - Too many requests (LLM API throttling)


6. **Server Errors (500):**
   - `LLM_PROVIDER_ERROR` - LLM API call failed
   - `DATABASE_ERROR` - Database query failed
   - `INTERNAL_ERROR` - Unexpected server error

### Error Handling Strategies

**LLM Provider Failures:**
- Retry with exponential backoff (3 attempts)
- If all retries fail, fall back to generic response from template
- Log failure for monitoring
- Never block student progress on LLM failure

**Database Connection Loss:**
- Retry transient errors (connection timeout, deadlock)
- For persistent failures, return cached data if available (offline-first)
- Display user-friendly message: "Connection issue detected. Your work is saved locally and will sync when restored."

**Offline Mode:**
- Service worker intercepts failed API calls
- Return cached data or queue request for background sync
- UI displays offline indicator
- All student responses saved to IndexedDB regardless of connectivity

**Distress Signal Detection Failures:**
- If pattern detection fails, continue with session (don't block)
- If LLM distress analysis fails, err on side of escalation (over-trigger bias)
- Log all detection failures for review


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The Escolent MVP contains several pure logic components suitable for property-based testing, including the knowledge tracing engine, skill graph traversal, spaced repetition scheduler, scaffolding selector, and misconception pattern matcher. The following properties define universal correctness guarantees that must hold across all inputs to these components.

### Property 1: Skill Unlock on Mastery

*For any* skill graph and any skill marked as mastered for a student, all skills that list the mastered skill as a prerequisite SHALL become available for practice for that student.

**Validates: Requirements 2.3**

### Property 2: Prerequisite Identification via Graph Traversal

*For any* skill in the skill graph, when a student's mastery state for that skill indicates struggle (mastery < 0.5), a breadth-first search SHALL identify all prerequisite skills (transitive closure) in the correct dependency order.

**Validates: Requirements 2.4**

### Property 3: Mastery State Update Follows BKT Rules

*For any* student response (correct or incorrect) and any current mastery state, the updated mastery state SHALL follow Bayesian Knowledge Tracing rules: correct answers SHALL increase the probability, incorrect answers SHALL decrease the probability, weighted by problem difficulty.

**Validates: Requirements 3.1, 3.3**

### Property 4: Mastery State Isolation Between Students

*For any* two distinct students and any skill, the mastery state updates for one student SHALL NOT affect the mastery state of the other student for that skill.

**Validates: Requirements 3.2**

### Property 5: Mastery Threshold Detection

*For any* mastery probability and skill, the system SHALL apply the correct mastery threshold (0.85 for procedural skills, 0.90 for conceptual skills) and flag the skill as tentatively mastered if and only if the probability meets or exceeds the threshold.

**Validates: Requirements 3.4, 3.5**

### Property 6: Durable Mastery Requires Multi-Session Confirmation

*For any* skill and student, the skill SHALL be marked as durably mastered if and only if the mastery probability has exceeded the threshold in at least two separate sessions occurring on different calendar days.

**Validates: Requirements 3.6**

### Property 7: Response Time Invariance in Mastery Calculation

*For any* two responses that are identical in correctness, problem difficulty, and student ID, but differ in response_time_ms, the calculated mastery state update SHALL be identical.

**Validates: Requirements 3.8**

### Property 8: Misconception Pattern Matching Correctness

*For any* incorrect student response and any error pattern in the misconception taxonomy, the pattern matching algorithm SHALL return a match if and only if the response satisfies the pattern definition (symbolic, regex, or semantic), and SHALL return no match otherwise.

**Validates: Requirements 4.3**

### Property 9: Misconception vs Slip Classification

*For any* student error history and misconception definition, the system SHALL classify the error as a persistent misconception (requiring remediation) if the error frequency meets the threshold specified in the misconception's classification, and SHALL classify it as a careless slip otherwise.

**Validates: Requirements 4.4**

### Property 10: Spaced Repetition Schedule Creation on Durable Mastery

*For any* skill marked as durably mastered for a student, a spaced repetition schedule SHALL be created with the initial review interval set to 1 day and ease_factor initialized to 2.5 (SM-2 default).

**Validates: Requirements 5.1**

### Property 11: Spaced Repetition Interval Increase on Successful Review

*For any* successful review (correct response to a spaced repetition problem), the next review interval SHALL be calculated as current_interval * ease_factor, and ease_factor SHALL remain >= 1.3.

**Validates: Requirements 5.2**

### Property 12: Spaced Repetition Interval Decrease on Failed Review

*For any* failed review (incorrect response to a spaced repetition problem), the review interval SHALL be shortened to a minimum of 1 day, and ease_factor SHALL be decreased but remain >= 1.3.

**Validates: Requirements 5.3**

### Property 13: Spaced Repetition Problem Limit in Sessions

*For any* generated session problem set, the number of spaced repetition review problems SHALL be at most 20% of the total number of problems in that session (rounded down).

**Validates: Requirements 5.5**

### Property 14: Adaptive Problem Selection with Boundary and Scaffolding Constraints

*For any* combination of student mastery states, space configuration (included_skill_ids, difficulty_range, classroom_pacing_mode), and due spaced repetition reviews, the problem selection algorithm SHALL:
1. Select only problems for skills within the space's included_skill_ids
2. Select only problems within the space's difficulty_range
3. Assign scaffolding level based on the student's mastery state for the problem's skill (worked_example for mastery < 0.3, partial_scaffold for 0.3-0.7, hint_on_demand for 0.7 to skill-type-specific threshold, independent for >= skill-type-specific threshold)
4. Include due spaced repetition reviews up to the 20% limit
5. When classroom_pacing_mode is false AND a skill has unmastered prerequisites, inject prerequisite problems
6. When classroom_pacing_mode is true, prioritize space skills even if prerequisites are unmastered, and flag prerequisite gaps for teacher visibility

**Validates: Requirements 6.2, 7.2, 7.4, 7.5, 7.6, 20.1** *(Citation fix: previously cited 7.1, which after the Entry/Briefing rewrite now describes the auto-start decision, not in-session problem selection; points 1–2's boundary behavior is Requirement 20.1's guardrail, and this property's session-mechanics points are 7.2 onward.)*

### Property 15: Hint Penalty Consistent Application

*For any* student mastery state and hint request during independent or hint_on_demand scaffolding levels, the mastery state update SHALL apply a consistent hint_penalty (e.g., -0.05) to the probability before saving, regardless of which specific hint was requested.

**Validates: Requirements 6.5**

### Property 16: Teacher Override Isolation

*For any* teacher override marking a skill as mastered for a specific student, only that student's mastery state for that skill SHALL be updated, and all other students' mastery states for that skill (or any other skill) SHALL remain unchanged.

**Validates: Requirements 11.1, 11.3, 11.6**

### Property 17: Distress Pattern Detection Triggers Escalation

*For any* student text response containing a keyword from the distress pattern library (e.g., "hurt myself", "want to die", "no point"), the distress detection system SHALL create an escalation record and trigger teacher notification within 5 seconds.

**Validates: Requirements 18.1**

### Property 18: Space Boundary Enforcement in Problem Sets

*For any* space boundaries (included_skill_ids) and any generated problem set for a session within that space, all problems in the problem set SHALL have skill_id values that appear in the space's included_skill_ids array.

**Validates: Requirements 20.1**

### Property 19: Real-Time Response for Unmatched Errors

*For any* student error that does not match any pattern in the misconception taxonomy, the system SHALL provide a general Socratic-style response to the student in real time (< 3 seconds), independent of and not blocked by the asynchronous routing to the Pedagogical_Lead.

**Validates: Requirements 4.10**

### Property 20: Evaluation Strategy Routing

*For any* Skill with a declared evaluation_strategy, the correctness-checking flow SHALL route to the corresponding evaluator (exact_match/symbolic_equivalence logic for those strategies, rubric-based LLM evaluation for rubric_llm), and SHALL NOT apply symbolic/exact-match logic to a Skill declared rubric_llm, or rubric-based evaluation to a Skill declared exact_match/symbolic_equivalence.

**Validates: Requirements 31.1, 31.2**

### Property 21: Parent Data Rights Verification Gate

*For any* data rights request (access, correction, or deletion), the Platform SHALL NOT process the requested action until a verification token sent to a registered Guardian's on-file contact channel has been confirmed by the requester.

**Validates: Requirements 35.2, 35.3**

### Property 22: Lens Switching on Remediation

*For any* Student's first incorrect practice attempt immediately following initial instruction on a Skill, the Lens selected for remediation SHALL differ from the Lens used for that Skill's initial instruction.

**Validates: Requirements 34.5**

### Property 23: Rubric Feedback Display for Non-Binary Evaluation

*For any* Skill with `evaluation_strategy = 'rubric_llm'`, the Student-facing response SHALL include per-criterion feedback derived from the Skill's rubric, and SHALL NOT present the result as a single binary correct/incorrect judgment.

**Validates: Requirements 31.10**

### Property 24: Verification Request Non-Enumerability

*For any* two verify-request submissions differing only in whether the submitted contact value matches a registered Guardian record, the API response returned to the caller SHALL be indistinguishable in content, shape, and timing.

**Validates: Requirements 35.2a**

### Property 25: Ask-a-Question Answer Grounding

*For any* plain-language question submitted to the Teacher or Admin ask-a-question endpoint (Section 19, `/api/teacher/ask` / `/api/admin/analytics/ask`), every fact, number, or name in the returned answer SHALL be present in the retrieved data passed to the LLM as context; the answer SHALL NOT contain any fact absent from that retrieved data.

**Validates: Requirements 10.8, 15.5, 37.4**

### Property 26: Entry Respects Space Boundaries Across Multiple Enrollments

*For any* Student with one or more active Space enrollments, the Skill selected by Entry (Section 7) SHALL fall within the boundaries and classroom pacing mode of the specific Space it was drawn from; no candidate Skill from one Space's boundary SHALL be presented as if it belonged to another Space the Student is also enrolled in.

**Validates: Requirements 7.1, 7.1f, 20.1**

### Property 27: Conversational Commands Never Bypass Confirmation or Audit

*For any* data-changing action completed via the Conversational Command Layer (Section 20), the resulting database state and audit log entry SHALL be identical to the state and log entry produced by the equivalent structured (click-driven) path for the same action and parameters — the `entry_method` field SHALL be the only difference.

**Validates: Requirements 11.2, 11.3a, 14a.4, 37.5, 37.6**

### Property 28: Ambiguous Commands Resolve to Clarification, Never a Guess

*For any* plain-language request where a required parameter (e.g., a named Student, Skill, or user account) matches more than one candidate record within the requester's RLS-visible scope, the Conversational Command Layer SHALL return a clarifying question and SHALL NOT execute the underlying action against any single candidate.

**Validates: Requirements 11.1a, 14a.2, 37.5**

### Property 29: LMS Actions Never Exceed Authorized Capability

*For any* tenant's LMS integration (Section 21), a read or write action SHALL be offered to a Teacher only if the corresponding capability is present in that tenant's authorized `lms_integrations` scope; an action absent from that scope SHALL NOT be presented as available, and SHALL be rejected server-side if attempted directly against the API.

**Validates: Requirements 36.1, 36.2, 36.7**

### Property 30: Live Content Edits Never Affect Students Before Approval

*For any* `validated` Skill or Misconception with an in-progress edit (a non-null `pending_edit`, Section 14d), every Student-facing read of that record's `name`, `description`, `evaluation_strategy`, `rubric`, and `prerequisite_ids` SHALL return the pre-edit values until the edit is explicitly approved and atomically applied; a Student SHALL NOT observe a partially-applied or in-progress edit under any interleaving of read and write operations.

**Validates: Requirements 31.8b**

### Property 31: Data-Deletion-Shaped Requests Never Execute as Role Management

*For any* plain-language request submitted to Admin's User/Role Management flow (Section 22a) that the Conversational Command Layer classifies as data-deletion-shaped rather than access-shaped, the request SHALL be routed to the Data Deletion flow's structured confirmation (Requirement 17.1) and SHALL NOT result in a `UserManagementAction` being executed.

**Validates: Requirements 14a.3, 17.1**

### Property 32: LMS-Only Today Items Never Offer Unavailable Practice

*For any* Student's Today or Week view item sourced from the connected LMS (`source: 'lms'`) for a subject Escolent has no adaptive content for, `action_route` SHALL be `null` and the item SHALL display a reference-back link to the source LMS; it SHALL NOT present a "start practice" action Escolent cannot actually fulfill.

**Validates: Requirements 7a.2**

## Testing Strategy

### Unit Testing

**Dual Testing Approach:**
The testing strategy employs a complementary combination of unit tests and property-based tests:
- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Together these provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

**Unit Test Focus Areas:**
- Specific example scenarios demonstrating correct behavior
- Edge cases and boundary conditions (empty inputs, maximum values, null handling)
- Error conditions and exception handling
- Integration points between components
- API route handlers (input validation, authentication checks)
- React components and UI interactions

**Frameworks:**
- Jest for unit tests
- React Testing Library for React component tests
- fast-check (TypeScript/JavaScript property-based testing library)

**Example Unit Tests:**
- Empty response rejected by input validation
- Session autosave triggered after 30 seconds
- Teacher Mastery Overview filters by Space correctly, and aggregates across Spaces when no filter is applied
- Distress escalation notification sent within 5 seconds

### Property-Based Testing

**Property Test Library:** fast-check (TypeScript/JavaScript)

**Test Configuration:**
- Minimum 100 iterations per property test (to ensure adequate input coverage through randomization)
- Each property test MUST reference its design document property via comment tag
- Tag format: `// Feature: escolent-mvp-adaptive-learning, Property {number}: {property_text}`

**Property Test Focus Areas:**
All 25 correctness properties defined in the Correctness Properties section must be implemented as property-based tests:

1. **Skill Graph Traversal** (Properties 1-2): Skill unlock on mastery, prerequisite identification
2. **Knowledge Tracing Engine** (Properties 3-7): BKT algorithm correctness, mastery state isolation, threshold detection, durable mastery, response time invariance
3. **Misconception Detection** (Properties 8-9): Pattern matching, misconception vs slip classification
4. **Spaced Repetition** (Properties 10-13): Schedule creation, interval adjustments, problem limit
5. **Adaptive Problem Selection** (Property 14): Comprehensive problem selection with all constraints
6. **Scaffolding System** (Property 15): Hint penalty application
7. **Teacher Overrides** (Property 16): Override isolation
8. **Distress Detection** (Property 17): Pattern-based escalation triggering
9. **Guardrail Enforcement** (Property 18): Space boundary enforcement
10. **Real-Time Unmatched Error Response** (Property 19): General Socratic response for unmatched errors
11. **Subject-Agnostic Evaluation** (Property 20): Evaluation strategy routing
12. **Parent Data Rights** (Property 21): Verification gate before request processing
13. **Adaptive Instruction** (Property 22): Lens switching on remediation
14. **Subject-Agnostic Evaluation Display** (Property 23): Rubric feedback for non-binary evaluation
15. **Parent Verification Privacy** (Property 24): Non-enumerability of verification requests
16. **Ask-a-Question Answer Grounding** (Property 25): Answer grounding, no fabrication

**Generator Strategies:**
- **Skill Graphs**: Generate random DAGs with 10-50 nodes, varying prerequisite depths
- **Mastery States**: Generate probabilities uniformly in [0, 1], response histories with 0-10 entries
- **Responses**: Generate correct/incorrect with varying difficulty (1-5), response times (0-300000ms)
- **Space Configurations**: Generate random skill subsets, difficulty ranges [1,5], pacing mode boolean
- **Error Patterns**: Generate symbolic patterns, regex patterns, example incorrect responses
- **Review Schedules**: Generate intervals (1-365 days), ease factors [1.3, 2.5]

**Example Property Test Implementation:**

```typescript
import fc from 'fast-check';

// Feature: escolent-mvp-adaptive-learning, Property 3: Mastery State Update Follows BKT Rules
test('correct answers increase mastery probability', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 1 }),  // current mastery probability
      fc.integer({ min: 1, max: 5 }), // problem difficulty
      (currentMastery, difficulty) => {
        const response = { is_correct: true, difficulty };
        const updatedMastery = updateMasteryState(currentMastery, response);
        expect(updatedMastery).toBeGreaterThan(currentMastery);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test Requirements:**
- Each correctness property SHALL be implemented as a SINGLE property-based test
- All tests SHALL run with minimum 100 iterations to ensure adequate randomization
- Tests SHALL use appropriate fast-check generators for input types
- Tests SHALL NOT implement property-based testing from scratch; use fast-check library


### Integration Testing

**Focus Areas:**
- LTI 1.3 authentication flow with Canvas/Moodle test instances
- Google Classroom API authentication flow
- Supabase real-time subscription for Teacher Mastery Overview updates
- Offline sync: responses queued in IndexedDB, synced when online
- Session state recovery after interruption
- RLS policy enforcement (tenant isolation)

**Testing Approach:**
- Test against real Supabase development instance
- Mock LLM provider responses for predictability
- Use Canvas/Moodle sandbox environments for LTI testing
- Test offline scenarios by disabling network in Playwright

**Frameworks:**
- Playwright for end-to-end tests
- Supabase local development instance

**Example Integration Tests:**
- Student launches from Canvas, session created, problem displayed
- Student submits response offline, syncs when connectivity restored
- Teacher Mastery Overview updates in real-time when student completes problem
- Admin from Tenant A cannot access Tenant B's student data
- Interrupted session recovers exact problem and responses after 2 hours


### Performance Testing

**Target Metrics (95th Percentile):**
- Authentication: < 3 seconds on 2Mbps connection
- Mastery state update: < 2 seconds
- Misconception detection: < 3 seconds
- Problem generation: < 2 seconds
- UI interaction response: < 1 second (non-server actions)
- PWA initial load: < 5 seconds on 2GB RAM, dual-core 1.5GHz device
- Offline sync (100 responses): < 10 seconds

**Testing Approach:**
- Lighthouse CI for PWA performance baselines
- k6 for API load testing
- Chrome DevTools throttling to simulate low-end device (4x CPU slowdown, 2GB RAM)
- Network throttling to 2Mbps
- Test with realistic skill graph size (50-100 skills)

**Load Testing Scenarios:**
- 30 concurrent students practicing (target class size)
- 5 teachers viewing Mastery Overview with real-time updates
- 1000 offline responses syncing simultaneously after connectivity restored


### Security Testing

**Focus Areas:**
- Multi-tenancy isolation: Tenant A cannot access Tenant B data
- RLS policy bypass attempts (SQL injection, direct API manipulation)
- LTI JWT signature validation (reject tampered tokens)
- Session hijacking prevention (token rotation, secure cookies)
- XSS prevention in user-generated content (student responses, teacher notes)
- CSRF protection on state-changing operations
- Audit log integrity (immutable logs, timestamp validation)

**Testing Approach:**
- Manual penetration testing by security consultant before production
- Automated security scanning (npm audit, Snyk, OWASP ZAP)
- Test malicious LTI JWT payloads
- Attempt cross-tenant data access via API manipulation
- Test XSS vectors in student free-text responses


### Compliance Testing (POPIA)

**Focus Areas:**
- Data retention: Student data auto-deleted after retention period
- Data export: Parent can retrieve all child's data in machine-readable format
- Data deletion: Student data permanently deleted within 72 hours of request
- Audit logs: All data access/modifications logged with 2+ year retention
- Cross-border data transfer disclosure: Geographic storage location visible to admins
- Breach notification: Simulated breach triggers notifications within required timeframe

**Testing Approach:**
- Automated tests for data deletion workflows
- Manual review of audit logs for completeness
- Legal counsel review of compliance documentation before production
- Test data export format for completeness and accuracy

**Note:** All POPIA timelines provisional pending legal review. Compliance testing MUST NOT proceed to production without qualified POPIA legal counsel validation.


## Deployment Architecture

### Infrastructure Overview

**Hosting:**
- **Frontend + API Routes:** Vercel (serverless functions for API routes)
- **Database + Auth + Realtime:** Supabase Cloud (South Africa region preferred to minimize cross-border data transfer; if unavailable, nearest available region with explicit cross-border transfer documentation per Requirement 27)
- **LLM Provider:** OpenAI/Anthropic (configurable)

**Deployment Model:**
- Single production environment initially (Teneo pilot)
- Staging environment for pre-production testing
- Preview deployments for feature branches (Vercel)

### Environment Configuration

```typescript
// Environment variables
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx (server-only)
LLM_PROVIDER=openai|anthropic|gemini
LLM_API_KEY=sk-xxx
LTI_CLIENT_ID_CANVAS=xxx
LTI_CLIENT_SECRET_CANVAS=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
TWILIO_ACCOUNT_SID=xxx (optional, for SMS escalation if needed beyond MVP pilot)
TWILIO_AUTH_TOKEN=xxx (optional, for SMS escalation if needed beyond MVP pilot)
```


### PWA Deployment

**Service Worker Registration:**
- Workbox generates service worker during build
- Auto-update strategy: prompt user when new version available
- Cache versioning to prevent stale content

**PWA Manifest:**
```json
{
  "name": "Escolent",
  "short_name": "Escolent",
  "description": "Adaptive math practice platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Offline Assets:**
- Static pages (login, error screens)
- Skill graph data (updated weekly)
- Problem templates (lazy-loaded by space)
- UI assets (CSS, JS, images)


### Monitoring and Observability

**Application Monitoring:**
- Vercel Analytics for frontend performance
- Vercel Logs for API route errors
- Supabase dashboard for database performance, RLS policy violations

**Error Tracking:**
- Sentry for client-side errors
- Server-side errors logged to Vercel
- Critical errors trigger alerts (distress detection failures, authentication errors)

**Key Metrics to Monitor:**
- Authentication success rate (target: > 98%)
- Mastery update latency (target: < 2 seconds, 95th percentile)
- Offline sync success rate (target: > 95%)
- Session state recovery success rate (target: > 99%)
- Distress detection accuracy (false negative rate: target < 1%)
- LLM provider API latency and error rate

**Alerting Thresholds:**
- Authentication failure rate > 5% for 5 minutes → alert
- Database connection errors > 10 in 1 minute → alert
- Distress detection service down → immediate alert
- LLM provider error rate > 20% → alert


### Backup and Disaster Recovery

**Database Backups (Supabase):**
- Daily automated backups (Supabase default)
- Point-in-time recovery available (7 days)
- Weekly backup validation testing

**Recovery Time Objective (RTO):**
- Database failure: < 4 hours (restore from backup)
- Vercel outage: < 1 hour (traffic automatically routed)
- Complete data loss: < 24 hours (restore from last daily backup)

**Recovery Point Objective (RPO):**
- Maximum data loss: < 24 hours (daily backup frequency)
- For MVP, this is acceptable given pilot scale

**Disaster Recovery Plan:**
1. Database corruption detected → restore from most recent backup
2. Verify data integrity with sample queries
3. Notify affected schools of temporary unavailability
4. Resume service, monitor for errors
5. Post-incident review within 48 hours


## Design Rationale and Trade-offs

### Multi-Tenancy Architecture

**Decision:** Implement multi-tenancy via Row Level Security (RLS) from day one, even though MVP is single-tenant.

**Rationale:**
- Second pilot school (Kenya) planned shortly after Teneo launch
- Retrofitting multi-tenancy is architecturally expensive and risky
- RLS provides strong isolation guarantees enforced at database level
- Negligible performance overhead for pilot scale (< 100 students)

**Trade-off:** Slightly increased initial development complexity vs. avoiding complete rewrite for second tenant.

### Offline-First PWA vs. Native App

**Decision:** Build as PWA with service worker offline support, not native iOS/Android apps.

**Rationale:**
- Single codebase for all platforms (lower development cost)
- No app store approval delays (critical for pilot iteration)
- Students access via LMS link (no separate app install)
- Service workers provide comparable offline experience on modern browsers
- Low-end devices often have limited storage (PWA caching more efficient)

**Trade-off:** Slightly reduced offline capabilities vs. native app, but acceptable for MVP scope.


### Simplified BKT vs. Deep Learning Mastery Models

**Decision:** Use simplified Bayesian Knowledge Tracing (BKT), not deep learning models (DKT, SAINT+).

**Rationale:**
- BKT is interpretable (teachers can understand mastery calculation)
- No cold-start problem (works immediately without training data)
- Low computational cost (runs on serverless functions)
- Sufficient accuracy for MVP validation
- Deep learning models require large training datasets (not available at pilot scale)

**Trade-off:** Lower mastery prediction accuracy vs. deep learning, but acceptable for MVP with teacher override capability.

### LLM-Based Misconception Detection vs. Rule-Based Only

**Decision:** Hybrid approach: pattern matching (fast) + LLM semantic analysis (fallback).

**Rationale:**
- Pattern matching handles common misconceptions with <100ms latency
- LLM provides flexibility for novel error patterns
- Pedagogical_Lead can curate patterns based on LLM-detected errors
- Over time, pattern library grows and LLM reliance decreases

**Trade-off:** LLM API cost and latency vs. pure rule-based brittleness. Hybrid balances both.


### Supabase vs. Custom Backend

**Decision:** Use Supabase for database, auth, and realtime, not custom Node.js backend.

**Rationale:**
- RLS policies enforce multi-tenancy at database level (security guarantee)
- Realtime subscriptions built-in (no custom WebSocket infrastructure)
- Auth integrations (Google, SSO) pre-built
- Reduces infrastructure management overhead for small team
- Supabase scales to thousands of concurrent users (sufficient for MVP expansion)

**Trade-off:** Vendor lock-in risk vs. faster development and lower operational cost. Acceptable for MVP.

### Distress Detection Over-Trigger Bias

**Decision:** Deliberately set low confidence thresholds (0.6 for LLM, single keyword match for patterns).

**Rationale:**
- False negative (missed distress signal) is unacceptable harm
- False positive (unnecessary teacher notification) is acceptable inconvenience
- Teachers prefer over-notification to under-notification (validated in user research)
- Pattern library will improve over time, reducing false positives

**Trade-off:** Increased teacher alert fatigue vs. student safety. Safety prioritized.
