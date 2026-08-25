# Requirements Document

## Introduction

Escolent MVP is a subject-agnostic, AI-native adaptive learning platform. The platform operates as an embedded layer within existing LMS systems (Canvas, Moodle, Google Classroom) to provide adaptive, personalized practice with honest mastery tracking, for any subject a school teaches. The core problem being solved is that schools track completion rather than mastery—students can finish exercises without understanding the material.

**MVP pilot content scope:** the platform's subject-agnostic mechanisms (Skill_Graph, Misconception_Taxonomy, evaluation, remediation — see Requirement 31) are validated end-to-end against one initial subject, Grade 8 Mathematics (IEB-aligned, starting with algebraic equations), at a single pilot school. This is the pilot's *content* scope, not the platform's architecture — Requirement 31 requires that a second subject be addable without redesigning the Platform.

The MVP targets a pilot deployment at Teneo, an online private K-12 school in South Africa, with one Grade 8 class. The platform must support low-end devices and unreliable connectivity typical of South African, Kenyan, and Nigerian markets.

**Note on Numeric Targets:** Requirements in this document contain specific numeric performance targets (latency thresholds, retention periods, device specifications, etc.). Unless explicitly noted otherwise, these represent reasonable engineering defaults subject to refinement during design and implementation, not validated hard requirements. POPIA-related timelines (Requirements 24-29) are provisional pending POPIA legal counsel review and must be validated by qualified legal counsel before implementation.

## Glossary

- **Platform**: The Escolent adaptive learning system
- **Student**: A K-12 learner using the Platform within their school's LMS (MVP pilot cohort: a Grade 8 class)
- **Teacher**: An educator who creates Spaces, monitors student progress, and can override AI assessments
- **Parent**: A parent or guardian of a Student
- **Admin**: A school administrator managing pilot scope, billing, and data operations
- **Space**: A teacher-defined practice environment with specific topic boundaries and guardrails
- **LMS**: Learning Management System (Canvas, Moodle, or Google Classroom)
- **Mastery_State**: A per-Student, per-skill probability estimate indicating likelihood of skill mastery
- **Session**: A continuous period of Student practice activity within a Space
- **Skill**: An atomic concept or procedure within a subject/curriculum configured on the Platform (MVP pilot content: Grade 8 algebraic equation Skills from the IEB curriculum — see Requirement 33)
- **Skill_Graph**: A dependency map showing prerequisite relationships between Skills
- **Misconception**: A persistent incorrect mental model, distinct from a careless slip
- **Misconception_Taxonomy**: A structured catalog of known Misconceptions with targeted remediation strategies
- **Pedagogical_Lead**: The Platform's subject matter expert responsible for curating the Misconception_Taxonomy and learning content
- **Practice_Problem**: A question or task, in whatever form the Skill's subject calls for, presented to a Student during a Session
- **Distress_Signal**: Language or pattern indicating student distress or self-harm risk
- **POPIA**: Protection of Personal Information Act (South African data protection law)
- **LTI**: Learning Tools Interoperability standard for LMS integration
- **SSO**: Single Sign-On authentication mechanism
- **Scaffolding**: Graduated support that fades from worked examples to independent practice
- **Spaced_Repetition**: A scheduling algorithm that resurfaces mastered Skills at increasing intervals
- **Override**: A teacher's manual correction of a Student's Mastery_State for a specific Skill
- **Escalation**: An alert sent to a Teacher when a Distress_Signal is detected
- **Evaluation_Strategy**: A per-Skill declaration of how Student responses are checked for correctness (e.g., exact match, symbolic equivalence, or rubric-based evaluation)
- **Content_Status**: The maturity state of a Skill or Misconception ("draft," "pending_approval," or "validated"); only "validated" content is ever servable to Students
- **Coverage_Status**: A per-Skill indicator ("rich", "thin", or "gap") of how well existing ingested content covers that Skill
- **Lens**: A fixed, platform-level pedagogical explanation strategy (e.g., concrete/analogy, procedural, narrative, Socratic) applied to any Skill's base description at instruction time
- **Guardian**: A registered parent or guardian contact associated with a Student, provided by the school
- **Entry**: The experience a Student, Teacher, Admin, or Pedagogical_Lead lands on when opening the Platform — a Session begun directly for a Student (Requirement 7), or a synthesized Briefing for the other three roles (Requirements 10, 15, 31a) — never a menu or dashboard requiring interpretation before anything useful appears
- **Briefing**: A synthesized, prioritized set of items needing a Teacher's, Admin's, or Pedagogical_Lead's attention, generated by the Platform rather than assembled by the user scanning raw data; each item is navigable directly to the specific record or action it concerns
- **Today**: A view combining a role's relevant due items and deadlines — Escolent-native and, where applicable, read from a connected LMS — for the current day, with a calendar view of the current week reachable from it

## Requirements

### Requirement 1: LMS Launch and Authentication

**User Story:** As a Student or Teacher, I want to launch the Platform from my school's LMS using my existing credentials, so that I don't need to manage separate login credentials.

#### Acceptance Criteria

1. WHEN a Student clicks the Platform link in Canvas, THE Platform SHALL authenticate the Student via LTI 1.3 and begin the Student's Entry experience (Requirement 7)
2. WHEN a Student clicks the Platform link in Moodle, THE Platform SHALL authenticate the Student via LTI 1.3 and begin the Student's Entry experience (Requirement 7)
3. WHEN a Student clicks the Platform link in Google Classroom, THE Platform SHALL authenticate the Student via Google Classroom API and begin the Student's Entry experience (Requirement 7)
4. WHEN an authentication request fails, THE Platform SHALL display an error message with contact information for technical support
5. THE Platform SHALL complete authentication within 3 seconds for 95th percentile latency on connections with 2Mbps or faster bandwidth
6. WHEN a Teacher launches the Platform from an LMS, THE Platform SHALL authenticate the Teacher via LTI 1.3 or Google Classroom API and begin the Teacher's Entry experience (Requirement 10)
7. *Found missing during the Student Shell pressure test — every prior AC here requires clicking through the LMS every time, which structurally prevents Escolent from ever being a Student's primary, directly-opened destination, undermining the product's own stated goal of eventually becoming a standalone platform.* WHEN a Student opens the Platform directly — a home-screen PWA icon, a bookmark, or a direct URL — rather than clicking through from the LMS, THE Platform SHALL authenticate the Student from a persisted session established by their most recent LTI or Google Classroom launch, and begin the Student's Entry experience (Requirement 7), without requiring a fresh LMS click-through
8. WHEN a Student opens the Platform directly and no valid persisted session exists (never launched via the LMS, or the persisted session has expired), THE Platform SHALL display a message directing the Student back to their LMS to launch from there, rather than presenting a broken or blank state

### Requirement 1A: Admin Direct Authentication

**User Story:** As an Admin, I want to access the Platform directly without navigating through course-specific LMS interfaces, so that I can manage the pilot independently of course enrollments.

#### Acceptance Criteria

1. THE Platform SHALL provide a direct login interface for Admins separate from the LTI launch flow
2. WHEN an Admin accesses the direct login interface, THE Platform SHALL authenticate the Admin via SSO or username/password
3. WHEN Admin authentication succeeds, THE Platform SHALL begin the Admin's Entry experience (Requirement 15)
4. THE Platform SHALL complete Admin authentication within 3 seconds for 95th percentile latency on connections with 2Mbps or faster bandwidth
5. WHEN Admin authentication fails, THE Platform SHALL display an error message with contact information for technical support

### Requirement 2: Skill Graph and Prerequisite Tracking

**User Story:** As a Teacher, I want the Platform to understand prerequisite relationships between Skills in my subject, so that remediation targets foundational gaps rather than surface symptoms.

#### Acceptance Criteria

