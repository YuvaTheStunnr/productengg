// ─────────────────────────────────────────────────────────────────────────────
// Shared, role-aware entity screens.
//
// Every Space (Leadership / PM / Engineering / QA) renders the same
// underlying objects — only navigation, visible tabs and available actions
// differ per role. Rather than duplicating near-identical detail pages four
// times, each entity gets ONE rich detail screen here that takes a `role`
// prop and adapts. Spaces stay thin: sidebars, dashboards, and list screens
// tailored to that role, wired to these shared screens for anything deeper.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  PRODUCTS, TEAMS, IDEAS, CUSTOMER_REQUESTS, ACCOUNTS, INITIATIVES, EPICS, STORIES, TASKS, BUGS, TEST_CASES, RELEASES, CYCLES, HOTFIXES,
  RELEASE_GATE_LABELS,
  getIdea, getCustomerRequest, getAccount, getInitiative, getEpic, getStory, getTask, getBug, getTestCase, getRelease, getProduct, getCycle, getHotfix,
  epicsForInitiative, storiesForEpic, tasksForStory, subtasksForTask, bugsForStory, testCasesForStory,
  ideasForInitiative, requestsForInitiative, initiativesForRequest, workflowTasksForSource,
  initiativeHealth, initiativePct, epicHealth, epicPct, storyHealth, storyPct, taskHealth, taskPct, releaseHealth, releasePct,
  customerFacingInitiativeUpdate, customerFacingReleaseStatus, requestStageNarrative,
  createIdea, createCustomerRequest, createInitiative, createEpic, createStory, createTask, createSubtask, createBug, createTestCase, createRelease, createHotfix,
  moveCustomerRequestStage, setRequestInitiatives, planStoryIntoCycle, moveStoryToQA, approveStory, rejectStory, requestStoryClarification, raiseStoryBlocker,
  markTaskDone, setTaskWorkflowState, markBugInFix, markBugFixed, markBugVerified, closeBugAsDuplicate, requestBugFix, setTestCaseStatus, updateNotes,
  acknowledgeWorkflowTask, completeWorkflowTask, toggleGateCheck, approveRelease,
  type Idea, type CustomerRequest, type RequestStatus, type Priority,
} from './data'
import {
  WorkflowBadge, HealthBadge, StatusPair, SeverityBadge, CardShell, SectionLabel, ProgressBar, Breadcrumb, WorkspaceShell,
  Btn, Divider, Tag, CommentThread, TabBar, DetailRow, AttachmentList, ActivityTimeline, RelationshipRow, WorkflowQueue, EmptyState,
  RequestStageBadge,
} from './ui'

export type Nav = (screen: string, id?: string) => void
export type Role = 'leadership' | 'pm' | 'engineering' | 'qa' | 'customer-success'

// ─── Shared form primitives ─────────────────────────────────────────────────────

export const inputCls = 'w-full border border-[#E0E0E0] rounded-md px-3 py-2.5 text-[13px] text-[#1A1A1A] bg-white outline-none focus:border-[#888]'
export const selectCls = 'w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[12px] text-[#444] bg-white outline-none'
export const textareaCls = inputCls + ' resize-none'

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-[#CC4444]"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#BBBBBB] mt-1">{hint}</p>}
    </div>
  )
}

