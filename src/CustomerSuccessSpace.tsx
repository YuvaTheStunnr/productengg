// ─────────────────────────────────────────────────────────────────────────────
// Customer Success Space
//
// CS represents the customer inside product development. It owns the
// Customer Request lifecycle end-to-end, but it never needs to open an
// engineering object to do its job — Stories, Tasks and raw Epic lists stay
// out of this space entirely. Where PM/Engineering/QA see the delivery graph
// as work to plan, build and validate, CS sees the same graph translated
// into customer impact: what's linked, how it's going, and when it ships.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  PRODUCTS, ACCOUNTS, CUSTOMER_REQUESTS, INITIATIVES,
  getAccount, getInitiative, getEpic, getStory, storyBreadcrumb, requestsForAccount, requestsForInitiative, initiativesForRequest,
  initiativePct,
  customerFacingInitiativeUpdate, customerFacingEpicUpdates, customerFacingReleaseStatus,
  workflowTasksForSpace, pendingWorkflowCount, acknowledgeWorkflowTask, completeWorkflowTask,
  type RequestStatus, type Initiative, type WorkflowTask,
} from './data'
import {
  CardShell, SectionLabel, ProgressBar, KPITile, SidebarShell, WorkspaceShell, Btn, Tag, RequestStageBadge,
  WorkflowQueue, EmptyState, DetailRow, Breadcrumb,
} from './ui'
import { CustomerRequestDetail, CreateCustomerRequest, type Nav } from './entities'

type Screen =
  | 'dashboard'
  | 'request-list' | 'request-detail' | 'create-request'
  | 'account-list' | 'account-detail'
  | 'initiative-list' | 'initiative-detail'

const NEEDS_ATTENTION: RequestStatus[] = ['New', 'Under Review']
const OPEN_STAGES: RequestStatus[] = ['New', 'Under Review', 'Accepted', 'Linked to Initiative', 'In Progress']