1. THE Skill_Graph SHALL represent all Skills defined for each subject/curriculum configured on the Platform; for the MVP pilot, this is populated with Grade 8 algebraic equation Skills from the IEB curriculum (see Requirement 33)
2. THE Skill_Graph SHALL encode prerequisite dependencies between Skills
3. WHEN a Student demonstrates mastery of a Skill, THE Platform SHALL make dependent Skills available for practice
4. WHEN a Student struggles with a Skill, THE Platform SHALL identify prerequisite Skills in the Skill_Graph
5. THE Platform SHALL store the Skill_Graph structure in a format that allows modification without code changes

### Requirement 3: Real-Time Knowledge Tracing

**User Story:** As a Student, I want the Platform to adapt to my understanding in real-time, so that I receive appropriate challenge and support within a single practice session.

#### Acceptance Criteria

1. WHEN a Student answers a Practice_Problem, THE Platform SHALL update the Mastery_State for the associated Skill within 2 seconds
2. THE Platform SHALL maintain a separate Mastery_State for each Student and each Skill
3. THE Platform SHALL calculate Mastery_State based on correctness and recent performance history
4. WHEN a Student's Mastery_State crosses the mastery threshold for a Skill, THE Platform SHALL flag the Skill as potentially mastered
5. THE Platform SHALL apply different mastery thresholds for procedural Skills versus conceptual Skills
6. THE Platform SHALL confirm mastery across at least two separate Sessions before marking a Skill as durably mastered
7. WHEN network connectivity is unavailable, THE Platform SHALL queue Mastery_State updates and synchronize them when connectivity is restored
8. THE Platform MAY track response time as a diagnostic signal visible to Teachers but SHALL NOT use response time in Mastery_State calculation to avoid penalizing low-end device users and ESL students

### Requirement 4: Misconception Detection and Remediation

**User Story:** As a Student, I want the Platform to identify my specific misunderstandings, so that I receive targeted help rather than generic hints.

#### Acceptance Criteria

1. THE Platform SHALL maintain a Misconception_Taxonomy per subject/curriculum configured on the Platform; for the MVP pilot, this is populated for Grade 8 algebraic equations
2. THE Misconception_Taxonomy SHALL classify each entry as either repetition-confirmed or first-occurrence-actionable, and THE Platform SHALL apply the distinction in Requirement 4.3 according to that classification
3. WHEN a Student provides an incorrect answer, THE Platform SHALL match the response pattern against the Misconception_Taxonomy within 3 seconds
4. THE Platform SHALL distinguish between a persistent Misconception and a careless slip based on error frequency across multiple Practice_Problems OR based on highly specific error patterns that indicate Misconception on first occurrence
5. WHEN a persistent Misconception is identified, THE Platform SHALL present targeted remediation addressing that specific Misconception
6. WHEN an error pattern suggests language comprehension difficulty rather than mathematical misunderstanding, THE Platform SHALL flag the response for Teacher review rather than applying mathematical remediation
7. THE Platform SHALL track identified Misconceptions per Student for Teacher visibility
8. WHEN a Student error does not match any pattern in the Misconception_Taxonomy, THE Platform SHALL log the unmatched error pattern with Student response context and make it available to the Pedagogical_Lead for taxonomy curation
9. WHEN a Pedagogical_Lead chooses to promote a logged unmatched error pattern to a Misconception, THE Platform SHALL pre-draft the Misconception entry (name, description, classification, remediation strategy) using the AI-assisted authoring mechanism specified in Requirement 31, for the Pedagogical_Lead to review and edit rather than author from a blank form
10. WHEN a Student error does not match any Misconception_Taxonomy pattern, THE Platform SHALL provide a general Socratic-style response to the Student in real time, independent of and not blocked by the asynchronous routing to the Pedagogical_Lead

### Requirement 5: Spaced Repetition Scheduling

**User Story:** As a Student, I want the Platform to help me remember what I've learned over time, so that my understanding is durable rather than temporary.

#### Acceptance Criteria

1. WHEN a Student achieves durable mastery of a Skill, THE Platform SHALL schedule the Skill for review using spaced repetition intervals
2. THE Platform SHALL increase the interval between reviews when a Student successfully completes review Practice_Problems
3. WHEN a Student struggles with a review Practice_Problem, THE Platform SHALL shorten the review interval for that Skill
4. THE Platform SHALL incorporate spaced repetition review Practice_Problems into regular practice Sessions
5. THE Platform SHALL limit spaced repetition reviews to no more than 20 percent of Practice_Problems in any Session

### Requirement 5a: Review-Due Notification

**User Story:** As a Student, I want to be told when something I learned is ready for review, so that I don't have to remember to check on my own — without feeling nagged or guilted into coming back.

#### Acceptance Criteria

1. THE Platform SHALL only send a proactive notification to a Student when a Skill becomes due for spaced-repetition review (Requirement 5) — never on a fixed schedule, and never based on time since the Student's last visit alone
2. THE Platform SHALL state only the fact that a review is ready, without referencing streaks, comparisons to other Students, or anything framed as a loss ("don't lose your progress," "your streak is at risk," or equivalent)
3. THE Platform SHALL only send this notification to a Student who has installed the Platform as a direct-open PWA (Requirement 1.7) and granted notification permission — a Student who has not done either receives no proactive notification, with no degraded in-app experience as a result
4. WHEN a Student taps the notification, THE Platform SHALL open directly into a Session for the Skill that became due, not a generic landing screen
5. THE Platform SHALL send at most one notification per Skill becoming due, not repeated reminders for the same pending review

### Requirement 6: Cognitive Load-Aware Scaffolding

**User Story:** As a Student, I want the Platform to provide more support when I'm learning something new and less support as I gain confidence, so that I develop independent problem-solving skills.

#### Acceptance Criteria

1. WHEN a Student first encounters a new Skill, THE Platform SHALL present worked examples with step-by-step explanations
2. THE Platform SHALL fade scaffolding as a Student's Mastery_State for a Skill increases according to the mastery thresholds defined in Requirement 3
3. THE Platform SHALL provide partially completed Practice_Problems with hints when a Student's Mastery_State indicates emerging understanding but not yet mastery
4. WHEN a Student's Mastery_State indicates likely mastery, THE Platform SHALL present independent Practice_Problems without hints
5. WHEN a Student requests a hint during independent practice, THE Platform SHALL provide the hint but adjust the Mastery_State calculation accordingly
6. WHEN a Student remains incorrect after exhausting all scaffolding levels including independent practice, THE Platform SHALL flag the attempt for Teacher review rather than repeating the highest scaffolding level indefinitely; IF the error pattern matches a known Misconception, THEN THE Platform SHALL route it per Requirement 4.5, and IF it matches no known pattern, THEN THE Platform SHALL log it per Requirement 4.8

### Requirement 7: Adaptive Practice Session Experience

**User Story:** As a Student, I want practice sessions that adapt to my current understanding, so that I'm neither bored nor overwhelmed.

#### Acceptance Criteria

