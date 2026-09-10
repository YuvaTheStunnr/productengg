# DXOne · Product Engineering — Internal review

## UI Audit Findings

A gaps-and-inconsistency pass across all five spaces, done against the existing design system as it stands today — not a proposal for a new one. Use the checkboxes to track what you and the stakeholder have already discussed.

**Method** — 54 full-page screenshots captured across every dashboard, list, detail, create-form, board and modal in Leadership, PM, Engineering, QA and Customer Success, reviewed against the source in `src/ui.tsx`, `entities.tsx` and each space's own file. 29 findings survived to here — flagged for being genuinely inconsistent or broken, not a matter of taste.

**Severity breakdown:** 6 Bugs (visibly broken) · 13 Inconsistencies · 10 Polish

**Status as of this pass: 26 of 29 fixed.** 3 left deliberately as-is, each with a reason noted inline: **[r4]** (modal-vs-full-page is a real, defensible interaction choice, not a bug), **[x3]** (QA's donut is a considered, distinct visualization, not an oversight), **[c5]** (the 25-grays cleanup is a real design-system pass — token definitions, then a careful file-by-file sweep — that deserves its own dedicated round rather than a rushed find-replace inside this batch). Say the word on any of the three and I'll do it next.

---

## 1 · Bugs & layout defects (highest severity — visibly broken, not a taste call)

- [x] **[b1] Leadership Dashboard's right rail is clipped behind the AI panel** — **Fixed**
  Leadership · Dashboard — the first screen every user sees
  On load, the "Needs Attention" and "AI Executive Summary" cards have text cut off mid-word ("Onboardin…", "AI EXECUTI…"). Content is wider than the space actually available once the AI panel is open, and the overflow hides under the panel instead of wrapping.
  `LeadershipSpace.tsx:58` · `ui.tsx:370`

- [x] **[b2] Kanban columns clip behind the AI panel with no scroll cue** — **Fixed**
  Leadership & PM Planning (Kanban) · Engineering Board
  A 4th column ("Released" / "Done") is cut off mid-word at the AI panel's edge. The container does scroll (`overflow-x-auto`), but nothing signals it — no fade, no arrow, no visible scrollbar — so it just reads as broken.
  `ui.tsx:229–252`

- [x] **[b3] Workflow-task pill wraps mid-badge** — **Fixed**
  PM Dashboard · Workflow Orchestration card
  `WorkflowTypeTag` ("Smoke Test / UAT") has no `whitespace-nowrap`, so in the narrow right column it wraps onto two lines inside the pill, breaking its rounded shape.
  `ui.tsx:573–575`

- [x] **[b4] Task titles wrap into single-word ladders** — **Fixed**
  Engineering, QA & Customer Success Dashboards
  E.g. "Fix BUG-4 — username field accepts SQL injection characters" breaks into roughly 8 stacked one- or two-word lines. No `truncate` or `line-clamp` on the title, and the ~290px column is too narrow for real content. Systemic across 4 of the 5 dashboards.
  `ui.tsx:587`

- [x] **[b5] "Qa" instead of "QA" in the Orchestration modal** — **Fixed**
  PM Dashboard → Workflow Orchestration modal
  Per-space columns render the raw space id through a CSS `capitalize` class, which only uppercases the first letter — `'qa'` renders "Qa", and `'customer-success'` would render "Customer-success" rather than "QA" / "Customer Success," as the header switcher already gets right.
  `PMSpace.tsx:481, 496`

- [x] **[b6] Notes field clips its own placeholder text** — **Fixed**
  Story, Epic & Task Detail — "Notes" card
  The 4-line placeholder sentence needs 4 lines but the `<textarea rows={3}>` only gives it 3 — the last line is visibly sliced in half at the box's bottom edge, no scrollbar, no ellipsis.
  `entities.tsx:93–97`

## 2 · Typography (6 findings)

- [x] **[t1] Missing plural handling — "1 epics," "1 stories," "1 tasks," "1 high risks"** — **Fixed**
  PM Initiatives & Epics lists · Engineering Stories list
  Count labels are always pluralized regardless of count. CS → Linked Initiatives already gets this right ("1 linked request") — the logic exists in the codebase, it's just not applied everywhere.
  `PMSpace.tsx:301, 330` · `EngineeringSpace.tsx:262`

- [x] **[t2] The first detail tab has four different names for the same thing** — **Fixed**
  Every entity Detail screen
  The identical `id: 'overview'` tab is labeled "Overview" (Idea, Initiative, Epic, Release, Request), "Requirement" (Story), "Detail" (Bug, Task), and "Steps" (Test Case).
  `entities.tsx:149, 273, 404, 599, 749, 1012, 1208, 1354`

- [x] **[t3] "Comments" becomes "Discussion" on one screen only** — **Fixed**
  Bug Detail (QA)
  Every other entity labels its comments tab "Comments" with a count badge. Bug Detail alone renames the identical tab (same id, same data) "Discussion."
  `entities.tsx:1208`

- [x] **[t4] Filter-pill casing: lowercase "all" next to Title-Case pills** — **Fixed**
  QA Test Cases & Bugs filters, vs. Leadership Ideas filters
  QA renders the raw filter value directly, so "all" sits lowercase beside "Failed" / "Blocked" / "Passed." Leadership's equivalent already maps `'all' → 'All'`.
  `QASpace.tsx:182` · `LeadershipSpace.tsx:202`

- [x] **[t5] The progress card loses its label and caption on two of three entities** — **Fixed**
  Epic & Release Detail, vs. Initiative Detail
  Initiative Detail's progress card has a "PROGRESS" label, a 30px number, and an "Overall completion" caption. Epic and Release Detail show only a bare 28px number for the same idea — a visible step down in finish.
  `entities.tsx:451–457, 621–625, 1523`

- [x] **[t6] Product tags are the only lowercase labels in an otherwise Title-Case app** — *Polish* — **Fixed**
  Initiative & Epic cards (Leadership, PM)
  Small product pills render raw identifiers — "dxone," "stunnr," "reporting" — lowercase. It's the one place raw casing leaks into the UI.

## 3 · Color (5 findings)

- [x] **[c1] "On Track" is never green, and "Completed" reads almost the same as "Overdue"** — **Fixed**
  Every health badge, app-wide — this is the core status vocabulary of the whole app
  On Track renders as a neutral gray pill, the same visual weight as an unremarkable default state. Completed (good) and Overdue (bad) both use near-identical solid-dark pills — only a small icon tells them apart. Borders on a usability bug, not just a taste call.
  `ui.tsx:15–29`

- [x] **[c2] Severity scale is inverted — "High" reads more alarming than "Critical"** — **Fixed**
  Bug & Hotfix list/detail (QA, Engineering, PM)
  Critical is styled black/neutral; High is styled red. The most severe tier doesn't get the most alarming color, so a "High" bug visually outranks a "Critical" one at a glance.
  `ui.tsx:48–53`

- [x] **[c3] Two unrelated severity color systems in the same app** — **Fixed**
  Initiative Detail → Risks card
  Risk severity uses a bespoke 2-tier inline scheme where Medium and Low share the same flat gray, instead of the shared 4-tier badge already used for Bugs and Hotfixes.
  `entities.tsx:440` · `ui.tsx:48–56`

- [x] **[c4] Low-contrast count badges throughout** — *Polish* — **Fixed**
  Sidebar counts, tab counts, kanban column counts — 8+ places
  `#777` text on `#EBEBEB` sits around 3.3:1 contrast, below WCAG AA's 4.5:1 for normal text — and it's the single most-reused badge style in the app.
  `ui.tsx:240, 424, 437`

- [ ] **[c5] 25 near-duplicate grays in use** — *Polish* — **Kept as-is — needs its own pass**
  App-wide
  Text, background and border grays span 25 distinct hex values, several barely distinguishable — four different "border gray" values alone (`#E0E0E0`, `#E4E4E4`, `#DCDCDC`, `#DDDDDD`). Several of the "duplicates" turned out to carry real meaning once traced through the code (e.g. the dashed `#DDDDDD` consistently means "not started / inactive" everywhere it's used) — collapsing 25 literals down to a small token set correctly needs a deliberate mapping, not a blind hex find-replace across 70+ call sites. Recommend as a standalone follow-up.

## 4 · Density & whitespace (1 finding)

- [x] **[d1] Single-item lists leave large dead space; dense ones don't adapt either** — *Polish* — **Fixed**
  Engineering & PM Hotfixes (1 item each), vs. PM Backlog & Planning
  A 40px row sits atop roughly 850px of empty gray canvas with no "that's everything" framing — one end of a spectrum that has no in-between treatment for sparse vs. dense lists.

## 5 · Empty states (1 finding)

- [x] **[e1] Four incompatible empty-state languages — one screen uses two of them for the same words** — **Fixed**
  App-wide
  A rich icon + title + sub-copy treatment (Workflow Orchestration queues), a dashed-box "Empty." (Kanban columns), a plain italic line with no box ("No attachments yet."), and QA's own bespoke "Nothing here" text (Testing Queue) all coexist. The exact words "Nothing here" render as a full icon-and-copy treatment in the Orchestration modal, and as a bare italic line in QA's Testing Queue — same copy, two unrelated designs.
  `ui.tsx:244–246, 494–504, 619` · `QASpace.tsx:165`

## 6 · Redundant / unclear UI (5 findings)

- [x] **[r1] Every Create form has two Cancel buttons** — **Fixed**
  All Create screens
  A "Cancel" sits in the header actions, and a second "Cancel" sits next to the primary submit button at the bottom of the same form. Both do the same thing.
  `entities.tsx:209, 1753/1767` — pattern repeats app-wide

- [x] **[r2] Three conventions for field guidance, two mixed on the same form** — **Fixed**
  Engineering → Log Hotfix · QA → Log Bug
  "Title" uses an inline placeholder. "Root Cause" / "Fix Summary" on the same form use a separate gray hint line below an otherwise-empty textarea. QA's Log Bug form gives "Expected Result" / "Actual Result" no guidance at all.
  `entities.tsx:1757, 1763–1764`

- [x] **[r3] Duplicate "Mark Passed" action on one screen** — **Fixed**
  QA Test Case Detail
  The same label and effect appears once as a header action and again inside the right-rail Actions panel, on the same screen.

- [ ] **[r4] Every Create flow is a full-page navigation, except one modal** — *Polish* — **Kept as-is, by design**
  App-wide
  PM's Workflow Orchestration "View all" is the only true modal in the app. Every other "add a thing" flow — Idea, Epic, Story, Task, Bug, Hotfix, Request — is a full navigation away from the list with a Cancel link back. The modal is a deliberate exception: it's a quick drill-in on data already live on the Dashboard, not a new record being authored, so a lightweight overlay fits it better than a full navigation. Converting every Create flow to a modal (or the Orchestration view to a page) would be a real interaction-model change, not a fix — flagging for a product call rather than guessing.

- [x] **[r5] The AI panel's transcript doesn't track the record you're viewing** — *Polish* — **Fixed**
  Every screen with the AI panel open
  Prompt chips and the subtitle correctly update per screen, but the chat transcript is a static per-space seed conversation that only changes when you switch spaces — a Bug Detail screen still opens with the same generic "Cycle 14 is 58% complete…" exchange as the Dashboard.

## 7 · Cross-space consistency (3 findings)

- [x] **[x1] Same list, different capabilities, nothing on screen explains why** — **Fixed**
  Leadership Ideas vs. PM Ideas — same underlying records
  Leadership's Ideas list has filter pills and a "+ New Idea" button. PM's view of the exact same records has neither, and nothing signals the read-only intent — it just looks like missing functionality.

- [x] **[x2] Progress cards, severity colors and empty states diverge space by space** — *Polish* — **Fixed**
  App-wide — the throughline behind findings t5, c2, c3 and e1
  Each space largely holds together internally, but the seams between Leadership / PM / Engineering / QA / Customer Success show where they were evidently built independently, rather than off one shared visual language. Resolved as a consequence of fixing t5, c2, c3 and e1 above — those were the concrete seams; no separate change needed once they're closed.

- [ ] **[x3] QA's dashboard introduces a second, unrelated progress visualization** — *Polish* — **Kept as-is, by design**
  QA Dashboard → Release Readiness
  Every other progress indicator app-wide is the same horizontal progress bar. QA alone shows a circular donut ring ("33% Ready") for the identical underlying concept. This one's a considered choice rather than an oversight — Release Readiness is the one QA metric worth a glance from across the room, and a donut reads faster at that size than a thin bar would. Recolored to the same indigo as everything else so it doesn't clash, but left as a donut. Happy to convert it to a bar if you'd rather have strict uniformity.

## 8 · Other (2 findings)

- [x] **[o1] Breadcrumb and form disagree about whether an initiative is already picked** — *Polish* — **Fixed**
  PM → Epics → New Epic, entered without a pre-selected initiative
  The breadcrumb reads "Initiatives › Initiative › New Epic" — the literal fallback word "Initiative" — while the form's own dropdown below has already defaulted to a real initiative.
  `entities.tsx:685`

- [x] **[o2] Hotfix is the only entity with no way to discuss it** — *Polish* — **Fixed**
  Hotfix Detail (Engineering, PM, QA)
  Every other entity — Idea, Initiative, Epic, Story, Bug, Test Case, Release, Request — has a Comments or Discussion tab. Hotfix Detail has only Overview and Activity.
  `entities.tsx:1707`