// CS has no Story/Epic/Bug screens — a workflow task that originated from
// one of those (e.g. Engineering flagging a blocker) resolves up to the
// Initiative it belongs to, since that's the object CS actually navigates.
function wfTargetInitiativeId(task: WorkflowTask): string | undefined {
  switch (task.sourceType) {
    case 'Initiative': return task.sourceId
    case 'Epic': return getEpic(task.sourceId)?.initiativeId
    case 'Story': return storyBreadcrumb(getStory(task.sourceId)).init?.id
    default: return undefined
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ nav, navigate }: { nav: Screen; navigate: (s: Screen) => void }) {
  const needsAttention = CUSTOMER_REQUESTS.filter(r => NEEDS_ATTENTION.includes(r.stage)).length
  const pendingWf = pendingWorkflowCount('customer-success')
  return (
    <SidebarShell
      items={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'request-list', label: 'Customer Requests', badge: needsAttention || undefined },
        { id: 'account-list', label: 'Accounts' },
        { id: 'initiative-list', label: 'Linked Initiatives' },
      ]}
      nav={nav}
      navigate={navigate}
      spaceColor="bg-[#8A6D4B]"
      userName="Nina Patel"
      userRole="Customer Success Lead"
      projectName="Customer Success"
    />
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const needsAttention = CUSTOMER_REQUESTS.filter(r => NEEDS_ATTENTION.includes(r.stage))
  const openCount = CUSTOMER_REQUESTS.filter(r => OPEN_STAGES.includes(r.stage)).length
  const linkedActive = CUSTOMER_REQUESTS.filter(r => r.stage === 'Linked to Initiative' || r.stage === 'In Progress').length
  const released = CUSTOMER_REQUESTS.filter(r => r.stage === 'Released').length
  const wfQueue = workflowTasksForSpace('customer-success')
  const linkedInitiativeIds = Array.from(new Set(CUSTOMER_REQUESTS.flatMap(r => r.initiativeIds)))
  const linkedInitiatives = linkedInitiativeIds.map(id => getInitiative(id))

  return (
    <WorkspaceShell title="Customer Success Dashboard" subtitle="What customers are waiting on, translated from the delivery graph"
      actions={<Btn variant="primary" small onClick={() => navigate('create-request')}>+ Log Request</Btn>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPITile label="Open Requests" value={String(openCount)} sub={`${needsAttention.length} need triage`} alert={needsAttention.length > 0} />
        <KPITile label="Linked & Active" value={String(linkedActive)} sub="Tracking against a plan" />
        <KPITile label="Released" value={String(released)} sub="Shipped to customers" />
        <KPITile label="Workflow Tasks" value={String(wfQueue.filter(w => w.status !== 'Done').length)} alert={wfQueue.filter(w => w.status !== 'Done').length > 0} />
      </div>

      <div className="grid grid-cols-[1fr_288px] gap-4">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Needs Triage</span>
              <Btn small variant="ghost" onClick={() => navigate('request-list')}>View all →</Btn>
            </div>
            {needsAttention.length === 0 && <div className="px-4 py-6"><EmptyState icon="✓" title="Nothing waiting on you" /></div>}
            {needsAttention.map(req => {
              const account = req.accountId ? getAccount(req.accountId) : undefined
              return (
                <div key={req.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] flex items-center justify-between gap-4" onClick={() => navigate('request-detail', req.id)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><span className="text-[12.5px] font-medium text-[#1A1A1A] truncate">{req.title}</span><RequestStageBadge stage={req.stage} /></div>
                    <p className="text-[10.5px] text-[#AAAAAA]">{account ? account.name : req.source} · {req.requestedAt}</p>
                  </div>
                  <Tag label={req.priority} variant={req.priority === 'Critical' ? 'dark' : 'outline'} />
                </div>
              )
            })}
          </CardShell>

          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Linked Initiative Progress</span></div>
            {linkedInitiatives.length === 0 && <div className="px-4 py-6"><EmptyState title="No requests linked to planned work yet" /></div>}
            {linkedInitiatives.map(init => (
              <div key={init.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]" onClick={() => navigate('initiative-detail', init.id)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12.5px] font-medium text-[#1A1A1A]">{init.title}</span>
                  <span className="text-[11px] text-[#888]">{initiativePct(init)}%</span>
                </div>
                <p className="text-[11.5px] text-[#666] leading-snug mb-1.5">{customerFacingInitiativeUpdate(init)}</p>
                <ProgressBar pct={initiativePct(init)} />
              </div>
            ))}
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Workflow Orchestration</span>
            </div>
            <WorkflowQueue tasks={wfQueue} onSelect={t => { const initId = wfTargetInitiativeId(t); if (initId) navigate('initiative-detail', initId) }} emptyLabel="No pending updates from Engineering or QA" onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>AI Recommendations</SectionLabel>
            {[
              'Draft a customer update for Globex Retail — Apple Pay is delayed on a merchant certificate',
              'Follow up with Acme Corp — the Okta SAML beta just moved to In Progress',
              'CR-4 has been Under Review for 2 weeks — check in with PM on prioritisation',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-[#F5F5F5] last:border-0">
                <span className="w-4 h-4 bg-[#1A1A1A] text-white text-[8px] font-bold rounded flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-[11.5px] text-[#444] leading-snug">{s}</p>
              </div>
            ))}
          </CardShell>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <CardShell className="p-4">
          <SectionLabel>Requests by Stage</SectionLabel>
          {(['New', 'Under Review', 'Accepted', 'Linked to Initiative', 'In Progress', 'Released', 'Closed', 'Rejected'] as RequestStatus[]).map(stage => {
            const count = CUSTOMER_REQUESTS.filter(r => r.stage === stage).length
            return (
              <div key={stage} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#F5F5F5] last:border-0"><span className="text-[#666]">{stage}</span><span className="font-medium text-[#333]">{count}</span></div>
            )
          })}
        </CardShell>
        <CardShell className="p-4">
          <SectionLabel>Requests by Account</SectionLabel>
          {ACCOUNTS.map(acct => {
            const count = requestsForAccount(acct.id).length
            return (
              <div key={acct.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#F5F5F5] last:border-0"><span className="text-[#666]">{acct.name}</span><span className="font-medium text-[#333]">{count}</span></div>
            )
          })}
          {(() => {
            const noAccount = CUSTOMER_REQUESTS.filter(r => !r.accountId).length
            return noAccount > 0 ? <div className="flex items-center justify-between text-[11px] py-1.5"><span className="text-[#AAAAAA] italic">No account</span><span className="font-medium text-[#333]">{noAccount}</span></div> : null
          })()}
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ─── Customer Requests ──────────────────────────────────────────────────────

function RequestList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState<'needs-attention' | 'all'>('needs-attention')
  const requests = filter === 'needs-attention' ? CUSTOMER_REQUESTS.filter(r => NEEDS_ATTENTION.includes(r.stage)) : CUSTOMER_REQUESTS

  return (
    <WorkspaceShell title="Customer Requests" subtitle="Every ask from Customer Success, Sales and Support — linking to an initiative is a decision made once a plan exists."
      actions={<Btn variant="primary" onClick={() => navigate('create-request')}>+ Log Request</Btn>}>
      <div className="flex items-center gap-2 mb-4">
        {([{ id: 'needs-attention', label: 'Needs Triage' }, { id: 'all', label: 'All Requests' }] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f.id ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{f.label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {requests.map(req => {
          const account = req.accountId ? getAccount(req.accountId) : undefined
          const linked = initiativesForRequest(req)
          return (
            <CardShell key={req.id} onClick={() => navigate('request-detail', req.id)}>
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{req.title}</h3>
                    <RequestStageBadge stage={req.stage} />
                    <Tag label={req.priority} variant={req.priority === 'Critical' ? 'dark' : 'outline'} />
                    <Tag label={req.source} variant="muted" />
                  </div>
                  <p className="text-[12px] text-[#666] leading-relaxed">{req.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] text-[#AAAAAA] block">{account ? account.name : 'No account'}</span>
                  <span className="text-[10.5px] text-[#CCCCCC] block mt-0.5">{linked.length > 0 ? `${linked.length} initiative${linked.length > 1 ? 's' : ''} linked` : 'Not linked'}</span>
                </div>
              </div>
            </CardShell>
          )
        })}
        {requests.length === 0 && <EmptyState icon="✓" title="Nothing here" sub="Switch filters to see the full list." />}
      </div>
    </WorkspaceShell>
  )
}

// ─── Accounts ───────────────────────────────────────────────────────────────

function AccountList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  return (
    <WorkspaceShell title="Accounts" subtitle="The customers behind each request">
      <div className="flex flex-col gap-3">
        {ACCOUNTS.map(acct => {
          const requests = requestsForAccount(acct.id)
          const open = requests.filter(r => OPEN_STAGES.includes(r.stage))
          return (
            <CardShell key={acct.id} onClick={() => navigate('account-detail', acct.id)}>
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1"><h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{acct.name}</h3><Tag label={acct.tier} variant="muted" /></div>
                  <p className="text-[11px] text-[#AAAAAA]">Owner: {acct.owner}{acct.arr ? ` · ${acct.arr} ARR` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[18px] font-bold text-[#1A1A1A]">{requests.length}</p>
                  <p className="text-[10px] text-[#BBBBBB]">{open.length} open</p>
                </div>
              </div>
            </CardShell>
          )
        })}
      </div>
    </WorkspaceShell>
  )
}

function AccountDetail({ id, nav, navigate }: { id: string; nav: Nav; navigate: (s: Screen, id?: string) => void }) {
  const account = getAccount(id) ?? ACCOUNTS[0]
  const requests = requestsForAccount(account.id)
  const linkedInitiatives = Array.from(new Set(requests.flatMap(r => r.initiativeIds))).map(iid => getInitiative(iid))

  return (
    <WorkspaceShell
      title={<div><Breadcrumb items={[{ label: 'Accounts', screen: 'account-list' }, { label: account.name }]} onNavigate={s => nav(s)} /><h1 className="text-[15px] font-semibold text-[#1A1A1A]">{account.name}</h1></div>}
    >
      <div className="grid grid-cols-[1fr_260px] gap-5 max-w-4xl">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Requests</span></div>
            {requests.length === 0 && <div className="px-4 py-6"><EmptyState title="No requests logged for this account" /></div>}
            {requests.map(req => (
              <div key={req.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] flex items-center justify-between" onClick={() => navigate('request-detail', req.id)}>
                <span className="text-[12.5px] text-[#333]">{req.title}</span>
                <RequestStageBadge stage={req.stage} />
              </div>
            ))}
          </CardShell>
          {linkedInitiatives.length > 0 && (
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Linked Initiatives</span></div>
              {linkedInitiatives.map(init => (
                <div key={init.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]" onClick={() => navigate('initiative-detail', init.id)}>
                  <span className="text-[12.5px] font-medium text-[#1A1A1A]">{init.title}</span>
                  <p className="text-[11.5px] text-[#666] mt-1">{customerFacingInitiativeUpdate(init)}</p>
                </div>
              ))}
            </CardShell>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <CardShell className="p-4">
            <SectionLabel>Account</SectionLabel>
            <DetailRow label="Tier">{account.tier}</DetailRow>
            <DetailRow label="Owner">{account.owner}</DetailRow>
            {account.arr && <DetailRow label="ARR">{account.arr}</DetailRow>}
            <DetailRow label="Requests">{requests.length}</DetailRow>
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── Linked Initiatives (customer lens) ─────────────────────────────────────
// Deliberately NOT the shared InitiativeDetail — that screen exposes Epics,
// Risks and internal milestones. CS gets a purpose-built summary: what's
// happening, in plain language, plus which requests brought it here.

function InitiativeListCS({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const linked = INITIATIVES.filter(init => requestsForInitiative(init).length > 0)
  return (
    <WorkspaceShell title="Linked Initiatives" subtitle="Planned work that at least one customer request is tracking against">
      <div className="flex flex-col gap-3">
        {linked.map(init => {
          const requests = requestsForInitiative(init)
          return (
            <CardShell key={init.id} onClick={() => navigate('initiative-detail', init.id)}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{init.title}</h3>
                  <span className="text-[11px] text-[#888] flex-shrink-0">{initiativePct(init)}%</span>
                </div>
                <p className="text-[12px] text-[#666] leading-relaxed mb-2">{customerFacingInitiativeUpdate(init)}</p>
                <ProgressBar pct={initiativePct(init)} />
                <div className="flex items-center gap-3 pt-3 mt-2 border-t border-[#F5F5F5] text-[11px] text-[#888]">
                  <span>{requests.length} linked request{requests.length > 1 ? 's' : ''}</span>
                  <span>{customerFacingReleaseStatus(init)}</span>
                  <span>Target: {init.targetDate}</span>
                </div>
              </div>
            </CardShell>
          )
        })}
        {linked.length === 0 && <EmptyState title="No initiatives linked yet" sub="Link a customer request to an initiative to see it here." />}
      </div>
    </WorkspaceShell>
  )
}

function ProductPillsLocal({ productIds }: { productIds: string[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {productIds.map(pid => {
        const p = PRODUCTS.find(x => x.id === pid)
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

function InitiativeDetailCS({ id, nav, navigate }: { id: string; nav: Nav; navigate: (s: Screen, id?: string) => void }) {
  const init = (INITIATIVES.find(i => i.id === id) ?? INITIATIVES[0]) as Initiative
  const requests = requestsForInitiative(init)
  const epicUpdates = customerFacingEpicUpdates(init)

  return (
    <WorkspaceShell
      title={<div><Breadcrumb items={[{ label: 'Linked Initiatives', screen: 'initiative-list' }, { label: init.title }]} onNavigate={s => nav(s)} /><h1 className="text-[15px] font-semibold text-[#1A1A1A]">{init.title}</h1></div>}
    >
      <div className="grid grid-cols-[1fr_280px] gap-5 max-w-5xl">
        <div className="flex flex-col gap-4">
          <CardShell className="p-4">
            <SectionLabel>What this means for customers</SectionLabel>
            <p className="text-[13px] text-[#333] leading-relaxed mb-2">{init.goal}</p>
            <p className="text-[12.5px] text-[#666] leading-relaxed">{customerFacingInitiativeUpdate(init)}</p>
          </CardShell>
          {epicUpdates.length > 0 && (
            <CardShell className="p-4">
              <SectionLabel>Progress</SectionLabel>
              {epicUpdates.map((u, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#F5F5F5] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#AAAAAA] flex-shrink-0" />
                  <p className="text-[12px] text-[#444]">{u}</p>
                </div>
              ))}
            </CardShell>
          )}
          <CardShell className="p-4">
            <SectionLabel>Linked Customer Requests</SectionLabel>
            {requests.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-1">No requests linked.</p>}
            {requests.map(r => {
              const account = r.accountId ? getAccount(r.accountId) : undefined
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-1 px-1" onClick={() => navigate('request-detail', r.id)}>
                  <div>
                    <p className="text-[12px] font-medium text-[#333]">{r.title}</p>
                    <p className="text-[10.5px] text-[#AAAAAA]">{account ? account.name : r.source}</p>
                  </div>
                  <RequestStageBadge stage={r.stage} />
                </div>
              )
            })}
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
            <ProductPillsLocal productIds={init.productIds} />
          </CardShell>
          <CardShell className="p-4">
            <SectionLabel>Timeline</SectionLabel>
            <DetailRow label="Target Date">{init.targetDate}</DetailRow>
            <DetailRow label="Release Status">{customerFacingReleaseStatus(init)}</DetailRow>
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── Space Root ────────────────────────────────────────────────────────────────

export function CustomerSuccessSpace({ onContextChange }: { onContextChange: (ctx: { title: string; prompts: string[]; product?: string; entity?: string }) => void }) {
  const [nav, setNav] = useState<{ screen: Screen; id?: string }>({ screen: 'dashboard' })
  const shared: Nav = (screen, id) => navigate(screen as Screen, id)

  const navigate = (screen: Screen, id?: string) => {
    setNav({ screen, id })
    const ctxMap: Record<Screen, { title: string; prompts: string[] }> = {
      'dashboard': { title: 'CS Dashboard', prompts: ['Summarise requests needing triage', 'What should I update customers on today?', 'Show accounts with open asks'] },
      'request-list': { title: 'Customer Requests', prompts: ['Summarise open requests', 'Which requests are stalling?'] },
      'request-detail': { title: 'Request Detail', prompts: ['Draft a customer update', 'Suggest an initiative to link'] },
      'create-request': { title: 'New Request', prompts: ['Help draft this request'] },
      'account-list': { title: 'Accounts', prompts: ['Which accounts have the most open asks?'] },
      'account-detail': { title: 'Account Detail', prompts: ['Summarise this account’s open requests', 'Draft a check-in note'] },
      'initiative-list': { title: 'Linked Initiatives', prompts: ['Summarise progress across linked initiatives', 'Which are at risk of slipping?'] },
      'initiative-detail': { title: 'Initiative Progress', prompts: ['Draft a customer-facing update', 'When will this ship?'] },
    }
    onContextChange({ ...ctxMap[screen] })
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <Sidebar nav={nav.screen} navigate={navigate} />
      <main className="flex-1 overflow-hidden">
        {nav.screen === 'dashboard' && <Dashboard navigate={navigate} />}
        {nav.screen === 'request-list' && <RequestList navigate={navigate} />}
        {nav.screen === 'request-detail' && <CustomerRequestDetail id={nav.id ?? CUSTOMER_REQUESTS[0].id} nav={shared} role="customer-success" />}
        {nav.screen === 'create-request' && <CreateCustomerRequest nav={shared} />}
        {nav.screen === 'account-list' && <AccountList navigate={navigate} />}
        {nav.screen === 'account-detail' && <AccountDetail id={nav.id ?? ACCOUNTS[0].id} nav={shared} navigate={navigate} />}
        {nav.screen === 'initiative-list' && <InitiativeListCS navigate={navigate} />}
        {nav.screen === 'initiative-detail' && <InitiativeDetailCS id={nav.id ?? INITIATIVES[0].id} nav={shared} navigate={navigate} />}
      </main>
    </div>
  )
}