1. WHEN a Student opens the Platform, THE Platform SHALL determine the next recommended Skill, from within the boundaries of a Space the Student is enrolled in, using the Student's Mastery_State and Spaced_Repetition schedule, and begin a Session directly, without requiring the Student to navigate a menu or select a Skill. *(Correction: an earlier draft of this AC omitted the Space-boundary constraint present in the original version of this requirement, which would have contradicted Requirement 20's guardrail enforcement — restored here.)*
1a. THE Platform SHALL accompany the automatically-selected Skill with a brief, one-line reason (e.g., spaced-repetition due, prerequisite gap, or new Skill)
1b. IF a Student requests different practice than the one automatically selected, THEN THE Platform SHALL honor that request immediately without requiring navigation through a menu first, subject to the boundaries of the Space that practice belongs to
1c. WHEN a Student has no prior Session history for any Skill, THE Platform SHALL begin on the first Skill in the Skill_Graph with no unmet prerequisites, within the boundaries of a Space the Student is enrolled in, and SHALL NOT reference a prior Session or imply returning progress in the framing shown to the Student
1d. WHEN a Student has no Skill currently due for practice or review, THE Platform SHALL display an honest state indicating there is nothing due, and MAY offer optional enrichment or review practice that the Student is not required to accept
1e. THE Platform SHALL determine the next recommended Skill (1) using only locally cached or previously synchronized Mastery_State and Spaced_Repetition data, so that the selection decision itself does not require a live network round trip; THIS DOES NOT alter Requirement 8.4 — starting a Session whose Practice_Problem content is not already cached still requires connectivity to load that content. 1e covers the *decision* of what to recommend, not a guarantee that a brand-new Session can begin with zero connectivity
1f. WHEN a Student is enrolled in more than one Space, THE Platform SHALL consider recommended Skills across all of the Student's active Space enrollments together when determining the single next recommendation, in the same manner Requirement 10.2 aggregates across a Teacher's Spaces; each candidate Skill remains subject to its own Space's configured boundaries and classroom pacing mode
2. THE Platform SHALL allow Students to continue Sessions without a hard time limit
3. WHEN a Student has completed 10 to 15 Practice_Problems or 15 to 20 minutes of practice, THE Platform SHALL suggest a natural stopping point
4. WHEN a Student demonstrates a prerequisite gap during individual practice, THE Platform SHALL automatically introduce prerequisite remediation within that Session
5. WHEN a Teacher has enabled classroom pacing mode for a Space, THE Platform SHALL prioritize Space-defined Skills over individually optimal prerequisite remediation
6. WHEN classroom pacing mode prevents prerequisite remediation, THE Platform SHALL flag the prerequisite gap visibly to the Teacher
7. THE Platform SHALL save Session progress every 30 seconds or after each Practice_Problem response, whichever occurs first
8. THE Practice_Problem response input SHALL be a structured field matched to the Skill's Evaluation_Strategy (a symbolic or numeric field for exact-match or symbolic-equivalence Skills, a free-text field for rubric-based Skills), not a general-purpose chat input

### Requirement 7a: Student Daily Awareness — Today and Calendar

*Found missing during tasks.md work, not carried over from any prior document: this capability is fully specified in escolent-interaction-model.md's Student section C, and was the user's own explicit request ("students need to know their daily quests... take their daily use of LMSes into account... access a calendar"), but never became a formal requirement — Teacher (10a) and Admin (15b) both got their Today/Week requirements, Student did not. Design.md never had anything to build from, so this was silently absent there too.*

**User Story:** As a Student, I want to see what's due today and this week — including my school's actual assignment due-dates — without separately checking the LMS, so Escolent can be where I actually keep track of things.

#### Acceptance Criteria

1. THE Platform SHALL present a Today view combining: Escolent's own recommendations (spaced-repetition items due, anything a Teacher specifically assigned through a Space) and the source LMS's assignments and due dates, read from the connected LMS
2. THE Today view SHALL include every due item from the connected LMS, not only ones tied to a subject Escolent currently has adaptive content for — general daily awareness, not a math-only view; only Escolent-native items receive a one-tap "start practice" action, LMS-only items link back to their source (Requirement 5, the reference-back principle) without offering practice Escolent cannot provide
3. THE Platform SHALL present a calendar view of the current week, reachable from the Today view; Today SHALL be the prominent default, the week SHALL be one tap away, not the landing view
4. WHEN LMS-sourced due-date data is stale, unavailable, or mid-synchronization, THE Platform SHALL visibly indicate this on the affected items rather than presenting them with the same certainty as Escolent-native items — same treatment as Requirement 10a.4's equivalent for Teacher
5. THE Platform SHALL allow a Student to obtain the same due-date information via a plain-language request (e.g., "what do I have due Thursday") without opening the Today or calendar view

### Requirement 8: Offline Session Resilience

**User Story:** As a Student in an area with unreliable connectivity, I want to continue practicing even when my connection drops, so that my learning is not constantly interrupted.

#### Acceptance Criteria

1. WHEN a Student is mid-Session and network connectivity is lost, THE Platform SHALL allow the Student to continue answering loaded Practice_Problems
2. THE Platform SHALL queue Student responses locally when network connectivity is unavailable
3. WHEN network connectivity is restored, THE Platform SHALL synchronize queued responses within 10 seconds
4. WHEN a Student attempts to start a new Session without network connectivity, THE Platform SHALL display a message indicating that connectivity is required to load new content
5. THE Platform SHALL indicate connectivity status visibly to the Student during all Sessions

### Requirement 9: Teacher Space Creation and Configuration

**User Story:** As a Teacher, I want to create practice Spaces with specific topic boundaries, so that student practice aligns with my curriculum pacing and instructional goals.

#### Acceptance Criteria

1. THE Platform SHALL allow a Teacher to create a new Space with a name and description
2. WHEN creating a Space, THE Teacher SHALL specify which Skills from the Skill_Graph are included
3. WHEN creating a Space, THE Teacher SHALL specify a difficulty range for Practice_Problems
4. THE Platform SHALL allow a Teacher to enable or disable classroom pacing mode for a Space
5. THE Platform SHALL allow a Teacher to assign Students to a Space
6. THE Platform SHALL allow a Teacher to modify Space configuration after creation
7. WHEN a Teacher modifies Space boundaries, THE Platform SHALL apply changes to future Sessions without affecting in-progress Sessions
8. THE Platform SHALL allow a Teacher to describe a Space in plain language and receive pre-filled Skill selections and a suggested difficulty range for review, using the same AI co-authoring mechanism specified in Requirement 31; the Teacher SHALL review and may adjust every pre-filled value before saving

### Requirement 10: Teacher Entry, Daily Briefing, and Awareness

**User Story:** As a Teacher, I want to open the Platform and immediately see what needs my attention today, across all my classes, so that I don't have to interpret a dashboard to find out.

#### Acceptance Criteria