function ProductCheckboxes({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {PRODUCTS.map(p => (
        <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-[#FAFAFA]">
          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} className="accent-[#1A1A1A]" />
          <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${p.color}`} />
          <span className="text-[12.5px] text-[#333]">{p.name}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Small shared pieces ────────────────────────────────────────────────────────

function WorkflowLinkCard({ sourceType, sourceId }: { sourceType: 'Bug' | 'Story' | 'Epic' | 'Initiative'; sourceId: string }) {
  const tasks = workflowTasksForSource(sourceType, sourceId)
  if (tasks.length === 0) return null
  return (
    <CardShell>
      <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center gap-2">
        <span className="text-[12px] font-semibold text-[#333]">Workflow Orchestration</span>
        <span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <WorkflowQueue tasks={tasks} onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
    </CardShell>
  )
}

// Lightweight editable scratchpad shown on Epic/Story/Task — distinct from
// Description (what it is) and Acceptance Criteria (how we know it's done).
// Saves immediately on blur; there's no separate edit mode to keep this small.
function NotesCard({ entity, canEdit }: { entity: { notes?: string }; canEdit: boolean }) {
  const [draft, setDraft] = useState(entity.notes ?? '')
  return (
    <CardShell className="p-4">
      <SectionLabel>Notes</SectionLabel>
      {canEdit ? (
        <textarea
          rows={3}
          value={draft}
          placeholder="Context for the team — decisions, open questions, anything that doesn't belong in the description…"
          className={textareaCls}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => updateNotes(entity, draft)}
        />
      ) : entity.notes ? (
        <p className="text-[12.5px] text-[#333] leading-relaxed whitespace-pre-wrap">{entity.notes}</p>
      ) : (
        <p className="text-[11.5px] text-[#CCCCCC] italic py-1">No notes yet.</p>
      )}
    </CardShell>
  )
}

function ProductPills({ productIds }: { productIds: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {productIds.map(pid => {
        const p = getProduct(pid)
        if (!p) return null
        return (
          <span key={pid} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#D8D8D8] bg-white">
            <span className={`w-2 h-2 rounded-sm ${p.color}`} />
            <span className="text-[10.5px] font-medium text-[#444]">{p.name}</span>
          </span>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEAS
// ═══════════════════════════════════════════════════════════════════════════════

export function IdeaDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'activity' | 'comments'>('overview')
  const idea = getIdea(id) ?? IDEAS[0]
  const canDecide = role === 'leadership' || role === 'pm'

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Ideas', screen: 'idea-list' }, { label: idea.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{idea.title}</h1>
            <Tag label={idea.status} variant={idea.status === 'Converted' ? 'dark' : idea.status === 'Rejected' ? 'outline' : 'default'} />
          </div>
        </div>
      }
      actions={canDecide && idea.status === 'Idea' ? <><Btn small variant="outline">Reject</Btn><Btn small variant="primary" onClick={() => nav('create-initiative')}>Convert to Initiative</Btn></> : undefined}
    >
      <TabBar tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: idea.comments.length }]} active={tab} onSelect={setTab} />
      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_260px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{idea.description}</p>
              </CardShell>
              {idea.status === 'Rejected' && idea.rejectionReason && (
                <CardShell className="p-4 bg-[#FDF8F8] border-[#F5E0E0]">
                  <SectionLabel>Rejection Reason</SectionLabel>
                  <p className="text-[12.5px] text-[#994444] leading-relaxed">{idea.rejectionReason}</p>
                </CardShell>
              )}
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={idea.attachments} />
              </CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>People &amp; Status</SectionLabel>
                <DetailRow label="Created by">{idea.createdBy}</DetailRow>
                <DetailRow label="Role">{idea.createdByRole}</DetailRow>
                <DetailRow label="Created">{idea.createdAt}</DetailRow>
                <DetailRow label="Status"><Tag label={idea.status} variant="muted" /></DetailRow>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Relationships</SectionLabel>
                <RelationshipRow label="Initiative" value={idea.initiativeId ? getInitiative(idea.initiativeId).title : '—'} onClick={idea.initiativeId ? () => nav('initiative-detail', idea.initiativeId) : undefined} />
              </CardShell>
            </div>
          </div>
        )}
        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={idea.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={idea.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

const roleDisplay: Record<Role, { name: string; label: string }> = {
  leadership: { name: 'Jamie Okonkwo', label: 'Leadership' },
  pm: { name: 'Alex Chen', label: 'PM' },
  engineering: { name: 'Morgan Tse', label: 'Engineering' },
  qa: { name: 'Dana Rao', label: 'QA' },
  'customer-success': { name: 'Nina Patel', label: 'Customer Success' },
}

export function CreateIdea({ nav, role }: { nav: Nav; role: Role }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const submit = () => {
    if (!title.trim() || !description.trim()) return
    const who = roleDisplay[role]
    const idea = createIdea({ title, description, createdBy: who.name, createdByRole: who.label })
    nav('idea-detail', idea.id)
  }
  return (
    <WorkspaceShell title="New Idea" subtitle="Ideas are lightweight — capture the thought, decide on it later." actions={<Btn small onClick={() => nav('idea-list')}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Ideas', screen: 'idea-list' }, { label: 'New Idea' }]} onNavigate={s => nav(s)} />
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Offline mode for mobile app" className={inputCls} /></Field>
            <Field label="Description" required><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's the idea? What problem does it solve?" className={textareaCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>{role === 'leadership' ? 'Save Idea' : 'Save & Notify Leadership'}</Btn>
              <Btn variant="ghost" onClick={() => nav('idea-list')}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

// Every stage a request can move to next. Deliberately linear (no skipping
// "Under Review" straight to "Released") so the badge always tells CS the
// truth about how far along a request actually is.
const nextStages: Record<RequestStatus, RequestStatus[]> = {
  'New': ['Under Review', 'Rejected'],
  'Under Review': ['Accepted', 'Rejected'],
  'Accepted': ['Linked to Initiative', 'Rejected'],
  'Linked to Initiative': ['In Progress'],
  'In Progress': ['Released'],
  'Released': ['Closed'],
  'Closed': [],
  'Rejected': [],
}

export function CustomerRequestDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'activity' | 'comments'>('overview')
  const req = getCustomerRequest(id) ?? CUSTOMER_REQUESTS[0]
  const account = req.accountId ? getAccount(req.accountId) : undefined
  const linkedInitiatives = initiativesForRequest(req)
  const isCS = role === 'customer-success'
  const upcoming = nextStages[req.stage]
  const [linking, setLinking] = useState(false)
  const [selectedInitiatives, setSelectedInitiatives] = useState<string[]>(req.initiativeIds)

  const openLinkPicker = () => { setSelectedInitiatives(req.initiativeIds); setLinking(true) }
  const toggleInitiative = (iid: string) => setSelectedInitiatives(ids => ids.includes(iid) ? ids.filter(x => x !== iid) : [...ids, iid])
  const confirmLink = () => { setRequestInitiatives(req.id, selectedInitiatives); setLinking(false) }

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Customer Requests', screen: 'request-list' }, { label: req.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{req.title}</h1>
            <RequestStageBadge stage={req.stage} />
            <Tag label={req.priority} variant={req.priority === 'Critical' ? 'dark' : 'outline'} />
          </div>
        </div>
      }
      actions={isCS && upcoming.length > 0 ? <>{upcoming.map(s => <Btn key={s} small variant={s === 'Rejected' ? 'outline' : 'primary'} onClick={() => moveCustomerRequestStage(req.id, s)}>Move to {s}</Btn>)}</> : undefined}
    >
      <TabBar tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: req.comments.length }]} active={tab} onSelect={setTab} />
      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_280px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{req.description}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Stage</SectionLabel>
                <p className="text-[12px] text-[#666] leading-relaxed">{requestStageNarrative(req.stage)}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={req.attachments} />
              </CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Requestor</SectionLabel>
                <DetailRow label="Source">{req.source}</DetailRow>
                <DetailRow label="Requested by">{req.requestedBy}</DetailRow>
                {account && <DetailRow label="Account">{account.name}</DetailRow>}
                <DetailRow label="Requested">{req.requestedAt}</DetailRow>
                <DetailRow label="Priority"><Tag label={req.priority} variant="muted" /></DetailRow>
              </CardShell>
              <CardShell className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Linked Initiatives</SectionLabel>
                  {isCS && req.stage !== 'New' && req.stage !== 'Under Review' && <Btn small variant="ghost" onClick={linking ? () => setLinking(false) : openLinkPicker}>{linking ? 'Close' : 'Link'}</Btn>}
                </div>
                {!linking && linkedInitiatives.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-1">Not linked to an initiative yet.</p>}
                {!linking && linkedInitiatives.map(init => (
                  <RelationshipRow key={init.id} label={isCS ? 'Progress' : 'Initiative'} value={isCS ? customerFacingInitiativeUpdate(init) : init.title} onClick={isCS ? () => nav('initiative-detail', init.id) : undefined} />
                ))}
                {linking && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10.5px] text-[#AAAAAA]">A request can inform more than one initiative — select all that apply.</p>
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                      {INITIATIVES.map(init => (
                        <label key={init.id} className="flex items-center gap-2.5 px-2.5 py-1.5 border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-[#FAFAFA]">
                          <input type="checkbox" checked={selectedInitiatives.includes(init.id)} onChange={() => toggleInitiative(init.id)} className="accent-[#1A1A1A]" />
                          <span className="text-[12px] text-[#333] truncate">{init.title}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Btn small variant="primary" onClick={confirmLink}>Link Selected ({selectedInitiatives.length})</Btn>
                      <Btn small variant="ghost" onClick={() => setLinking(false)}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </CardShell>
            </div>
          </div>
        )}
        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={req.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={req.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateCustomerRequest({ nav }: { nav: Nav }) {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState<CustomerRequest['source']>('Customer Success')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [accountId, setAccountId] = useState('')
  const [description, setDescription] = useState('')
  const submit = () => {
    if (!title.trim() || !description.trim()) return
    const req = createCustomerRequest({ title, description, source, priority, accountId: accountId || undefined, requestedBy: 'Nina Patel' })
    nav('request-detail', req.id)
  }
  return (
    <WorkspaceShell title="Log Customer Request" subtitle="Requests are captured on their own — linking to an initiative is a separate decision made once a plan exists." actions={<Btn small onClick={() => nav('request-list')}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Customer Requests', screen: 'request-list' }, { label: 'New Request' }]} onNavigate={s => nav(s)} />
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Enterprise SSO requirement" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source" required>
                <select value={source} onChange={e => setSource(e.target.value as CustomerRequest['source'])} className={selectCls}><option>Customer Success</option><option>Sales</option><option>Support</option></select>
              </Field>
              <Field label="Priority">
                <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={selectCls}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
              </Field>
            </div>
            <Field label="Account" hint="Leave blank for requests that aren't tied to one specific account.">
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className={selectCls}><option value="">— No account</option>{ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            </Field>
            <Field label="Description" required><textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is the customer asking for, and why?" className={textareaCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Log Request</Btn>
              <Btn variant="ghost" onClick={() => nav('request-list')}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIATIVES
// ═══════════════════════════════════════════════════════════════════════════════

export function InitiativeDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'epics' | 'activity' | 'comments'>('overview')
  const init = getInitiative(id) ?? INITIATIVES[0]
  const epics = epicsForInitiative(init.id)
  const ideas = ideasForInitiative(init)
  const requests = requestsForInitiative(init)
  const isPM = role === 'pm'

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Initiatives', screen: 'initiative-list' }, { label: init.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{init.title}</h1>
            <StatusPair workflow={init.workflowState} health={initiativeHealth(init)} />
          </div>
        </div>
      }
      actions={isPM ? <><Btn small onClick={() => nav('create-epic', init.id)}>+ Epic</Btn><Btn small>Edit</Btn><Btn variant="primary" small onClick={() => nav('create-release')}>Plan Release</Btn></> : <><Btn small>Edit</Btn><Btn variant="primary" small>Share Update</Btn></>}
    >
      <TabBar tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'epics', label: 'Epics', count: epics.length },
        { id: 'activity', label: 'Activity' },
        { id: 'comments', label: 'Comments', count: init.comments.length },
      ]} active={tab} onSelect={setTab} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_280px] gap-5 max-w-5xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Business Goal</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{init.goal}</p>
                <p className="text-[12px] text-[#666] leading-relaxed mt-2">{init.description}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Milestones</SectionLabel>
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-[#EBEBEB]" />
                  {init.milestones.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-2">No milestones set yet.</p>}
                  {init.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-4 py-2.5 pl-8 relative">
                      <div className={`absolute left-2 w-3 h-3 rounded-full border-2 -translate-x-1/2 ${m.done ? 'bg-[#888] border-[#888]' : 'bg-white border-[#CCCCCC]'}`} />
                      <span className="text-[12px] text-[#333]">{m.label}</span>
                      <span className="text-[10px] text-[#BBBBBB] ml-auto">{m.date}</span>
                      {m.done && <Tag label="Done" variant="muted" />}
                    </div>
                  ))}
                </div>
              </CardShell>
              {init.risks.length > 0 && (
                <CardShell className="p-4">
                  <SectionLabel>Risks</SectionLabel>
                  {init.risks.map((r, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 py-2 border-b border-[#F5F5F5] last:border-0">
                      <p className="text-[11.5px] text-[#444] leading-snug">{r.text}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${r.severity === 'High' ? 'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]' : 'bg-[#EBEBEB] text-[#777]'}`}>{r.severity}</span>
                    </div>
                  ))}
                </CardShell>
              )}
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={init.attachments} />
              </CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Progress</SectionLabel>
                <div className="text-center py-3">
                  <p className="text-[30px] font-bold text-[#1A1A1A]">{initiativePct(init)}%</p>
                  <p className="text-[11px] text-[#AAAAAA]">Overall completion</p>
                </div>
                <ProgressBar pct={initiativePct(init)} />
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Products</SectionLabel>
                <ProductPills productIds={init.productIds} />
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>People</SectionLabel>
                <DetailRow label="PM Owner">{init.pm}</DetailRow>
                <DetailRow label="Eng Lead">{init.engLead}</DetailRow>
                <DetailRow label="QA Lead">{init.qaLead}</DetailRow>
                <DetailRow label="Start Date">{init.startDate ?? '—'}</DetailRow>
                <DetailRow label="Target Date">{init.targetDate}</DetailRow>
              </CardShell>
              {(ideas.length > 0 || requests.length > 0) && (
                <CardShell className="p-4">
                  <SectionLabel>Originated From</SectionLabel>
                  {ideas.map(i => <RelationshipRow key={i.id} label="Idea" value={i.title} onClick={isPM || role === 'leadership' ? () => nav('idea-detail', i.id) : undefined} />)}
                  {/* Customer Requests live in Customer Success now — shown here as read-only
                      context (with stage) rather than a link, since PM/Leadership can't open
                      a request-detail screen that no longer exists in their spaces. */}
                  {requests.map(r => <RelationshipRow key={r.id} label="Customer Request" value={`${r.title} · ${r.stage}`} />)}
                </CardShell>
              )}
            </div>
          </div>
        )}

        {tab === 'epics' && (
          <div className="max-w-4xl flex flex-col gap-3">
            {epics.length === 0 && <EmptyState icon="◇" title="No epics yet" sub={isPM ? 'Break this initiative into epics to start planning delivery.' : undefined} />}
            {epics.map(epic => {
              const stories = storiesForEpic(epic.id)
              return (
                <CardShell key={epic.id} onClick={isPM ? () => nav('epic-detail', epic.id) : undefined}>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{epic.title}</span>
                      <StatusPair workflow={epic.workflowState} health={epicHealth(epic)} />
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-[#888]">{stories.length} stories</span>
                      <div className="w-20"><ProgressBar pct={epicPct(epic)} /></div>
                      <span className="text-[11px] text-[#888] w-8 text-right">{epicPct(epic)}%</span>
                    </div>
                  </div>
                </CardShell>
              )
            })}
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={init.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={init.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateInitiative({ nav, role }: { nav: Nav; role: Role }) {
  const [productIds, setProductIds] = useState<string[]>([])
  const toggle = (id: string) => setProductIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const isLeadership = role === 'leadership'
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [pm, setPm] = useState('')
  const [engLead, setEngLead] = useState('')
  const [qaLead, setQaLead] = useState('')
  const [originatingIdeaId, setOriginatingIdeaId] = useState('')
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!title.trim() || !goal.trim() || !targetDate || productIds.length === 0) return
    const init = createInitiative({ title, goal, description, startDate: startDate || undefined, targetDate, productIds, pm, engLead, qaLead, originatingIdeaId: originatingIdeaId || undefined })
    nav('initiative-detail', init.id)
  }

  return (
    <WorkspaceShell title="New Initiative" subtitle="Title, business goal, target date and products are all that's required to get started — PM/Eng/QA leads and everything else below can be added later." actions={<Btn small onClick={() => nav('initiative-list')}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Initiatives', screen: 'initiative-list' }, { label: 'New Initiative' }]} onNavigate={s => nav(s)} />
        <CardShell className="p-6">
          <div className="flex flex-col gap-5">
            <Field label="Initiative Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Unified Authentication" className={inputCls} /></Field>
            <Field label="Business Goal" required hint="Describe the outcome this initiative achieves, not the work involved."><textarea rows={3} value={goal} onChange={e => setGoal(e.target.value)} placeholder="What outcome does this initiative achieve?" className={textareaCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" hint="When work actually kicks off — powers the Planning Calendar timeline."><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-[#E0E0E0] rounded-md px-3 py-2.5 text-[13px] text-[#333] bg-white outline-none focus:border-[#888] w-full" /></Field>
              <Field label="Target Date" required><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="border border-[#E0E0E0] rounded-md px-3 py-2.5 text-[13px] text-[#333] bg-white outline-none focus:border-[#888] w-full" /></Field>
            </div>
            <Field label="Products" required hint="An initiative may span multiple products at once."><ProductCheckboxes selected={productIds} onToggle={toggle} /></Field>

            <Divider />
            <p className="text-[11px] text-[#AAAAAA] font-medium uppercase tracking-wider">Optional — add later</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="PM Owner"><select value={pm} onChange={e => setPm(e.target.value)} className={selectCls}><option value="">— Assign PM</option><option>Alex Chen</option></select></Field>
              <Field label="Engineering Lead"><select value={engLead} onChange={e => setEngLead(e.target.value)} className={selectCls}><option value="">— Assign</option><option>Sam Liu</option><option>Jordan Mills</option></select></Field>
              <Field label="QA Lead"><select value={qaLead} onChange={e => setQaLead(e.target.value)} className={selectCls}><option value="">— Assign</option><option>Dana Rao</option><option>Priya Sinha</option></select></Field>
            </div>
            {!isLeadership && (
              <Field label="Originating Idea" hint="Customer requests link to an initiative from Customer Success once a plan exists — not at creation.">
                <select value={originatingIdeaId} onChange={e => setOriginatingIdeaId(e.target.value)} className={selectCls}><option value="">— None</option>{IDEAS.filter(i => i.status !== 'Rejected').map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select>
              </Field>
            )}
            <Field label="Additional Context"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Background, constraints, or references…" className={textareaCls} /></Field>

            <div className="flex items-center gap-3 pt-2">
              <Btn variant="primary" onClick={submit}>Save as Draft</Btn>
              <Btn variant="ghost" onClick={() => nav('initiative-list')}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EPICS
// ═══════════════════════════════════════════════════════════════════════════════

export function EpicDetail({ id, nav }: { id: string; nav: Nav }) {
  const [tab, setTab] = useState<'overview' | 'stories' | 'activity' | 'comments'>('overview')
  const epic = getEpic(id) ?? EPICS[0]
  const init = getInitiative(epic.initiativeId)
  const stories = storiesForEpic(epic.id)

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: init.title, screen: 'initiative-detail' }, { label: epic.title }]} onNavigate={s => nav(s, init.id)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{epic.title}</h1>
            <StatusPair workflow={epic.workflowState} health={epicHealth(epic)} />
          </div>
        </div>
      }
      actions={<><Btn small onClick={() => nav('create-story', epic.id)}>+ Story</Btn><Btn small>Edit</Btn></>}
    >
      <TabBar tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'stories', label: 'Stories', count: stories.length },
        { id: 'activity', label: 'Activity' },
        { id: 'comments', label: 'Comments', count: epic.comments.length },
      ]} active={tab} onSelect={setTab} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_260px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{epic.description}</p>
              </CardShell>
              <NotesCard entity={epic} canEdit />
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={epic.attachments} />
              </CardShell>
              <WorkflowLinkCard sourceType="Epic" sourceId={epic.id} />
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <div className="text-center py-3">
                  <p className="text-[28px] font-bold text-[#1A1A1A]">{epicPct(epic)}%</p>
                  <ProgressBar pct={epicPct(epic)} />
                </div>
                <DetailRow label="Initiative"><button onClick={() => nav('initiative-detail', init.id)} className="hover:underline">{init.title}</button></DetailRow>
                <DetailRow label="Assignee">{epic.assignee}</DetailRow>
                <DetailRow label="Target Date">{epic.targetDate ?? '—'}</DetailRow>
                <DetailRow label="Stories">{stories.length}</DetailRow>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Products</SectionLabel>
                <ProductPills productIds={init.productIds} />
              </CardShell>
            </div>
          </div>
        )}

        {tab === 'stories' && (
          <div className="max-w-4xl flex flex-col gap-2">
            {stories.length === 0 && <EmptyState icon="◇" title="No stories yet" sub="Add stories to break this epic into deliverable units." />}
            {stories.map(story => (
              <CardShell key={story.id} onClick={() => nav('story-detail', story.id)}>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-[#CCCCCC] flex-shrink-0">{story.id.toUpperCase()}</span>
                    <span className="text-[12.5px] text-[#333] truncate">{story.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[#BBBBBB]">{story.assignee}</span>
                    <Tag label={`${story.points} pts`} variant="muted" />
                    <StatusPair workflow={story.workflowState} health={storyHealth(story)} />
                  </div>
                </div>
              </CardShell>
            ))}
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={epic.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={epic.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateEpic({ nav, initiativeId }: { nav: Nav; initiativeId?: string }) {
  const [title, setTitle] = useState('')
  const [chosenInitiativeId, setChosenInitiativeId] = useState(initiativeId ?? INITIATIVES[0].id)
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [mockLink, setMockLink] = useState('')

  const submit = (andAddStories: boolean) => {
    if (!title.trim()) return
    const epic = createEpic({ title, initiativeId: chosenInitiativeId, description, assignee, targetDate: targetDate || undefined, notes: notes || undefined, mockLink: mockLink || undefined })
    nav(andAddStories ? 'create-story' : 'epic-detail', epic.id)
  }

  return (
    <WorkspaceShell title="Create Epic" subtitle="Epics are PM-owned deliverable units of an initiative, broken into stories for engineering and QA." actions={<Btn small onClick={() => nav('initiative-detail', initiativeId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Initiatives', screen: 'initiative-list' }, { label: initiativeId ? getInitiative(initiativeId).title : 'Initiative', screen: 'initiative-detail' }, { label: 'New Epic' }]} onNavigate={s => nav(s, initiativeId)} />
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Epic Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Onboarding Checklist" className={inputCls} /></Field>
            <Field label="Initiative" required>
              <select className={selectCls} value={chosenInitiativeId} onChange={e => setChosenInitiativeId(e.target.value)}>{INITIATIVES.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select>
            </Field>
            <Field label="Description"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this epic deliver?" className={textareaCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assignee">
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className={selectCls}><option value="">— Unassigned</option><option>Sam Liu</option><option>Morgan Tse</option><option>Jordan Mills</option></select>
              </Field>
              <Field label="Target Date"><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={selectCls} /></Field>
            </div>
            <Field label="Mocks / Wireframes" hint="Paste a Figma or design link — shows up under Attachments once the epic is created."><input value={mockLink} onChange={e => setMockLink(e.target.value)} placeholder="e.g. https://figma.com/file/…" className={inputCls} /></Field>
            <Field label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else the team should know?" className={textareaCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={() => submit(false)}>Create Epic</Btn>
              <Btn onClick={() => submit(true)}>Create &amp; Add Stories</Btn>
              <Btn variant="ghost" onClick={() => nav('initiative-detail', initiativeId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORIES
// ═══════════════════════════════════════════════════════════════════════════════

export function StoryDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const story = getStory(id) ?? STORIES[0]
  const epic = getEpic(story.epicId)
  const init = getInitiative(epic.initiativeId)
  const tasks = tasksForStory(story.id)
  const testCases = testCasesForStory(story.id)
  const bugs = bugsForStory(story.id)
  const cycle = story.cycleId ? getCycle(story.cycleId) : undefined

  type PmTab = 'overview' | 'engineering' | 'qa' | 'activity' | 'comments'
  type EngTab = 'overview' | 'tasks' | 'activity' | 'comments'
  type QaTab = 'overview' | 'validation' | 'activity' | 'comments'
  const [tab, setTab] = useState<PmTab | EngTab | QaTab>('overview')
  const [raisingBlocker, setRaisingBlocker] = useState(false)
  const [blockerReason, setBlockerReason] = useState('')

  const breadcrumbItems = role === 'pm'
    ? [{ label: init.title, screen: 'initiative-detail' }, { label: epic.title, screen: 'epic-detail' }, { label: story.title }]
    : role === 'engineering'
      ? [{ label: 'Stories', screen: 'story-list' }, { label: story.title }]
      : [{ label: 'Testing Queue', screen: 'testing-queue' }, { label: story.title }]
  const breadcrumbNav = (s: string) => nav(s, s === 'epic-detail' ? epic.id : s === 'initiative-detail' ? init.id : undefined)

  const actions = role === 'pm'
    ? <><Btn small>Edit</Btn><Btn variant="primary" small onClick={() => { planStoryIntoCycle(story.id); nav('backlog') }}>Plan into Cycle</Btn></>
    : role === 'engineering'
      ? <><Btn small onClick={() => nav('create-task', story.id)}>Split into Task</Btn><Btn variant="primary" small onClick={() => moveStoryToQA(story.id)}>Move to QA</Btn></>
      : <><Btn small variant="outline" onClick={() => requestStoryClarification(story.id)}>Request Clarification</Btn><Btn small variant="outline" onClick={() => rejectStory(story.id)}>Reject</Btn><Btn variant="primary" small onClick={() => approveStory(story.id)}>Approve Story</Btn></>

  const tabs = role === 'pm'
    ? [{ id: 'overview', label: 'Overview' }, { id: 'engineering', label: 'Engineering', count: tasks.length }, { id: 'qa', label: 'QA', count: testCases.length + bugs.length }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: story.comments.length }]
    : role === 'engineering'
      ? [{ id: 'overview', label: 'Requirement' }, { id: 'tasks', label: 'Tasks', count: tasks.length }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: story.comments.length }]
      : [{ id: 'overview', label: 'Requirement' }, { id: 'validation', label: 'Validation', count: testCases.length + bugs.length }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: story.comments.length }]

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={breadcrumbItems} onNavigate={breadcrumbNav} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{story.title}</h1>
            <StatusPair workflow={story.workflowState} health={storyHealth(story)} />
          </div>
          {role !== 'pm' && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#CCCCCC] mt-1">
              <span>{init.title}</span><span>›</span><span>{epic.title}</span>
            </div>
          )}
        </div>
      }
      actions={actions}
    >
      <TabBar tabs={tabs as any} active={tab} onSelect={setTab as any} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_250px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>{role === 'pm' ? 'Description' : 'What this story requires'}</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{story.description}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Acceptance Criteria</SectionLabel>
                {story.acceptanceCriteria.map((ac, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-[#F5F5F5] last:border-0">
                    <div className="w-4 h-4 rounded border border-[#D8D8D8] flex-shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-[#333]">{ac}</p>
                  </div>
                ))}
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={story.attachments} />
              </CardShell>
              <WorkflowLinkCard sourceType="Story" sourceId={story.id} />
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                {role === 'pm' && <DetailRow label="Initiative"><button onClick={() => nav('initiative-detail', init.id)} className="hover:underline">{init.title}</button></DetailRow>}
                {role === 'pm' && <DetailRow label="Epic"><button onClick={() => nav('epic-detail', epic.id)} className="hover:underline">{epic.title}</button></DetailRow>}
                <DetailRow label="Assignee">{story.assignee}</DetailRow>
                <DetailRow label="Points">{story.points} pts</DetailRow>
                <DetailRow label="Cycle">{cycle ? cycle.name : story.targetDate ? `Target: ${story.targetDate}` : 'Unscheduled'}</DetailRow>
                <DetailRow label="Workflow"><WorkflowBadge state={story.workflowState} /></DetailRow>
                <DetailRow label="Health"><HealthBadge health={storyHealth(story)} /></DetailRow>
                {story.qaState && <DetailRow label="QA State"><Tag label={story.qaState} variant="muted" /></DetailRow>}
              </CardShell>
              {story.blockedReason && (
                <CardShell className="p-4 bg-[#FDF8F8] border-[#F5E0E0]">
                  <SectionLabel>Blocked</SectionLabel>
                  <p className="text-[12px] text-[#994444] leading-relaxed">{story.blockedReason}</p>
                </CardShell>
              )}
              {role === 'engineering' && (
                <CardShell className="p-4">
                  <SectionLabel>Quick Actions</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <Btn small variant="outline" onClick={() => nav('create-task', story.id)}>+ Add Task</Btn>
                    {raisingBlocker ? (
                      <div className="flex flex-col gap-2 pt-1">
                        <textarea rows={2} value={blockerReason} onChange={e => setBlockerReason(e.target.value)} placeholder="What's blocking this story?" className={textareaCls} />
                        <div className="flex gap-2">
                          <Btn small variant="primary" onClick={() => { if (blockerReason.trim()) { raiseStoryBlocker(story.id, blockerReason.trim()); setRaisingBlocker(false); setBlockerReason('') } }}>Confirm Blocker</Btn>
                          <Btn small variant="ghost" onClick={() => setRaisingBlocker(false)}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <Btn small variant="outline" onClick={() => setRaisingBlocker(true)}>Raise Blocker</Btn>
                    )}
                    <Btn small variant="outline">Mention QA</Btn>
                  </div>
                </CardShell>
              )}
              {role === 'qa' && (
                <CardShell className="p-4">
                  <SectionLabel>QA Actions</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <Btn small variant="primary" onClick={() => approveStory(story.id)}>Approve Story</Btn>
                    <Btn small variant="outline" onClick={() => rejectStory(story.id)}>Reject Story</Btn>
                    <Btn small variant="outline" onClick={() => requestStoryClarification(story.id)}>Request Clarification</Btn>
                    <Btn small variant="outline" onClick={() => nav('create-bug', story.id)}>Log Bug</Btn>
                  </div>
                </CardShell>
              )}
              <NotesCard entity={story} canEdit={role === 'pm' || role === 'engineering'} />
            </div>
          </div>
        )}

        {tab === 'engineering' && (
          <div className="max-w-3xl">
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#333]">Engineering Tasks</span>
                <Btn small onClick={() => nav('create-task', story.id)}>+ Add Task</Btn>
              </div>
              {tasks.length === 0 && <div className="px-4 py-4 text-[12px] text-[#CCCCCC] italic">No tasks yet</div>}
              {tasks.map(t => (
                <div key={t.id} onClick={() => nav('task-detail', t.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA]">
                  <div>
                    <span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{t.id.toUpperCase()}</span>
                    <span className="text-[12.5px] text-[#333]">{t.title}</span>
                    <p className="text-[10px] text-[#BBBBBB] mt-0.5">{t.assignee} · {t.estimate}h est</p>
                  </div>
                  <StatusPair workflow={t.workflowState} health={taskHealth(t)} />
                </div>
              ))}
            </CardShell>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="max-w-3xl">
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#333]">Tasks</span>
                <Btn small onClick={() => nav('create-task', story.id)}>+ Add Task</Btn>
              </div>
              {tasks.map(t => (
                <div key={t.id} onClick={() => nav('task-detail', t.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA]">
                  <div>
                    <span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{t.id.toUpperCase()}</span>
                    <span className="text-[12.5px] font-medium text-[#333]">{t.title}</span>
                    {t.branch && <p className="font-mono text-[10px] text-[#BBBBBB] mt-0.5 ml-5">{t.branch}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#888]">{t.assignee}</span>
                    <Tag label={`${t.estimate}h`} variant="muted" />
                    <StatusPair workflow={t.workflowState} health={taskHealth(t)} />
                  </div>
                </div>
              ))}
            </CardShell>
          </div>
        )}

        {(tab === 'qa' || tab === 'validation') && (
          <div className="max-w-3xl flex flex-col gap-4">
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#333]">Test Cases</span>
                {role === 'qa' && <Btn small onClick={() => nav('create-test-case', story.id)}>+ Test Case</Btn>}
              </div>
              {testCases.length === 0 && <div className="px-4 py-4 text-[12px] text-[#CCCCCC] italic">No test cases yet</div>}
              {testCases.map(tc => (
                <div key={tc.id} onClick={() => nav('test-case-detail', tc.id)} className="px-4 py-2.5 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA]">
                  <span className="text-[12px] text-[#333]">{tc.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#888]">{tc.assignee}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${tc.status === 'Passed' ? 'bg-[#F0F0F0] text-[#555]' : tc.status === 'Failed' ? 'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]' : 'bg-[#FAFAFA] text-[#BBBBBB] border border-[#E4E4E4]'}`}>{tc.status}</span>
                  </div>
                </div>
              ))}
            </CardShell>
            {bugs.length > 0 && (
              <CardShell>
                <div className="px-4 py-3 bg-[#FDF7F7] border-b border-[#F5EEEE]"><span className="text-[12px] font-semibold text-[#555]">Linked Bugs</span></div>
                {bugs.map(bug => (
                  <div key={bug.id} onClick={() => nav('bug-detail', bug.id)} className="px-4 py-2.5 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA]">
                    <div><span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{bug.id.toUpperCase()}</span><span className="text-[12px] text-[#333]">{bug.title}</span></div>
                    <div className="flex items-center gap-2"><SeverityBadge severity={bug.severity} /><span className="text-[10px] text-[#888]">{bug.workflowState}</span></div>
                  </div>
                ))}
              </CardShell>
            )}
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={story.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={story.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateStory({ nav, epicId, role }: { nav: Nav; epicId?: string; role: Role }) {
  const [title, setTitle] = useState('')
  const [chosenEpicId, setChosenEpicId] = useState(epicId ?? EPICS[0].id)
  const [description, setDescription] = useState('')
  const [acCriteria, setAcCriteria] = useState('')
  const [assignee, setAssignee] = useState('')
  const [points, setPoints] = useState(5)
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [mockLink, setMockLink] = useState('')

  const submit = () => {
    if (!title.trim()) return
    const acceptanceCriteria = acCriteria.split('\n').map(l => l.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    const story = createStory({
      title, epicId: chosenEpicId, description, acceptanceCriteria, assignee, points,
      targetDate: targetDate || undefined, notes: notes || undefined, mockLink: mockLink || undefined,
      createdByRole: role === 'engineering' ? 'Engineering' : 'PM',
    })
    nav('story-detail', story.id)
  }

  return (
    <WorkspaceShell title="Create Story" subtitle={role === 'engineering' ? 'Engineering can create and split stories directly during execution.' : 'Stories are the deliverable unit engineering estimates and builds against.'} actions={<Btn small onClick={() => nav(role === 'engineering' ? 'story-list' : 'epic-detail', epicId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Story Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Social sign-in integration" className={inputCls} /></Field>
            <Field label="Epic" required>
              <select className={selectCls} value={chosenEpicId} onChange={e => setChosenEpicId(e.target.value)}>{EPICS.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>
            </Field>
            <Field label="Description"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this story deliver?" className={textareaCls} /></Field>
            <Field label="Acceptance Criteria" hint="One per line."><textarea rows={4} value={acCriteria} onChange={e => setAcCriteria(e.target.value)} placeholder={'• Criterion one\n• Criterion two'} className={textareaCls + ' font-mono'} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} className={selectCls}><option value="">— Unassigned</option><option>Sam Liu</option><option>Morgan Tse</option><option>Jordan Mills</option></select></Field>
              <Field label="Estimate (points)"><input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} className={selectCls} /></Field>
            </div>
            <Field label="Target Date" hint="Optional — only assign a cycle if this team plans in cycles."><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={selectCls} /></Field>
            <Field label="Mocks / Wireframes" hint="Paste a Figma or design link — shows up under Attachments once the story is created."><input value={mockLink} onChange={e => setMockLink(e.target.value)} placeholder="e.g. https://figma.com/file/…" className={inputCls} /></Field>
            <Field label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else the team should know?" className={textareaCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Create Story</Btn>
              <Btn variant="ghost" onClick={() => nav(role === 'engineering' ? 'story-list' : 'epic-detail', epicId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'subtasks' | 'activity' | 'comments'>('overview')
  const task = getTask(id) ?? TASKS[0]
  const story = getStory(task.storyId)
  const epic = getEpic(story.epicId)
  const init = getInitiative(epic.initiativeId)
  const subtasks = subtasksForTask(task.id)
  const isEngineering = role === 'engineering'

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: isEngineering ? 'My Tasks' : 'Story', screen: isEngineering ? 'my-tasks' : 'story-detail' }, { label: story.title, screen: 'story-detail' }, { label: task.title }]} onNavigate={s => nav(s, s === 'story-detail' ? story.id : undefined)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{task.title}</h1>
            <StatusPair workflow={task.workflowState} health={taskHealth(task)} />
          </div>
        </div>
      }
      actions={isEngineering ? <><Btn small>Start Branch</Btn><Btn small>Link PR</Btn><Btn variant="primary" small onClick={() => markTaskDone(task.id)}>Mark Done</Btn></> : <Btn small variant="outline">Comment</Btn>}
    >
      <TabBar tabs={[
        { id: 'overview', label: 'Detail' },
        { id: 'subtasks', label: 'Subtasks', count: subtasks.length },
        { id: 'activity', label: 'Activity' },
        { id: 'comments', label: 'Comments', count: task.comments.length },
      ]} active={tab} onSelect={setTab} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_240px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{task.description}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Story Context</SectionLabel>
                <div className="flex flex-col gap-2 text-[12px]">
                  <div className="flex items-center gap-2 text-[#AAAAAA] text-[10px] font-mono mb-1">
                    <span>{init.title}</span><span>›</span><span>{epic.title}</span><span>›</span><span>{story.id.toUpperCase()}</span>
                  </div>
                  <button onClick={() => nav('story-detail', story.id)} className="text-[12.5px] font-medium text-[#1A1A1A] hover:underline text-left">{story.title}</button>
                  <p className="text-[11.5px] text-[#666]">{story.description}</p>
                </div>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={task.attachments} />
              </CardShell>
              <NotesCard entity={task} canEdit={isEngineering} />
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <DetailRow label="Assignee">{task.assignee}</DetailRow>
                <DetailRow label="Estimate">{task.estimate}h</DetailRow>
                <DetailRow label="Branch">{task.branch ?? '—'}</DetailRow>
                <DetailRow label="PR">{task.prNumber ? `#${task.prNumber}` : 'Not linked'}</DetailRow>
                <DetailRow label="Workflow"><WorkflowBadge state={task.workflowState} /></DetailRow>
                <DetailRow label="Health"><HealthBadge health={taskHealth(task)} /></DetailRow>
              </CardShell>
              {task.blockedReason && (
                <CardShell className="p-4 bg-[#FDF8F8] border-[#F5E0E0]">
                  <SectionLabel>Blocked</SectionLabel>
                  <p className="text-[12px] text-[#994444] leading-relaxed">{task.blockedReason}</p>
                </CardShell>
              )}
              {isEngineering && (
                <CardShell className="p-4">
                  <SectionLabel>Quick Actions</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <Btn small variant="outline" onClick={() => setTaskWorkflowState(task.id, 'In Progress')}>Mark In Progress</Btn>
                    <Btn small variant="outline">Link Pull Request</Btn>
                    <Btn small variant="outline">Raise Blocker</Btn>
                    <Btn small variant="outline" onClick={() => nav('create-subtask', task.id)}>Split into Subtask</Btn>
                  </div>
                </CardShell>
              )}
            </div>
          </div>
        )}

        {tab === 'subtasks' && (
          <div className="max-w-2xl">
            <CardShell className="p-4">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Subtasks</SectionLabel>
                {isEngineering && <Btn small onClick={() => nav('create-subtask', task.id)}>+ Add Subtask</Btn>}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1"><ProgressBar pct={taskPct(task)} /></div>
                <span className="text-[11px] text-[#888]">{subtasks.filter(s => s.done).length}/{subtasks.length} done</span>
              </div>
              {subtasks.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic">No subtasks yet.</p>}
              {subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${st.done ? 'bg-[#888] border-[#888]' : 'border-[#CCCCCC]'}`}>{st.done && <span className="text-white text-[9px]">✓</span>}</div>
                  <span className={`text-[12.5px] ${st.done ? 'text-[#AAAAAA] line-through' : 'text-[#333]'}`}>{st.title}</span>
                  {st.assignee && <span className="text-[10px] text-[#BBBBBB] ml-auto">{st.assignee}</span>}
                </div>
              ))}
            </CardShell>
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={task.activity} /></CardShell></div>}
        {tab === 'comments' && (
          <div className="max-w-2xl">
            <CardShell className="p-5">
              {task.comments.length === 0 ? <p className="text-[12px] text-[#BBBBBB] italic">No comments yet. Start a discussion or mention @PM / @QA.</p> : <CommentThread comments={task.comments} />}
            </CardShell>
          </div>
        )}
      </div>
    </WorkspaceShell>
  )
}

export function CreateTask({ nav, storyId }: { nav: Nav; storyId?: string }) {
  const [title, setTitle] = useState('')
  const [chosenStoryId, setChosenStoryId] = useState(storyId ?? STORIES[0].id)
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('Morgan Tse')
  const [estimate, setEstimate] = useState(4)
  const [notes, setNotes] = useState('')

  const submit = () => {
    if (!title.trim()) return
    const task = createTask({ title, storyId: chosenStoryId, description, assignee, estimate, notes: notes || undefined })
    nav('task-detail', task.id)
  }

  return (
    <WorkspaceShell title="Create Task" subtitle="Engineering splits stories into tasks to plan execution." actions={<Btn small onClick={() => nav('story-detail', storyId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Task Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build bio input component" className={inputCls} /></Field>
            <Field label="Story" required><select className={selectCls} value={chosenStoryId} onChange={e => setChosenStoryId(e.target.value)}>{STORIES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
            <Field label="Description"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this task cover?" className={textareaCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} className={selectCls}><option>Morgan Tse</option><option>Sam Liu</option><option>Jordan Mills</option></select></Field>
              <Field label="Estimate (hours)"><input type="number" value={estimate} onChange={e => setEstimate(Number(e.target.value))} className={selectCls} /></Field>
            </div>
            <Field label="Notes"><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else the team should know?" className={textareaCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Create Task</Btn>
              <Btn variant="ghost" onClick={() => nav('story-detail', storyId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

export function CreateSubtask({ nav, taskId }: { nav: Nav; taskId?: string }) {
  const task = taskId ? getTask(taskId) : TASKS[0]
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')

  const submit = () => {
    if (!title.trim() || !task) return
    createSubtask(task.id, title, assignee || undefined)
    nav('task-detail', task.id)
  }

  return (
    <WorkspaceShell title="Add Subtask" subtitle={`Breaking down ${task?.title ?? 'a task'} into a smaller checklist item.`} actions={<Btn small onClick={() => nav('task-detail', taskId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <Breadcrumb items={[{ label: 'Story', screen: 'story-detail' }, { label: task?.title ?? 'Task', screen: 'task-detail' }, { label: 'New Subtask' }]} onNavigate={s => nav(s, s === 'story-detail' ? task?.storyId : task?.id)} />
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Subtask Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Add debounce on uniqueness check" className={inputCls} /></Field>
            <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} className={selectCls}><option value="">— Unassigned</option><option>Morgan Tse</option><option>Sam Liu</option><option>Jordan Mills</option></select></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Add Subtask</Btn>
              <Btn variant="ghost" onClick={() => nav('task-detail', taskId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUGS
// ═══════════════════════════════════════════════════════════════════════════════

export function BugDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'repro' | 'activity' | 'comments'>('overview')
  const bug = getBug(id) ?? BUGS[0]
  const story = bug.storyId ? getStory(bug.storyId) : undefined
  const epic = bug.epicId ? getEpic(bug.epicId) : story ? getEpic(story.epicId) : undefined
  const init = epic ? getInitiative(epic.initiativeId) : undefined
  const linkedTCs = bug.linkedTestCaseIds.map(tid => getTestCase(tid)).filter(Boolean)

  const actions = role === 'qa'
    ? <><Btn small variant="outline" onClick={() => requestBugFix(bug.id)}>Request Fix</Btn><Btn small variant="outline" onClick={() => closeBugAsDuplicate(bug.id)}>Duplicate Bug</Btn><Btn variant="primary" small onClick={() => markBugVerified(bug.id)}>Mark Verified</Btn></>
    : role === 'engineering'
      ? <><Btn small variant="outline" onClick={() => markBugInFix(bug.id)}>Mark In Fix</Btn><Btn variant="primary" small onClick={() => markBugFixed(bug.id)}>Mark Fixed</Btn></>
      : <Btn small variant="outline">Comment</Btn>

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Bugs', screen: 'bug-list' }, { label: bug.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{bug.title}</h1>
            <SeverityBadge severity={bug.severity} />
            <Tag label={bug.workflowState} variant={bug.workflowState === 'Fixed' || bug.workflowState === 'Verified' ? 'dark' : 'outline'} />
          </div>
        </div>
      }
      actions={actions}
    >
      <TabBar tabs={[{ id: 'overview', label: 'Detail' }, { id: 'repro', label: 'Repro Steps' }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Discussion', count: bug.comments.length }]} active={tab} onSelect={setTab} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_240px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              {(init || epic || story) && (
                <CardShell className="p-4">
                  <SectionLabel>Context</SectionLabel>
                  <div className="text-[10px] font-mono text-[#AAAAAA] mb-3">{init?.title} {epic ? `› ${epic.title}` : ''} {story ? `› ${story.id.toUpperCase()}` : ''}</div>
                  {story && <button onClick={() => nav('story-detail', story.id)} className="text-[12.5px] font-medium text-[#1A1A1A] hover:underline text-left">{story.title}</button>}
                </CardShell>
              )}
              <CardShell className="p-4">
                <SectionLabel>Expected vs Actual</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-2">Expected</p>
                    <p className="text-[12.5px] text-[#333] leading-relaxed bg-[#FAFAFA] rounded p-3 border border-[#F0F0F0]">{bug.expectedResult}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#CC4444] uppercase tracking-wider mb-2">Actual</p>
                    <p className="text-[12.5px] text-[#CC4444] leading-relaxed bg-[#FDF5F5] rounded p-3 border border-[#F5E0E0]">{bug.actualResult}</p>
                  </div>
                </div>
              </CardShell>
              {linkedTCs.length > 0 && (
                <CardShell className="p-4">
                  <SectionLabel>Linked Test Cases</SectionLabel>
                  {linkedTCs.map(tc => (
                    <div key={tc!.id} onClick={() => nav('test-case-detail', tc!.id)} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
                      <span className="text-[12px] text-[#333]">{tc!.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${tc!.status === 'Failed' ? 'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]' : 'bg-[#F0F0F0] text-[#555]'}`}>{tc!.status}</span>
                    </div>
                  ))}
                </CardShell>
              )}
              <CardShell className="p-4">
                <SectionLabel>Attachments</SectionLabel>
                <AttachmentList attachments={bug.attachments} />
              </CardShell>
              <WorkflowLinkCard sourceType="Bug" sourceId={bug.id} />
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <DetailRow label="Severity"><SeverityBadge severity={bug.severity} /></DetailRow>
                <DetailRow label="Status"><Tag label={bug.workflowState} variant="outline" /></DetailRow>
                <DetailRow label="Reporter">{bug.reporter}</DetailRow>
                <DetailRow label="Assignee">{bug.assignee}</DetailRow>
                <DetailRow label="Environment">{bug.environment}</DetailRow>
              </CardShell>
            </div>
          </div>
        )}

        {tab === 'repro' && (
          <div className="max-w-2xl">
            <CardShell className="p-5">
              <SectionLabel>Reproduction Steps</SectionLabel>
              {bug.reproSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-[#F5F5F5] last:border-0">
                  <span className="w-5 h-5 bg-[#1A1A1A] text-white text-[10px] font-bold rounded flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[13px] text-[#333] leading-relaxed">{step}</p>
                </div>
              ))}
              <div className="mt-4 p-3 bg-[#FAFAFA] rounded border border-[#F0F0F0]">
                <p className="text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">Environment</p>
                <p className="text-[12px] text-[#555] font-mono">{bug.environment}</p>
              </div>
            </CardShell>
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={bug.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={bug.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateBug({ nav, storyId }: { nav: Nav; storyId?: string }) {
  const [title, setTitle] = useState('')
  const [chosenStoryId, setChosenStoryId] = useState(storyId ?? '')
  const [severity, setSeverity] = useState<Priority>('High')
  const [expectedResult, setExpectedResult] = useState('')
  const [actualResult, setActualResult] = useState('')
  const [reproSteps, setReproSteps] = useState('')
  const [environment, setEnvironment] = useState('')

  const submit = () => {
    if (!title.trim() || !expectedResult.trim() || !actualResult.trim() || !reproSteps.trim()) return
    const steps = reproSteps.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
    const bug = createBug({ title, storyId: chosenStoryId || undefined, severity, expectedResult, actualResult, reproSteps: steps, environment })
    nav('bug-detail', bug.id)
  }

  return (
    <WorkspaceShell title="Log Bug" subtitle="Logging a bug automatically opens a Bug Fix task for the assigned engineer." actions={<Btn small onClick={() => nav(storyId ? 'story-detail' : 'bug-list', storyId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Bug Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short, specific summary" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Story" required><select className={selectCls} value={chosenStoryId} onChange={e => setChosenStoryId(e.target.value)}><option value="">— Not linked</option>{STORIES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
              <Field label="Severity" required><select value={severity} onChange={e => setSeverity(e.target.value as Priority)} className={selectCls}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></Field>
            </div>
            <Field label="Expected Result" required><textarea rows={2} value={expectedResult} onChange={e => setExpectedResult(e.target.value)} className={textareaCls} /></Field>
            <Field label="Actual Result" required><textarea rows={2} value={actualResult} onChange={e => setActualResult(e.target.value)} className={textareaCls} /></Field>
            <Field label="Reproduction Steps" required><textarea rows={4} value={reproSteps} onChange={e => setReproSteps(e.target.value)} placeholder={'1. Step one\n2. Step two'} className={textareaCls + ' font-mono'} /></Field>
            <Field label="Environment"><input value={environment} onChange={e => setEnvironment(e.target.value)} placeholder="e.g. iOS 17.5, iPhone 15 Pro" className={inputCls} /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Log Bug</Btn>
              <Btn variant="ghost" onClick={() => nav(storyId ? 'story-detail' : 'bug-list', storyId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════════

export function TestCaseDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const tc = getTestCase(id) ?? TEST_CASES[0]
  const story = getStory(tc.storyId)
  const epic = getEpic(story.epicId)
  const init = getInitiative(epic.initiativeId)
  const linkedBugs = tc.linkedBugIds.map(bid => getBug(bid)).filter(Boolean)
  const [tab, setTab] = useState<'overview' | 'activity' | 'comments'>('overview')

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Testing Queue', screen: 'testing-queue' }, { label: tc.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{tc.title}</h1>
            <span className={`text-[10px] font-medium px-2.5 py-1 rounded border ${tc.status === 'Passed' ? 'bg-[#F0F0F0] text-[#555] border-[#D8D8D8]' : tc.status === 'Failed' || tc.status === 'Blocked' ? 'bg-[#FDF0F0] text-[#CC4444] border-[#E8CCCC]' : 'bg-[#FAFAFA] text-[#BBBBBB] border-dashed border-[#DDDDDD]'}`}>{tc.status}</span>
          </div>
        </div>
      }
      actions={role === 'qa' ? <><Btn small>Generate Edge Cases</Btn><Btn small onClick={() => nav('create-bug', story.id)}>Log Bug</Btn><Btn variant="primary" small onClick={() => setTestCaseStatus(tc.id, 'Passed')}>Mark Passed</Btn></> : undefined}
    >
      <TabBar tabs={[{ id: 'overview', label: 'Steps' }, { id: 'activity', label: 'Activity' }, { id: 'comments', label: 'Comments', count: tc.comments.length }]} active={tab} onSelect={setTab} />
      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_240px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Context</SectionLabel>
                <div className="text-[10px] font-mono text-[#AAAAAA] mb-2">{init.title} › {epic.title} › {story.id.toUpperCase()}</div>
                <button onClick={() => nav('story-detail', story.id)} className="text-[12.5px] font-medium text-[#1A1A1A] hover:underline text-left">{story.title}</button>
              </CardShell>
              <CardShell className="overflow-hidden">
                <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] grid grid-cols-[2fr_2fr_2fr] gap-4 text-[11px] font-semibold text-[#888] uppercase tracking-wider">
                  <span>Step</span><span>Expected</span><span>Actual Result</span>
                </div>
                {tc.steps.map((step, i) => {
                  const hasActual = !!step.actual
                  const passed = step.actual && step.actual !== 'No error shown' && step.actual !== 'Form submits and API returns 400'
                  return (
                    <div key={i} className={`px-4 py-3 border-b border-[#F5F5F5] last:border-0 grid grid-cols-[2fr_2fr_2fr] gap-4 items-start ${!passed && hasActual ? 'bg-[#FDF8F8]' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-[#1A1A1A] text-white text-[9px] font-bold rounded flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-[12px] text-[#333] leading-relaxed">{step.step}</p>
                      </div>
                      <p className="text-[12px] text-[#666] leading-relaxed">{step.expected}</p>
                      <div>{hasActual ? <p className={`text-[12px] leading-relaxed ${passed ? 'text-[#555]' : 'text-[#CC4444]'}`}>{step.actual}</p> : <span className="text-[11px] text-[#CCCCCC] italic">Not run</span>}</div>
                    </div>
                  )
                })}
              </CardShell>
              {linkedBugs.length > 0 && (
                <CardShell className="p-4">
                  <SectionLabel>Linked Bugs</SectionLabel>
                  {linkedBugs.map(bug => (
                    <div key={bug!.id} onClick={() => nav('bug-detail', bug!.id)} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
                      <div><span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{bug!.id.toUpperCase()}</span><span className="text-[12px] text-[#333]">{bug!.title}</span></div>
                      <SeverityBadge severity={bug!.severity} />
                    </div>
                  ))}
                </CardShell>
              )}
              <CardShell className="p-4"><SectionLabel>Attachments</SectionLabel><AttachmentList attachments={tc.attachments} /></CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <DetailRow label="Status">{tc.status}</DetailRow>
                <DetailRow label="Assignee">{tc.assignee}</DetailRow>
                <DetailRow label="Last Run">{tc.lastRun ?? 'Never'}</DetailRow>
                <DetailRow label="Story"><button onClick={() => nav('story-detail', story.id)} className="hover:underline">{story.id.toUpperCase()}</button></DetailRow>
                <DetailRow label="Linked Bugs">{tc.linkedBugIds.length}</DetailRow>
              </CardShell>
              {role === 'qa' && (
                <CardShell className="p-4">
                  <SectionLabel>Actions</SectionLabel>
                  <div className="flex flex-col gap-2">
                    <Btn small variant="primary" onClick={() => setTestCaseStatus(tc.id, 'Passed')}>Mark Passed</Btn>
                    <Btn small variant="outline" onClick={() => { setTestCaseStatus(tc.id, 'Failed'); nav('create-bug', story.id) }}>Mark Failed + Log Bug</Btn>
                    <Btn small variant="outline" onClick={() => setTestCaseStatus(tc.id, 'Blocked')}>Mark Blocked</Btn>
                    <Btn small variant="outline">Add to Regression Suite</Btn>
                  </div>
                </CardShell>
              )}
            </div>
          </div>
        )}
        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={tc.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={tc.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateTestCase({ nav, storyId }: { nav: Nav; storyId?: string }) {
  const [title, setTitle] = useState('')
  const [chosenStoryId, setChosenStoryId] = useState(storyId ?? STORIES[0].id)
  const [steps, setSteps] = useState('')
  const [assignee, setAssignee] = useState('Dana Rao')

  // Genuinely reads the selected story's real acceptance criteria and mocks
  // (rather than faking an "AI" output) — one step per AC, plus a note when
  // the story has a mock/wireframe attached to check against visually.
  const generateFromStory = () => {
    const story = getStory(chosenStoryId)
    if (!story) return
    const acLines = story.acceptanceCriteria.map(ac => `Verify: ${ac} → Meets acceptance criteria`)
    const mock = story.attachments.find(a => a.type === 'link' || a.type === 'image')
    const mockLine = mock ? [`Compare against ${mock.name} → Matches the mock/wireframe`] : []
    setSteps([...acLines, ...mockLine].join('\n'))
    if (!title.trim()) setTitle(`${story.title} — acceptance criteria coverage`)
  }

  const submit = () => {
    if (!title.trim() || !steps.trim()) return
    const parsed = steps.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [step, expected] = line.split('→').map(s => s.trim())
      return { step, expected: expected ?? 'Behaves as expected' }
    })
    const tc = createTestCase({ title, storyId: chosenStoryId, steps: parsed, assignee })
    nav('test-case-detail', tc.id)
  }

  return (
    <WorkspaceShell title="Create Test Case" subtitle="Test cases validate a story's acceptance criteria." actions={<Btn small onClick={() => nav(storyId ? 'story-detail' : 'testing-queue', storyId)}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Test Case Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Checkout — happy path with new card" className={inputCls} /></Field>
            <Field label="Story" required><select className={selectCls} value={chosenStoryId} onChange={e => setChosenStoryId(e.target.value)}>{STORIES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Steps <span className="text-[#CC4444]">*</span></label>
              <Btn small variant="ghost" onClick={generateFromStory}>Generate from Acceptance Criteria &amp; Mocks</Btn>
            </div>
            <textarea rows={6} value={steps} onChange={e => setSteps(e.target.value)} placeholder={'Step → Expected result, one per line'} className={textareaCls} />
            <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} className={selectCls}><option>Dana Rao</option><option>Priya Sinha</option></select></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Create Test Case</Btn>
              <Btn variant="ghost" onClick={() => nav(storyId ? 'story-detail' : 'testing-queue', storyId)}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELEASES
// ═══════════════════════════════════════════════════════════════════════════════

export function ReleaseDetail({ id, nav, role }: { id: string; nav: Nav; role: Role }) {
  const [tab, setTab] = useState<'overview' | 'epics' | 'gates' | 'activity' | 'comments'>('overview')
  const rel = getRelease(id) ?? RELEASES[0]
  const epics = rel.epicIds.map(eid => getEpic(eid)).filter(Boolean)
  const standaloneStories = (rel.storyIds ?? []).map(sid => getStory(sid)).filter(Boolean)
  const gatePct = releasePct(rel)
  const canGate = role === 'qa' || role === 'pm'

  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Releases', screen: 'release-list' }, { label: rel.name }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{rel.name}</h1>
            <StatusPair workflow={rel.workflowState} health={releaseHealth(rel)} />
          </div>
        </div>
      }
      actions={canGate ? <><Btn small variant="outline">Request Fix</Btn><Btn variant={gatePct === 100 ? 'primary' : 'outline'} small onClick={gatePct === 100 ? () => approveRelease(rel.id) : undefined}>{gatePct === 100 ? 'Approve Release' : 'Release Blocked'}</Btn></> : undefined}
    >
      <TabBar tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'epics', label: 'In Scope', count: epics.length + standaloneStories.length },
        { id: 'gates', label: 'Gates', count: rel.gateChecks.length },
        { id: 'activity', label: 'Activity' },
        { id: 'comments', label: 'Comments', count: rel.comments.length },
      ]} active={tab} onSelect={setTab} />

      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_260px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{rel.description}</p>
              </CardShell>
              <CardShell className="p-4"><SectionLabel>Attachments</SectionLabel><AttachmentList attachments={rel.attachments} /></CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <div className="text-center py-3"><p className="text-[28px] font-bold text-[#1A1A1A]">{gatePct}%</p><ProgressBar pct={gatePct} /></div>
                <DetailRow label="Target Date">{rel.targetDate}</DetailRow>
                <DetailRow label="Gates Passed">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length}</DetailRow>
              </CardShell>
            </div>
          </div>
        )}

        {tab === 'epics' && (
          <div className="max-w-4xl flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {epics.length === 0 && standaloneStories.length === 0 && <EmptyState icon="◇" title="Nothing in scope yet" />}
              {epics.map(epic => (
                <CardShell key={epic!.id} onClick={role === 'pm' ? () => nav('epic-detail', epic!.id) : undefined}>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><span className="text-[12.5px] font-medium text-[#333]">{epic!.title}</span><StatusPair workflow={epic!.workflowState} health={epicHealth(epic!)} /></div>
                    <span className="text-[11px] text-[#888]">{epicPct(epic!)}%</span>
                  </div>
                </CardShell>
              ))}
            </div>
            {standaloneStories.length > 0 && (
              <div>
                <SectionLabel>Individual Stories (incremental — shipped without their whole epic)</SectionLabel>
                <div className="flex flex-col gap-2 mt-2">
                  {standaloneStories.map(story => (
                    <CardShell key={story!.id} onClick={role === 'pm' ? () => nav('story-detail', story!.id) : undefined}>
                      <div className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3"><span className="text-[10px] font-mono text-[#CCCCCC]">{story!.id.toUpperCase()}</span><span className="text-[12.5px] font-medium text-[#333]">{story!.title}</span><StatusPair workflow={story!.workflowState} health={storyHealth(story!)} /></div>
                        <span className="text-[11px] text-[#888]">{story!.points} pts</span>
                      </div>
                    </CardShell>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'gates' && (
          <div className="max-w-2xl">
            <CardShell className="p-4">
              <div className="flex items-center gap-2 mb-3"><ProgressBar pct={gatePct} /><span className="text-[11px] text-[#888] flex-shrink-0">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length}</span></div>
              {rel.gateChecks.map((gate, i) => (
                <div
                  key={i}
                  onClick={canGate ? () => toggleGateCheck(rel.id, i) : undefined}
                  className={`flex items-start gap-2.5 py-3 border-b border-[#F5F5F5] last:border-0 ${canGate ? 'cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4' : ''}`}
                >
                  <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center ${gate.passed ? 'bg-[#888]' : 'border border-[#D8D8D8]'}`}>{gate.passed && <span className="text-white text-[9px]">✓</span>}</div>
                  <div><p className={`text-[12px] ${gate.passed ? 'text-[#888] line-through' : 'text-[#333]'}`}>{gate.label}</p>{gate.note && <p className="text-[10px] text-[#CC4444] mt-0.5">⚠ {gate.note}</p>}</div>
                </div>
              ))}
              {canGate && <p className="text-[10.5px] text-[#BBBBBB] mt-2">Click a gate to toggle it passed/open.</p>}
            </CardShell>
          </div>
        )}

        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={rel.activity} /></CardShell></div>}
        {tab === 'comments' && <div className="max-w-2xl"><CardShell className="p-5"><CommentThread comments={rel.comments} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateRelease({ nav }: { nav: Nav }) {
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')
  const [epicIds, setEpicIds] = useState<string[]>([])
  const [storyIds, setStoryIds] = useState<string[]>([])
  const [gateLabels, setGateLabels] = useState<string[]>(RELEASE_GATE_LABELS)

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  // Stories already covered by a selected epic don't need to be picked
  // individually — this list is for incremental, epic-less releases only.
  const uncoveredStories = STORIES.filter(s => !epicIds.includes(s.epicId))

  const submit = () => {
    if (!name.trim() || !targetDate) return
    const rel = createRelease({ name, targetDate, description, epicIds, storyIds, gateLabels })
    nav('release-detail', rel.id)
  }

  return (
    <WorkspaceShell title="New Release" subtitle="Group epics — and, for incremental ships, individual stories — into a gated release." actions={<Btn small onClick={() => nav('release-list')}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Release Name" required><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. v2.5.0" className={inputCls} /></Field>
            <Field label="Target Date" required><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={selectCls} /></Field>
            <Field label="Description"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={textareaCls} /></Field>
            <Field label="Epics in Scope">
              <div className="flex flex-col gap-1.5">
                {EPICS.map(e => (
                  <label key={e.id} className="flex items-center gap-2.5 px-3 py-2 border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-[#FAFAFA]">
                    <input type="checkbox" checked={epicIds.includes(e.id)} onChange={() => toggle(epicIds, setEpicIds, e.id)} className="accent-[#1A1A1A]" /><span className="text-[12.5px] text-[#333]">{e.title}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Individual Stories (optional)" hint="For shipping a story incrementally, without waiting for its whole epic.">
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {uncoveredStories.map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-[#FAFAFA]">
                    <input type="checkbox" checked={storyIds.includes(s.id)} onChange={() => toggle(storyIds, setStoryIds, s.id)} className="accent-[#1A1A1A]" /><span className="text-[12.5px] text-[#333]">{s.title}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Gate Checks" hint="Which checks does this release need to clear? Each stays a manual sign-off, not an automated check.">
              <div className="flex flex-col gap-1.5">
                {RELEASE_GATE_LABELS.map(label => (
                  <label key={label} className="flex items-center gap-2.5 px-3 py-2 border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-[#FAFAFA]">
                    <input type="checkbox" checked={gateLabels.includes(label)} onChange={() => toggle(gateLabels, setGateLabels, label)} className="accent-[#1A1A1A]" /><span className="text-[12.5px] text-[#333]">{label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Create Release</Btn>
              <Btn variant="ghost" onClick={() => nav('release-list')}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTFIXES
//
// Deliberately standalone: tied to a Product, never an Initiative. Reads as
// a release log — why it happened, what the fix was — logged by whichever
// engineer shipped it, out of band from the normal Bug → Story pipeline.
// ═══════════════════════════════════════════════════════════════════════════════

export function HotfixList({ nav, productId }: { nav: Nav; productId?: string }) {
  const list = productId ? HOTFIXES.filter(h => h.productId === productId) : HOTFIXES
  return (
    <WorkspaceShell title="Hotfixes" subtitle="Unplanned, out-of-cycle production fixes — logged by the engineer who shipped them. Never tied to an initiative." actions={<Btn small variant="primary" onClick={() => nav('create-hotfix')}>+ Log Hotfix</Btn>}>
      <div className="max-w-4xl flex flex-col gap-2">
        {list.length === 0 && <EmptyState icon="⚑" title="No hotfixes logged" sub="Out-of-cycle production fixes will show up here." />}
        {list.map(hf => {
          const product = getProduct(hf.productId)
          return (
            <CardShell key={hf.id} onClick={() => nav('hotfix-detail', hf.id)}>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <SeverityBadge severity={hf.severity} />
                  <span className="text-[12.5px] font-medium text-[#1A1A1A] truncate">{hf.title}</span>
                  {product && <Tag label={product.name} variant="muted" />}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-[#BBBBBB]">{hf.reportedBy} · {hf.createdAt}</span>
                  <Tag label={hf.status} variant={hf.status === 'Shipped' ? 'dark' : 'outline'} />
                </div>
              </div>
            </CardShell>
          )
        })}
      </div>
    </WorkspaceShell>
  )
}

export function HotfixDetail({ id, nav }: { id: string; nav: Nav }) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview')
  const hf = getHotfix(id) ?? HOTFIXES[0]
  const product = getProduct(hf.productId)
  return (
    <WorkspaceShell
      title={
        <div>
          <Breadcrumb items={[{ label: 'Hotfixes', screen: 'hotfix-list' }, { label: hf.title }]} onNavigate={s => nav(s)} />
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{hf.title}</h1>
            <SeverityBadge severity={hf.severity} />
            <Tag label={hf.status} variant={hf.status === 'Shipped' ? 'dark' : 'outline'} />
          </div>
        </div>
      }
    >
      <TabBar tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }]} active={tab} onSelect={setTab} />
      <div className="px-6 py-5">
        {tab === 'overview' && (
          <div className="grid grid-cols-[1fr_240px] gap-5 max-w-4xl">
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <SectionLabel>Why it happened</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{hf.rootCause}</p>
              </CardShell>
              <CardShell className="p-4">
                <SectionLabel>The fix</SectionLabel>
                <p className="text-[13px] text-[#333] leading-relaxed">{hf.fixSummary}</p>
              </CardShell>
            </div>
            <div className="flex flex-col gap-4">
              <CardShell className="p-4">
                <DetailRow label="Product">{product?.name ?? '—'}</DetailRow>
                <DetailRow label="Severity"><SeverityBadge severity={hf.severity} /></DetailRow>
                <DetailRow label="Reported by">{hf.reportedBy}</DetailRow>
                <DetailRow label="Assignee">{hf.assignee}</DetailRow>
                <DetailRow label="Logged">{hf.createdAt}</DetailRow>
                <DetailRow label="Shipped">{hf.shippedAt ?? '—'}</DetailRow>
              </CardShell>
            </div>
          </div>
        )}
        {tab === 'activity' && <div className="max-w-2xl"><CardShell className="p-5"><ActivityTimeline items={hf.activity} /></CardShell></div>}
      </div>
    </WorkspaceShell>
  )
}

export function CreateHotfix({ nav, productId }: { nav: Nav; productId?: string }) {
  const [title, setTitle] = useState('')
  const [chosenProductId, setChosenProductId] = useState(productId ?? PRODUCTS[0].id)
  const [severity, setSeverity] = useState<Priority>('High')
  const [rootCause, setRootCause] = useState('')
  const [fixSummary, setFixSummary] = useState('')
  const [reportedBy, setReportedBy] = useState('Morgan Tse')

  const submit = () => {
    if (!title.trim() || !rootCause.trim() || !fixSummary.trim()) return
    const hf = createHotfix({ title, productId: chosenProductId, severity, rootCause, fixSummary, reportedBy })
    nav('hotfix-detail', hf.id)
  }

  return (
    <WorkspaceShell title="Log Hotfix" subtitle="For an unplanned production fix shipped outside the normal cycle — never tied to an initiative. Captured here so there's a record of why it happened and what changed." actions={<Btn small onClick={() => nav('hotfix-list')}>Cancel</Btn>}>
      <div className="max-w-2xl">
        <CardShell className="p-6">
          <div className="flex flex-col gap-4">
            <Field label="Title" required><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Push notification crash on Android 14" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product" required><select className={selectCls} value={chosenProductId} onChange={e => setChosenProductId(e.target.value)}>{PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Severity" required><select value={severity} onChange={e => setSeverity(e.target.value as Priority)} className={selectCls}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></Field>
            </div>
            <Field label="Root Cause" required hint="Why did this happen?"><textarea rows={3} value={rootCause} onChange={e => setRootCause(e.target.value)} className={textareaCls} /></Field>
            <Field label="Fix Summary" required hint="What changed?"><textarea rows={3} value={fixSummary} onChange={e => setFixSummary(e.target.value)} className={textareaCls} /></Field>
            <Field label="Reported / Shipped By"><select value={reportedBy} onChange={e => setReportedBy(e.target.value)} className={selectCls}><option>Morgan Tse</option><option>Sam Liu</option><option>Jordan Mills</option></select></Field>
            <div className="flex items-center gap-3 pt-1">
              <Btn variant="primary" onClick={submit}>Log Hotfix</Btn>
              <Btn variant="ghost" onClick={() => nav('hotfix-list')}>Cancel</Btn>
            </div>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}
