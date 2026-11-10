# CAMPUS MEMORY — Planning Document

| Field | Value |
|---|---|
| **Project title** | CAMPUS MEMORY — Temporal Campus Event-Provenance Database |
| **Course** | Database Systems — 24CS520 |
| **Document** | `CAMPUS_MEMORY_Planning_Document_v0.2.md` (1 of 3 coordinated documents) |
| **Version / status** | v0.2 — DRAFT, revised after document review. Academic items remain **unverified** against the official guideline. |
| **Planning date** | 1 November 2026 (v0.1 used 18 October 2026) |
| **Team size** | 4 members |
| **Selected stack** | React frontend → Python/FastAPI backend → PostgreSQL hosted on Supabase; Git + GitHub |

> **Provisional document.** The official Project Overview and the official 24CS520 guideline were not available when v0.1 or v0.2 was written (Section 1.7). Anything marked "Unverified — confirm against the official guideline." must not be presented as an official requirement.

---

## 0. How to Read This Document (Legend)

Every statement carries one of these tags (or is plainly a design description under a clearly labelled heading).

| Tag | Meaning |
|---|---|
| **[C] Confirmed team decision** | A decision the team has made for its own project (concept, selected stack, team size, roles). Confirmed *by the team*, not by faculty. |
| **[P] Supplied information** | Information given in the team's original prompt, in v0.1, or in the requirement summary reproduced in the v0.2 revision brief. Not independently checked. |
| **[A] Planning assumption** | A choice made in this document to make the plan workable. Can be changed freely. |
| **[D] Pending decision** | An open question needing a team or faculty answer (collected in Section 19). |
| **[U] Unverified academic item** | Written as: **"Unverified — confirm against the official guideline."** Applies to every academic requirement, date, deliverable, format and phase allocation not yet checked against the official 24CS520 document. |

Identifier prefixes: FR = functional requirement · NFR = non-functional requirement · PO/SO/AO = objectives · F = feature · A = academic compliance item · TG/SP = proposed database trigger/procedure design · CU = conflict or uncertainty · D = pending decision · R = risk · M = milestone. Identifiers are stable: v0.2 does **not** renumber anything from v0.1; new items continue the existing sequences.

---

## 1. Document Overview

### 1.1 Purpose
This document is the planning baseline for CAMPUS MEMORY: why it is being built, what is in and out of scope, the requirements, the technology stack, the academic compliance tracker, the remaining-work roadmap, team roles, data strategy, testing strategy, risks and open decisions. It feeds the Architecture Document and the Database Schema Document.

### 1.2 Intended audience
The four team members, the project guide or faculty reviewer, and anyone joining the team later.

### 1.3 Scope of this document
Planning only. It contains **no SQL scripts, no application code, no full architecture and no full schema design**. Where database objects are described (Section 8.8), they are *proposed designs* in prose, to be finalized in the Database Schema Document.

| Future document | Must cover (not duplicated here) |
|---|---|
| **Architecture Document** | Component diagram; React ↔ FastAPI ↔ Supabase PostgreSQL interaction; API contract; authentication and authorization design; database connection method; security boundaries and secret handling; local and hosted deployment; architectural decision records. |
| **Database Schema Document** | Entities and attributes; PostgreSQL data types; keys; constraints; relationships and cardinalities; normalization; temporal and history design; indexes; trigger, procedure and view specifications; SQL implementation details; final table names. |

### 1.4 Version and status
v0.2 DRAFT. It becomes v0.3 once the official documents have been checked (Section 21).

### 1.5 Revision History

| Version | Date | Summary |
|---|---|---|
| v0.1 | 18 Oct 2026 | Original provisional planning draft, written from the team's prompt only. |
| v0.2 | 1 Nov 2026 | Revised after document review. Official guideline verification still pending where applicable. |

**What v0.2 changed (concise):**
- **Timeline:** planning date moved to 1 Nov 2026; v0.1's dated roadmap (18 Oct–4 Nov) is superseded; a project-status table and a dependency-based roadmap replace it; faculty deadlines and internal targets are separated (Section 13).
- **Compliance matrix:** relational algebra queries, the Phase 1 report structure and the report formatting rules added; state diagram provisionally moved to Phase 1; completion-status column added (Section 11).
- **Requirement fixes:** event-update traceability vs status history (FR-005, FR-033, FR-050); evidence enforcement (FR-012, FR-047, FR-048); impact counting (FR-025, FR-049); time-order warning (FR-014).
- **Database objects:** two triggers (TG-1, TG-2) and two stored procedures (SP-1, SP-2) now have proposed responsibilities (Section 8.8).
- **Terminology:** "Campus Event" is the general concept; "incident" is defined as a technical subset (Section 5.4).
- **Roadmap/team:** R4's preparation work versus full frontend implementation clarified (Sections 13.6, 14).
- **New items:** CU-11 to CU-14, NFR-020, FR-047 to FR-050, D-15 to D-22, R-16 to R-19, A-26 to A-28.

### 1.6 Source documents