1. WHEN a Teacher opens the Platform, THE Platform SHALL present a synthesized briefing of items needing attention (e.g., Students showing a specific struggle pattern, a spiking Misconception, pending Escalations) rather than requiring the Teacher to interpret raw Mastery_State or Session data unprompted
2. THE briefing SHALL aggregate across every Space the Teacher teaches by default; each item SHALL carry a label identifying which Space or class it concerns
2a. THE Platform SHALL provide a filter allowing a Teacher to narrow the briefing and related views to a single Space; this filter SHALL be a narrowing option applied on top of the aggregated default, not a required first step
3. WHEN a Teacher taps or otherwise selects a briefing item, THE Platform SHALL navigate directly to the specific record or action the item concerns (e.g., the affected Students' error patterns, the relevant Curation Queue entry, the specific Escalation), not a general dashboard
3a. WHEN a briefing category contains more than one item (e.g., three Students stuck on the same Skill), THE Platform SHALL present the set of items for selection rather than forcing selection of a single instance
4. WHEN a Teacher has no Spaces or Students yet, THE Platform SHALL present Space creation (Requirement 9) instead of an empty briefing
5. WHEN a Teacher's Spaces exist but there is not yet enough Session data to synthesize a meaningful briefing (e.g., the start of a new term), THE Platform SHALL state that data is still accumulating rather than presenting an empty or falsely reassuring briefing, and SHALL default to the mastery overview described in Requirement 10b
6. WHEN a Teacher has no items needing attention, THE Platform SHALL present an honest state indicating nothing is currently urgent, and MAY surface lower-priority information (e.g., a Student trending downward but not yet flagged) without presenting it as urgent
7. THE Platform SHALL determine the briefing's contents using locally synchronized data where available, so that opening the Platform does not require a live network round trip to display a briefing

### Requirement 10a: Teacher Daily and Weekly Awareness

**User Story:** As a Teacher, I want to see what's due today and this week across all my classes — including my own grading obligations and my school's LMS deadlines — without separately checking the LMS.

#### Acceptance Criteria

1. THE Platform SHALL present a Today view combining: Escolent-native items (Curation Queue backlog, pending Escalations, Overrides awaiting follow-up) and the source LMS's assignment due-dates and grading deadlines across the Teacher's classes, read from the connected LMS
2. THE Platform SHALL present a calendar view of the current week, reachable from the Today view, showing the same combined item set
3. Every item in the Today and calendar views SHALL be navigable directly to its specific action or record, with the same immediacy as an item in the Requirement 10 briefing — Today is not a separate, static list
4. WHEN LMS-sourced due-date data is stale, unavailable, or mid-synchronization, THE Platform SHALL visibly indicate this on the affected items rather than presenting them with the same certainty as Escolent-native items
5. THE Platform SHALL allow a Teacher to obtain the same due-date and deadline information via a plain-language request (e.g., "what's due for period 3 this week") without opening the Today or calendar view

### Requirement 10b: Teacher Class-Level Mastery Overview

**User Story:** As a Teacher, I want to scan mastery across all my students at once, so that I can spot who needs help.

#### Acceptance Criteria

1. THE Platform SHALL display a Teacher mastery overview showing Mastery_State for each Student and each Skill, aggregated across the Teacher's Spaces by default per Requirement 10.2, with the single-Space filter of Requirement 10.2a available
2. THE Platform SHALL update the mastery overview in real-time as Students practice
3. THE Platform SHALL allow a Teacher to filter the mastery overview by Space, Student, or Skill, including via a plain-language request (e.g., "show me who's below 60% on algebra")
4. THE Platform SHALL visually distinguish between tentative mastery and durable mastery
5. THE Platform SHALL display flagged prerequisite gaps
6. THE Platform SHALL display identified Misconceptions per Student
7. THE Platform SHALL allow a Teacher to drill down into individual Student Session history
8. THE Platform SHALL allow a Teacher to ask a plain-language question about their students' progress and receive an answer synthesized from that Teacher's actual Mastery_State, Misconception, and Session data; THE Platform SHALL NOT state any fact not present in that underlying data

### Requirement 11: Teacher Override of AI Mastery Assessment

**User Story:** As a Teacher, I want to override the AI's mastery assessment when I observe student understanding directly, so that the Platform reflects my professional judgment.

#### Acceptance Criteria

1. THE Platform SHALL allow a Teacher to manually mark a Skill as mastered for a specific Student, including via a plain-language request (e.g., "override Jane's assessment on two-step equations — solved it correctly on paper, input error")
1a. WHEN a plain-language Override request is ambiguous (e.g., the named Student or Skill is not uniquely identifiable), THE Platform SHALL ask for clarification rather than acting on a best-effort guess
2. WHEN a Teacher marks a Skill as mastered, THE Platform SHALL require the Teacher to provide a brief reason and to explicitly confirm the action before it is applied, regardless of whether the request originated as a structured action or a plain-language request
3. THE Platform SHALL update the Student's Mastery_State immediately when a Teacher marks a Skill as mastered
3a. THE Platform SHALL log an Override identically in the audit trail regardless of whether it originated as a structured action or a plain-language request
4. THE Platform SHALL display Override history per Student for Teacher review
5. THE Platform SHALL periodically prompt Teachers to revisit Overrides that are more than 30 days old
6. THE Platform SHALL apply Overrides only to the specific Student, without modifying global mastery algorithms

### Requirement 12: Weekly Teacher Digest Email

**User Story:** As a Teacher, I want to receive a weekly email summary of student progress, so that I have a record outside the Platform even when I'm not actively using it.

#### Acceptance Criteria

1. THE Platform SHALL generate a weekly digest email for each Teacher summarizing Student progress in their Spaces, using the same underlying synthesis mechanism that powers the daily in-app briefing (Requirement 10) — the email is an additional delivery channel for that synthesis, not a separate mechanism
2. THE weekly digest SHALL include the number of Students who achieved new durable mastery during the week
3. THE weekly digest SHALL include the number of Students with flagged prerequisite gaps
4. THE weekly digest SHALL include the most common Misconceptions identified during the week
5. THE Platform SHALL send weekly digests on a day and time configurable by the Teacher
6. THE Platform SHALL generate weekly digest content using the LLM abstraction layer specified in Requirement 22, grounded in that Teacher's actual Space and Student data for the week; THE Platform SHALL NOT generate digest content from a static template with values substituted in

### Requirement 13: Parent Mastery Updates

**User Story:** As a Parent, I want to receive plain-language updates about my child's mastery progress, so that I understand what my child is learning and where they may need support.

#### Acceptance Criteria

1. THE Platform SHALL generate plain-language mastery updates for Parents describing Student progress
2. THE Platform SHALL deliver Parent updates via the school's existing parent communication channel such as WhatsApp, SMS, or school mobile apps
3. THE Platform SHALL send Parent updates weekly by default
4. THE Platform SHALL include in Parent updates which Skills the Student mastered and which Skills need more practice
5. THE Platform SHALL avoid technical terminology in Parent updates
6. WHERE a Parent does not have access to digital communication channels, THE Platform SHALL provide a printable summary report that Teachers can deliver physically
7. THE Platform SHALL generate Parent update content using the LLM abstraction layer specified in Requirement 22, grounded in that Student's actual Mastery_State data for the period covered; THE Platform SHALL NOT generate update content from a static template with values substituted in

### Requirement 14: Admin Pilot Scope and Subject Activation

**User Story:** As an Admin, I want to control which classes participate in the pilot and which subjects are active for my school, so that I can manage rollout scope and risk.

#### Acceptance Criteria

1. THE Platform SHALL allow an Admin to enable or disable Platform access for specific classes
2. THE Platform SHALL allow an Admin to view which Teachers and Students have active Platform access
3. THE Platform SHALL prevent Students from accessing the Platform when their class is disabled by an Admin
4. THE Platform SHALL surface a specific pilot-progress summary to the Admin at the pilot's day-21 mark, distinct from routine ongoing metrics, including adoption and early mastery signal to date
5. WHEN a subject or curriculum has been curated platform-wide by a Pedagogical_Lead to Content_Status "validated" (Requirement 31), THE Platform SHALL allow an Admin to activate that subject or curriculum for their specific school, selecting which grade or class it applies to and when it becomes available to Students
6. THE Platform SHALL NOT grant an Admin write access to the Skill or Misconception content itself when activating a subject; activation controls only whether and when already-curated content is switched on for the Admin's school (see Requirement 21.5 for the read/write boundary)

### Requirement 14a: Admin User and Role Management

**User Story:** As an Admin, I want to invite, remove, or change the role of Teacher and Admin accounts at my school, so that I can manage who has access without waiting on engineering support.

#### Acceptance Criteria

1. THE Platform SHALL allow an Admin to invite a new Teacher or Admin account, and to change an existing account's role, including via a plain-language request (e.g., "invite Jane Smith as a teacher for Grade 8, jane@school.edu") that pre-fills a structured action for the Admin to review and confirm
2. WHEN a plain-language role-management request is ambiguous (e.g., the named person is not uniquely identifiable), THE Platform SHALL ask for clarification rather than acting on a best-effort guess
3. THIS requirement's scope is limited to access and role administration — inviting, changing roles, deactivating a login. A request that reads as deleting a person's data, however phrased, SHALL be routed to Requirement 17's structured deletion flow instead of being executed here
4. THE Platform SHALL log a role-management action identically in the audit trail regardless of whether it originated as a structured action or a plain-language request
5. WHEN a school's tenant has more than one Admin account, THE Platform SHALL show whether another Admin currently has the same user record open or has recently acted on it

### Requirement 15: Admin Entry, Daily Briefing, and Awareness

**User Story:** As an Admin, I want to open the Platform and immediately see what needs my attention — rollout health, compliance deadlines, billing events, and unresolved Escalations — across the whole school, so that I don't have to interpret a dashboard to find out.

#### Acceptance Criteria

1. WHEN an Admin opens the Platform, THE Platform SHALL present a synthesized briefing of items needing attention (e.g., Teachers who have not yet created a Space, pending data-subject requests, unresolved Escalations, upcoming billing events) rather than requiring the Admin to interpret raw metrics unprompted
2. THE briefing and related views SHALL aggregate across the whole school by default, with drill-down into a specific Teacher, class, or item available; unlike Requirement 10.2a's Teacher-facing filter, this is drill-down on an already-wide default, not a switch between narrow views
3. WHEN an Admin taps or otherwise selects a briefing item, THE Platform SHALL navigate directly to the specific record or action the item concerns
4. WHEN an Admin's tenant has no rollout activity yet (a new pilot), THE Platform SHALL present Requirement 14's setup or Requirement 15b's LMS integration setup instead of an empty briefing
5. WHEN an Admin's tenant has activity but not yet enough data for confident triage, THE Platform SHALL state that data is still accumulating and default to the school-wide analytics view (Requirement 15a) rather than an empty or falsely reassuring briefing
6. WHEN an Admin has no items needing attention, THE Platform SHALL present an honest state indicating nothing is currently urgent
7. THE Platform's tenant-wide access to distress Escalations for Admin (Requirement 19) SHALL surface in this briefing as an oversight signal (e.g., how many Escalations have been open longer than a defined threshold) rather than requiring the Admin to individually review every Escalation as a primary actor

### Requirement 15a: Admin School-Wide Analytics

**User Story:** As an Admin, I want to see overall adoption and mastery trends across the pilot, so that I can evaluate Platform effectiveness.

#### Acceptance Criteria

1. THE Platform SHALL display Admin analytics showing adoption metrics including active Students, average Session duration, and total Practice_Problems completed, aggregated across the school by default per Requirement 15.2
2. THE Platform SHALL display aggregated mastery metrics including average Skills mastered per Student and distribution of Mastery_States
3. THE Platform SHALL allow an Admin to filter metrics by Teacher, class, or date range, including via a plain-language request
4. THE Platform SHALL update Admin analytics metrics daily
5. THE Platform SHALL allow an Admin to ask a plain-language question about pilot progress and receive an answer synthesized from that tenant's actual adoption and mastery data; THE Platform SHALL NOT state any fact not present in that underlying data

### Requirement 15b: Admin Today, Week, and LMS Integration Setup

**User Story:** As an Admin, I want to see compliance deadlines, billing events, and rollout status for the week, and to be the one who connects our school's LMS to Escolent, so that day-to-day LMS usage (Requirement 10a) works for Teachers.

#### Acceptance Criteria

1. THE Platform SHALL present an Admin Today view combining compliance deadlines (e.g., a data-subject request's statutory response window), billing events (e.g., renewal, seat-limit reached), and the aggregated Curation Queue and Escalation backlog across the school — not LMS assignment due-dates, which are Requirement 10a's concern, not Admin's
2. THE Platform SHALL present a calendar view of the current week, reachable from the Today view, showing the same combined item set
3. Every item in the Today and calendar views SHALL be navigable directly to its specific action, with the same immediacy as an item in the Requirement 15 briefing
4. THE Platform SHALL require an Admin to authorize the connection between the Platform and the school's LMS before Requirement 10a's LMS-sourced due-date data or Requirement 36's read/write integration become available for that school, via a structured, credential-entry setup flow (a Canvas developer key issued by the school's Canvas admin, Moodle web-service functions enabled by the Moodle admin, or Google Classroom domain-level authorization granted by the Workspace admin, depending on the school's LMS)
5. THE LMS integration setup flow of 15b.4 SHALL be a structured flow, not a plain-language-driven one, given its security-sensitive nature; THE Platform MAY provide plain-language guidance narrating each step alongside the structured entry

### Requirement 15c: Admin Billing

**User Story:** As an Admin, I want to see our current plan, seats used, and renewal date, and to change our plan when needed, so that I can manage the school's subscription without contacting support for routine questions.

#### Acceptance Criteria

1. THE Platform SHALL display an Admin's current plan, seats used, and renewal date
2. THE Platform SHALL allow an Admin to obtain plan, seat, and renewal information via a plain-language request (e.g., "when does our subscription renew"), per Requirement 37.3's dual-mode principle
3. THE Platform SHALL treat a plan change as a structured action requiring an explicit form and explicit confirmation, not a plain-language-driven action — a financial commitment SHALL NOT be executed from a chat command that could be ambiguous about what was actually agreed to; this is a second example of Requirement 37.1's structured-only carve-out, alongside Requirement 15b.5

### Requirement 16: Admin Data Export

**User Story:** As an Admin, I want to export student data for analysis or migration, so that I retain control over school data.

#### Acceptance Criteria

1. THE Platform SHALL allow an Admin to export all Student interaction data in CSV format
2. THE Platform SHALL allow an Admin to export all Student Mastery_State data in CSV format
3. THE Platform SHALL allow an Admin to export Session history in CSV format
4. THE Platform SHALL complete data exports within 60 seconds for datasets containing up to 100 Students

### Requirement 17: Admin Data Deletion

**User Story:** As an Admin, I want to delete student data upon request, so that I comply with data protection regulations and parent requests.

#### Acceptance Criteria

1. THE Platform SHALL allow an Admin to request deletion of all data for a specific Student, via a structured, explicitly-confirmed flow — including when the request originates as a plain-language statement (e.g., "remove this graduated student's account"); a plain-language request that reads as deleting a person's data SHALL be routed to this structured flow rather than executed as a casual access-management action (see Requirement 14a's role-management scope for the boundary)
2. WHEN an Admin requests Student data deletion, THE Platform SHALL permanently delete the Student's Mastery_State, Session history, and interaction logs within 72 hours
3. THE Platform SHALL provide confirmation to the Admin when data deletion is complete
4. THE Platform SHALL retain anonymized aggregated statistics after individual Student data deletion
5. WHEN a school's tenant has more than one Admin account, THE Platform SHALL show whether another Admin currently has the same deletion request or user record open or has recently acted on it, so that shared write access does not produce invisible duplicate or conflicting action

### Requirement 18: Distress Signal Detection

**User Story:** As a Teacher, I want the Platform to alert me immediately if a student shows signs of distress, so that I can intervene appropriately.

#### Acceptance Criteria

1. THE Platform SHALL monitor Student free-text input for Distress_Signals using pattern-based detection, across every surface that accepts free-text input from a Student (including but not limited to practice responses, the Today view, progress requests, and hint requests) — not only a single designated input
2. THE Platform SHALL monitor Student free-text input for Distress_Signals using contextual analysis, across the same surfaces as 18.1
3. WHEN a Distress_Signal is detected, THE Platform SHALL create an immediate Escalation to the Student's Teacher
4. THE Platform SHALL err toward over-triggering rather than under-triggering Distress_Signal detection
5. THE Platform SHALL log all detected Distress_Signals with timestamp and context for Teacher review
6. *Added during the Student Shell deep-completion pass, the user's own proposal.* THE Platform SHALL provide a persistent, always-available way for a Student to directly and explicitly signal they need help, independent of and in addition to the passive detection in 18.1-18.2 — passive detection SHALL NOT be replaced by this, since a Student in genuine distress is frequently the least likely person to proactively self-report in the moment; this AC exists for the Student who is ready to ask directly, not as a substitute for noticing the Student who isn't
6a. WHEN a Student uses this direct signal, THE Platform SHALL create an immediate Escalation through the same mechanism as a detected Distress_Signal (Requirement 19), logged with a distinct detection_method value (`student_initiated`) so a Teacher can tell the two apart when reviewing an Escalation

### Requirement 19: Distress Signal Escalation and Response

**User Story:** As a Teacher, I want to receive real-time alerts when distress signals are detected, so that I can respond quickly and appropriately.

#### Acceptance Criteria

1. WHEN an Escalation is created, THE Platform SHALL send a real-time notification to the Student's Teacher within 5 seconds
2. THE Platform SHALL display Escalation details including the Student's response text and timestamp, reached directly from a notification or briefing item (Requirement 10, Requirement 15) without requiring navigation through a general list
2a. WHEN more than one Teacher or Admin has RLS access to the same Escalation (Requirement 19.3's backup path, or an Admin's oversight access), THE Platform SHALL show whether another staff member has already viewed or acknowledged it, so that shared access does not result in the Escalation being assumed-handled by everyone and actually handled by no one
3. WHEN the primary Teacher has not acknowledged an Escalation within 10 minutes, THE Platform SHALL send a backup Escalation to a designated backup Teacher or Admin
4. THE Platform SHALL never provide counseling or mental health advice to Students
5. THE Platform SHALL display a message to the Student indicating that their Teacher has been notified and will follow up

### Requirement 20: Guardrail Enforcement

**User Story:** As a Teacher, I want the Platform to keep students within defined topic boundaries, so that practice remains aligned with my instructional goals.

#### Acceptance Criteria

1. WHEN a Student is practicing in a Space, THE Platform SHALL only present Practice_Problems for Skills within the Space's configured boundaries
2. IF a Student requests help with a topic outside the Space boundaries, THEN THE Platform SHALL indicate that the topic is outside the current practice scope
3. THE Platform SHALL prevent Students from using the Platform to extract direct answers to homework or test questions
4. WHEN a Student's input suggests answer-seeking behavior, THE Platform SHALL redirect the Student to explain their thinking rather than providing a direct answer

### Requirement 21: Multi-Tenancy by School

**User Story:** As an Admin, I want our school's data isolated from other schools, so that student privacy is protected.

#### Acceptance Criteria

1. THE Platform SHALL isolate Student, Teacher, and Admin data by school
2. THE Platform SHALL prevent Teachers from one school from accessing Student data from another school
3. THE Platform SHALL prevent Admins from one school from accessing data from another school
4. THE Platform SHALL allow the Platform operator to configure billing and feature settings per school
5. THE Platform SHALL grant the Pedagogical_Lead role cross-tenant read and write access to Skill and Misconception content (Requirement 31) as an explicit exception to 21.1–21.3; THE Platform SHALL NOT grant the Pedagogical_Lead role access to any Student, Teacher, Session, or Mastery_State data across or within any tenant — the cross-tenant exception is scoped strictly to curated content, never operational data

### Requirement 22: LLM Provider Abstraction

**User Story:** As a Platform operator, I want to swap LLM providers without rewriting core logic, so that the Platform is not locked into a single vendor.

#### Acceptance Criteria

1. THE Platform SHALL isolate LLM provider API calls behind a provider-agnostic interface
2. THE Platform SHALL allow configuration of LLM provider credentials without code changes
3. THE Platform SHALL support switching LLM providers through configuration changes only

### Requirement 23: Low-End Device Performance

**User Story:** As a Student using a low-end device, I want the Platform to load quickly and respond smoothly, so that I can focus on learning rather than waiting.

#### Acceptance Criteria

1. THE Platform SHALL load the practice interface within 5 seconds on a device with 2GB RAM and a dual-core 1.5GHz processor over a 2Mbps connection
2. THE Platform SHALL respond to Student interactions within 1 second for UI actions that do not require server computation
3. THE Platform SHALL minimize client-side memory usage to remain functional on devices with 2GB RAM

### Requirement 24: POPIA Lawful Processing Basis

*Requirements 24–29 are written for the MVP pilot's South African deployment, where POPIA is the applicable law. As the Platform scales to other markets (Kenya, Nigeria, and others), each will have its own data-protection statute, not POPIA — the architectural pattern established here (lawful basis, data-subject rights, retention limits, breach notification, audit logging) is intended to extend per jurisdiction, not to assume POPIA applies everywhere. The specific legal content of Requirements 24–29 remains South-Africa/POPIA-specific and pending legal counsel review as already noted; this note scopes intent, it does not substitute for jurisdiction-specific legal review when the Platform expands.*

**User Story:** As an Admin, I want to ensure the Platform processes student data lawfully under POPIA, so that the school complies with South African data protection law.

#### Acceptance Criteria

1. THE Platform SHALL process Student personal information only for the purpose of providing adaptive learning services
2. THE Platform SHALL obtain explicit parental consent before processing personal information of Students under 18 years (pending legal counsel review to determine consent mechanism and scope)
3. THE Platform SHALL provide clear information to Parents and Students about what data is collected and how it is used
4. THE Platform SHALL process only the minimum Student personal information necessary to provide adaptive learning services
5. THE Platform SHALL validate all POPIA compliance requirements with qualified POPIA legal counsel before production deployment

### Requirement 25: POPIA Data Subject Rights

**User Story:** As a Parent, I want to access, correct, and delete my child's data, so that I exercise my rights under POPIA.

#### Acceptance Criteria

1. THE Platform SHALL allow Parents to request access to their child's personal information
2. WHEN a Parent requests data access, THE Platform SHALL provide the information within a timeframe compliant with POPIA (pending legal counsel review to determine specific timeframe)
3. THE Platform SHALL allow Parents to request correction of inaccurate personal information
4. THE Platform SHALL allow Parents to request deletion of their child's personal information
5. WHEN a Parent requests data deletion, THE Platform SHALL complete deletion within a timeframe compliant with POPIA (pending legal counsel review to determine specific timeframe) and provide confirmation
6. THE Platform SHALL validate all data subject rights procedures and timelines with qualified POPIA legal counsel before production deployment; identity verification for these requests is governed by Requirement 35

### Requirement 26: POPIA Data Retention and Deletion

**User Story:** As an Admin, I want student data deleted automatically when no longer needed, so that the Platform complies with POPIA data minimization principles.

#### Acceptance Criteria

1. THE Platform SHALL retain Student interaction data, Mastery_State history, and Session logs for the duration of the Student's enrollment plus a retention period compliant with POPIA (pending legal counsel review to determine specific retention period)
2. WHEN the retention period expires, THE Platform SHALL automatically delete or anonymize Student personal information
3. THE Platform SHALL allow immediate data deletion upon request from a Parent or Admin
4. THE Platform SHALL retain anonymized aggregated statistics after individual Student data deletion for product improvement
5. THE Platform SHALL validate data retention periods and deletion procedures with qualified POPIA legal counsel before production deployment

### Requirement 27: POPIA Cross-Border Data Transfer Awareness

**User Story:** As an Admin, I want to understand where student data is stored and processed, so that I can assess cross-border transfer implications under POPIA.

#### Acceptance Criteria

1. THE Platform SHALL disclose to Admins the geographic location of data storage and processing infrastructure
2. WHEN Student personal information is transferred outside South Africa, THE Platform SHALL implement appropriate safeguards as required by POPIA
3. THE Platform SHALL document cross-border data transfer mechanisms for Admin review

### Requirement 28: Data Breach Notification

**User Story:** As an Admin, I want to be notified immediately of any data breach, so that I can fulfill POPIA notification obligations.

#### Acceptance Criteria

1. IF a data breach affecting Student personal information occurs, THEN THE Platform SHALL notify the affected school's Admin within a timeframe compliant with POPIA (pending legal counsel review to determine specific notification timeframe)
2. THE Platform SHALL provide breach details including what data was affected, when the breach occurred, and what mitigation steps have been taken
3. THE Platform SHALL assist Admins in fulfilling POPIA breach notification obligations to the Information Regulator and affected Parents
4. THE Platform SHALL validate breach notification procedures and timelines with qualified POPIA legal counsel before production deployment

### Requirement 29: Logging and Audit Trail

**User Story:** As an Admin, I want a complete audit trail of data access and modifications, so that I can demonstrate POPIA compliance.

#### Acceptance Criteria

1. THE Platform SHALL log all access to Student personal information including timestamp, user, and purpose
2. THE Platform SHALL log all modifications to Student personal information including timestamp, user, and changed fields
3. THE Platform SHALL retain audit logs for at least 2 years
4. THE Platform SHALL allow Admins to export audit logs for compliance review

### Requirement 30: Session State Recovery

**User Story:** As a Student whose connection drops mid-session, I want to resume exactly where I left off, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN a Student's Session is interrupted by connectivity loss or browser closure, THE Platform SHALL save the Session state including current Practice_Problem and responses
2. WHEN a Student returns to the Platform, THE Platform SHALL offer to resume the interrupted Session
3. THE Platform SHALL restore the exact Practice_Problem and Student responses from the interrupted Session
4. THE Platform SHALL expire saved Session states after 24 hours

### Requirement 31: Subject-Agnostic Evaluation and AI-Assisted Content Authoring

**User Story:** As a Teacher or Pedagogical_Lead, I want to author adaptive learning content for any subject, not just mathematics, so that the Platform can scale to new subjects without being redesigned each time.

#### Acceptance Criteria

1. THE Platform SHALL support a configurable Evaluation_Strategy per Skill, including at minimum exact-match/symbolic-equivalence and rubric-based LLM evaluation
2. WHEN a Skill's Evaluation_Strategy is rubric-based, THE Platform SHALL grade Student responses against a teacher-defined rubric rather than requiring a single correct answer
3. THE Platform SHALL support semantic (LLM-based) Misconception pattern matching as the default detection mechanism for any Skill that does not use symbolic or regex matching
4. WHEN a Teacher or Pedagogical_Lead provides a plain-language description of a new subject or unit, THE Platform SHALL generate a draft Skill_Graph and draft Misconception_Taxonomy for review
5. THE Platform SHALL NOT present AI-proposed Skill_Graph or Misconception_Taxonomy content to Students until it has reached Content_Status "validated"
6. THE Platform SHALL track Content_Status for each Skill and Misconception as one of "draft" (AI-proposed, not yet reviewed by a human), "pending_approval" (reviewed and edited by a Teacher or Pedagogical_Lead, awaiting final sign-off from the content owner), or "validated" (signed off and live)
7. THE Platform SHALL NOT serve content with Content_Status "draft" or "pending_approval" to Students under any circumstance
8. THE Platform SHALL promote content from "pending_approval" to "validated" only via explicit sign-off from the content owner (the Teacher for Space-level content, the Pedagogical_Lead for platform-level content); promotion SHALL NOT occur automatically or based on accumulated Student interaction volume
8a. THE Platform SHALL allow the content owner to reject a "pending_approval" item and return it to "draft" with specific written feedback describing what needs to change, rather than only supporting approval
8b. WHEN a Pedagogical_Lead edits a Skill or Misconception with Content_Status "validated" that has active Student usage, THE Platform SHALL require an explicit, distinct confirmation before applying the edit, separate from the confirmation used for authoring new content — editing live content SHALL NOT silently change its Content_Status or otherwise disrupt Students currently using it. *(Note: the complete fix for this likely requires a content-versioning mechanism in design.md — an edit producing a new pending version while Students continue on the current validated version — which is a schema question beyond what this requirement alone can resolve; this AC establishes the minimum interaction-level safeguard.)*
8c. WHEN a school's tenant has more than one Pedagogical_Lead account, THE Platform SHALL show whether another Pedagogical_Lead currently has the same "pending_approval" item open or has recently acted on it
9. THE Platform SHALL allow a Teacher to edit, merge, split, or remove AI-proposed Skills or Misconceptions before approval
10. WHEN a Skill's Evaluation_Strategy is rubric_llm, THE Platform SHALL display per-criterion feedback to the Student rather than a single binary correct/incorrect result

### Requirement 31a: Pedagogical_Lead Entry, Briefing, and Cross-Tenant Awareness

**User Story:** As a Pedagogical_Lead, I want to open the Platform and immediately see what content needs my attention across every school, so that I don't have to check each tenant separately.

#### Acceptance Criteria

1. WHEN a Pedagogical_Lead opens the Platform, THE Platform SHALL present a synthesized, content-scoped briefing (e.g., items awaiting review, Skills with thin content coverage, a Misconception pattern recurring across multiple schools) — this briefing SHALL NOT reference individual Students, Teachers, or schools by name in any operational sense, consistent with Requirement 21.5's boundary
2. THE briefing and related views SHALL aggregate across every school on the Platform by default, with drill-down into a specific Skill, Misconception, or school's flagged item available
3. WHEN a Pedagogical_Lead taps or otherwise selects a briefing item, THE Platform SHALL navigate directly to the specific record or action the item concerns (Requirement 4.9's curation flow, Requirement 31's authoring flow, or Requirement 31's validation flow, as applicable)
4. THE briefing SHALL express review-backlog age using an aging threshold (e.g., items pending longer than a defined interval) rather than a raw count alone. *(Note: the specific threshold is a policy decision, not established by this requirement — no review-turnaround service-level target currently exists for "pending_approval" content and one should be set before this AC is fully implementable.)*
5. WHEN the Platform has no curated content yet, THE Platform SHALL present the content-authoring flow (Requirement 31.4) instead of an empty briefing
6. WHEN a Pedagogical_Lead has no items needing attention, THE Platform SHALL present an honest state indicating nothing is currently pending
7. Because this role's cross-tenant visibility is limited to curated content (Requirement 21.5), THE Platform MAY surface a content-level pattern spanning multiple schools (e.g., a Misconception appearing in several tenants), but SHALL NOT present any comparison of schools, Teachers, or Students against each other, since this role has no access to the operational data such a comparison would require

### Requirement 32: AI-Native Content Experience

**User Story:** As a Student or Teacher, I want school content reorganized into a clear, skill-based structure instead of a messy file list, so that navigating and understanding course material is easier.

#### Acceptance Criteria

1. THE Platform SHALL present Skills to Students organized by learning progression (Skill_Graph order) rather than by upload date or file order
2. THE Platform SHALL display, for each Skill, a synthesized summary alongside a visible reference to the original source material it was derived from
3. THE Platform SHALL NOT alter, delete, or replace original source material when generating a synthesized summary
4. WHEN a Teacher views a Space, THE Platform SHALL display a per-Skill content coverage indicator (rich, thin, or gap), aggregated from the coverage status of the Space's included Skills
5. THE Platform SHALL allow a Student to ask a free-text question, scoped to Skills within their current Space boundary, consistent with Requirement 20's guardrail enforcement
6. THE Platform SHALL display Content_Status ("draft," "pending_approval," or "validated") to Teachers, Pedagogical_Leads, and Admins, and SHALL NOT display Content_Status to Students
7. *Added during the Student Shell deep-completion pass.* WHEN a Student's free-text question, on any surface covered by 32.5 or the practice session's ask-a-question, is a direct request for the answer to a specific Practice_Problem rather than a request for understanding, THE Platform SHALL redirect toward explaining their own thinking so far, rather than supplying the answer directly
7. THE Platform SHALL provide the Pedagogical_Lead a platform-wide, cross-tenant view aggregating per-Skill coverage across all schools, to help prioritize content-authoring effort where it is most needed

### Requirement 33: LMS Content Ingestion and Structuring

**User Story:** As a Teacher or Pedagogical_Lead, I want the Platform to use content I've already created in our LMS, so that I don't have to re-author material from scratch.

#### Acceptance Criteria

1. THE Platform SHALL support ingesting text-based course content (pages, PDFs, Word documents) from a connected LMS, subject to explicit school authorization of the required read scope
2. THE Platform SHALL support ingesting image-based content (diagrams, scanned materials) via OCR and visual description
3. THE Platform SHALL preserve a traceable reference from any ingested content to its original source location
4. THE Platform SHALL NOT modify or delete original source content during ingestion
5. WHEN ingested content for a Skill is sparse or absent, THE Platform SHALL fall back to the plain-language-description authoring flow defined in Requirement 31.4
6. Video content ingestion is explicitly out of scope for this MVP and SHALL be treated as a future enhancement

### Requirement 34: Adaptive Instruction

**User Story:** As a Student, I want my first exposure to a new concept to build on what I already know and be explained in a way likely to make sense to me, so that I understand it the first time, not just after repeated practice failures.

#### Acceptance Criteria

1. WHEN a Student encounters a Skill for the first time, THE Platform SHALL check the Student's Mastery_State for that Skill's direct prerequisites before presenting instruction
2. IF a prerequisite's Mastery_State is struggling, tentative, stale, or unassessed, THEN THE Platform SHALL present a brief bridging explanation as part of the new Skill's instruction, rather than a separate remediation Session *(added "struggling" — found missing while tracing this AC against a Student's actual data: struggling is, if anything, the clearest case for needing a bridge, and its absence meant a Student actively struggling on a direct prerequisite would get no bridging at all while one merely "tentative" would)*
3. THE Platform SHALL maintain a fixed, platform-level library of pedagogical explanation strategies ("Lenses"), authored once and reused across all Skills and subjects
4. THE Platform SHALL select a default Lens for a Skill's initial instruction based on the Skill's skill_type
5. WHEN a Student's first practice attempt after initial instruction is incorrect, THE Platform SHALL select a different Lens than the one used for initial instruction, using a fixed platform-level switching policy
6. THE Platform SHALL NOT require per-Skill authored explanation variants; Lens content SHALL be generated at runtime from the Skill's base description and the selected Lens template
7. THE Platform SHALL NOT require or prompt a Student to select or indicate a preferred teaching style at any point
8. THE Platform SHALL track Content_Status for generated Lens-delivered explanation content using the same three-stage model and promotion mechanism as other AI-proposed content, and SHALL NOT serve it to a Student until it reaches "validated"

### Requirement 35: Parent Identity Verification and Data Rights Access

**User Story:** As a Parent, I want to securely verify my identity before accessing, correcting, or deleting my child's data, so that only I, and not anyone claiming to be me, can exercise these rights.

#### Acceptance Criteria

1. THE Platform SHALL maintain a record of registered Guardian contacts per Student, provided by the school
2. WHEN a Parent submits a data access, correction, or deletion request, THE Platform SHALL send a verification token to the contact channel already on file for a matching registered Guardian, not to a contact value the requester provides freely
2a. THE Platform SHALL NOT disclose whether a submitted contact value matches a registered Guardian record to a requester whose information does not match; the requester-facing response SHALL be indistinguishable between a genuine non-match and a token having been sent
3. THE Platform SHALL NOT process a data rights request until the verification token is confirmed
4. THE Platform SHALL NOT create a persistent Parent user account; verified access SHALL be scoped to the single request session
5. WHEN a Student has multiple registered Guardians, THE Platform SHALL notify the school's Admin of any data rights request for Admin awareness, without blocking the verified Guardian's request

### Requirement 36: LMS Read/Write Integration

**User Story:** As a Teacher, I want to read my LMS's rosters and assignments and write grades back to it from within Escolent, so that I don't have to maintain the same information in two places.

#### Acceptance Criteria

1. THE Platform SHALL read roster, assignment, and due-date data from the connected LMS, subject to the integration authorized per Requirement 15b.4
2. THE Platform SHALL write Student scores and grades earned through Escolent's adaptive practice back to the connected LMS's gradebook
3. Requirements 36.1 and 36.2 constitute Phase 1 of LMS read/write integration and SHALL be available at MVP launch
4. THE Platform MAY support posting an assignment or announcement originated in Escolent back to the source LMS as a Phase 2 capability; this is not required for MVP launch
5. THE Platform MAY support fuller content authoring and management from within Escolent, pushed back to the source LMS, as a Phase 3 capability; this is not required for MVP launch and depends on platform-specific API capabilities that vary by LMS
6. Phase 2 and Phase 3 capabilities introduce the possibility of content being edited in Escolent and independently edited in the source LMS at the same time; THE Platform SHALL NOT ship Phase 2 without a defined conflict-resolution mechanism for this case. *(Note: that mechanism is not specified by this requirement and remains an open design question — flagged so it is not silently skipped.)*
7. Read/write capability per Requirement 36.1–36.2 SHALL be scoped by what the connected LMS's authorized integration actually permits (e.g., a Moodle deployment where the school's Moodle admin has not enabled a given web-service function); THE Platform SHALL NOT present a read or write action to a Teacher that the underlying LMS integration cannot actually perform

### Requirement 37: Conversational Operability of Structured Actions

**User Story:** As any Platform user, I want to accomplish structured tasks by typing or speaking a plain-language request instead of always navigating a form or menu, so that the Platform doesn't force navigation for things I could just say.

#### Acceptance Criteria

1. THE Platform SHALL allow a plain-language request to accomplish the same outcome as the equivalent structured navigation or action, for every structured view in the Platform, except where a specific requirement elsewhere in this document states that an action must remain structured-only (e.g., Requirement 15b.5's LMS integration setup, Requirement 15c.3's plan changes)
2. THE Platform SHALL treat a task as genuinely conversational (dialogue-first) only where the task is inherently dialogic (tutoring, remediation, open-ended creation); THE Platform SHALL keep a task structured (visual-first) where the task is inherently spatial, comparative, or a scanning task (e.g., editing Skill_Graph topology, comparing many data points), and using a conversational interaction for such a task SHALL NOT be treated as more "AI-native" merely because it is conversational
3. WHERE it is genuinely unclear whether a piece of information is better presented visually or answered directly, THE Platform SHALL support both, rather than choosing one
4. WHEN a plain-language request goes beyond what the Platform can ground in actual data, THE Platform SHALL respond with an honest statement that it cannot answer from available data, rather than generating a plausible-sounding but ungrounded answer; this applies to every AI-synthesized answer in the Platform (dashboard queries, briefings, and structured-action requests alike), not only the specific instances named elsewhere in this document
5. WHEN a plain-language request would change a record (data-changing, not merely informational), THE Platform SHALL treat an ambiguous request as a request for clarification, not as a best-effort guess to execute — this is a distinct requirement from 37.4: insufficient specificity, not insufficient data
6. THE Platform SHALL log a data-changing action identically in the audit trail regardless of whether it originated as a structured action or a plain-language request
7. WHERE more than one Platform user holds shared write access to the same record (e.g., multiple Teachers on a shared Escalation, multiple Admins at one school, multiple Pedagogical_Leads on the same pending content item), THE Platform SHALL show whether another such user currently has that record open or has recently acted on it — not to restrict who may act, but so that shared authority does not produce invisible duplicate or conflicting action
8. Requirements 18, 19, and 20 (distress signal detection, escalation, and guardrail enforcement) apply identically regardless of whether a Student's input arrives through a structured action or a plain-language request; conversational operability SHALL NOT create a path around a safety or guardrail requirement that a structured interaction would not have
