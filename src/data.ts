// ─────────────────────────────────────────────────────────────────────────────
// Domain model
//
// Hierarchy:  Initiative → Epic → Story → Task → Subtask
// Initiative ↔ Products (many)   Product → Teams
// Ideas and Customer Requests are independent first-class entities that an
// Initiative may optionally reference — never required.
//
// Health is NEVER assigned manually. It is always derived from workflow
// state, progress, deadlines and blocked descendants — see computeHealth()
// and the *Health()/*Pct()/*Blocked() helpers below.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Status Types ─────────────────────────────────────────────────────────────

export type WorkflowState = 'Draft' | 'Planning' | 'In Progress' | 'Testing' | 'Released' | 'Paused'
export type Health = 'Not Started' | 'On Track' | 'Blocked' | 'Overdue' | 'Completed'
export type Space = 'leadership' | 'pm' | 'engineering' | 'qa' | 'customer-success'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

// Customer Request lifecycle — owned by Customer Success. A request moving
// through these stages is independent of any Initiative's own WorkflowState;
// "Linked to Initiative" only means a plan now exists, not that work has
// started (see RequestStatus vs the linked Initiative's own state).
export type RequestStatus = 'New' | 'Under Review' | 'Accepted' | 'Linked to Initiative' | 'In Progress' | 'Released' | 'Closed' | 'Rejected'

// ─── Shared sub-types ───────────────────────────────────────────────────────

export interface Comment {
  id: string; author: string; role: string; text: string; time: string
}

export interface Attachment {
  id: string; name: string; type: 'image' | 'video' | 'document' | 'link'
  meta: string; uploadedBy: string; uploadedAt: string
}

export interface ActivityItem {
  id: string; who: string; role: string; action: string; time: string
}

// ─── Products & Teams ─────────────────────────────────────────────────────────

export interface Product {
  id: string; name: string; description: string; color: string
}

export interface Team {
  id: string; name: string; productIds: string[]; lead: string
}

// ─── Ideas & Customer Requests (independent, non-sequential) ─────────────────