| # | Document | Availability |
|---|---|---|
| 1 | CAMPUS MEMORY Project Overview (team's original) | **Not available** (workspace checked 1 Nov 2026) |
| 2 | Official 24CS520 DBMS Mini Project Guidelines | **Not available** (workspace checked 1 Nov 2026) |
| 3 | Team's original prompt, including its requirement summaries | Available — **[P]**, unchecked |
| 4 | v0.1 of this planning document | Available |
| 5 | v0.2 revision brief, including the requirement summary for the Phase 1 report structure, report formatting and phase allocation | Available — **[P]**, unchecked |

### 1.7 Source Validation (Important)

> **The original CAMPUS MEMORY Project Overview and the official 24CS520 DBMS Mini Project Guidelines were unavailable when this document was drafted and could not be independently checked.** On 1 November 2026 the workspace was searched again; only items 3–5 above were present. All project concepts and academic requirements in this document come from those items. No faculty instruction, approval, deadline, mark, form category or submission rule has been added beyond what they state.

Consequences:
- The compliance matrix (Section 11) reflects the team's *summary* of the guideline, not the guideline itself. It may be incomplete or differ in detail.
- Details the summaries do not give (form categories, report formats beyond Section 11.3–11.4, marks, submission format, Phase 2 report content) are marked **unknown**, not guessed.
- The cross-check between the Project Overview and the guideline requested in the original brief **could not be performed**.

### 1.8 Conflicts, Uncertainties and Assumptions

| ID | Issue | Why it matters | Handling in this plan |
|---|---|---|---|
| CU-01 | **PostgreSQL/Supabase is not in the guideline summary's DBMS list** (Oracle, MySQL, MongoDB). | Rejection or forced migration. | Preferred stack requiring faculty confirmation; compliance not claimed. Section 10.7, D-01. |
| CU-02 | **Timeline mismatch.** v0.1 targeted 4–5 weeks. As of 1 Nov, the described Phase 2 window ("first week of November 2026") begins this week. | The 4–5 week target no longer fits if the window holds. | v0.1's internal dates superseded; dependency-based roadmap and scope triage (Section 13). |
| CU-03 | **Phase 1 window has passed by calendar.** "Third week of October 2026" is the description in the summary; v0.1 flagged it as ambiguous. | Whether Phase 1 was demonstrated, and with what outcome, is unknown. | Section 13.3 confirmations; A-23. |
| CU-04 | The summary requires five forms "covering the required form categories" but **does not list the categories**. | Forms might not satisfy the rubric. | Categories treated as unknown; the five proposed project forms (Section 8.7) are kept separate from official categories. |
| CU-05 | **Phase allocation.** The summary places ER, schema and state diagrams in Phase 1 System Design; v0.1 placed the state diagram in Phase 2. The summary does not say which other requirements belong to which phase. | Phase 1 scope could be wrong. | State diagram provisionally Phase 1 (A-21); all other allocations are **[A]** proposals. |
| CU-06 | Format and content of the "two generated reports" are not specified. | Reports could be rejected. | Planned as application reports (FR-038, FR-039); format D-12, D-20. |
| CU-07 | Triggers and stored procedures must run in the database. PostgreSQL implements triggers with trigger functions and procedures with `CREATE PROCEDURE` and `CALL`; Oracle PL/SQL differs. | Faculty may expect other syntax. | Implemented only as database objects, never as Python substitutes; flagged for confirmation. |
| CU-08 | Set operations: PostgreSQL uses `UNION`, `INTERSECT`, `EXCEPT`; Oracle uses `MINUS` instead of `EXCEPT`. | Syntax acceptance. | Flagged (NFR-019). |
| CU-09 | Whether recursive queries (needed for root-cause and blast-radius) are acceptable is unknown. | They are central to the concept. | Treated as additional to, not a replacement for, the listed query categories. |
| CU-10 | Exact Phase 1 deliverables are not stated. | Risk of missing a Phase 1 item. | Section 13 uses **[A]** allocations; correct after verification. |
| CU-11 | **"Two reports" is ambiguous.** v0.1 assumed two *application-generated* reports. The summary also describes an academic *Phase 1 report document*; whether Phase 2 has its own report document is not stated. | Wrong interpretation wastes effort or leaves a gap. | Both tracked: A-18 (application reports) and A-27 (Phase 1 report document). D-20. |
| CU-12 | **Relational algebra queries** were missing from v0.1's matrix. Their count, scope and expected notation are unknown. | Missing item in the Phase 1 report. | Added as A-26; SQL queries are **not** assumed to satisfy it. D-21. |
| CU-13 | Phase 1 report structure and formatting come from the summary only. "Blue outer title sheet", certificate content and the LaTeX template are not described further; the DBMS introduction depends on which DBMS is approved. | Report could be non-compliant. | Sections 11.3–11.4; D-20. |
| CU-14 | **Progress since 18 Oct is unknown** to this document. | The roadmap must not assume work is done or not done. | All completion statuses "Team confirmation required" except where information supports otherwise (Section 13.2). |

---

## 2. Executive Summary

CAMPUS MEMORY **[C]** is a database system that remembers *what happened on campus, why it happened, what it affected, and how the record changed over time*.

Campus problems are usually recorded in isolation: a power failure in one log, a network outage in another, a cancelled lab session in a timetable change. Nobody can easily see that they are one chain. CAMPUS MEMORY records each **Campus Event**, links events that evidence suggests are connected, and answers four questions:

1. **Root cause** — looking backward from an event, which recorded events led to it?
2. **Blast radius** — looking forward from an event, what did it affect?
3. **Time** — what was recorded as true at a given moment?
4. **Provenance** — what evidence and confidence support each claimed link?

It is deliberately **not** a plain ticketing (CRUD) system. Its value is in the *relationships and history* between events, and in refusing to treat "happened close together" as proof of causation.

**Where this document stands (1 Nov 2026).** It is the working planning baseline for the four-member team, built from v0.1 and the team's requirement summary because the official documents are unavailable. v0.2 fixes the inconsistencies found in v0.1: it separates status history from general audit history, defines how the database enforces the evidence rule, fixes a counting rule for impacts, selects the responsibilities of the two triggers and two stored procedures, adds the relational algebra and Phase 1 report requirements, and replaces the October schedule with a status check and a dependency-based roadmap. The expected result is a React web application backed by FastAPI and Supabase-hosted PostgreSQL that meets the course's DBMS requirements (**Unverified — confirm against the official guideline.**) and demonstrates the four capabilities on a clearly labelled dataset. How far the team has already progressed is **not known** to this document and must be confirmed (Section 13.3).

---

## 3. Problem Statement

**Current situation.** Campus events (power cuts, network outages, equipment failures, lab cancellations, exam disruptions, classroom problems) are typically recorded in different places by different people, often as free text, and rarely connected.

**Problems this causes:**
- **Hidden root causes.** A cancelled lab session is recorded as "lab cancelled"; the failing UPS behind it is never connected to it.
- **Unknown consequences.** After a failure, nobody can easily list everything it disrupted.
- **Repeated failures.** The same asset or location fails again and again, but the pattern is invisible because each record stands alone.
- **Lost history.** Statuses and corrections get overwritten, so it is hard to reconstruct what was known at a particular time.
- **Unreliable inferences.** Without evidence and confidence, people either assume connections that are not real or ignore real ones.

**The gap.** No structured record links events by evidence-backed cause and effect, keeps a history of how records changed, and supports backward and forward investigation across technical and non-technical events. CAMPUS MEMORY addresses this at student-project scale.

---

## 4. Project Objectives

### 4.1 Primary objectives
| ID | Objective | Verification |
|---|---|---|
| PO-1 | Record Campus Events of technical, infrastructure, academic and operational categories in one registry. | Events of all four categories can be created and retrieved. |
| PO-2 | Record directed cause→effect relationships with status (confirmed / suspected / rejected-unrelated), confidence and evidence. | A relationship cannot be confirmed without evidence (enforced by the database). |
| PO-3 | Provide root-cause investigation: list recorded upstream events for any event. | The worked example (UPS → switch → lab network → cancelled session) returns the correct chain. |
| PO-4 | Provide blast-radius analysis: list downstream events and total recorded impact, counting each event and impact once under the rule in Section 8.4.1. | A diamond-shaped test graph does not double-count. |
| PO-5 | Keep an automatic status history for events. | Creating an event and every status change each produce exactly one history row; unchanged status produces none. |
| PO-6 | Support time-based investigation ("as of" a chosen time). | Query for a chosen time returns the expected states on test data. |

### 4.2 Secondary objectives
| ID | Objective |
|---|---|
| SO-1 | Provide a dashboard with summary cards and charts. |
| SO-2 | Identify assets and locations with recurring problems. |
| SO-3 | Provide search and filtering by category, type, status, severity, location, date range and keyword. |
| SO-4 | Provide two generated reports (FR-038, FR-039; interpretation pending, CU-11). |
| SO-5 | Provide role-based access so users see only what their role allows. |

### 4.3 Academic and DBMS learning objectives
**[P] — Unverified — confirm against the official guideline.**
| ID | Objective |
|---|---|
| AO-1 | Design a relational schema with at least six tables, keys, and at least five attributes per table. |
| AO-2 | Write simple, nested, correlated, set-operation, GROUP BY / HAVING, pattern-matching, aggregate, EXISTS and NOT EXISTS queries (counts in Section 11). |
| AO-3 | Create views, triggers and stored procedures **inside the database**. |
| AO-4 | Build a frontend with the required forms and two reports. |
| AO-5 | Produce ER, schema and state diagrams, plus testing and documentation. |
| AO-6 *(team's own)* | Apply recursive SQL, constraints and history tracking to a real modelling problem. |
| AO-7 | Express the required queries in relational algebra where the report requires it (A-26). |
| AO-8 | Produce the Phase 1 report in the required structure and format (A-27, A-28). |

---

## 5. Project Scope

### 5.1 In Scope
- Campus Event recording (technical, infrastructure, academic, operational) with categories, types, severity, location/asset and times
- Scheduled-activity records (e.g., lab sessions) that events can affect
- Event-to-event relationships with status, confidence and evidence
- Root-cause exploration (backward traversal)
- Blast-radius analysis (forward traversal) with impact aggregation
- Temporal and historical investigation
- Event status history (automatic) and last-modified traceability for other changes
- Impact recording (estimated vs verified)
- Search, filtering, dashboard and reports
- Role-based access (scope depth is a pending decision, D-05)

### 5.2 Out of Scope
- Enterprise-scale monitoring or real-time telemetry ingestion
- Integration with any existing campus system (timetable, ERP, network monitoring tools)
- Automatic or machine-learning causal inference — every causal link is entered or confirmed by a human
- Notifications, email/SMS alerting, mobile applications
- High-availability, load-balanced or multi-region deployment
- Campus single sign-on or identity federation
- Predictive maintenance or forecasting
- Field-level audit of every event edit — *not in v1 unless D-15 decides otherwise* (FR-050)

### 5.3 Scope Boundaries (Definitions)
| Term | Definition used in this project |
|---|---|
| **Technical incident** | A Campus Event involving a technical fault: equipment failure, UPS failure, network switch failure, Wi-Fi outage, power failure (category technical or infrastructure). |
| **Academic / operational event** | A Campus Event with no technical fault of its own that affects teaching or operations: lab cancellation, exam disruption, classroom unavailability, schedule change. Can be a *cause* as well as an *effect*. |
| **Causal relationship** | A directed link "event A contributed to event B", with a status: **confirmed** (supported by evidence), **suspected** (plausible, not proven), or **rejected/unrelated** (investigated and found unconnected). Closeness in time alone never creates a confirmed link. |
| **Impact / consequence** | A recorded effect of an event on something: affected students, lost lab hours, disrupted sessions, equipment downtime. Stored separately from the relationship; belongs to exactly one event; may be *verified* or *estimated*. |
| **Scheduled activity** | A planned item (such as a lab session) with a planned time. Events (such as a cancellation) *reference* it; it is not itself an event. |

The scope supports technical and non-technical events: a technical failure may cause an academic event, and an academic or operational event may in turn cause further events.

### 5.4 Terminology and Naming Convention (new in v0.2)

v0.1 used "event" and "incident" interchangeably. From v0.2:

| Term | Meaning |
|---|---|
| **Campus Event** (short form: "event") | The general concept and the **only record type** for things that happened: every category (technical, infrastructure, academic, operational). Used in all explanations. |
| **Incident** | A **technical subset**: a Campus Event whose category is technical or infrastructure (see "Technical incident", Section 5.3). It is **not** a separate record type or table, and academic/operational events are not called incidents. |
| **Event relationship** | A directed cause→effect link between two Campus Events. |
| **Event status history** | The automatic record of a Campus Event's status changes (including its initial status). |
| **Impact** | A recorded consequence attached to exactly one Campus Event. |
| **Evidence** | A source or proof item attached to a relationship (optionally an event). |
| **Scheduled activity** | A planned activity that events can reference; not an event. |

**Database naming convention (proposed, final names in the Schema Document):** snake_case, singular table names; the logical entity "Campus Event" maps to a table named `campus_event`; other tables follow the same pattern (e.g., event relationship, event status history). Technical sections of this document use "Campus Event" and the terms above consistently.

**Renamed wording from v0.1 (titles only; no identifier changed):**

| v0.1 wording | v0.2 wording |
|---|---|
| Incident Status History (F6) | Event Status History |
| Incident reporter / Incident investigator | Event reporter / Event investigator |
| Incident Investigation Report (FR-039) | Event Investigation Report |
| "register an incident" / "close an incident" | register event (SP-1) / close event (SP-2) |

The user-facing label "Incident/Event Status History" from the project brief is retained as an alias of F6.

---

## 6. Users and Stakeholders

Roles are **[A]** proposals; the final role model is D-05. No role other than administrator has broad access.

| Role | Responsibilities | Permitted high-level activities | Not permitted |
|---|---|---|---|
| **System administrator** | Maintains reference data and user accounts; guards data quality. | Manage users and roles, reference data (categories, types, locations/assets); view everything; close or void events. | Silently altering history. |
| **Event reporter (staff member)** | Reports events they observe. | Create events; view and update *their own* events while open; add basic details. | Confirm causal links; edit others' events; close events; see admin screens. |
| **Event investigator** | Establishes causes and impacts. | Create and modify relationships; attach evidence; set relationship status and confidence (including downgrades with a reason); record impacts; run root-cause and blast-radius tools; change event status; close events. | Manage users. |
| **Department / campus decision-maker** | Uses results to decide. | Read-only dashboard, reports, blast-radius and recurrence results. | Create or edit records. |

---

## 7. Core Features

Priority: **M** = Must for the first working version · **S** = Should · **C** = Could (optional). "Main FRs" links each feature to Section 8.

| # | Feature | Purpose / user problem solved | Expected output | Main FRs | Priority |
|---|---|---|---|---|---|
| F1 | **Campus Event Registry** | One place to record every event. Solves scattered records. | Event list/detail with category, type, severity, location/asset, times, status. | FR-001–008 | **M** |
| F2 | **Event Relationship & Provenance Tracking** | Connect events with evidence and confidence. Solves hidden connections and unjustified assumptions. | Relationship records with status, confidence, explanation and evidence. | FR-009–017, 047, 048 | **M** |
| F3 | **Root-Cause Explorer** | Find what led to an event. | Upstream chain; confirmed vs suspected links labelled; chain end shown as "root of the recorded chain". | FR-018–022 | **M** |
| F4 | **Blast-Radius Calculator** | Find everything an event affected. | Downstream events and total impact by type under the counting rule. | FR-023–028, 049 | **M** |
| F5 | **Temporal Investigation** | Reconstruct what was recorded at a past time. | "As of" results and chain timeline. | FR-029–032 | **S** (a basic as-of query becomes M if a Phase 1 query needs it) |
| F6 | **Event Status History** (alias: Incident/Event Status History) | Know how an event's status changed, when and by whom. | Read-only history timeline per event, written by a database trigger. | FR-005, 033, 034 | **M** |
| F7 | **Infrastructure Vulnerability & Recurrence Analysis** | Find assets/locations that fail repeatedly. | Ranked list by event count and cumulative impact over a period. | FR-036 | **S** |
| F8 | **Dashboard & Reports** | Summaries for decision-makers; reports. | Summary cards, charts, two generated reports. | FR-037–040 | **M** (reports) / **S** (charts) |
| F9 | Search & filtering | Find events quickly. | Filtered lists, keyword search. | FR-035 | **M** |
| F10 | Export (CSV/print) | Share results. | Downloadable/printable output. | FR-040 | **C** |
| F11 | Interactive graph visualization | Nicer root-cause/blast-radius display. | Node-link diagram. | — | **C** (an indented tree/list is the Must fallback) |

---

## 8. Functional Requirements

Priority: M / S / C as in Section 7. All items are **[A] project requirements** written by this plan; they are distinct from the academic items in Section 11. Rows marked **(v0.2)** were revised or added in this version. New identifiers continue the sequence (FR-047 to FR-050); nothing was renumbered.

### 8.1 Event registry
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-001 | The system shall allow an authorized user to create a Campus Event with at least: title, description, category (technical / infrastructure / academic / operational), event type, severity, location or asset, start time, status, reporter. | M | Create test events of each category; a missing required field is rejected. |
| FR-002 | The system shall allow an optional end/resolved time and require it to be not earlier than the start time. | M | End before start returns a validation error. |
| FR-003 | Categories, types, severities and statuses shall come from controlled reference lists, not free text. | M | An invalid value is rejected by database and API. |
| FR-004 | The system shall retrieve a single event with its relationships, impacts, evidence summary and status history. | M | Detail view/API shows all listed parts for a seeded event. |
| FR-005 **(v0.2)** | The system shall record, for every Campus Event, who created it and who last modified it, and the time of creation and of last modification. **This is the only traceability guaranteed for changes to non-status fields** (title, description, severity, location/asset and so on): previous values are **not** retained in version 1. Complete field-level audit is a pending decision (D-15) and future enhancement (FR-050). Status changes are covered separately by FR-033. | M | Update an event as user X: last-modified-by shows X and the time is updated. Documentation states that old field values are not recoverable. |
| FR-006 | Events shall not be hard-deleted through the application; they shall be marked void with a reason. | S | No delete endpoint; void action records its reason. |
| FR-007 | The system shall record a location and/or asset for each event and allow the administrator to manage this reference data. | M | Admin adds a location; it can be selected on an event. |
| FR-008 | The system shall record scheduled activities (e.g., lab sessions with a planned date/time, location, course) and allow an event to reference the scheduled activity it affects. | M | A cancellation event linked to a session appears on both views. |

#### 8.1.1 Kinds of history — do not confuse them (v0.2)
| Kind | What it records | Written by | Guarantee in version 1 |
|---|---|---|---|
| **Event status history** (FR-033, FR-034, TG-1) | Every status change of a Campus Event, including its initial status. | Database trigger | Complete for status: old status, new status, time, user, reason. |
| **Last-modified metadata** (FR-005) | Who last changed an event, and when. | Backend sets the values with each update | Last change only; no previous values. |
| **General audit history** (FR-050) | Old and new values of other fields (title, description, severity, location). | Not designed | **Not provided** unless D-15 decides to include it. |
| **Relationship history** (FR-016) | Changes to a relationship's status or confidence. | To be designed (Should) | Only if FR-016 is implemented. |

### 8.2 Relationships and evidence
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-009 | The system shall let an event investigator link a *cause* event to an *effect* event as a directed relationship. | M | Create A→B; B→A is a separate record. |
| FR-010 | Each relationship shall have a status: confirmed, suspected, or rejected/unrelated. | M | Status values enforced. |
| FR-011 | Each relationship shall have a confidence value (scale set in the Schema Document) and a short explanation of the reasoning. | M | Missing confidence or explanation is rejected. |
| FR-012 **(v0.2)** | A new relationship shall default to *suspected*. A relationship may enter the *confirmed* status only if at least one evidence record is attached to it at that moment. The database enforces this (TG-2). Inserting a relationship directly as *confirmed* shall be rejected, because evidence cannot exist before the relationship does. | M | Direct insert as confirmed → rejected. Add evidence, then confirm → accepted. Confirm with no evidence → rejected. Repeat through both SQL and API. |
| FR-013 | The system shall reject a relationship from an event to itself and a duplicate relationship for the same ordered pair of events. | M | Both rejected. |
| FR-014 **(v0.2)** | When a relationship is saved whose cause event started *after* its effect event, the system shall show a warning and require a non-empty override reason before saving; the flag and the reason shall be stored with the relationship. This is a **warning**, not a prohibition (Section 8.2.2). Equal start times raise no warning. | S | Reversed times without a reason: not saved, reason requested. With a reason: saved and flagged. Equal times: no warning. |
| FR-015 | The system shall allow evidence records (type, description, source/reference, recorded by, recorded at) to be attached to relationships (and optionally events). | M | Evidence appears in the relationship detail. |
| FR-016 **(v0.2)** | Changes to a relationship's status or confidence shall be recorded in a relationship history (separate from event status history, Section 8.1.1). | S | A history row is created on each change. |
| FR-017 | The application shall create no causal link automatically from time proximity alone. | M | Review: no code path creates links without a user action. |
| FR-047 **(new)** | An event investigator may downgrade a *confirmed* relationship to *suspected* or *rejected/unrelated*. The system shall require a non-empty reason and reject the downgrade without one. | M | Downgrade with a reason succeeds; without, rejected. Evidence remains attached. |
| FR-048 **(new)** | The database shall reject deletion of the last remaining evidence record of a *confirmed* relationship, and reject moving it to another relationship. The relationship must first be downgraded (FR-047). | M | Delete last evidence of a confirmed relationship → rejected; after downgrade → allowed. |

#### 8.2.1 Evidence-enforcement design (intended design; not implemented)
Details are finalized in the Database Schema Document. Nothing here claims the design is built.

| Question | Intended design |
|---|---|
| **What happens when a relationship is first confirmed?** | Relationships start as *suspected*. The investigator attaches evidence, then changes the status to *confirmed*. At that moment TG-2 checks that at least one evidence record exists for that relationship and rejects the change otherwise. A relationship inserted directly as *confirmed* is rejected (no evidence can exist yet). Whether a procedure should create relationship, evidence and confirmation atomically is open (D-18). |
| **What if evidence is deleted later?** | While the relationship is *confirmed*, deleting its last evidence record (or moving it elsewhere) is rejected by TG-2. Evidence can be removed only if other evidence remains, or after the relationship has been downgraded. Events and relationships are not hard-deleted through the application (FR-006 principle); how cascading deletes interact with TG-2 is a Schema Document detail. |
| **Can a confirmed relationship be downgraded?** | Yes: to *suspected* or *rejected/unrelated*, by an event investigator, with a required reason (FR-047). Downgrading leaves evidence in place. Where the reason is stored (relationship history under FR-016, or a status-reason field) is a Schema Document decision. |
| **How do application and database stay consistent?** | The **database is the authority**. FastAPI may pre-check to give friendly messages but is never the only check. Database rule violations are translated by the API into clear errors (NFR-020). Tests run each rule through direct SQL *and* through the API (Section 16). Open: two sessions confirming and deleting evidence at the same moment — the locking approach is a Schema Document matter (D-18). |

#### 8.2.2 Rejected rules versus warned rules (v0.2)
A **prohibition** fails the operation regardless of what the user says. A **warning** informs the user, who may proceed by giving a reason.

| Rule | Type | Intended enforcement |
|---|---|---|
| Relationship from an event to itself | Prohibition | Database constraint (FR-013) |
| Duplicate relationship for the same ordered pair | Prohibition | Database constraint (FR-013) |
| Confirm a relationship without evidence | Prohibition | Database trigger TG-2 (FR-012) |
| Delete the last evidence of a confirmed relationship | Prohibition | Database trigger TG-2 (FR-048) |
| Event end time before start time | Prohibition | Database constraint (FR-002) |
| Cause event started after effect event | **Warning** with required override reason | Application rule; flag and reason stored (FR-014). Enforcing it in the database would need a cross-table check and is pending (D-11). |
| Two events close together in time | No link is ever created automatically | Design principle (FR-017) |

### 8.3 Root-cause investigation
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-018 **(v0.2)** | Given a Campus Event, the system shall return each recorded upstream cause event **once**, with its minimum distance (depth) from the selected event. | M | The UPS → switch → network → cancellation example returns the chain; an event reachable by two paths appears once. |
| FR-019 | The user shall be able to choose "confirmed links only" or "include suspected links"; suspected links shall be visibly labelled. | M | The same event returns different sets under each option. |
| FR-020 | The traversal shall terminate correctly if the data contains a cycle. | M | A seeded cycle does not hang or crash. |
| FR-021 | The result shall show, for each link, its status and confidence. | M | Fields visible in the output. |
| FR-022 | Events with no recorded upstream cause shall be described as "root of the recorded chain", not as absolute root causes. | S | Wording check in UI/API. |

### 8.4 Blast-radius analysis
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-023 **(v0.2)** | Given a Campus Event, the system shall return each recorded downstream effect event **once**, with its minimum depth. | M | The example returns the downstream chain; a diamond returns the shared event once. |
| FR-024 | The system shall allow impacts to be recorded against an event: impact type, affected object (e.g., scheduled activity, room, group, asset), quantity with unit, and a flag for *verified* vs *estimated*. | M | Impact create/read/update test. |
| FR-025 **(v0.2)** | The blast-radius total shall count each event once and each impact record once, following the counting rule in Section 8.4.1. | M | Diamond-graph test: total equals the sum of the unique impact records. |
| FR-026 | The user shall be able to restrict the blast radius to confirmed links only. | M | The result differs from including suspected links. |
| FR-027 | Results shall be summarized by impact type and, where data allows, by department/location. | S | Summary matches a manual calculation. |
| FR-028 | Estimated and verified impact totals shall be shown separately. | M | Two totals reported. |
| FR-049 **(new)** | Where impact records in one result reference the same affected object and the same impact type, the headline total shall count that object once, per the proposed rule in Section 8.4.1; the excluded records shall be listed as possible duplicates. Impacts without a structured affected-object reference are not de-duplicated, and the result shall say so. | S | Seeded same-object duplicates counted once and listed; unreferenced impacts flagged. |

#### 8.4.1 Impact counting rule (proposed; details pending D-16)
| Situation | Meaning | Proposed rule |
|---|---|---|
| **1. An event reachable through several causal paths** | Diamond: A→B→D and A→C→D. | Event D appears **once** in the result, at its minimum depth. Paths may be displayed but never multiply anything. |
| **2. An impact record reachable through several paths** | Every impact record belongs to exactly one event. | If an event is counted once, its impact records are counted once. Totals are computed over the **distinct impact records of the distinct events** in the result. |
| **3. The same real-world object recorded more than once** | Two events each record an impact on the same scheduled session. | If records in one result share the same affected object **and** the same impact type, the headline total counts that object **once**, using the largest recorded quantity; the others are listed as "possible duplicates (excluded from headline total)". |

*Worked example.* "Lab network outage" records *session S1 — disrupted — 1*. "Lab session cancellation" records *session S1 — cancelled — 1*. Same object, different impact types: both count. If both had recorded *session S1 — session lost — 1*, the headline total would count S1 once.

*Open details (D-16):* largest quantity versus sum versus manual review; whether units of different kinds ever combine; whether the affected object must always be a structured reference; whether verified and estimated impacts are de-duplicated together or separately (FR-028).

### 8.5 Temporal investigation and history
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-029 | The system shall list events that were open/active at a user-chosen date and time. | S | Test dataset with known times. |
| FR-030 | The system shall show an event's status as recorded at a user-chosen time, derived from the status history. | S | Compare with history rows. |
| FR-031 | The system shall display a chain of related events on a time-ordered timeline. | S | Order matches times. |
| FR-032 | The system shall distinguish *when an event happened* from *when it was recorded* (see D-10). | S | Both timestamps stored and shown. |
| FR-033 **(v0.2)** | The database shall record an event's **initial status** when the event is created and **every later status change** in an event status history record (old status, new status, time, user, reason), through a database trigger (TG-1). No history record shall be written when the status value does not change, including updates to other fields. | M | Create an event → one history row. Change status → one more. Edit title only → none. Set status to its current value → none. Test via API and via SQL Editor. |
| FR-034 | Event status history shall be read-only through the application. | M | No edit or delete endpoint. |
| FR-050 **(new, future)** | *Future enhancement, not part of version 1 unless D-15 decides otherwise:* general audit history recording old and new values of non-status event fields. | C | Not applicable until approved and designed. |

### 8.6 Search, recurrence, dashboard and reports
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-035 | The system shall list/filter events by category, type, status, severity, location/asset, date range and keyword (pattern match on title/description). | M | Each filter tested alone and combined. |
| FR-036 | The system shall report assets/locations with repeated events in a chosen period, ranked by event count and cumulative impact. | S | Matches a manual count on seed data. |
| FR-037 | The dashboard shall show at least: open events by category, events by severity, recent events, and top recurring assets/locations. | S | Values match queries. |
| FR-038 | **Application report 1 — Event Summary Report:** events over a chosen period grouped by category and status, with totals. | M | Totals cross-checked against SQL. |
| FR-039 **(v0.2 wording)** | **Application report 2 — Event Investigation Report:** for a chosen event, its root-cause chain, blast radius, impacts and evidence. | M | Content matches the root-cause and blast-radius results. |
| FR-040 | Reports may be exported to CSV or a printable view (format = D-12). | C | Export opens correctly. |

*FR-038 and FR-039 are the project's reading of "two generated reports". Whether the academic requirement means these, the Phase 1/Phase 2 report documents, or both is open (CU-11, D-20).*

### 8.7 Access control and forms
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-041 | Only authenticated users shall access any data or function (mechanism per D-05). | M | Unauthenticated calls return an authorization error. |
| FR-042 | Each endpoint shall check the user's role against Section 6. | M | Role/endpoint test matrix. |
| FR-043 | The administrator shall manage user accounts and role assignments. | S | Admin assigns a role; behavior changes. |
| FR-044 **(v0.2)** | The frontend shall provide at least five forms. The five **proposed project forms** below are design proposals; they are **not** the official form categories, which are unknown (A-17, CU-04). | M | Forms exist and submit successfully; mapping to official categories completed after verification. |

| Proposed project form | Purpose | Related FRs | Official category it satisfies |
|---|---|---|---|
| PF-1 Event registration | Create a Campus Event (backed by SP-1) | FR-001–003, 007, 008, 046 | **Unknown** — map after verification |
| PF-2 Event update | Edit an event, change status, close (SP-2) | FR-005, 033, 046 | **Unknown** |
| PF-3 Relationship and evidence entry | Link events, attach evidence, set status/confidence, downgrade | FR-009–015, 047 | **Unknown** |
| PF-4 Impact entry | Record impacts | FR-024 | **Unknown** |
| PF-5 Investigation / search | Search events; choose root-cause or blast-radius options | FR-018, 019, 023, 026, 035 | **Unknown** |

### 8.8 Database-level logic (proposed designs)
| ID | Requirement | Pri | Verification |
|---|---|---|---|
| FR-045 **(v0.2)** | The database shall contain at least two triggers, designed as **TG-1** and **TG-2** below. *Count:* **Unverified — confirm against the official guideline.** | M | Trigger tests, Section 16.6. |
| FR-046 **(v0.2)** | The database shall contain at least two stored procedures, designed as **SP-1** and **SP-2** below. *Count:* **Unverified — confirm against the official guideline.** | M | Procedure tests, Section 16.6. |

#### 8.8.1 Ground rules
- **Status: proposed designs only.** None is implemented and no test result is claimed. The Database Schema Document finalizes them.
- **What counts as a database object:** a **trigger** is a PostgreSQL trigger function bound by a trigger definition, firing automatically on data changes. A **stored procedure** is a database object created with `CREATE PROCEDURE` (PostgreSQL 11 and later; the Supabase-provided version is to be confirmed, D-08) and invoked with `CALL`. **Python functions and FastAPI endpoints do not count** as triggers or procedures for the academic requirement. FastAPI endpoints may *call* SP-1 and SP-2, but the objects must also be demonstrable directly in the SQL Editor.
- **Single-writer rule:** only TG-1 writes event status history rows. The procedures and the application never insert status history directly, so there are no duplicate entries and manual status updates are captured too.

#### 8.8.2 TG-1 — Event status history
| Aspect | Design |
|---|---|
| Purpose | Automatic, complete status history (FR-033). |
| Fires | After a Campus Event is inserted; after an update in which the stored status value differs from the previous value. |
| Behavior | On insert: write the initial status record (old status empty). On a real status change: write a record with old status, new status, time, user, reason. |
| Must not | Write a record when the status is unchanged, including updates to other fields or setting the same status again. |
| Open design (D-22) | How user identity and reason reach the trigger (columns on the event row, or another mechanism). |

#### 8.8.3 TG-2 — Confirmed-relationship evidence validation
| Aspect | Design |
|---|---|
| Purpose | Enforce FR-012 and FR-048. |
| Fires | Before a relationship is inserted or its status updated; before evidence is deleted or reassigned. |
| Behavior | Reject entry into *confirmed* unless at least one evidence record exists. Reject deletion or reassignment of the last evidence of a *confirmed* relationship. Allow downgrade; evidence checks then no longer apply. |
| Implementation note | May be one trigger function bound to two tables. TG-1 and TG-2 remain two distinct designs; confirm the counting basis if the guideline specifies one (A-15, D-22). |
| Open design (D-18) | Concurrency, cascade interaction, where the downgrade reason is stored. |

#### 8.8.4 SP-1 — Register event
| Aspect | Design |
|---|---|
| Purpose | Create a Campus Event in one atomic operation (backs PF-1). |
| Behavior | Validate required fields (FR-001); insert the event with its initial status; the initial status history record is written by **TG-1**, not by the procedure. Runs as one transaction: any failure leaves no partial data. |
| Output | New event identifier (method open, D-22). |

#### 8.8.5 SP-2 — Close event
| Aspect | Design |
|---|---|
| Purpose | Move an event to its closing status safely (backs PF-2). |
| Behavior | Check the event exists and is not already closed or void; check that closing is allowed from its current status (D-17); require a non-empty reason; set the closing status (and end/resolved time if missing, rule per D-17); history is written by **TG-1**. Any failure raises an error and changes nothing. |

#### 8.8.6 Illustrative status vocabulary (**[A]**, D-17)
reported → investigating → resolved → closed; plus void (cancelled with a reason, FR-006). States and allowed transitions will be fixed with the state diagram (A-21).

---

## 9. Non-Functional Requirements

Targets marked "proposed" are placeholders; no performance figure is presented as fact. Rows marked **(v0.2)** are revised or new.

| ID | Category | Requirement | Verification |
|---|---|---|---|
| NFR-001 | Data integrity | Primary keys, foreign keys, NOT NULL, UNIQUE and CHECK constraints shall protect core rules (no self-links, valid time ranges, valid statuses) in the database, not only in Python. | Constraint violation tests. |
| NFR-002 | Data integrity | Related records shall not become orphaned; deletion rules (restrict/cascade) shall be chosen deliberately in the Schema Document. | Referential tests. |
| NFR-003 | Security | Database credentials and any service-role/secret keys shall exist only in backend configuration, never in React code, its environment variables, or Git. | Repository and bundle scan. |
| NFR-004 | Security | The browser shall communicate only with the FastAPI API, never directly with PostgreSQL. | Network inspection. |
| NFR-005 | Security | All queries from FastAPI shall be parameterized; no SQL built from user input by string joining. | Code review; injection-style inputs. |
| NFR-006 | Security | Role-based authorization shall be enforced on the backend independently of what the frontend shows or hides. | Direct API calls with each role. |
| NFR-007 | Security | Data exposed by Supabase's optional generated API (if enabled) shall not bypass application access rules (D-06, Section 10.4). | Unauthenticated request test. |
| NFR-008 | Reliability | The API shall return structured errors for invalid input, missing records and database failures, without stack traces or credentials. | Error-case tests. |
| NFR-009 | Reliability | Multi-step changes shall run in a transaction (SP-1 and SP-2 do so inside the database). | Failure-injection test. |
| NFR-010 | Performance | Common queries and traversals shall return in a time acceptable for live demonstration. *Proposed target:* under 2 seconds on a few hundred events, to be confirmed after measurement. | Timed test. |
| NFR-011 | Usability | A new user shall be able to register an event and run a root-cause search from the on-screen labels. *Proposed check:* two non-team users complete both tasks. | Usability trial. |
| NFR-012 | Usability | Forms shall show validation errors next to the relevant field. | Manual test. |
| NFR-013 | Maintainability | The repository shall have a README with setup steps, separate `frontend/`, `backend/` and `database/` folders, and configuration through environment files (examples committed, real secrets not). | Fresh-clone setup by a teammate. |
| NFR-014 | Maintainability | All SQL scripts (tables, seed data, queries, views, triggers, procedures) shall be versioned in Git and runnable in order to rebuild the database. | Rebuild in a clean Supabase project. |
| NFR-015 | Provenance | Every relationship shall show who recorded it, when, its status, confidence and evidence. | UI/API inspection. |
| NFR-016 **(v0.2)** | Auditability | Event status history and relationship history shall be append-only through the application. Traceability of other event changes is limited to FR-005 unless D-15 adds more. | No update/delete path; limitation documented. |
| NFR-017 | Data labelling | Every record or dataset shall be identifiable as verified, public, or synthetic (Section 15). | Visible label. |
| NFR-018 | Backup/recovery | The team shall export schema and data (SQL scripts and a dump/export) before each demo and after each milestone. Hosted backup features shall be checked in the Supabase dashboard, not assumed. | Restore test into a fresh project. |
| NFR-019 | Compatibility | Database-specific syntax used for academic requirements shall be listed for faculty review. | Compatibility list exists. |
| NFR-020 **(new)** | Reliability | The API shall translate database rule violations (constraint or trigger/procedure errors) into clear structured errors. API pre-checks are conveniences and shall never be the sole enforcement of a rule the database must enforce. | Each database-enforced rule tested via direct SQL and via the API. |

---

## 10. DBMS and Technology Stack

**[C]** Selected architecture: **React frontend → Python/FastAPI backend → PostgreSQL hosted on Supabase**, with Git + GitHub. Exact versions are **[D]** (D-08). Any other framework or service would first have to become a pending decision.

### 10.1 Frontend — React
React will implement: the dashboard and summary cards; event registration and update forms; event search and filtering; root-cause visualization; blast-radius visualization; the event timeline and status history; impact analysis and reports.
- **[A]** A simple, readable representation (indented tree or list) is the must-have for traversals; an interactive graph is optional (F11).
- The frontend holds only the backend API base address — never database credentials.
- **[A]** TypeScript and a build tool such as Vite are suggested because they are common for React projects; confirm in the Architecture Document.

### 10.2 Backend — Python + FastAPI
FastAPI will: expose REST endpoints; validate requests (e.g., with Pydantic models); apply application rules; execute database operations (including `CALL` of SP-1 and SP-2); return structured responses; handle errors and enforce authorization; and coordinate root-cause and impact queries by calling database-side logic.

Principle: FastAPI is the *door* to the database; it does not replace database features. Triggers, procedures, views and constraints required by the rubric live **in PostgreSQL**.

### 10.3 Database — Supabase PostgreSQL
Supabase is a **platform that hosts PostgreSQL**; it is not a separate database engine. The relational database is PostgreSQL. It will store the relational data and run SQL queries, views, trigger functions and triggers, procedures, constraints, joins, aggregates and recursive queries (as supported by the PostgreSQL version Supabase provides). Supabase tools used: the Dashboard and the SQL Editor. **[A]** Only genuinely useful optional services will be adopted (D-06).

### 10.4 Database Connectivity (recommendation; final design deferred to the Architecture Document)
| Topic | Planning recommendation |
|---|---|
| Driver | **[A]** psycopg 3 with its connection pool for FastAPI. |
| Query style | **[A]** Hand-written parameterized SQL rather than an ORM, because the course evaluates SQL directly and the recursive and advanced queries must be visible and demonstrable. Revisit in the Architecture Document. |
| Configuration | A `DATABASE_URL` (or separate host/user/password values) in a backend-only `.env`, git-ignored; a `.env.example` with fake values is committed. |
| Credential rule | Database passwords and Supabase service-role keys must **never** appear in React environment variables (anything bundled into the browser is public) or in committed code. |
| Direct frontend → database | **Not used.** |
| Connection mechanism | **Pending (D-07).** Supabase offers a direct connection and pooled connections (session and transaction modes). Trade-offs to evaluate against current Supabase documentation: a direct connection is simplest but may depend on the network environment of the machines used (not assumed here); session-mode pooling suits a long-running backend and ordinary SQL; transaction-mode pooling suits many short connections but can restrict session features such as prepared statements. |
| Supabase generated API | Supabase can expose tables through a generated REST API protected by row-level security. Because everything is routed through FastAPI, the team must decide whether to disable or lock it down so it cannot bypass backend rules (D-06, NFR-007). |
| Authentication | Supabase Auth is **optional**, not assumed. Alternatives are compared in the Architecture Document (D-05). |

### 10.5 Version Control and Development
| Tool | Role |
|---|---|
| Git + GitHub | Single repository (proposed monorepo with `frontend/`, `backend/`, `database/`, `docs/`); feature branches; pull requests reviewed by a teammate. **All SQL scripts live in Git**, never only in the browser editor. |
| React tooling | Node.js package manager and dev server for local frontend work. |
| Python environment | Virtual environment with a pinned requirements file. |
| FastAPI dev tools | ASGI development server (e.g., Uvicorn) and FastAPI's interactive API documentation for backend testing. |
| Supabase SQL Editor | Running and trying SQL and demonstrating database objects; every script is saved as a file in Git. |

Exact versions are **not selected here**; they are chosen and recorded at implementation (D-08). The deployment and network environment of the team is not assumed (D-09).

### 10.6 Security Boundaries and Database-Object Rules (summary)
| Boundary | Rule | Related |
|---|---|---|
| React ↔ secrets | React contains no database password or service-role secret. | NFR-003 |
| FastAPI ↔ database | Only the backend talks to PostgreSQL. | NFR-004 |
| Queries | Parameterized inputs only. | NFR-005 |
| Authorization | Enforced on the backend, independent of frontend visibility. | NFR-006 |
| Database objects | Triggers, views, procedures and constraints exist **inside PostgreSQL**; Python code does not substitute for them. | FR-045, FR-046, A-11, A-15, A-16 |
| Scripts | SQL scripts are stored in Git and rebuild the database. | NFR-014 |
| Supabase | A platform hosting PostgreSQL, not a separate engine; optional services are decisions (D-06). | — |

### 10.7 Academic Compatibility Warning

> **The available requirement summary lists Oracle, MySQL and MongoDB. It does not explicitly list PostgreSQL. Supabase/PostgreSQL is the team's *preferred* stack and requires faculty confirmation. This document does not claim academic compliance.** Faculty confirmation status: **NOT CONFIRMED** (no confirmation is supplied in any available source).

Related consequences: the Phase 1 report's "Introduction to SQL/MySQL/MongoDB/DBMS as applicable to the approved DBMS" (Section 11.3) depends on this answer, and with the Phase 2 window now described as imminent, a late migration would be expensive, so this question is urgent (D-01).

**If faculty do not accept PostgreSQL:** the alternative must be decided explicitly, not by silently changing the stack. Options to evaluate at that time:

| Option | Impact |
|---|---|
| Move to MySQL | Recursive queries exist in recent versions; trigger and procedure syntax differs; set-operation support depends on version; backend driver and hosting change (no Supabase). |
| Move to Oracle | Closest to traditional coursework; PL/SQL triggers and procedures; `MINUS`; licensing, hosting and access constraints; larger SQL rewrite. |
| MongoDB | Not relational; conflicts with the table/key requirements as summarized — least suitable. |
| Keep PostgreSQL locally and present scripts only | Only if faculty permit; confirm. |

Migration effort is smallest if SQL stays in separate versioned scripts and standard SQL is preferred where practical (NFR-019).

---

## 11. Academic DBMS Requirements and Compliance Matrix

### 11.1 How to read this section
- Every row comes from the team's **summary** of the guideline, not the guideline itself. Every row is **"Unverified — confirm against the official guideline."**
- **Completion status** is "Team confirmation required" for every deliverable row, because this document has no information about progress (CU-14). No row is claimed complete.
- **Expected phase** is an **[A]** proposal (CU-05), except where a row says otherwise. The state diagram is provisionally Phase 1 (A-21).
- Requirement counts are exactly as supplied; none is reduced, merged or omitted. Identifiers A-01 to A-25 are unchanged from v0.1; A-26 to A-28 are new.

### 11.2 Compliance matrix

| Req ID | Requirement (as summarized) | Planned implementation | Evidence / demonstration | Expected phase [A] | Verification status | Completion status |
|---|---|---|---|---|---|---|
| A-01 | At least 6 tables | Schema with at least six tables (indicative 8–10; final count D-03) | ER and schema diagrams; table list in the Supabase Dashboard | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-02 | Each table has a primary key, and foreign keys where applicable | Primary key on every table; foreign keys for every relationship | Schema diagram; constraint listing | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-03 | Each table has at least 5 attributes | Every table, including reference tables, designed with five or more attributes | Attribute-count table in the Schema Document | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-04 | 5 simple SQL queries | Basic selections and joins over events, locations, status | Query files in `queries/`, results, paired relational algebra (A-26) | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-05 | 5 nested SQL queries | Subqueries (e.g., events at assets with above-average failure counts) | Query files, results, relational algebra | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-06 | 2 set-operation queries | `UNION` / `INTERSECT` / `EXCEPT` (PostgreSQL names; Oracle uses `MINUS`, CU-08) | Query files, results, compatibility note | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-07 | 2 GROUP BY queries | Events per category; events per location | Query files, results | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-08 | 2 HAVING queries | Assets with more than N events; categories with total impact above a threshold | Query files, results | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-09 | 3 LIKE / BETWEEN / pattern-matching queries | Keyword search on titles; date-range filter; code-pattern search | Query files, results | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-10 | 1 correlated query | Events whose severity exceeds the average for their own location | Query file, results | Phase 1/2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-11 | 2 views | e.g., open-events summary view; event-impact summary view — created inside PostgreSQL | View definitions and queries against them | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-12 | 1 EXISTS query | Events with at least one confirmed relationship | Query file, results | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-13 | 1 NOT EXISTS query | Events with no recorded impact or no evidence | Query file, results | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-14 | 4 aggregate-function queries | `COUNT`, `SUM`, `AVG`, `MIN`/`MAX` over impacts and durations | Query files, results | Phase 1/2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-15 | 2 triggers | **TG-1** event status history and **TG-2** evidence validation (Section 8.8) — database objects, not Python | Scripts; live demonstration of change → effect in the SQL Editor | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-16 | 2 stored procedures | **SP-1** register event and **SP-2** close event (Section 8.8), invoked with `CALL` | Scripts; demonstration calls | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-17 | Frontend with minimum 5 forms covering the form categories required by faculty | Five **proposed project forms** PF-1 to PF-5 (Section 8.7). The **official categories are unknown**; mapping happens after verification | Live demonstration of each form; mapping table | Phase 2 | Unverified — confirm against the official guideline. Categories unknown. | Team confirmation required |
| A-18 | Two generated reports | Application reports FR-038 and FR-039. Meaning of "two reports" is open (CU-11); the Phase 1 report document is tracked separately in A-27 | Generated output | Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-19 | ER diagram | Drawn from the final schema | Diagram file; included in the Phase 1 report | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-20 | Schema diagram | Relational schema from the Schema Document | Diagram file; included in the Phase 1 report | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-21 | State diagram | Event lifecycle (illustrative states in 8.8.6, D-17). **Provisionally Phase 1**: the supplied summary lists it under Phase 1 System Design; v0.1 had it in Phase 2 (inconsistency corrected) | Diagram file; included in the Phase 1 report | **Phase 1 (provisional)** | Unverified — confirm against the official guideline. | Team confirmation required |
| A-22 | Testing and documentation | Test cases and evidence (Section 16); the three project documents; "Testing and Results" section of the Phase 1 report | Test log; documents | Phase 1 (report section) and Phase 2 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-23 | Phase 1 demo described as "third week of October 2026" | Historical date; whether Phase 1 was demonstrated is unknown (Section 13.3) | — | — | Unverified — confirm against the official guideline. | Not applicable (a date) |
| A-24 | Phase 2 demo described as "first week of November 2026" | Exact day unknown (Section 13.3) | — | — | Unverified — confirm against the official guideline. | Not applicable (a date) |
| A-25 | Allowed DBMS list (summary lists Oracle, MySQL, MongoDB; PostgreSQL not listed) | Faculty confirmation required before any compliance claim | Faculty confirmation filed in the repository | Immediately | Unverified — confirm against the official guideline. Faculty approval **NOT CONFIRMED**. | Not confirmed |
| A-26 **(new)** | Relational algebra queries — a **distinct** item; SQL queries are **not** assumed to satisfy it | A relational algebra expression for each Phase 1 SQL query where expressible; extended notation for grouping/aggregates where needed. Count, scope and notation unknown (CU-12, D-21) | "Relational algebra queries" section of the Phase 1 report, each paired with its SQL and result | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-27 **(new)** | Phase 1 report structure (nine parts) | Compile per the checklist in 11.3 | Report document | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |
| A-28 **(new)** | Phase 1 report formatting | Build to the checklist in 11.4 | Compiled report checked item by item | Phase 1 | Unverified — confirm against the official guideline. | Team confirmation required |

### 11.3 Phase 1 report structure checklist (from the supplied summary)

| # | Part | Contents | Planned content source in this project **[A]** | Verification status | Completion status |
|---|---|---|---|---|---|
| 1 | Blue outer title sheet | Cover page; what exactly is "blue" (background, border, colour of text) is not described | To be designed once confirmed | Unverified — confirm against the official guideline. | Team confirmation required |
| 2 | Certificate | Content and format not described | To be confirmed | Unverified — confirm against the official guideline. | Team confirmation required |
| 3 | Table of contents | — | Generated by the LaTeX document | Unverified — confirm against the official guideline. | Team confirmation required |
| 4 | Introduction | Project objective; features | Sections 4 and 7 of this document | Unverified — confirm against the official guideline. | Team confirmation required |
| 5 | System Design | ER diagram; schema diagram; state diagram | A-19, A-20, A-21 | Unverified — confirm against the official guideline. | Team confirmation required |
| 6 | System Implementation | Introduction to SQL/MySQL/MongoDB/DBMS as applicable to the approved DBMS; relational algebra queries; SQL queries | DBMS introduction written for the **approved** DBMS (PostgreSQL only if approved, D-01); A-26; A-04 to A-14 | Unverified — confirm against the official guideline. | Team confirmation required |
| 7 | Testing and Results | Not further described | Section 16 evidence for the Phase 1 items | Unverified — confirm against the official guideline. | Team confirmation required |
| 8 | Conclusion | Not further described | Written after results exist | Unverified — confirm against the official guideline. | Team confirmation required |
| 9 | References | Not further described | Real, verifiable sources only; none invented | Unverified — confirm against the official guideline. | Team confirmation required |

### 11.4 Phase 1 report formatting checklist (from the supplied summary)

| # | Formatting item | Planning note **[A]** | Verification status | Completion status |
|---|---|---|---|---|
| 1 | LaTeX document | Compose the report in LaTeX; template choice is D-20 | Unverified — confirm against the official guideline. | Team confirmation required |
| 2 | Times New Roman | A proprietary font; LaTeX options include a Times-compatible font package or an engine that can use the installed font. Whether a Times-compatible substitute is acceptable to faculty is unknown | Unverified — confirm against the official guideline. | Team confirmation required |
| 3 | Main headings 16 pt | Standard LaTeX classes offer fixed base sizes, so heading sizes need explicit overrides | Unverified — confirm against the official guideline. | Team confirmation required |
| 4 | Subheadings 14 pt | Same as above | Unverified — confirm against the official guideline. | Team confirmation required |
| 5 | Body text 12 pt | Set as the document base size | Unverified — confirm against the official guideline. | Team confirmation required |
| 6 | Line spacing 1.5 | Check how the LaTeX spacing setting compares with the faculty's meaning of "1.5" | Unverified — confirm against the official guideline. | Team confirmation required |
| 7 | Justified paragraphs | LaTeX default; check for overfull lines | Unverified — confirm against the official guideline. | Team confirmation required |
| 8 | Top, bottom and right margins 1 inch | Page-geometry setting | Unverified — confirm against the official guideline. | Team confirmation required |
| 9 | Left margin 1.25 inches | Page-geometry setting | Unverified — confirm against the official guideline. | Team confirmation required |

### 11.5 Notes
- **Database-level versus application-level logic.** Triggers, procedures and views must exist as **database objects**; simulating them in Python does not count toward A-11, A-15 or A-16.
- **PostgreSQL-specific syntax** (trigger functions, `CREATE PROCEDURE`, recursive queries, `EXCEPT`) is listed in a compatibility note for faculty (NFR-019). PostgreSQL features are not assumed equivalent to every rubric item.
- **Relational algebra is separate from SQL** (A-26). Grouping and aggregates need an extended notation; which notation the faculty expect is unknown.
- **Margin.** Plan one extra query per category in case the real guideline differs.
- The recursive root-cause and blast-radius queries are **in addition to**, not instead of, the listed query categories.

---

## 12. Project Deliverables

### 12.1 Academic deliverables (as summarized; **Unverified — confirm against the official guideline.**)
Identifiers D1–D12 are unchanged from v0.1; D13–D15 are new.

| # | Deliverable | Phase [A] | Matrix link |
|---|---|---|---|
| D1 | Table-creation script and seed-data script | 1 | A-01–A-03 |
| D2 | Basic and advanced query files | 1–2 | A-04–A-14 |
| D3 | Trigger and stored-procedure scripts (TG-1, TG-2, SP-1, SP-2) | 2 | A-15, A-16 |
| D4 | View scripts | 2 | A-11 |
| D5 | ER diagram | 1 | A-19 |
| D6 | Relational schema diagram | 1 | A-20 |
| D7 | State diagram | **1 (provisional; v0.1 had 2)** | A-21 |
| D8 | React frontend (at least five forms) | 2 | A-17 |
| D9 | FastAPI backend | 2 | — |
| D10 | Two generated reports (application, CU-11) | 2 | A-18 |
| D11 | Test cases and test evidence | 1–2 | A-22 |
| D12 | Final report/documentation and demonstration material | 2 | A-22 |
| D13 **(new)** | Relational algebra queries, each paired with its SQL | 1 | A-26 |
| D14 **(new)** | Phase 1 report document (LaTeX, per 11.3 and 11.4) | 1 | A-27, A-28 |
| D15 **(new)** | Phase 2 report or other Phase 2 deliverables — **not specified in the supplied summary** | 2 | Unknown — confirm (D-20) |

Whether the FastAPI and React source code are submittables, or only demonstrated, is unknown.

### 12.2 Supporting project documents
Planning Document (this), Architecture Document, Database Schema Document **[C]**. Whether faculty require them is unknown.

### 12.3 Optional enhancements
Interactive graph visualization (F11), export formats (F10), advanced recurrence analytics, dashboard charts, role administration screen, hosted deployment, optional Supabase Auth, field-level audit history (FR-050).

---

## 13. Development Roadmap and Milestones

*Replaces v0.1's dated roadmap. The 18 Oct–4 Nov schedule in v0.1 is **superseded**; it must not be used as the current schedule, and a passed date is not evidence that the work was done.*

### 13.1 Date reality check
- Planning date: **Sunday, 1 November 2026**.
- **Phase 1 as described in the summary:** "third week of October 2026" (historical; **Unverified — confirm against the official guideline.**). By calendar, that window has ended. Whether Phase 1 was demonstrated, and its outcome, is **unknown** to this document.
- **Phase 2 as described in the summary:** "first week of November 2026" (**Unverified — confirm against the official guideline.**). By calendar, that window begins this week. The exact day and the Phase 2 deliverables are **unknown**.
- Consequence: the first job is to establish facts (13.3). The roadmap below is ordered by dependency. **No dates are invented**, and no internal target dates are set until the team supplies the missing information.

### 13.2 Current project status

Status values: **Completed** and **In progress** and **Not started** are used only where the available information explicitly supports them; otherwise **Team confirmation required**.

| Area | Status | Basis |
|---|---|---|
| Planning Document v0.1 | Completed (provisional draft) | v0.1 exists and was supplied with the revision brief |
| Planning Document v0.2 | In progress | This revision |
| Verification against the official documents | Not started | The documents were not in the workspace on 1 Nov 2026, so no verification has been possible |
| Faculty confirmation of PostgreSQL/Supabase | Team confirmation required | No information |
| Phase 1 demonstrated | Team confirmation required | No information |
| Phase 1 corrections pending | Team confirmation required | No information |
| Exact Phase 2 demonstration date | Team confirmation required | Only the summary's description exists |
| Exact Phase 2 deliverables | Team confirmation required | Not in the summary |
| Architecture Document | Team confirmation required | No information |
| Database Schema Document | Team confirmation required | No information |
| Database design (ER, schema v1) | Team confirmation required | No information |
| Tables and seed data in Supabase | Team confirmation required | No information |
| SQL queries (A-04–A-14) | Team confirmation required | No information |
| Relational algebra queries (A-26) | Team confirmation required | No information |
| Views | Team confirmation required | No information |
| Triggers (TG-1, TG-2) | Team confirmation required | No information |
| Stored procedures (SP-1, SP-2) | Team confirmation required | No information |
| FastAPI backend | Team confirmation required | No information |
| React frontend and forms | Team confirmation required | No information |
| Application reports (FR-038, FR-039) | Team confirmation required | No information |
| Phase 1 report document (A-27, A-28) | Team confirmation required | No information |
| Testing and test evidence | Team confirmation required | No information |
| Other documentation | Team confirmation required | No information |

### 13.3 What the team must confirm immediately (owner: R1)
- [ ] Have the official Project Overview and 24CS520 guideline been located? (Share them for the Section 21 check.)
- [ ] **Has Phase 1 been demonstrated?** When, and what was the outcome?
- [ ] **Are Phase 1 corrections pending?** List them.
- [ ] **Exact Phase 2 demonstration date.**
- [ ] **Exact Phase 2 deliverables** (including whether a Phase 2 report document is required).
- [ ] Faculty answer on PostgreSQL/Supabase (D-01).
- [ ] Current completion status of: database design; SQL queries; relational algebra; backend; frontend; triggers; procedures; reports; documentation (rows of 13.2).
- [ ] Which of M1–M8 already have their acceptance criteria met.

### 13.4 Faculty deadlines versus internal team targets

| Kind | Item | Status |
|---|---|---|
| **Faculty deadline** (as described in the summary) | Phase 1 demo: "third week of October 2026" | Historical; **Unverified — confirm against the official guideline.**; outcome unknown |
| **Faculty deadline** (as described in the summary) | Phase 2 demo: "first week of November 2026" | **Unverified — confirm against the official guideline.**; exact day unknown |
| **Internal team target dates** | None set in v0.2 | To be set by the team after 13.3 is answered. v0.1's internal dates (18 Oct–4 Nov) are superseded |

### 13.5 Remaining-work roadmap (dependency-based, no dates)

**Dependencies:** M1 → M2 → M3 → {M4, M5}; M6 may start once schema v1 is stable; M6 → M7; {M5, M6, M7} → M8. M4 and M5 may overlap. **Start from the first milestone whose acceptance criteria are not yet met**, and treat no earlier milestone as done until 13.2 says so. Every milestone's current status is "Team confirmation required".

**M1 — Requirements, status and environment confirmation**
| Item | Detail |
|---|---|
| Tasks | Answer 13.3; locate or obtain the official documents; send faculty questions in writing (D-01, D-02, form categories, report details, relational algebra scope, Phase 1 contents, Phase 2 deliverables); confirm repo and Supabase access for all four members; test database connectivity from each machine (D-07). |
| Entry condition | None — always first. |
| Deliverables | Completed 13.2/13.3; faculty questions sent; Section 21 check started or done. |
| Role | R1 leads; all contribute. |
| Acceptance | Every row of 13.2 has a real status; questions sent; all four can reach the repo and Supabase. |
| Risks | Slow faculty reply → proceed on the PostgreSQL assumption while keeping SQL portable. |

**M2 — Planning and database design**
| Item | Detail |
|---|---|
| Tasks | Confirm or finish entities, attributes (≥5 each), keys, relationships; design relationship/evidence, status-history and impact structures; choose how as-of history is stored; fix the state diagram states (D-17); draft the ER diagram; **freeze schema v1** (or reconcile with an existing schema if one is already built). |
| Entry condition | M1 answers on what exists; D-03. |
| Deliverables | ER diagram; schema v1; Database Schema Document started or updated. |
| Role | R2 leads; R1 reviews; R3 and R4 check their needs are covered. |
| Acceptance | Every Must FR maps to a table or column; at least six tables; reviewed by all four. |
| Risks | Late schema changes — only through a short written change note. |

**M3 — Supabase PostgreSQL implementation and sample data**
| Item | Detail |
|---|---|
| Tasks | Create tables and constraints from versioned scripts; load synthetic seed data (Section 15) including the worked example, a diamond graph, a cycle, a recurring asset, same-object impact duplicates, and evidence-protection cases. |
| Entry condition | Schema v1 stable. |
| Deliverables | Table script; seed script; data log. |
| Role | R2 leads; R1 verifies a clean rebuild. |
| Acceptance | Scripts rebuild the database from scratch; constraint checks in 16.1 pass. |
| Risks | Supabase setup problems; keep scripts runnable on any PostgreSQL. |

**M4 — Phase 1 queries, relational algebra, diagrams, report and demonstration**
| Item | Detail |
|---|---|
| Tasks | Write and test the queries allocated to Phase 1 (A-04–A-10, A-14 as applicable); write the paired relational algebra (A-26); finalize ER, schema and **state** diagrams; compile the Phase 1 report in LaTeX (11.3, 11.4); prepare and rehearse the demonstration; close any pending Phase 1 corrections (13.3). R3 may build a connection test and skeleton; R4 follows 13.6. |
| Entry condition | M3. |
| Deliverables | Query files with expected-output notes; relational algebra section; three diagrams; Phase 1 report; demo script. |
| Role | R2 queries and relational algebra; R1 diagrams, report compilation, demo script; second member reviews each relational algebra expression. |
| Acceptance | Every query runs on seeded data with a one-sentence explanation; each relational algebra expression matches its SQL; diagrams match the created tables; report passes the 11.3 and 11.4 checklists; one rehearsal done. |
| Risks | If Phase 1 was already demonstrated, this milestone reduces to the corrections. |

**M5 — Advanced DBMS requirements**
| Item | Detail |
|---|---|
| Tasks | Views (A-11); EXISTS and NOT EXISTS (A-12, A-13); remaining correlated and aggregate queries; **TG-1, TG-2, SP-1, SP-2** per Section 8.8; recursive root-cause and blast-radius queries including cycle handling and the counting rule (8.4.1). |
| Entry condition | M3 (M4 desirable). |
| Deliverables | View, trigger, procedure and advanced query scripts with tests. |
| Role | R2 leads; R1 reviews. |
| Acceptance | Each object demonstrated directly in the database; 16.6 tests pass. |
| Risks | PostgreSQL versus Oracle syntax differences; confusing database objects with Python logic. |

**M6 — FastAPI backend implementation**
| Item | Detail |
|---|---|
| Tasks | Project structure; connection pooling and configuration; request/response models; endpoints for events, reference data, relationships, evidence, impacts, status changes, root-cause, blast-radius, as-of, search, dashboard, reports; authentication and authorization (D-05); error mapping (NFR-020); `CALL` of SP-1 and SP-2. |
| Entry condition | Schema v1 stable; M5 objects as they become available. |
| Deliverables | Running API with interactive documentation; endpoint tests. |
| Role | R3 leads; R2 supports queries; R1 reviews. |
| Acceptance | Every Must FR has an endpoint; correct results and errors; secrets only in `.env`. |
| Risks | Connection configuration problems — test early (M1). |

**M7 — React frontend and integration**
| Item | Detail |
|---|---|
| Tasks | Layout and navigation; login; the five proposed forms PF-1 to PF-5; event list and search; event detail; root-cause and blast-radius views (simple list or tree first); timeline; dashboard; application reports; API connection; validation and error display. |
| Entry condition | Phase 1 database foundation stable (13.6); API endpoints from M6 (use mock data until ready). |
| Deliverables | Frontend integrated with the backend. |
| Role | R4 leads; R3 supports integration; R1 coordinates. |
| Acceptance | The worked example runs end to end in the browser; all five forms submit; reports generate. |
| Risks | Late integration — agree API shapes early. |

**M8 — Testing, reports, documentation and final demonstration**
| Item | Detail |
|---|---|
| Tasks | Run the full test plan (Section 16); fix defects; finalize the Architecture and Schema Documents; collect test evidence; update matrix statuses honestly against the **official** guideline; produce Phase 2 report or deliverables as clarified (D-20); rehearse twice; export a database backup. |
| Entry condition | M5–M7, or as much as exists. |
| Deliverables | Test evidence; final documents; demo script; backup. |
| Role | R1 leads; everyone tests components they did not build. |
| Acceptance | Phase 2 and Complete readiness conditions (Section 18) met. |
| Risks | Insufficient testing time — cut Could/Should items, not tests. |

### 13.6 R4's work before and after the Phase 1 database foundation is stable
**Before the Phase 1 foundation is demo-ready (or while it is being closed out), R4 is not blocked from preparation:** wireframes; studying React; planning the five forms (PF-1 to PF-5); discussing API requirements with R3 and R2.

**After the foundation is stable,** full frontend implementation and integration take priority. Parallel implementation earlier is justified only if faculty requirements or the remaining time call for it (decision for R1 with the team).

### 13.7 Scope triage if time is short
Because the Phase 2 window is described as this week, the team should first establish what exists (13.3), then protect work in this order:
1. Database objects and queries the rubric requires (A-04 to A-16), including relational algebra and the three diagrams if Phase 1 is not closed.
2. The five forms and the reports, in minimal form.
3. The root-cause and blast-radius core.
4. Tests and evidence for the above.

Cut order: **Could** items first (graph visualization, export), then **Should** extras (charts, recurrence screen, advanced temporal features). **Never cut:** rubric database objects, the evidence rule, and testing.

---

## 14. Team Organization

| Role | Primary responsibility | Also supports |
|---|---|---|
| **R1 — Project lead & integration** | Planning, faculty communication, repository management, diagrams, Phase 1 report compilation, integration, review, demo coordination. | Testing and documentation |
| **R2 — Database design & SQL** | Schema, constraints, seed data, all SQL queries, relational algebra, views, triggers (TG-1, TG-2), procedures (SP-1, SP-2). | API query design |
| **R3 — Backend (Python/FastAPI)** | API, connection, validation, authorization, error mapping, endpoint tests. | SQL review |
| **R4 — Frontend (React)** | UI, forms, visualizations, reports, usability. During database-foundation work: preparation only (13.6). | API tests, documentation |

Names are not assigned (**D-13**). **[A]** Roles may overlap realistically. **Testing and documentation are shared across all four.**

**Everyone understands the whole project:** each member reads this document and presents one section; everyone runs the worked example end to end; demo narrators rotate and each member explains one query and one endpoint they did not write; short daily check-ins and a weekly integration review.

**Definition of done (per workstream):**
| Workstream | Done when |
|---|---|
| Database | Scripts rebuild from scratch; constraints tested; seed data labelled; objects demonstrated in the database; scripts in Git |
| Queries and relational algebra | Run on seeded data; expected outputs recorded; each relational algebra expression matches its SQL; reviewed by another member |
| Backend | Endpoint documented; success and error cases tested; authorization checked; no secrets committed; reviewed |
| Frontend | Screen matches requirement; validation messages shown; works against the real API; reviewed |
| Documentation and report | Accurate to the current build; checked against 11.3/11.4 where applicable; reviewed; version recorded |
| Diagrams | Match the created database |

---

## 15. Data Strategy

CAMPUS MEMORY must never present invented events as real campus events.

| Data class | Description | Rules |
|---|---|---|
| **Verified real campus data** | Events from authorized campus staff or records, with permission. | Written permission recorded; source, date and person/department noted; marked "verified". No personal data beyond need. |
| **Public information** | Publicly documented events or facts. | Source link/title and access date recorded; marked "public". |
| **Synthetic data** | Invented data for testing and demonstration. | Marked "synthetic" in a visible field and in the demo; never described as real. |
| **Estimated impact values** | Impact numbers not measured. | Marked "estimated" with the assumption behind them; reported separately from verified totals (FR-028). |

**Documentation of every dataset:** a data log (Markdown file in the repository) with source, collection date, collector, permission, class and assumptions. **Timestamps:** event time and record time stored separately (FR-032); consistent time-zone handling (proposed: store with time zone, display in India Standard Time). **Confidence:** a defined scale in the Schema Document; each link needs an explanation, confirmed links need evidence.

**[A] Initial dataset target:** a few hundred rows at most, including: the worked example; a diamond-shaped path; a cycle; a recurring asset; events without impacts; all four categories; a time range for temporal tests; **same-object impact duplicates** (8.4.1); a confirmed relationship with one evidence record (for TG-2 tests); a reversed-time relationship (FR-014).

**D-04.** If real data cannot be obtained quickly, the project proceeds with fully synthetic data, labelled as such.

---

## 16. Testing and Acceptance Strategy

No test is claimed to have passed. Evidence (screenshots, outputs) will be stored in `docs/test-evidence/`.

| # | Category | What to test | Success looks like |
|---|---|---|---|
| 16.1 | **Schema and constraints** | Keys, NOT NULL, UNIQUE, CHECK, FK rules; self-link and duplicate-link rejection; time-range validity; controlled values | Each invalid insert is rejected by the **database**; each valid insert succeeds. |
| 16.2 | **SQL query and relational algebra correctness** | Every query in the matrix; each relational algebra expression against its SQL | Output matches hand-calculated results on seed data; each expression gives the same result as its SQL. |
| 16.3 | **Root-cause traversal** | Worked example; confirmed-only versus include-suspected; branches; cycle; event with no cause; event reachable by two paths | Correct chains; each event once at minimum depth; cycle terminates; suspected links labelled. |
| 16.4 | **Blast radius and duplicate-impact prevention** | Linear chain; diamond; confirmed-only filter; estimated versus verified totals; **same-object duplicates; impacts without an affected-object reference** | Totals equal the hand-calculated figure under the rule in 8.4.1; excluded duplicates listed; unreferenced impacts flagged. |
| 16.5 | **Temporal and history** | As-of queries; status reconstruction; timeline order; record time versus event time; **last-modified metadata (FR-005)** | Results equal a manual reading of the history rows; the limitation of FR-005 is documented. |
| 16.6 | **Triggers and stored procedures** | **TG-1:** create → one row; change status → one more; edit other field → none; same status again → none; change made in the SQL Editor → row. **TG-2:** direct insert as confirmed → rejected; confirm without evidence → rejected; add evidence then confirm → accepted; delete last evidence of a confirmed relationship → rejected; downgrade then delete → allowed; delete one of two evidence items → allowed. **SP-1:** valid call creates the event plus exactly one history row; invalid input → error and no rows. **SP-2:** close with reason → history row; no reason → error; already closed → error; disallowed source status → error | Expected rows produced; failed calls leave no partial data; each object demonstrated directly in the database and through the API. |
| 16.7 | **FastAPI endpoint testing** | Success, validation failure, not-found, unauthorized, forbidden, database error; database rule violations mapped to clear errors (NFR-020); reversed-time warning flow (FR-014) | Correct status codes and structured messages. |
| 16.8 | **React/FastAPI integration** | Each form and screen end to end; the worked example from the browser | Data entered in the UI is stored and shown correctly. |
| 16.9 | **Invalid input and errors** | Empty/oversized/special-character input; injection-style strings; bad dates | No crash, no corruption, clear messages. |
| 16.10 | **Access control and credential exposure** | Each role against each endpoint; search repository and built frontend for secrets; test any Supabase generated-API exposure | No role exceeds its permissions; no credentials in React code, bundles or Git history; no access via other routes. |
| 16.11 | **Report verification** | Both application reports versus direct SQL; Phase 1 report against 11.3 and 11.4 | Figures match exactly; every structure and formatting item checked. |
| 16.12 | **Rebuild and backup** | Rebuild the database from scripts in a fresh project; restore from export | Identical row counts and working queries. |

**Concrete acceptance criteria (summary):**
1. The worked example yields UPS failure → switch failure → lab network outage → lab session cancellation, and the forward blast radius from the UPS failure.
2. A confirmed relationship without evidence cannot be saved, and the last evidence of a confirmed relationship cannot be deleted.
3. An event and its impacts reachable through two paths are counted once.
4. Every status change produces exactly one history entry; unchanged status produces none.
5. A reporter cannot confirm a relationship; a decision-maker cannot edit anything.
6. The browser makes no direct database connection and holds no database credentials.

---

## 17. Risks, Dependencies and Mitigation

Likelihood/impact: **H** high · **M** medium · **L** low. Ratings are **[A]** judgments.

| ID | Risk | Likelihood | Impact | Mitigation | Decision needed |
|---|---|---|---|---|---|
| R-01 | Faculty do not approve PostgreSQL/Supabase; a late migration is expensive with Phase 2 imminent | M | H | Ask immediately; keep SQL in versioned files with standard SQL where practical; prepare alternatives (10.7). | D-01 |
| R-02 | Phase 1 status or pending corrections unknown | H | H | Confirm in 13.3 before planning further work. | D-19 |
| R-03 | Phase 2 window described as this week; remaining scope may not fit | H | H | Triage (13.7); establish what exists first. | D-02, D-19 |
| R-04 | Limited access to verified campus data | H | M | Clearly labelled synthetic data. | D-04 |
| R-05 | Incorrect or unverified causal links | M | H | Statuses, confidence, evidence rule (TG-2), no automatic linking, "recorded root" wording. | — |
| R-06 | Late schema changes | M | H | Freeze schema v1; written change notes; rebuildable scripts. | D-03 |
| R-07 | Team integration problems | M | M | Agree API shapes early; weekly integration; shared definition of done. | — |
| R-08 | React/FastAPI integration delays | M | M | Mock data in the frontend; API interactive docs; integrate early. | — |
| R-09 | Database connection or configuration problems | M | M | Test on every machine in M1; document the working configuration. | D-07 |
| R-10 | Insufficient testing time | H | H | Reserve M8; cut features, not tests. | — |
| R-11 | Supabase generated API or defaults expose data | L–M | H | Review settings; test unauthenticated access; follow NFR-007. | D-06 |
| R-12 | Secrets committed accidentally | M | H | Git-ignore `.env`; scan before each push; rotate if leaked. | — |
| R-13 | Matrix wrong because the guideline was not checked | M | H | Complete Section 21 as soon as documents are available; keep a query margin. | — |
| R-14 | Team member unavailable | M | M | Pairing; everyone understands the whole system. | — |
| R-15 | Over-ambitious features | M | M | Strict scope (5.2). | — |
| R-16 | **Unknown progress causes duplicated or skipped work** | M | H | Status table 13.2; confirmations 13.3; roadmap starts at the first unmet milestone. | D-19 |
| R-17 | **Phase 1 report does not meet structure or format** (LaTeX, font, sizes, spacing, margins, blue title sheet, certificate) | M | M | Build to the 11.3 and 11.4 checklists; compile early; confirm unclear items. | D-20 |
| R-18 | **Relational algebra omitted or wrong** | M | H | Separate item A-26; reviewer for each expression; pair with SQL. | D-21 |
| R-19 | **Trigger/procedure designs mistaken for implemented, or judged not database-level** | L–M | H | Ground rules in 8.8.1; demonstrate directly in the SQL Editor; never count Python code. | D-22 |

---

## 18. Definition of Success

All academic conditions are **Unverified — confirm against the official guideline.** They are **[A]** proposals until the guideline is checked. If a phase has already happened, record its actual outcome here rather than ticking boxes from this list.

### 18.1 Phase 1 readiness (proposed contents)
- [ ] Faculty answer on the DBMS obtained, or a documented fallback
- [ ] At least 6 tables with primary keys, foreign keys where applicable, at least 5 attributes each
- [ ] Seed data loaded and labelled (synthetic / verified / public)
- [ ] Phase 1 queries run correctly and are explained (A-04 to A-10, A-14 as allocated)
- [ ] Relational algebra expressions written and paired with their SQL (A-26)
- [ ] ER, schema and state diagrams match the created tables (A-19 to A-21)
- [ ] Phase 1 report compiled in the required structure and format (A-27, A-28)
- [ ] The worked example chain can be shown in SQL
- [ ] Demonstration rehearsed once
- [ ] Any pending Phase 1 corrections closed (13.3)

### 18.2 Phase 2 readiness (proposed contents)
- [ ] Phase 1 items maintained
- [ ] Views, EXISTS, NOT EXISTS, correlated and aggregate queries complete
- [ ] Two triggers and two stored procedures working **inside the database** (TG-1, TG-2, SP-1, SP-2)
- [ ] FastAPI backend serves all Must requirements
- [ ] React frontend with at least five forms integrated with the backend; mapping to official categories done
- [ ] Reports generate correctly (interpretation per D-20)
- [ ] Root-cause and blast-radius features work end to end
- [ ] Test evidence and documentation complete
- [ ] Two demonstration rehearsals

### 18.3 Complete project readiness
- [ ] All Must and most Should requirements satisfied and tested
- [ ] Compliance matrix statuses updated honestly against the **official** guideline
- [ ] No secrets in Git or the frontend
- [ ] Rebuild from scripts verified; backup exported
- [ ] Every team member can explain and demonstrate the entire system

---

## 19. Decisions Pending

"Needed by" is expressed as a milestone or "ASAP"; no calendar date is invented.

| ID | Decision | Owner | Needed by | Default if no answer |
|---|---|---|---|---|
| D-01 | **Faculty approval of PostgreSQL/Supabase** | R1 → faculty | ASAP | Proceed with portable SQL; **do not claim compliance** |
| D-02 | **Exact Phase 1 and Phase 2 demo dates** and contents (Phase 1 date is historical) | R1 → faculty | ASAP | Treat Phase 2 as starting this week |
| D-03 | Final schema and table count | R2 | End of M2 | At least 6 tables, indicative 8–10 |
| D-04 | Data availability (real vs synthetic) | R1 | M2 | Fully synthetic, labelled |
| D-05 | Authentication and authorization scope (Supabase Auth or application-managed; roles in v1) | R3 + R1 | Before M6 | Minimal application-managed roles enforced by the backend |
| D-06 | Whether optional Supabase services are used; how the generated API is restricted | R1 + R3 | Before M6 | Only database hosting, SQL Editor and Dashboard |
| D-07 | Database connection method (direct, session pooler, transaction pooler) | R3 | M1 / M6 | The one that works reliably on all team machines |
| D-08 | Exact versions of React, Python, FastAPI, database driver, PostgreSQL (as provided by Supabase) | R1 | M1 | Current stable versions at project start, recorded in the repo |
| D-09 | Hosting and deployment approach | R1 | Before M7 | Local demonstration plus hosted database |
| D-10 | Time representation (event time vs record time; how as-of history is stored) | R2 | M2 | Event time plus record time; status history drives as-of |
| D-11 **(v0.2)** | Cause-after-effect rule: kept as a **warning with override reason** (FR-014); whether the database should also enforce it (needs a cross-table check) | R1 + R2 | M2 | Application-level warning only |
| D-12 | Report and export format | R1 | Before M7 | On-screen table plus CSV |
| D-13 | Assignment of named people to R1–R4 | Team | M1 | Proposed split in Section 14 |
| D-14 | Whether Phase 1 requires the backend/frontend or SQL only | R1 → faculty | ASAP | Assume SQL, relational algebra, diagrams and report |
| D-15 **(new)** | Include general (field-level) audit history in version 1, or keep FR-005's last-modified traceability only (FR-050) | R1 + R2 | M2 | Last-modified metadata only |
| D-16 **(new)** | Impact counting details: largest versus sum versus manual review; units; structured affected-object reference; verified/estimated handling (8.4.1) | R2 + R1 | M2 | Rule as proposed in 8.4.1 |
| D-17 **(new)** | Status vocabulary, allowed transitions, closing status and close-event rules; state diagram content | R2 + R1 | M2 | Illustrative states in 8.8.6 |
| D-18 **(new)** | Evidence-enforcement details: atomic create-confirmed procedure, concurrency/locking, cascade interaction, where the downgrade reason is stored | R2 | M2 | Design in 8.2.1 |
| D-19 **(new)** | Current project status: Phase 1 demonstrated?, corrections pending?, completion status of every area in 13.2 | R1 + team | ASAP | Treat every area as "Team confirmation required" |
| D-20 **(new)** | Report requirements: what "two reports" means; whether Phase 2 has a report document; LaTeX template and font choice; blue title sheet and certificate details | R1 → faculty | ASAP | Application reports FR-038/039 plus Phase 1 report per 11.3/11.4 |
| D-21 **(new)** | Relational algebra scope, count and notation | R1 → faculty | M4 | Expression for each Phase 1 SQL query where expressible |
| D-22 **(new)** | Trigger/procedure technical details: how user identity and reason reach TG-1; how SP-1 returns the new identifier; trigger counting basis | R2 | M2 | Columns on the event row for identity and reason; identifier returned by the procedure |

---

## 20. References

**Source documents (not available when this document was drafted):**
1. CAMPUS MEMORY Project Overview — team's original document. *Not available; not checked.*
2. Official 24CS520 DBMS Mini Project Guidelines. *Not available; not checked.*

**Information actually used:** the team's original prompt and its requirement summaries; v0.1 of this document; the v0.2 revision brief and the requirement summary it reproduces (Phase 1 report structure, formatting, phase allocation).

No bibliographic details, external citations or faculty communications have been invented. If external technical documentation (PostgreSQL, Supabase, FastAPI, React, psycopg) is cited later, the exact link and access date will be added then, clearly separated from the two source documents.

---

## 21. Confirmation Checklist for When the Original Documents Become Available

Complete this checklist first; then update this document to v0.3 and change the legend tags.

### 21.1 From the official 24CS520 Guidelines
- [ ] Exact Phase 1 and Phase 2 demonstration dates and what must be shown in each
- [ ] Which requirements belong to Phase 1 and which to Phase 2 — **including whether the state diagram belongs to Phase 1** (A-21)
- [ ] Whether query counts are per phase or total
- [ ] **Allowed DBMS list** — is PostgreSQL/Supabase accepted? (or written faculty approval obtained and filed)
- [ ] At least six tables; primary and foreign keys; at least five attributes per table
- [ ] Five simple queries; five nested queries
- [ ] Two set-operation queries (accepted syntax)
- [ ] Two GROUP BY; two HAVING; three LIKE/BETWEEN/pattern-matching
- [ ] One correlated query; two views; one EXISTS; one NOT EXISTS; four aggregate-function queries
- [ ] Two triggers and two stored procedures (syntax, environment, counting basis; must run in the database)
- [ ] Frontend: number of forms **and the required form categories**
- [ ] What "two reports" / "two generated reports" means; Phase 2 report requirement
- [ ] **Relational algebra queries:** count, which queries, notation
- [ ] **Phase 1 report structure** matches 11.3 (blue title sheet, certificate, contents, introduction, system design, implementation, testing and results, conclusion, references)
- [ ] **Phase 1 report formatting** matches 11.4 (LaTeX, Times New Roman, 16/14/12 pt, 1.5 spacing, justified, margins 1 in top/bottom/right and 1.25 in left)
- [ ] ER, schema and state diagram notation and format
- [ ] Testing and documentation requirements
- [ ] Submission format, team-size rules, marks distribution, viva/demo format
- [ ] Any requirement in the guideline **not** in this document (add to Section 11)
- [ ] Any requirement in this document **not** in the guideline (downgrade or delete)

### 21.2 From the original CAMPUS MEMORY Project Overview
- [ ] Project name, scope and feature list match Sections 2, 5 and 7
- [ ] Definitions (technical incident, event, causal relationship, impact, scheduled activity) match Sections 5.3 and 5.4
- [ ] Roles match Section 6
- [ ] Example scenario matches
- [ ] Any feature in the overview missing here (add); any feature here missing from the overview (mark as team enhancement or remove)

### 21.3 Conflict check between the two documents (not yet possible)
- [ ] Compare overview and guideline; record each conflict in Section 1.8
- [ ] Apply the project rule: the guideline governs assessment requirements; the overview governs the intended concept

### 21.4 Project status (from Section 13.3)
- [ ] Phase 1 demonstrated? Corrections pending?
- [ ] Exact Phase 2 date and deliverables
- [ ] Completion status of every area in 13.2 filled in with real information
- [ ] Faculty reply on PostgreSQL/Supabase filed in the repository

---

*End of document. Status: DRAFT v0.2 — not verified against the official documents.*
