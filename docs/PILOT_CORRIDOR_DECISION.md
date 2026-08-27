# Pilot-Corridor Decision Record

**Decision state:** Proposed — no live routing enablement approved  
**Decision date:** 27 August 2026

## Decision

Sakay proposes **MRT-3 North Avenue ↔ Taft Avenue** as the initial supported schedule-only corridor. The product must display the support boundary and must preserve the existing unavailable state until the approvals in `PILOT_DATA_GOVERNANCE.md` are complete.

## Rationale

The corridor is sufficiently bounded for targeted source validation, golden-route review, operational monitoring, and mobile usability testing. It also permits a meaningful direct-journey and walking-access pilot without claiming coverage across Metro Manila. This is a scope decision, not confirmation that current fixture data, a third-party GitHub feed, or public map content is authorized for production routing.

## Approval record

| Role | Decision required | Status | Evidence location |
|---|---|---|---|
| Product owner | Approve rider audience, corridor boundary, and launch wording | Pending | Add signed decision or issue link here |
| Transit-data owner | Approve authoritative schedule source, rights, update cadence, and route accuracy | Pending | Add source manifest and approval ID here |
| Data engineer | Approve validation report, graph build, checksum, and golden routes | Pending | Add graph release record here |
| Accessibility reviewer | Approve all accessibility claims or mark coverage unknown | Pending | Add review record here |
| Operations owner | Approve deployment, monitoring, rollback, and incident ownership | Pending | Add operational-readiness record here |

## Current rider-facing requirement

Until all approvals are complete, the app must state that live journey guidance is unavailable. It may expose clearly labeled demo fixtures only in explicit demo mode, never as a production travel recommendation.