export interface Idea {
  id: string; title: string; description: string
  status: 'Idea' | 'Converted' | 'Rejected'
  createdBy: string; createdByRole: string; createdAt: string
  initiativeId?: string
  rejectionReason?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface CustomerRequest {
  id: string; title: string; description: string
  source: 'Customer Success' | 'Sales' | 'Support'
  requestedBy: string; accountId?: string; requestedAt: string
  priority: Priority
  stage: RequestStatus
  // Many-to-many: a request may inform more than one Initiative (e.g. a
  // platform-wide ask that's addressed piecemeal), and is never required to
  // link to any. Linking does not happen at creation time — see
  // CreateCustomerRequest — it's a decision made once a plan exists.
  initiativeIds: string[]
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

// ─── Accounts ───────────────────────────────────────────────────────────────
// Customer Success' unit of "who": the org behind a Customer Request. Kept
// separate from CustomerRequest so CS can see everything one account has
// asked for, not just a free-text label repeated per-request.

export interface Account {
  id: string; name: string; tier: 'Enterprise' | 'Mid-Market' | 'SMB'; owner: string; arr?: string
}

// ─── Core delivery hierarchy ───────────────────────────────────────────────────

export interface Initiative {
  id: string; title: string; goal: string; description: string; targetDate: string
  workflowState: WorkflowState
  productIds: string[]
  pm: string; engLead: string; qaLead: string
  epicIds: string[]
  milestones: { label: string; date: string; done: boolean }[]
  risks: { text: string; severity: 'High' | 'Medium' | 'Low' }[]
  blockedReason?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface Epic {
  id: string; initiativeId: string; title: string; description: string
  workflowState: WorkflowState
  assignee: string; storyIds: string[]
  targetDate?: string
  blockedReason?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface Story {
  id: string; epicId: string; title: string; description: string
  acceptanceCriteria: string[]
  workflowState: WorkflowState
  points: number; assignee: string
  taskIds: string[]; testCaseIds: string[]; bugIds: string[]
  cycleId?: string; targetDate?: string
  blockedReason?: string
  qaState?: 'Pending' | 'Approved' | 'Rejected' | 'Clarification Requested'
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface Subtask {
  id: string; taskId: string; title: string; done: boolean; assignee?: string
}

export interface Task {
  id: string; storyId: string; title: string; description: string
  assignee: string; estimate: number
  workflowState: WorkflowState
  branch?: string; prNumber?: number
  subtaskIds: string[]
  blockedReason?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface Bug {
  id: string; title: string; storyId?: string; epicId?: string
  severity: Priority
  workflowState: 'Open' | 'In Fix' | 'Fixed' | 'Verified' | 'Closed'
  assignee: string; reporter: string
  reproSteps: string[]; expectedResult: string; actualResult: string
  environment: string; linkedTestCaseIds: string[]
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface TestCase {
  id: string; title: string; storyId: string
  steps: { step: string; expected: string; actual?: string }[]
  status: 'Not Run' | 'Passed' | 'Failed' | 'Blocked'
  assignee: string; linkedBugIds: string[]; lastRun?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

export interface Release {
  id: string; name: string; targetDate: string
  workflowState: WorkflowState
  epicIds: string[]
  gateChecks: { label: string; passed: boolean; note?: string }[]
  description: string
  blockedReason?: string
  comments: Comment[]; attachments: Attachment[]; activity: ActivityItem[]
}

// Cycle replaces "Sprint" — used only where a team opts into cycle planning.
// Many rollups (backlog stories, epics, releases) use targetDate instead and
// never require a Cycle at all.
export interface Cycle {
  id: string; name: string; startDate: string; endDate: string; current: boolean
  storyIds: string[]; productId: string
}

// ─── Workflow Orchestration ────────────────────────────────────────────────────
// System-generated cross-role tasks. These are never created by hand — the
// product automatically opens one whenever work crosses a role boundary
// (QA logs a bug → Engineering gets a Bug Fix task; Engineering moves a story
// to QA → QA gets a Validation task; etc.)

export type WorkflowTaskType = 'Bug Fix' | 'Smoke Test / UAT' | 'Story Review' | 'Scope Review' | 'Validation' | 'Clarification' | 'Customer Update'

export interface WorkflowTask {
  id: string; type: WorkflowTaskType; title: string; detail: string
  targetSpace: Space; assignee: string
  sourceType: 'Bug' | 'Story' | 'Epic' | 'Initiative'; sourceId: string
  triggeredBy: string; createdAt: string
  status: 'Pending' | 'Acknowledged' | 'Done'
}

// ─── Seed: Products & Teams ────────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  { id: 'prod-dxone', name: 'DXOne', description: 'Core consumer mobile app.', color: 'bg-[#1A1A1A]' },
  { id: 'prod-stunnr', name: 'Stunnr', description: 'Creator-facing companion app.', color: 'bg-[#555555]' },
  { id: 'prod-reporting', name: 'Reporting', description: 'Internal analytics & reporting suite.', color: 'bg-[#888888]' },
]

export const TEAMS: Team[] = [
  { id: 'team-mobile', name: 'Mobile Platform', productIds: ['prod-dxone'], lead: 'Sam Liu' },
  { id: 'team-growth', name: 'Growth', productIds: ['prod-dxone', 'prod-stunnr'], lead: 'Morgan Tse' },
  { id: 'team-payments', name: 'Payments', productIds: ['prod-dxone'], lead: 'Jordan Mills' },
  { id: 'team-identity', name: 'Identity', productIds: ['prod-dxone', 'prod-stunnr', 'prod-reporting'], lead: 'Jordan Mills' },
  { id: 'team-insights', name: 'Insights', productIds: ['prod-reporting'], lead: 'Priya Sinha' },
]

// ─── Seed: Accounts (Customer Success) ─────────────────────────────────────────

export const ACCOUNTS: Account[] = [
  { id: 'acct-acme', name: 'Acme Corp', tier: 'Enterprise', owner: 'Nina Patel', arr: '$420K' },
  { id: 'acct-globex', name: 'Globex Retail', tier: 'Mid-Market', owner: 'Nina Patel', arr: '$96K' },
  { id: 'acct-initech', name: 'Initech', tier: 'SMB', owner: 'Nina Patel', arr: '$18K' },
]

// ─── Seed: Comments / Attachments / Activity ───────────────────────────────────

export const COMMENTS: Comment[] = [
  { id: 'c1', author: 'Alex Chen', role: 'PM', text: 'This needs to be unblocked before the Aug 14 beta. Can we get a status update from Jordan on the cert?', time: '2h ago' },
  { id: 'c2', author: 'Sam Liu', role: 'Engineering', text: "I've opened a ticket with the merchant portal. ETA is 3–5 business days.", time: '1h ago' },
  { id: 'c3', author: 'Dana Rao', role: 'QA', text: "I'll hold off on the Apple Pay test cases until the cert is resolved. Will mark as blocked.", time: '45m ago' },
  { id: 'c4', author: 'Riley Kim', role: 'Design', text: 'Final screens for Feature Tour are uploaded to Figma. Link in the initiative doc.', time: '3h ago' },
  { id: 'c5', author: 'Morgan Tse', role: 'Engineering', text: 'Subtask 3 is done. Pushing PR today.', time: '5h ago' },
  { id: 'c6', author: 'Priya Sinha', role: 'QA', text: 'Found a regression in the avatar upload flow when the file is exactly 5MB. Logging a bug.', time: '1d ago' },
  { id: 'c7', author: 'Alex Chen', role: 'PM', text: "Agreed. Let's defer Bulk Export to Q4 — usage signal is low and it saves 8 pts this sprint.", time: '2d ago' },
  { id: 'c8', author: 'Jordan Mills', role: 'Engineering', text: 'Identity provider handshake works against staging for all three products now.', time: '6h ago' },
  { id: 'c9', author: 'Dana Rao', role: 'QA', text: 'Requesting clarification — should token refresh be silent or prompt re-auth after 90 days?', time: '2h ago' },
]

function mkAtt(id: string, name: string, type: Attachment['type'], meta: string, by: string, at: string): Attachment {
  return { id, name, type, meta, uploadedBy: by, uploadedAt: at }
}

function mkAct(id: string, who: string, role: string, action: string, time: string): ActivityItem {
  return { id, who, role, action, time }
}

// ─── Seed: Ideas ────────────────────────────────────────────────────────────────

export const IDEAS: Idea[] = [
  {
    id: 'idea-1', title: 'Single sign-on across all products', status: 'Converted',
    description: 'Customers juggling DXOne, Stunnr and Reporting logins separately are a recurring support and churn signal. One identity should work everywhere.',
    createdBy: 'Jamie Okonkwo', createdByRole: 'VP Product', createdAt: 'Jun 3, 2026',
    initiativeId: 'init-6',
    comments: [], attachments: [mkAtt('att-i1', 'sso-market-scan.pdf', 'document', '1.2 MB', 'Jamie Okonkwo', 'Jun 3, 2026')],
    activity: [mkAct('act-i1a', 'Jamie Okonkwo', 'Leadership', 'created this idea', 'Jun 3, 2026'), mkAct('act-i1b', 'Jamie Okonkwo', 'Leadership', 'converted this idea into Unified Authentication', 'Jun 10, 2026')],
  },
  {
    id: 'idea-2', title: 'Gamified onboarding streaks', status: 'Idea',
    description: 'Reward users with a visible streak for completing onboarding steps within their first 3 days — similar pattern drove +18% activation in a competitor teardown.',
    createdBy: 'Jamie Okonkwo', createdByRole: 'VP Product', createdAt: 'Jul 22, 2026',
    comments: [], attachments: [],
    activity: [mkAct('act-i2a', 'Jamie Okonkwo', 'Leadership', 'created this idea', 'Jul 22, 2026')],
  },
  {
    id: 'idea-3', title: 'Offline mode for mobile app', status: 'Idea',
    description: 'Allow core flows (viewing profile, drafting content) to work with no connectivity and sync when back online. Frequently requested in app store reviews.',
    createdBy: 'Alex Chen', createdByRole: 'Product Lead', createdAt: 'Aug 5, 2026',
    comments: [], attachments: [],
    activity: [mkAct('act-i3a', 'Alex Chen', 'PM', 'created this idea', 'Aug 5, 2026')],
  },
  {
    id: 'idea-4', title: 'Merge Stunnr and DXOne billing systems', status: 'Rejected',
    description: 'Consolidate the two separate billing stacks into one to reduce maintenance overhead.',
    createdBy: 'Jamie Okonkwo', createdByRole: 'VP Product', createdAt: 'May 12, 2026',
    rejectionReason: 'Billing systems are intentionally separate due to differing tax jurisdictions. Revisit only if entity structure changes.',
    comments: [], attachments: [],
    activity: [mkAct('act-i4a', 'Jamie Okonkwo', 'Leadership', 'created this idea', 'May 12, 2026'), mkAct('act-i4b', 'Jamie Okonkwo', 'Leadership', 'rejected this idea', 'May 20, 2026')],
  },
]

// ─── Seed: Customer Requests ────────────────────────────────────────────────────

export const CUSTOMER_REQUESTS: CustomerRequest[] = [
  {
    id: 'cr-1', title: 'Enterprise SSO requirement — Acme Corp', priority: 'Critical',
    description: 'Acme Corp (est. ARR $420K) has made SSO with their Okta tenant a hard requirement to close the renewal, across all three products they use.',
    source: 'Sales', requestedBy: 'Taylor Grant', accountId: 'acct-acme', requestedAt: 'Jun 8, 2026',
    stage: 'In Progress', initiativeIds: ['init-6'],
    comments: [], attachments: [mkAtt('att-cr1', 'acme-okta-requirements.docx', 'document', '340 KB', 'Taylor Grant', 'Jun 8, 2026')],
    activity: [mkAct('act-cr1a', 'Taylor Grant', 'Sales', 'logged this request', 'Jun 8, 2026'), mkAct('act-cr1b', 'Nina Patel', 'Customer Success', 'linked this request to Unified Authentication', 'Jun 11, 2026'), mkAct('act-cr1c', 'Nina Patel', 'Customer Success', 'moved to In Progress', 'Jul 2, 2026')],
  },
  {
    id: 'cr-2', title: 'Dark mode for low-vision users', priority: 'Medium',
    description: 'Multiple accessibility-focused support tickets citing eye strain in bright environments. Requesting a true dark theme, not just brightness reduction.',
    source: 'Support', requestedBy: 'Casey Wu', requestedAt: 'Jul 2, 2026',
    stage: 'Linked to Initiative', initiativeIds: ['init-5'],
    comments: [], attachments: [],
    activity: [mkAct('act-cr2a', 'Casey Wu', 'Support', 'logged this request', 'Jul 2, 2026'), mkAct('act-cr2b', 'Nina Patel', 'Customer Success', 'linked this request to Dark Mode', 'Jul 9, 2026')],
  },
  {
    id: 'cr-3', title: 'Apple Pay at checkout', priority: 'High',
    description: 'Top requested payment method from iOS users in the last two quarterly NPS surveys.',
    source: 'Customer Success', requestedBy: 'Nina Patel', accountId: 'acct-globex', requestedAt: 'May 30, 2026',
    stage: 'In Progress', initiativeIds: ['init-2'],
    comments: [], attachments: [],
    activity: [mkAct('act-cr3a', 'Nina Patel', 'Customer Success', 'logged this request', 'May 30, 2026'), mkAct('act-cr3b', 'Nina Patel', 'Customer Success', 'linked this request to Payment v2', 'Jun 2, 2026')],
  },
  {
    id: 'cr-4', title: 'Bulk CSV export in Reporting', priority: 'Low',
    description: 'Ops teams want to export raw metric tables as CSV instead of screenshotting dashboards.',
    source: 'Support', requestedBy: 'Casey Wu', accountId: 'acct-initech', requestedAt: 'Aug 12, 2026',
    stage: 'Under Review', initiativeIds: [],
    comments: [], attachments: [],
    activity: [mkAct('act-cr4a', 'Casey Wu', 'Support', 'logged this request', 'Aug 12, 2026'), mkAct('act-cr4b', 'Nina Patel', 'Customer Success', 'moved to Under Review', 'Aug 14, 2026')],
  },
  {
    id: 'cr-5', title: 'SCIM provisioning for enterprise rollout', priority: 'High',
    description: 'Ahead of a company-wide rollout, Acme Corp needs automated user provisioning/deprovisioning via SCIM tied to their Okta tenant — manual account creation will not scale past 200 seats.',
    source: 'Sales', requestedBy: 'Taylor Grant', accountId: 'acct-acme', requestedAt: 'Aug 20, 2026',
    stage: 'New', initiativeIds: [],
    comments: [], attachments: [],
    activity: [mkAct('act-cr5a', 'Taylor Grant', 'Sales', 'logged this request', 'Aug 20, 2026')],
  },
  {
    id: 'cr-6', title: 'White-label branding for Initech', priority: 'Low',
    description: 'Initech asked whether the app chrome can be re-skinned with their own logo and colour palette for their internal rollout.',
    source: 'Customer Success', requestedBy: 'Nina Patel', accountId: 'acct-initech', requestedAt: 'Jul 18, 2026',
    stage: 'Rejected', initiativeIds: [],
    comments: [], attachments: [],
    activity: [mkAct('act-cr6a', 'Nina Patel', 'Customer Success', 'logged this request', 'Jul 18, 2026'), mkAct('act-cr6b', 'Nina Patel', 'Customer Success', 'rejected this request — white-labelling is not on the near-term roadmap', 'Jul 25, 2026')],
  },
]

// ─── Seed: Subtasks ─────────────────────────────────────────────────────────────

export const SUBTASKS: Subtask[] = [
  { id: 'sub-1', taskId: 'task-1', title: 'Write validation function', done: true },
  { id: 'sub-2', taskId: 'task-1', title: 'Add regex unit tests', done: true },
  { id: 'sub-3', taskId: 'task-1', title: 'Handle unicode edge cases', done: true },
  { id: 'sub-4', taskId: 'task-2', title: 'Design error component', done: true },
  { id: 'sub-5', taskId: 'task-2', title: 'Wire to form validation', done: true },
  { id: 'sub-6', taskId: 'task-2', title: 'Add debounce on uniqueness check', done: false },
  { id: 'sub-7', taskId: 'task-2', title: 'Accessibility audit (ARIA)', done: false },
  { id: 'sub-8', taskId: 'task-4', title: 'Update schema', done: true },
  { id: 'sub-9', taskId: 'task-4', title: 'Deploy to staging', done: true },
  { id: 'sub-10', taskId: 'task-5', title: 'Component shell', done: true, assignee: 'Morgan Tse' },
  { id: 'sub-11', taskId: 'task-5', title: 'Char counter', done: false, assignee: 'Morgan Tse' },
  { id: 'sub-12', taskId: 'task-5', title: 'Link to profile API', done: false, assignee: 'Morgan Tse' },
  { id: 'sub-13', taskId: 'task-6', title: 'S3 bucket config', done: true },
  { id: 'sub-14', taskId: 'task-6', title: 'Image resize lambda', done: true },
  { id: 'sub-15', taskId: 'task-6', title: 'QA review pending', done: false },
  { id: 'sub-16', taskId: 'task-7', title: 'Overlay scaffold', done: true },
  { id: 'sub-17', taskId: 'task-7', title: 'Step navigation', done: true },
  { id: 'sub-18', taskId: 'task-7', title: 'Target element highlighting', done: false },
  { id: 'sub-19', taskId: 'task-7', title: 'Animation + timing', done: false },
  { id: 'sub-20', taskId: 'task-7', title: 'Persistence (completed state)', done: false },
]

// ─── Seed: Tasks ────────────────────────────────────────────────────────────────

export const TASKS: Task[] = [
  {
    id: 'task-1', storyId: 'story-2', title: 'Implement username validation regex', description: 'Validate username: 3–20 chars, alphanumeric + underscore, case-insensitive uniqueness check.',
    assignee: 'Morgan Tse', estimate: 3, workflowState: 'Released',
    branch: 'feat/username-validation', prNumber: 84, subtaskIds: ['sub-1', 'sub-2', 'sub-3'],
    comments: [COMMENTS[4]], attachments: [], activity: [mkAct('act-t1', 'Morgan Tse', 'Engineering', 'merged PR #84', '3d ago')],
  },
  {
    id: 'task-2', storyId: 'story-2', title: 'Add error UI states for username field', description: 'Show inline error messages for: too short, too long, invalid characters, already taken.',
    assignee: 'Morgan Tse', estimate: 4, workflowState: 'In Progress',
    subtaskIds: ['sub-4', 'sub-5', 'sub-6', 'sub-7'],
    comments: [], attachments: [], activity: [mkAct('act-t2', 'Morgan Tse', 'Engineering', 'moved to In Progress', '1d ago')],
  },
  {
    id: 'task-3', storyId: 'story-2', title: 'Write integration tests for username endpoint', description: 'Cover all edge cases in the /api/username/check endpoint.',
    assignee: 'Morgan Tse', estimate: 2, workflowState: 'Planning',
    subtaskIds: [], comments: [], attachments: [], activity: [],
  },
  {
    id: 'task-4', storyId: 'story-2', title: 'Update API validation endpoint', description: 'Add server-side validation mirror of client-side rules.',
    assignee: 'Sam Liu', estimate: 3, workflowState: 'Released',
    branch: 'feat/api-username-v2', prNumber: 81, subtaskIds: ['sub-8', 'sub-9'],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'task-5', storyId: 'story-4', title: 'Build bio input component', description: 'Multi-line bio field with 160-char limit and live counter.',
    assignee: 'Morgan Tse', estimate: 3, workflowState: 'In Progress',
    branch: 'feat/bio-input', subtaskIds: ['sub-10', 'sub-11', 'sub-12'],
    blockedReason: 'Waiting on profile API contract sign-off from Sam Liu.',
    comments: [COMMENTS[0]], attachments: [], activity: [],
  },
  {
    id: 'task-6', storyId: 'story-1', title: 'Avatar upload — S3 integration', description: 'Upload avatar image to S3, resize to 256x256 and 64x64.',
    assignee: 'Sam Liu', estimate: 5, workflowState: 'Testing',
    branch: 'feat/avatar-upload', prNumber: 89, subtaskIds: ['sub-13', 'sub-14', 'sub-15'],
    comments: [COMMENTS[5]], attachments: [], activity: [],
  },
  {
    id: 'task-7', storyId: 'story-5', title: 'Feature tour overlay component', description: 'Step-by-step spotlight overlay. Must support 8 steps and be dismissible.',
    assignee: 'Morgan Tse', estimate: 8, workflowState: 'In Progress',
    branch: 'feat/feature-tour', subtaskIds: ['sub-16', 'sub-17', 'sub-18', 'sub-19', 'sub-20'],
    comments: [COMMENTS[3]], attachments: [mkAtt('att-t7', 'feature-tour-v3.fig', 'link', 'Figma', 'Riley Kim', '3h ago')], activity: [],
  },
  {
    id: 'task-8', storyId: 'story-5', title: 'Onboarding analytics events', description: 'Track step_viewed, step_skipped, tour_completed, tour_dismissed.',
    assignee: 'Sam Liu', estimate: 2, workflowState: 'Planning',
    subtaskIds: [], comments: [], attachments: [], activity: [],
  },
  {
    id: 'task-9', storyId: 'story-16', title: 'Okta SAML connector', description: 'Implement SAML 2.0 handshake against Okta as the first supported IdP.',
    assignee: 'Jordan Mills', estimate: 8, workflowState: 'In Progress',
    branch: 'feat/okta-saml', subtaskIds: [],
    comments: [COMMENTS[7]], attachments: [], activity: [],
  },
]

// ─── Seed: Test Cases ───────────────────────────────────────────────────────────

export const TEST_CASES: TestCase[] = [
  {
    id: 'tc-1', title: 'Checkout — happy path with new card', storyId: 'story-8',
    steps: [
      { step: 'Navigate to cart with 2 items', expected: 'Cart shows 2 items and correct total', actual: 'Passed' },
      { step: 'Tap "Proceed to Checkout"', expected: 'Checkout screen opens', actual: 'Passed' },
      { step: 'Enter valid Visa card details', expected: 'Card accepted, shows last 4 digits', actual: 'Passed' },
      { step: 'Tap "Pay Now"', expected: 'Payment processes, order confirmation shown', actual: 'Passed' },
    ],
    status: 'Passed', assignee: 'Priya Sinha', linkedBugIds: [], lastRun: 'Aug 1, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'tc-2', title: 'Checkout — invalid card number handling', storyId: 'story-8',
    steps: [
      { step: 'Enter a 15-digit card number', expected: 'Inline error: "Invalid card number"', actual: 'No error shown' },
      { step: 'Tap "Pay Now" with invalid card', expected: 'Submit blocked, error highlighted', actual: 'Form submits and API returns 400' },
    ],
    status: 'Failed', assignee: 'Priya Sinha', linkedBugIds: ['bug-2'], lastRun: 'Aug 1, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'tc-3', title: 'Avatar upload — file over 5MB', storyId: 'story-1',
    steps: [
      { step: 'Tap avatar placeholder in Profile Setup', expected: 'File picker opens' },
      { step: 'Select a 6MB image file', expected: 'Error: "File too large. Max size is 5MB."' },
      { step: 'Verify original avatar unchanged', expected: 'Profile photo not modified' },
    ],
    status: 'Blocked', assignee: 'Dana Rao', linkedBugIds: ['bug-3'], lastRun: undefined,
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'tc-4', title: 'Username — already taken error', storyId: 'story-2',
    steps: [
      { step: 'Enter "alex_chen" (existing username)', expected: 'Debounce check fires after 500ms' },
      { step: 'Wait for API response', expected: 'Inline error: "Username already taken"', actual: 'Passed' },
      { step: 'Clear and enter unique username', expected: 'Error clears, green checkmark shown', actual: 'Passed' },
    ],
    status: 'Passed', assignee: 'Dana Rao', linkedBugIds: [], lastRun: 'Jul 30, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'tc-5', title: 'Apple Pay — merchant validation', storyId: 'story-9',
    steps: [
      { step: 'Navigate to checkout with Apple Pay device', expected: 'Apple Pay button visible' },
      { step: 'Tap Apple Pay button', expected: 'Native payment sheet opens' },
      { step: 'Authenticate with Face ID', expected: 'Payment submitted' },
    ],
    status: 'Blocked', assignee: 'Priya Sinha', linkedBugIds: ['bug-1'], lastRun: undefined,
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'tc-6', title: 'Regression — auth token refresh', storyId: 'story-2',
    steps: [
      { step: 'Log in and wait for token expiry (90 min)', expected: 'Token silently refreshes' },
      { step: 'Perform an API action after expiry', expected: 'Action succeeds, no logout', actual: 'Passed' },
    ],
    status: 'Passed', assignee: 'Dana Rao', linkedBugIds: [], lastRun: 'Jul 28, 2026',
    comments: [], attachments: [], activity: [],
  },
]

// ─── Seed: Bugs ─────────────────────────────────────────────────────────────────

export const BUGS: Bug[] = [
  {
    id: 'bug-1', title: 'Apple Pay merchant validation request times out after 5s', storyId: 'story-9', epicId: 'epic-7',
    severity: 'Critical', workflowState: 'Open', assignee: 'Sam Liu', reporter: 'Priya Sinha',
    reproSteps: ['Open checkout with Apple Pay-enabled device', 'Tap the Apple Pay button', 'Observe — after 5 seconds, silent timeout with no user feedback'],
    expectedResult: 'Merchant validation completes within 2s, payment sheet opens.',
    actualResult: 'Validation request times out at 5s. Native sheet never opens. No error shown to user.',
    environment: 'iOS 17.5, iPhone 15 Pro, Staging v2.3.8-rc2',
    linkedTestCaseIds: ['tc-5'], comments: [COMMENTS[0], COMMENTS[1], COMMENTS[2]], attachments: [], activity: [mkAct('act-b1', 'Priya Sinha', 'QA', 'logged this bug', '3d ago')],
  },
  {
    id: 'bug-2', title: 'CVV re-entry loop on saved card checkout', storyId: 'story-8', epicId: 'epic-5',
    severity: 'High', workflowState: 'In Fix', assignee: 'Morgan Tse', reporter: 'Dana Rao',
    reproSteps: ['Save a card in Payment Methods', 'Return to checkout and select the saved card', 'Enter CVV and tap Pay Now', 'Observe — CVV field clears and re-prompts infinitely'],
    expectedResult: 'CVV is verified once, payment proceeds.',
    actualResult: 'CVV form re-renders after each submission attempt, trapping the user.',
    environment: 'Android 14, Pixel 8, Staging v2.3.8-rc2',
    linkedTestCaseIds: ['tc-2'], comments: [COMMENTS[4]], attachments: [], activity: [],
  },
  {
    id: 'bug-3', title: 'App crashes on avatar upload when file is exactly 5MB', storyId: 'story-1', epicId: 'epic-2',
    severity: 'High', workflowState: 'Fixed', assignee: 'Sam Liu', reporter: 'Priya Sinha',
    reproSteps: ['Open Profile Setup', 'Select a JPEG image that is exactly 5,242,880 bytes (5.0 MB)', 'Observe crash immediately on file picker dismissal'],
    expectedResult: 'File at the boundary is accepted and uploaded.',
    actualResult: 'Off-by-one error in size check: `>` should be `>=`. App crashes with unhandled exception.',
    environment: 'iOS 17.5 + Android 14',
    linkedTestCaseIds: ['tc-3'], comments: [], attachments: [], activity: [],
  },
  {
    id: 'bug-4', title: 'Username field accepts SQL injection characters', storyId: 'story-2', epicId: 'epic-2',
    severity: 'High', workflowState: 'Open', assignee: 'Sam Liu', reporter: 'Dana Rao',
    reproSteps: ["Enter `alex'; DROP TABLE users;--` in the username field", 'Submit the form', 'Observe — no client-side error, value passes to API'],
    expectedResult: 'Client-side validation rejects special characters before API call.',
    actualResult: "Characters `'`, `;`, `--` pass client-side validation. Server sanitises but client should not allow.",
    environment: 'All platforms, Staging v2.3.8-rc2',
    linkedTestCaseIds: [], comments: [], attachments: [], activity: [],
  },
  {
    id: 'bug-5', title: 'White flash visible for 200ms when switching to dark mode', storyId: undefined, epicId: 'epic-2',
    severity: 'Medium', workflowState: 'Open', assignee: 'Morgan Tse', reporter: 'Alex Chen',
    reproSteps: ['Toggle dark mode from Settings', 'Observe the transition between light and dark theme'],
    expectedResult: 'Instant theme switch with no visible flash.',
    actualResult: 'White background is visible for ~200ms before dark styles apply. CSS-in-JS hydration delay.',
    environment: 'iOS 17.5',
    linkedTestCaseIds: [], comments: [], attachments: [], activity: [],
  },
  {
    id: 'bug-6', title: 'Feature tour does not resume after app backgrounding', storyId: 'story-5', epicId: 'epic-3',
    severity: 'Medium', workflowState: 'Open', assignee: 'Morgan Tse', reporter: 'Dana Rao',
    reproSteps: ['Start the feature tour', 'Background the app', 'Foreground the app', 'Observe — tour restarts from step 1'],
    expectedResult: 'Tour resumes from the last completed step.',
    actualResult: 'Tour state is not persisted across app lifecycle events.',
    environment: 'iOS 17.5 + Android 14',
    linkedTestCaseIds: [], comments: [], attachments: [], activity: [],
  },
]

// ─── Seed: Stories ──────────────────────────────────────────────────────────────

export const STORIES: Story[] = [
  {
    id: 'story-1', epicId: 'epic-2', title: 'Avatar upload flow', workflowState: 'Testing', points: 5,
    description: 'Users can upload a profile photo from their camera roll. Images must be under 5MB and are auto-resized.',
    acceptanceCriteria: ['File picker opens on tap', 'Supports JPEG, PNG, HEIC', 'Files over 5MB are rejected with a clear error', 'Image is resized to 256×256 and shown in the preview', 'Upload progress indicator shown during transfer'],
    assignee: 'Sam Liu', taskIds: ['task-6'], testCaseIds: ['tc-3'], bugIds: ['bug-3'], cycleId: 'cycle-14',
    qaState: 'Pending',
    comments: [COMMENTS[5]], attachments: [], activity: [mkAct('act-s1', 'Sam Liu', 'Engineering', 'moved story to Testing', '1d ago')],
  },
  {
    id: 'story-2', epicId: 'epic-2', title: 'Username validation', workflowState: 'In Progress', points: 8,
    description: 'Real-time username availability check with inline error states for all validation rules.',
    acceptanceCriteria: ['3–20 characters allowed', 'Only alphanumeric and underscore', 'Real-time uniqueness check with debounce', 'Clear error messages for each failure case', 'Success indicator when username is valid and available'],
    assignee: 'Morgan Tse', taskIds: ['task-1', 'task-2', 'task-3', 'task-4'], testCaseIds: ['tc-4', 'tc-6'], bugIds: ['bug-4'], cycleId: 'cycle-14',
    comments: [COMMENTS[0], COMMENTS[4]], attachments: [], activity: [mkAct('act-s2', 'Morgan Tse', 'Engineering', 'split this story into 4 tasks', '4d ago')],
  },
  {
    id: 'story-3', epicId: 'epic-2', title: 'Social sign-in integration', workflowState: 'Planning', points: 13,
    description: 'Allow users to sign in with Google or Apple during onboarding. Profile fields auto-populate from provider.',
    acceptanceCriteria: ['Google OAuth 2.0 flow', 'Apple Sign-In with privacy email relay', 'Existing account merge if email matches', 'Profile name and photo imported from provider'],
    assignee: 'Sam Liu', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Sep 20, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-4', epicId: 'epic-2', title: 'Bio and display name', workflowState: 'In Progress', points: 3,
    description: 'Editable display name (separate from username) and a 160-character bio field.',
    acceptanceCriteria: ['Display name: 1–50 characters', 'Bio: max 160 characters with live counter', 'Both fields optional', 'Saved to profile API on continue'],
    assignee: 'Morgan Tse', taskIds: ['task-5'], testCaseIds: [], bugIds: [], cycleId: 'cycle-14',
    comments: [COMMENTS[0], COMMENTS[1]], attachments: [], activity: [],
  },
  {
    id: 'story-5', epicId: 'epic-3', title: 'Step-by-step onboarding overlay', workflowState: 'In Progress', points: 13,
    description: 'A guided tour that highlights key UI elements for first-time users. Must be dismissible and resumable.',
    acceptanceCriteria: ['8-step tour highlighting core features', 'Spotlight effect on target element', 'Skip button visible at all times', 'Progress indicator (step X of 8)', 'Persists completion state across sessions'],
    assignee: 'Morgan Tse', taskIds: ['task-7', 'task-8'], testCaseIds: [], bugIds: ['bug-6'], cycleId: 'cycle-14',
    comments: [COMMENTS[3]], attachments: [mkAtt('att-s5', 'onboarding-tour-flow.mp4', 'video', '0:42', 'Riley Kim', '2d ago')],
    activity: [mkAct('act-s5a', 'Riley Kim', 'Design', 'uploaded final designs (v3)', '3d ago'), mkAct('act-s5b', 'Alex Chen', 'PM', 'adjusted scope — removed step 9', '1d ago')],
  },
  {
    id: 'story-6', epicId: 'epic-3', title: 'Skip and resume logic', workflowState: 'Planning', points: 5,
    description: 'Users can skip the tour at any point. The tour can be replayed from Settings.',
    acceptanceCriteria: ['Skip persists to user preferences', 'Settings > "Replay onboarding tour" option', 'Replaying resets all step state'],
    assignee: 'Unassigned', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Sep 25, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-7', epicId: 'epic-3', title: 'Onboarding analytics tracking', workflowState: 'Draft', points: 3,
    description: 'Track user interactions with the onboarding tour for product analytics.',
    acceptanceCriteria: ['Event: step_viewed (stepId, timestamp)', 'Event: tour_completed', 'Event: tour_skipped (atStep)', 'Events routed to Segment'],
    assignee: 'Unassigned', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Oct 1, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-8', epicId: 'epic-5', title: 'Checkout redesign — new card flow', workflowState: 'Testing', points: 8,
    description: 'Updated checkout UI for entering a new card. Inline validation, clean layout matching v2 design.',
    acceptanceCriteria: ['Luhn algorithm client-side validation', 'Inline error per field', 'Card brand detection (Visa, MC, Amex)', 'Accessible: all fields labelled for screen readers'],
    assignee: 'Sam Liu', taskIds: [], testCaseIds: ['tc-1', 'tc-2'], bugIds: ['bug-2'],
    qaState: 'Pending',
    comments: [], attachments: [], activity: [mkAct('act-s8', 'Sam Liu', 'Engineering', 'moved story to QA', '1d ago')],
  },
  {
    id: 'story-9', epicId: 'epic-7', title: 'Apple Pay SDK integration', workflowState: 'In Progress', points: 8,
    description: 'Integrate Apple Pay via the PassKit framework. Requires merchant certificate.',
    acceptanceCriteria: ['Apple Pay button displayed on capable devices', 'Merchant validation succeeds within 2s', 'Payment sheet opens correctly', 'Order confirmed on success'],
    assignee: 'Sam Liu', taskIds: [], testCaseIds: ['tc-5'], bugIds: ['bug-1'],
    blockedReason: 'Apple Pay merchant certificate pending from Apple Developer portal (ETA 3–5 business days).',
    qaState: 'Clarification Requested',
    comments: [COMMENTS[0], COMMENTS[1], COMMENTS[2], COMMENTS[8]], attachments: [], activity: [],
  },
  {
    id: 'story-10', epicId: 'epic-4', title: 'Notification preference centre', workflowState: 'Planning', points: 5,
    description: 'Granular notification settings: push, email, marketing, weekly digest.',
    acceptanceCriteria: ['Per-channel toggle switches', 'Saved to user preferences API', 'Deep-link from notification to settings'],
    assignee: 'Unassigned', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Oct 10, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-11', epicId: 'epic-4', title: 'Permission request modal', workflowState: 'Draft', points: 3,
    description: 'Pre-permission modal explaining why we need notification access before the native prompt.',
    acceptanceCriteria: ['Shown once per install', 'Clear benefit statement', 'Leading to native OS permission prompt'],
    assignee: 'Unassigned', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Oct 10, 2026',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-12', epicId: 'epic-6', title: 'Save card to payment methods', workflowState: 'In Progress', points: 5,
    description: 'Allow users to save a card after successful payment for future use.',
    acceptanceCriteria: ['Save card checkbox in checkout', 'Tokenised via Stripe', 'Visible in Settings > Payment Methods', 'Deletable from settings'],
    assignee: 'Jordan Mills', taskIds: [], testCaseIds: [], bugIds: ['bug-2'],
    blockedReason: 'Blocked on CVV re-entry loop bug (BUG-2) affecting the same checkout path.',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-13', epicId: 'epic-5', title: 'Order confirmation screen', workflowState: 'Released', points: 3,
    description: 'Post-payment confirmation with order summary, estimated delivery, and share CTA.',
    acceptanceCriteria: ['Order number displayed', 'Estimated arrival shown', 'Share order link via native share sheet'],
    assignee: 'Morgan Tse', taskIds: [], testCaseIds: [], bugIds: [], qaState: 'Approved',
    comments: [], attachments: [], activity: [mkAct('act-s13', 'Dana Rao', 'QA', 'approved this story', '1w ago')],
  },
  {
    id: 'story-14', epicId: 'epic-1', title: 'Animated welcome splash screen', workflowState: 'Released', points: 3,
    description: 'Brand animation on first launch before the welcome flow begins.',
    acceptanceCriteria: ['Plays only on first install', '1.5s duration', 'Skippable after 0.5s'],
    assignee: 'Morgan Tse', taskIds: [], testCaseIds: [], bugIds: [], qaState: 'Approved',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-15', epicId: 'epic-1', title: 'Permission prompt UI', workflowState: 'Released', points: 2,
    description: 'Explain permission needs before requesting camera, location, and notifications.',
    acceptanceCriteria: ['Shown before each native permission prompt', 'Skippable with "Not now"', 'State remembered per permission'],
    assignee: 'Sam Liu', taskIds: [], testCaseIds: [], bugIds: [], qaState: 'Approved',
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'story-16', epicId: 'epic-10', title: 'Okta SAML login', workflowState: 'In Progress', points: 8,
    description: 'Support SAML 2.0 login against a customer Okta tenant, shared across DXOne, Stunnr and Reporting.',
    acceptanceCriteria: ['SAML metadata exchange', 'Just-in-time user provisioning', 'Session shared across all three products'],
    assignee: 'Jordan Mills', taskIds: ['task-9'], testCaseIds: [], bugIds: [],
    comments: [COMMENTS[7]], attachments: [], activity: [],
  },
  {
    id: 'story-17', epicId: 'epic-11', title: 'Central identity provider service', workflowState: 'Planning', points: 13,
    description: 'Stand up a shared identity service that DXOne, Stunnr and Reporting all authenticate against.',
    acceptanceCriteria: ['Single token format across products', 'Per-product scopes and claims', 'Zero-downtime migration for existing sessions'],
    assignee: 'Unassigned', taskIds: [], testCaseIds: [], bugIds: [], targetDate: 'Nov 1, 2026',
    comments: [], attachments: [], activity: [],
  },
]

// ─── Seed: Epics ────────────────────────────────────────────────────────────────

export const EPICS: Epic[] = [
  { id: 'epic-1', initiativeId: 'init-1', title: 'Welcome Flow', description: 'Animated splash and initial permission prompts for first-time users.', workflowState: 'Released', assignee: 'Sam Liu', storyIds: ['story-14', 'story-15'], comments: [], attachments: [], activity: [] },
  { id: 'epic-2', initiativeId: 'init-1', title: 'Profile Setup', description: 'Avatar, username, display name, and bio configuration during onboarding.', workflowState: 'In Progress', assignee: 'Morgan Tse', storyIds: ['story-1', 'story-2', 'story-3', 'story-4'], comments: [], attachments: [mkAtt('att-e2', 'profile-setup-flow.png', 'image', '210 KB', 'Riley Kim', '5d ago')], activity: [] },
  { id: 'epic-3', initiativeId: 'init-1', title: 'Feature Tour', description: 'Guided first-use tour highlighting core app features with step-by-step overlay.', workflowState: 'In Progress', assignee: 'Morgan Tse', storyIds: ['story-5', 'story-6', 'story-7'], targetDate: 'Aug 28, 2026', comments: [], attachments: [], activity: [mkAct('act-e3', 'Riley Kim', 'Design', 'uploaded final designs for Feature Tour (v3)', '3d ago')] },
  { id: 'epic-4', initiativeId: 'init-1', title: 'Notification Preferences', description: 'Granular push and email notification settings presented during onboarding.', workflowState: 'Planning', assignee: 'Unassigned', storyIds: ['story-10', 'story-11'], comments: [], attachments: [], activity: [] },
  { id: 'epic-5', initiativeId: 'init-2', title: 'Checkout Redesign', description: 'New card entry flow with inline validation, order confirmation screen.', workflowState: 'Testing', assignee: 'Sam Liu', storyIds: ['story-8', 'story-13'], comments: [], attachments: [], activity: [] },
  { id: 'epic-6', initiativeId: 'init-2', title: 'Saved Payment Methods', description: 'Tokenised card storage via Stripe, manageable from Settings.', workflowState: 'In Progress', assignee: 'Jordan Mills', storyIds: ['story-12'], comments: [], attachments: [], activity: [] },
  { id: 'epic-7', initiativeId: 'init-2', title: 'Apple Pay Integration', description: 'Native Apple Pay via PassKit. Requires merchant certificate setup.', workflowState: 'In Progress', assignee: 'Sam Liu', storyIds: ['story-9'], comments: [], attachments: [], activity: [] },
  { id: 'epic-8', initiativeId: 'init-3', title: 'Usage Metrics Dashboard', description: 'Self-serve analytics showing DAU, retention, and feature adoption.', workflowState: 'Planning', assignee: 'Unassigned', storyIds: [], targetDate: 'Nov 15, 2026', comments: [], attachments: [], activity: [] },
  { id: 'epic-9', initiativeId: 'init-4', title: 'API Response Caching', description: 'Edge-layer caching to reduce P99 latency for core API routes.', workflowState: 'In Progress', assignee: 'Jordan Mills', storyIds: [], comments: [], attachments: [], activity: [] },
  { id: 'epic-10', initiativeId: 'init-6', title: 'SSO Login Experience', description: 'Shared login screen and session handoff across DXOne, Stunnr and Reporting.', workflowState: 'In Progress', assignee: 'Jordan Mills', storyIds: ['story-16'], comments: [COMMENTS[7]], attachments: [], activity: [] },
  { id: 'epic-11', initiativeId: 'init-6', title: 'Identity Provider Integration', description: 'Central identity service that all three products authenticate against.', workflowState: 'Planning', assignee: 'Unassigned', storyIds: ['story-17'], targetDate: 'Nov 1, 2026', comments: [], attachments: [], activity: [] },
]

// ─── Seed: Initiatives ──────────────────────────────────────────────────────────

export const INITIATIVES: Initiative[] = [
  {
    id: 'init-1', title: 'Onboarding Redesign', goal: 'Reduce first-session drop-off by 30% through a redesigned onboarding experience that guides users to their first value moment within 3 minutes.',
    targetDate: 'Sep 30, 2026', workflowState: 'In Progress',
    productIds: ['prod-dxone'],
    pm: 'Alex Chen', engLead: 'Sam Liu', qaLead: 'Dana Rao',
    epicIds: ['epic-1', 'epic-2', 'epic-3', 'epic-4'],
    description: 'The current onboarding flow has a 68% drop-off at the profile setup step. This initiative redesigns the end-to-end flow from first launch through to the main feed, with a guided feature tour and personalisation.',
    milestones: [
      { label: 'Kickoff', date: 'Jun 2', done: true },
      { label: 'Design complete', date: 'Jul 18', done: true },
      { label: 'Engineering cutoff', date: 'Aug 28', done: false },
      { label: 'Beta release', date: 'Aug 14', done: false },
      { label: 'GA Launch', date: 'Sep 30', done: false },
    ],
    risks: [
      { text: 'Feature Tour design approval delayed — impacts sprint 15 scope', severity: 'High' },
      { text: 'No dedicated QA resource for Notification Preferences epic', severity: 'Medium' },
      { text: 'Social sign-in requires Apple review process (up to 7 days)', severity: 'Low' },
    ],
    comments: [], attachments: [], activity: [mkAct('act-init1', 'Alex Chen', 'PM', 'created story-2 — Username validation', '2d ago')],
  },
  {
    id: 'init-2', title: 'Payment v2', goal: 'Support Apple Pay and saved payment methods to increase checkout conversion by 15%.',
    targetDate: 'Sep 30, 2026', workflowState: 'In Progress',
    productIds: ['prod-dxone'],
    pm: 'Alex Chen', engLead: 'Jordan Mills', qaLead: 'Priya Sinha',
    epicIds: ['epic-5', 'epic-6', 'epic-7'],
    description: 'Modernise the payment experience with support for Apple Pay, saved cards, and a redesigned checkout UI. Requires merchant certificate procurement from the Apple Developer portal.',
    milestones: [
      { label: 'Checkout redesign', date: 'Aug 10', done: false },
      { label: 'Apple Pay beta', date: 'Sep 5', done: false },
      { label: 'GA Launch', date: 'Sep 30', done: false },
    ],
    risks: [
      { text: 'Apple Pay merchant certificate ETA: 3–5 business days — blocks all Apple Pay testing', severity: 'High' },
      { text: 'Stripe saved card tokenisation requires additional PCI review', severity: 'Medium' },
    ],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'init-3', title: 'Analytics Dashboard', goal: 'Give the operations team self-serve reporting on DAU, retention, and feature adoption.',
    targetDate: 'Dec 15, 2026', workflowState: 'Planning',
    productIds: ['prod-reporting'],
    pm: 'Alex Chen', engLead: 'Jordan Mills', qaLead: 'Dana Rao',
    epicIds: ['epic-8'],
    description: 'Build an internal analytics dashboard that surfaces key product metrics without requiring SQL or BI tool access. Phase 1 covers DAU, retention curves, and feature flag adoption.',
    milestones: [
      { label: 'Requirements locked', date: 'Sep 15', done: false },
      { label: 'Beta', date: 'Nov 15', done: false },
      { label: 'GA', date: 'Dec 15', done: false },
    ],
    risks: [{ text: 'Data warehouse schema changes required — coordination with data team needed', severity: 'Medium' }],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'init-4', title: 'Performance Hardening', goal: 'Reduce P99 API latency to under 200ms across all core endpoints.',
    targetDate: 'Nov 1, 2026', workflowState: 'In Progress',
    productIds: ['prod-dxone', 'prod-stunnr'],
    pm: 'Alex Chen', engLead: 'Jordan Mills', qaLead: 'Dana Rao',
    epicIds: ['epic-9'],
    description: 'Core API endpoints regularly exceed 800ms at P99 under load. This initiative focuses on edge caching, query optimisation, and database indexing to bring P99 under 200ms — shared infrastructure work spanning DXOne and Stunnr.',
    milestones: [
      { label: 'Profiling complete', date: 'Jul 30', done: true },
      { label: 'Caching layer deployed', date: 'Sep 1', done: false },
      { label: 'Load test sign-off', date: 'Oct 15', done: false },
    ],
    risks: [{ text: 'Cache invalidation edge cases may require extended QA', severity: 'Low' }],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'init-5', title: 'Dark Mode', goal: 'Ship native dark mode across iOS and Android in a single release.',
    targetDate: 'Oct 15, 2026', workflowState: 'Draft',
    productIds: ['prod-dxone', 'prod-stunnr'],
    pm: 'Alex Chen', engLead: 'Unassigned', qaLead: 'Unassigned',
    epicIds: [],
    description: 'Design system token-based dark mode. All components must be audited against WCAG AA contrast requirements in both themes.',
    milestones: [],
    risks: [{ text: 'Design token audit is a prerequisite — not yet scheduled', severity: 'High' }],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'init-6', title: 'Unified Authentication', goal: 'One identity across DXOne, Stunnr and Reporting — including enterprise SSO — to close enterprise deals and cut login-related support volume in half.',
    targetDate: 'Dec 1, 2026', workflowState: 'In Progress',
    productIds: ['prod-dxone', 'prod-stunnr', 'prod-reporting'],
    pm: 'Alex Chen', engLead: 'Jordan Mills', qaLead: 'Priya Sinha',
    epicIds: ['epic-10', 'epic-11'],
    description: 'Originated from a leadership idea to unify login across the portfolio, and accelerated by an enterprise SSO commitment to Acme Corp. Spans three products and the Identity team.',
    milestones: [
      { label: 'IdP integration design', date: 'Jul 1', done: true },
      { label: 'Okta SAML beta', date: 'Sep 15', done: false },
      { label: 'Cross-product session sharing', date: 'Oct 30', done: false },
      { label: 'GA across all products', date: 'Dec 1', done: false },
    ],
    risks: [{ text: 'Cross-product session migration needs a zero-downtime cutover plan', severity: 'High' }],
    comments: [], attachments: [mkAtt('att-init6', 'unified-auth-architecture.pdf', 'document', '890 KB', 'Jordan Mills', '2w ago')],
    activity: [mkAct('act-init6a', 'Jamie Okonkwo', 'Leadership', 'converted Idea "Single sign-on across all products" into this initiative', 'Jun 10, 2026'), mkAct('act-init6b', 'Alex Chen', 'PM', 'linked customer request CR-1 (Acme Corp)', 'Jun 11, 2026')],
  },
]

// ─── Seed: Releases ─────────────────────────────────────────────────────────────

export const RELEASES: Release[] = [
  {
    id: 'rel-1', name: 'v2.4.1 Beta', targetDate: 'Aug 14, 2026', workflowState: 'Testing',
    epicIds: ['epic-1', 'epic-2', 'epic-5'],
    description: 'Beta release covering completed onboarding epics and the checkout redesign. Internal distribution only.',
    gateChecks: [
      { label: 'All P0 bugs resolved', passed: false, note: '2 critical bugs open (bug-1, bug-4)' },
      { label: 'Regression suite ≥ 90% pass rate', passed: false, note: 'Currently at 68%' },
      { label: 'Performance: P99 < 500ms', passed: true },
      { label: 'Accessibility audit complete', passed: false, note: 'Pending for Profile Setup' },
      { label: 'Security review signed off', passed: true },
      { label: 'QA lead approval', passed: false },
    ],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'rel-2', name: 'v2.4.1 GA', targetDate: 'Aug 28, 2026', workflowState: 'Planning',
    epicIds: ['epic-1', 'epic-2', 'epic-3', 'epic-5'],
    description: 'General availability including Feature Tour. Requires beta sign-off as prerequisite.',
    gateChecks: [
      { label: 'Beta sign-off completed', passed: false },
      { label: 'App Store review submitted', passed: false },
      { label: 'Feature Tour QA complete', passed: false },
      { label: 'Rollout plan approved', passed: true },
      { label: 'Release notes drafted', passed: true },
    ],
    comments: [], attachments: [], activity: [],
  },
  {
    id: 'rel-3', name: 'v3.0', targetDate: 'Sep 30, 2026', workflowState: 'Draft',
    epicIds: ['epic-1', 'epic-2', 'epic-3', 'epic-4', 'epic-6', 'epic-7'],
    description: 'Full Onboarding Redesign + Payment v2 in a single major release.',
    gateChecks: [
      { label: 'All epics code complete', passed: false },
      { label: 'Apple Pay merchant cert resolved', passed: false },
      { label: 'Full regression suite passed', passed: false },
      { label: 'Legal review of payment flows', passed: false },
      { label: 'Marketing assets ready', passed: false },
    ],
    comments: [], attachments: [], activity: [],
  },
]

// ─── Seed: Cycles ───────────────────────────────────────────────────────────────
// Optional — only stories that opt into cycle planning appear here. Everything
// else rolls up on targetDate instead.

export const CYCLES: Cycle[] = [
  { id: 'cycle-14', name: 'Cycle 14', startDate: 'Jul 21, 2026', endDate: 'Aug 4, 2026', current: true, storyIds: ['story-1', 'story-2', 'story-4', 'story-5'], productId: 'prod-dxone' },
  { id: 'cycle-15', name: 'Cycle 15', startDate: 'Aug 5, 2026', endDate: 'Aug 18, 2026', current: false, storyIds: ['story-8'], productId: 'prod-dxone' },
]

// ─── Seed: Workflow Orchestration Tasks ────────────────────────────────────────

export const WORKFLOW_TASKS: WorkflowTask[] = [
  { id: 'wf-1', type: 'Bug Fix', title: 'Fix BUG-1 — Apple Pay merchant validation timeout', detail: 'Priya Sinha logged a Critical bug against Story-9. Engineering owns the fix.', targetSpace: 'engineering', assignee: 'Sam Liu', sourceType: 'Bug', sourceId: 'bug-1', triggeredBy: 'QA logged BUG-1', createdAt: '3d ago', status: 'Pending' },
  { id: 'wf-2', type: 'Bug Fix', title: 'Fix BUG-2 — CVV re-entry loop', detail: 'Dana Rao logged a High severity bug against Story-8. Fix already in progress.', targetSpace: 'engineering', assignee: 'Morgan Tse', sourceType: 'Bug', sourceId: 'bug-2', triggeredBy: 'QA logged BUG-2', createdAt: '2d ago', status: 'Acknowledged' },
  { id: 'wf-3', type: 'Bug Fix', title: 'Fix BUG-4 — username field accepts SQL injection characters', detail: 'Dana Rao logged a High severity bug against Story-2.', targetSpace: 'engineering', assignee: 'Sam Liu', sourceType: 'Bug', sourceId: 'bug-4', triggeredBy: 'QA logged BUG-4', createdAt: '1d ago', status: 'Pending' },
  { id: 'wf-4', type: 'Smoke Test / UAT', title: 'Sign off Story-13 — Order confirmation screen', detail: 'QA approved this story. PM sign-off required before it counts toward release readiness.', targetSpace: 'pm', assignee: 'Alex Chen', sourceType: 'Story', sourceId: 'story-13', triggeredBy: 'QA approved STORY-13', createdAt: '1w ago', status: 'Done' },
  { id: 'wf-5', type: 'Smoke Test / UAT', title: 'Smoke test Story-8 ahead of v2.4.1 Beta', detail: 'Checkout redesign is in QA testing with 1 of 2 test cases passing. PM UAT needed once QA clears it.', targetSpace: 'pm', assignee: 'Alex Chen', sourceType: 'Story', sourceId: 'story-8', triggeredBy: 'Engineering moved STORY-8 to Testing', createdAt: '1d ago', status: 'Pending' },
  { id: 'wf-6', type: 'Story Review', title: 'Review task split on Story-2 — Username validation', detail: 'Engineering split this story into 4 tasks. PM should confirm scope still matches the original story.', targetSpace: 'pm', assignee: 'Alex Chen', sourceType: 'Story', sourceId: 'story-2', triggeredBy: 'Engineering split STORY-2 into 4 tasks', createdAt: '4d ago', status: 'Pending' },
  { id: 'wf-7', type: 'Scope Review', title: 'Re-estimate Story-5 after scope change', detail: 'PM removed step 9 from the onboarding tour. Engineering should confirm the estimate and subtasks still hold.', targetSpace: 'engineering', assignee: 'Morgan Tse', sourceType: 'Story', sourceId: 'story-5', triggeredBy: 'PM changed scope on STORY-5', createdAt: '1d ago', status: 'Acknowledged' },
  { id: 'wf-8', type: 'Validation', title: 'Validate Story-8 — Checkout redesign', detail: 'Engineering moved this story to QA. 1 of 2 test cases has failed — needs re-run after BUG-2 fix lands.', targetSpace: 'qa', assignee: 'Priya Sinha', sourceType: 'Story', sourceId: 'story-8', triggeredBy: 'Engineering moved STORY-8 to QA', createdAt: '1d ago', status: 'Pending' },
  { id: 'wf-9', type: 'Validation', title: 'Validate Story-1 — Avatar upload flow', detail: 'Engineering moved this story to QA. One test case is blocked pending BUG-3 verification.', targetSpace: 'qa', assignee: 'Dana Rao', sourceType: 'Story', sourceId: 'story-1', triggeredBy: 'Engineering moved STORY-1 to QA', createdAt: '1d ago', status: 'Acknowledged' },
  { id: 'wf-10', type: 'Clarification', title: 'Clarify token refresh behaviour for Story-9', detail: 'QA requested clarification before writing Apple Pay test cases: should token refresh be silent or prompt re-auth after 90 days?', targetSpace: 'pm', assignee: 'Alex Chen', sourceType: 'Story', sourceId: 'story-9', triggeredBy: 'QA requested clarification on STORY-9', createdAt: '2h ago', status: 'Pending' },
  { id: 'wf-11', type: 'Customer Update', title: 'Update Globex Retail on Apple Pay — merchant cert delay', detail: 'Apple Pay support is delayed pending a required certificate from Apple. This affects CR-3, linked to Globex Retail. Share the revised timeline once Engineering confirms an ETA.', targetSpace: 'customer-success', assignee: 'Nina Patel', sourceType: 'Story', sourceId: 'story-9', triggeredBy: 'Engineering flagged STORY-9 as blocked', createdAt: '3d ago', status: 'Pending' },
  { id: 'wf-12', type: 'Customer Update', title: 'Notify Acme Corp — Okta SAML beta reached', detail: 'The Okta SAML connector for Unified Authentication is now in progress. This affects CR-1, linked to Acme Corp — share a progress update ahead of their renewal.', targetSpace: 'customer-success', assignee: 'Nina Patel', sourceType: 'Epic', sourceId: 'epic-10', triggeredBy: 'Engineering moved EPIC-10 to In Progress', createdAt: '1d ago', status: 'Acknowledged' },
]

// ─── Derived: progress & health (never stored, always computed) ───────────────

const DEMO_TODAY = new Date('2026-08-01T00:00:00Z')

function pastDue(dateStr?: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d.getTime() < DEMO_TODAY.getTime()
}

function defaultPctForState(ws: WorkflowState): number {
  switch (ws) {
    case 'Draft': return 0
    case 'Planning': return 0
    case 'In Progress': return 50
    case 'Testing': return 75
    case 'Released': return 100
    case 'Paused': return 0
  }
}

export function computeHealth(input: { workflowState: WorkflowState; pct: number; targetDate?: string; blocked: boolean }): Health {
  if (input.blocked) return 'Blocked'
  if (input.workflowState === 'Released' || input.pct >= 100) return 'Completed'
  if (pastDue(input.targetDate)) return 'Overdue'
  if (input.pct <= 0 && (input.workflowState === 'Draft' || input.workflowState === 'Planning')) return 'Not Started'
  return 'On Track'
}

export const subtasksForTask = (taskId: string) => SUBTASKS.filter(s => s.taskId === taskId)
export const tasksForStory = (storyId: string) => TASKS.filter(t => t.storyId === storyId)
export const storiesForEpic = (epicId: string) => STORIES.filter(s => s.epicId === epicId)
export const epicsForInitiative = (initiativeId: string) => EPICS.filter(e => e.initiativeId === initiativeId)
export const bugsForStory = (storyId: string) => BUGS.filter(b => b.storyId === storyId)
export const testCasesForStory = (storyId: string) => TEST_CASES.filter(t => t.storyId === storyId)
// Derived purely from the Idea/CustomerRequest side — Initiative does not
// store back-references. A single array of ids per relationship (rather than
// mirrored id lists on both sides) means there is exactly one place a link
// can be wrong, not two that can drift apart.
export const ideasForInitiative = (init: Initiative) => IDEAS.filter(i => i.initiativeId === init.id)
export const requestsForInitiative = (init: Initiative) => CUSTOMER_REQUESTS.filter(r => r.initiativeIds.includes(init.id))
export const initiativesForRequest = (req: CustomerRequest) => req.initiativeIds.map(id => getInitiative(id))
export const requestsForAccount = (accountId: string) => CUSTOMER_REQUESTS.filter(r => r.accountId === accountId)

export function taskPct(task: Task): number {
  const subs = subtasksForTask(task.id)
  if (subs.length) return Math.round((subs.filter(s => s.done).length / subs.length) * 100)
  return defaultPctForState(task.workflowState)
}
export function taskHealth(task: Task): Health {
  return computeHealth({ workflowState: task.workflowState, pct: taskPct(task), blocked: !!task.blockedReason })
}

export function storyPct(story: Story): number {
  const tasks = tasksForStory(story.id)
  if (tasks.length) return Math.round(tasks.reduce((a, t) => a + taskPct(t), 0) / tasks.length)
  return defaultPctForState(story.workflowState)
}
export function storyBlocked(story: Story): boolean {
  if (story.blockedReason) return true
  return tasksForStory(story.id).some(t => taskHealth(t) === 'Blocked')
}
export function storyHealth(story: Story): Health {
  return computeHealth({ workflowState: story.workflowState, pct: storyPct(story), targetDate: story.targetDate, blocked: storyBlocked(story) })
}

export function epicPct(epic: Epic): number {
  const stories = storiesForEpic(epic.id)
  if (stories.length) return Math.round(stories.reduce((a, s) => a + storyPct(s), 0) / stories.length)
  return defaultPctForState(epic.workflowState)
}
export function epicBlocked(epic: Epic): boolean {
  if (epic.blockedReason) return true
  return storiesForEpic(epic.id).some(s => storyHealth(s) === 'Blocked')
}
export function epicHealth(epic: Epic): Health {
  return computeHealth({ workflowState: epic.workflowState, pct: epicPct(epic), targetDate: epic.targetDate, blocked: epicBlocked(epic) })
}

export function initiativePct(init: Initiative): number {
  const epics = epicsForInitiative(init.id)
  if (epics.length) return Math.round(epics.reduce((a, e) => a + epicPct(e), 0) / epics.length)
  return defaultPctForState(init.workflowState)
}
export function initiativeBlocked(init: Initiative): boolean {
  if (init.blockedReason) return true
  return epicsForInitiative(init.id).some(e => epicHealth(e) === 'Blocked')
}
export function initiativeHealth(init: Initiative): Health {
  return computeHealth({ workflowState: init.workflowState, pct: initiativePct(init), targetDate: init.targetDate, blocked: initiativeBlocked(init) })
}

export function releasePct(rel: Release): number {
  return Math.round((rel.gateChecks.filter(g => g.passed).length / rel.gateChecks.length) * 100)
}
export function releaseBlocked(rel: Release): boolean {
  return !!rel.blockedReason || rel.gateChecks.some(g => !g.passed && !!g.note)
}
export function releaseHealth(rel: Release): Health {
  return computeHealth({ workflowState: rel.workflowState, pct: releasePct(rel), targetDate: rel.targetDate, blocked: releaseBlocked(rel) })
}

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export const getProduct = (id: string) => PRODUCTS.find(p => p.id === id)
export const getAccount = (id: string) => ACCOUNTS.find(a => a.id === id)
export const getIdea = (id: string) => IDEAS.find(i => i.id === id)
export const getCustomerRequest = (id: string) => CUSTOMER_REQUESTS.find(r => r.id === id)
export const getInitiative = (id: string) => INITIATIVES.find(i => i.id === id)!
export const getEpic = (id: string) => EPICS.find(e => e.id === id)!
export const getStory = (id: string) => STORIES.find(s => s.id === id)!
export const getTask = (id: string) => TASKS.find(t => t.id === id)!
export const getBug = (id: string) => BUGS.find(b => b.id === id)!
export const getTestCase = (id: string) => TEST_CASES.find(t => t.id === id)!
export const getRelease = (id: string) => RELEASES.find(r => r.id === id)!
export const getCycle = (id: string) => CYCLES.find(c => c.id === id)

export const storyBreadcrumb = (story: Story) => {
  const epic = getEpic(story.epicId)
  const init = epic ? getInitiative(epic.initiativeId) : undefined
  return { epic, init }
}
export const taskBreadcrumb = (task: Task) => {
  const story = getStory(task.storyId)
  const { epic, init } = storyBreadcrumb(story)
  return { story, epic, init }
}

export const initiativesForProduct = (productId: string | 'all') =>
  productId === 'all' ? INITIATIVES : INITIATIVES.filter(i => i.productIds.includes(productId))
export const epicsForProduct = (productId: string | 'all') =>
  productId === 'all' ? EPICS : EPICS.filter(e => initiativesForProduct(productId).some(i => i.id === e.initiativeId))
export const storiesForProduct = (productId: string | 'all') =>
  productId === 'all' ? STORIES : STORIES.filter(s => epicsForProduct(productId).some(e => e.id === s.epicId))

export const workflowTasksForSpace = (space: Space) => WORKFLOW_TASKS.filter(w => w.targetSpace === space)
export const pendingWorkflowCount = (space: Space) => workflowTasksForSpace(space).filter(w => w.status !== 'Done').length
export const workflowTasksForSource = (sourceType: WorkflowTask['sourceType'], sourceId: string) => WORKFLOW_TASKS.filter(w => w.sourceType === sourceType && w.sourceId === sourceId)

// ─── Customer-facing translation layer ─────────────────────────────────────────
// Customer Success should never need to read an engineering object to explain
// progress to a customer. These functions turn internal state (WorkflowState,
// Health, IDs) into the plain-language sentence CS actually needs — e.g.
// "Story ENG-214 completed" becomes "Authentication improvements are now in
// testing." Nothing here exposes a raw engineering ID.

const stateNarrative: Record<WorkflowState, string> = {
  'Draft': 'is being scoped',
  'Planning': 'is in planning',
  'In Progress': 'is underway',
  'Testing': 'is now in testing',
  'Released': 'has shipped',
  'Paused': 'is paused',
}

export function customerFacingInitiativeUpdate(init: Initiative): string {
  const health = initiativeHealth(init)
  const pct = initiativePct(init)
  if (health === 'Blocked') return `Work on ${init.title} is temporarily paused while we clear a dependency — we'll share an updated timeline soon.`
  if (health === 'Completed') return `${init.title} has shipped.`
  if (health === 'Overdue') return `${init.title} is taking longer than planned. We're re-baselining the timeline and will follow up.`
  if (pct <= 0) return `${init.title} ${stateNarrative[init.workflowState]}.`
  return `${init.title} is on track and ${pct}% complete.`
}

// Rolls an Initiative's Epics up into one customer-safe sentence per epic,
// e.g. "Feature Tour is now in testing" — never an epic ID or story detail.
export function customerFacingEpicUpdates(init: Initiative): string[] {
  return epicsForInitiative(init.id).map(e => `${e.title} ${stateNarrative[epicHealth(e) === 'Blocked' ? 'Paused' : e.workflowState]}`)
}

export function customerFacingReleaseStatus(init: Initiative): string {
  const epics = epicsForInitiative(init.id)
  const relatedReleases = RELEASES.filter(r => r.epicIds.some(eid => epics.some(e => e.id === eid)))
  if (relatedReleases.length === 0) return 'No release scheduled yet'
  const allReleased = relatedReleases.every(r => r.workflowState === 'Released')
  if (allReleased) return 'Released'
  const next = relatedReleases.find(r => r.workflowState !== 'Released') ?? relatedReleases[0]
  return `Targeting ${next.name} · ${next.targetDate}`
}

export function requestStageNarrative(stage: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
    'New': 'Just received — awaiting triage.',
    'Under Review': 'Being evaluated against the roadmap.',
    'Accepted': 'Accepted — not yet linked to planned work.',
    'Linked to Initiative': 'Linked to planned work — not yet started.',
    'In Progress': 'Actively being worked on.',
    'Released': 'Shipped.',
    'Closed': 'Closed.',
    'Rejected': 'Not being pursued.',
  }
  return map[stage]
}
