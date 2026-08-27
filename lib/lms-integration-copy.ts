/**
 * Static instructional copy for LMS setup — Req 15b.5.
 *
 * Hand-written, reviewed text only. No AI generation, no plain-language assist,
 * no chat entry anywhere in the credential flow.
 */

import type { LmsType } from "@/lib/lms-integration-store";

export const LMS_SETUP_INTRO =
  "Authorize how Escolent reads roster and assignment data from your school's LMS, and writes earned grades back. This is a structured credential flow — there is no plain-language setup option.";

export const LMS_MVP_SCOPE_LINES = [
  "Read roster enrollment",
  "Read assignments and due dates",
  "Write Escolent-earned grades back to the gradebook",
] as const;

export const LMS_PHASE_EXCLUDED =
  "Posting new assignments or course content back to the LMS is not part of MVP (Requirements 36.4/36.5) and does not appear here.";

export const LMS_PROVIDER_INSTRUCTIONS: Record<
  LmsType,
  { heading: string; steps: string[]; fieldNote?: string }
> = {
  canvas: {
    heading: "Canvas developer key",
    steps: [
      "In Canvas, open Admin → Developer Keys → + Developer Key → API Key.",
      "Set Redirect URI to your Escolent tenant URL and copy the Developer Key ID and secret.",
      "Paste the developer key below and confirm your Canvas instance URL (e.g. yourschool.instructure.com).",
      "Escolent uses this key server-side only — Teachers never see the credential.",
    ],
    fieldNote:
      "This demo tenant already reads Canvas due dates (e.g. “Ecosystems Unit Quiz” on Student Today). You are managing an existing connection, not starting from zero.",
  },
  moodle: {
    heading: "Moodle web services",
    steps: [
      "Your Moodle administrator enables web services and creates a dedicated service user.",
      "Enable only the functions Escolent needs for MVP read/write (listed below).",
      "Generate a web-service token for that user and paste it with your Moodle site URL.",
      "Escolent stores the token server-side; Teachers receive synced data through adapters, not the token itself.",
    ],
  },
  google_classroom: {
    heading: "Google Workspace domain authorization",
    steps: [
      "Google Classroom uses domain-level OAuth — a Workspace super admin approves Escolent for the whole domain.",
      "When you continue, Escolent sends you to Google's own authorization screen (not a text field on this page).",
      "After Google confirms domain consent, Escolent stores a refresh token server-side and begins roster and coursework sync.",
      "Teachers never handle OAuth tokens directly.",
    ],
    fieldNote:
      "There is no token text box here by design — the mechanism is genuinely different from Canvas or Moodle.",
  },
};

export const LMS_GOOGLE_OAUTH_NOTE =
  "Would redirect to Google Workspace to approve domain-wide access. OAuth happens on Google's screen, not in Escolent.";
