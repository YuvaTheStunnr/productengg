// ─────────────────────────────────────────────────────────────────────────────
// Planning Workspace
//
// One tabbed view across the four things a portfolio actually plans against —
// Ideas, Initiatives, Requests and Releases — each with its own lifecycle,
// each shown as a Kanban board of that lifecycle's real stages. Initiatives
// and Releases (the two with real dates) can also switch to a Gantt timeline.
// Cards cross-link where the data already does: a Converted idea points at
// the initiative it became, a linked request points at the initiative it's
// tracking against, a release lists the initiatives it ships.
//
// Shared by PM (product-scoped) and Leadership (cross-product) — pass
// `product` to filter the Initiatives tab to one product; omit it to show
// everything, which is what Leadership wants.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  IDEAS, INITIATIVES, CUSTOMER_REQUESTS, RELEASES,
  getInitiative, getEpic, requestsForInitiative, initiativesForRequest, initiativesForProduct,
  initiativeHealth, initiativePct, releaseHealth, releasePct,
  type Idea, type Initiative, type CustomerRequest, type Release, type WorkflowState, type RequestStatus,
} from './data'
import {
  WorkspaceShell, TabBar, KanbanBoard, GanttTimeline, CardShell, ProgressBar, Tag, HealthBadge,
  monthPosition, ganttBarClass, ganttDotClass,
} from './ui'

type PlanTab = 'idea' | 'initiative' | 'requests' | 'releases'
type PlanNav = (screen: string, id?: string) => void

function initiativesForRelease(rel: Release): Initiative[] {
  const ids = new Set<string>()
  rel.epicIds.forEach(eid => { const e = getEpic(eid); if (e) ids.add(e.initiativeId) })
  return Array.from(ids).map(id => getInitiative(id))
}

export function PlanningWorkspace({ navigate, product }: { navigate: PlanNav; product?: string }) {
  const [tab, setTab] = useState<PlanTab>('initiative')
  const [view, setView] = useState<'kanban' | 'gantt'>('gantt')
  const supportsGantt = tab === 'initiative' || tab === 'releases'
  const activeView = supportsGantt ? view : 'kanban'
  const initiatives = product ? initiativesForProduct(product) : INITIATIVES

  return (
    <WorkspaceShell
      title="Planning"
      subtitle="Ideas, initiatives, requests and releases — each lifecycle on its own board, linked where the data already connects them"
      actions={supportsGantt ? (
        <div className="flex items-center border border-[#E0E0E0] rounded-md overflow-hidden">
          <button onClick={() => setView('kanban')} className={`text-[11px] px-2.5 py-1 transition-colors ${activeView === 'kanban' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>Kanban</button>
          <button onClick={() => setView('gantt')} className={`text-[11px] px-2.5 py-1 transition-colors ${activeView === 'gantt' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>Gantt</button>
        </div>
      ) : undefined}
      noPad
    >
      <TabBar
        tabs={[
          { id: 'idea', label: 'Ideas', count: IDEAS.length },
          { id: 'initiative', label: 'Initiatives', count: initiatives.length },
          { id: 'requests', label: 'Requests', count: CUSTOMER_REQUESTS.length },
          { id: 'releases', label: 'Releases', count: RELEASES.length },
        ]}
        active={tab}
        onSelect={setTab}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'idea' && <IdeaBoard navigate={navigate} />}
        {tab === 'initiative' && (activeView === 'gantt'
          ? <InitiativeGantt navigate={navigate} initiatives={initiatives} />
          : <InitiativeBoard navigate={navigate} initiatives={initiatives} />)}
        {tab === 'requests' && <RequestsBoard navigate={navigate} />}
        {tab === 'releases' && (activeView === 'gantt'
          ? <ReleasesGantt navigate={navigate} />
          : <ReleasesBoard navigate={navigate} />)}
      </div>
    </WorkspaceShell>
  )
}

// ─── Ideas ────────────────────────────────────────────────────────────────────

function IdeaBoard({ navigate }: { navigate: PlanNav }) {
  const stages = ['Idea', 'Converted', 'Rejected'] as const
  const columns = stages.map(s => ({ id: s, label: s, items: IDEAS.filter(i => i.status === s) }))
  return (
    <KanbanBoard
      columns={columns}
      cardKey={(i: Idea) => i.id}
      renderCard={(idea: Idea) => (
        <CardShell className="p-3" onClick={() => navigate('idea-detail', idea.id)}>
          <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug mb-1.5">{idea.title}</p>
          <p className="text-[10px] text-[#AAAAAA]">{idea.createdBy} · {idea.createdAt}</p>
          {idea.status === 'Converted' && idea.initiativeId && (
            <button
              onClick={e => { e.stopPropagation(); navigate('initiative-detail', idea.initiativeId) }}
              className="mt-2 text-[10.5px] text-[#555] hover:underline"
            >
              → {getInitiative(idea.initiativeId).title}
            </button>
          )}
        </CardShell>
      )}
    />
  )
}

// ─── Initiatives ──────────────────────────────────────────────────────────────

const INITIATIVE_STAGES: WorkflowState[] = ['Draft', 'Planning', 'In Progress', 'Released']

function InitiativeBoard({ navigate, initiatives }: { navigate: PlanNav; initiatives: Initiative[] }) {
  const columns = INITIATIVE_STAGES.map(s => ({ id: s, label: s, items: initiatives.filter(i => i.workflowState === s) }))
  return (
    <KanbanBoard
      columns={columns}
      cardKey={(i: Initiative) => i.id}
      renderCard={(init: Initiative) => {
        const linked = requestsForInitiative(init)
        return (
          <CardShell className="p-3" onClick={() => navigate('initiative-detail', init.id)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{init.title}</p>
              <HealthBadge health={initiativeHealth(init)} />
            </div>
            <ProgressBar pct={initiativePct(init)} thin />
            <div className="flex items-center justify-between mt-2 text-[10px] text-[#BBBBBB]">
              <span>Target: {init.targetDate}</span>
              {linked.length > 0 && <span>{linked.length} request{linked.length > 1 ? 's' : ''}</span>}
            </div>
          </CardShell>
        )
      }}
    />
  )
}

function InitiativeGantt({ navigate, initiatives }: { navigate: PlanNav; initiatives: Initiative[] }) {
  const rows = initiatives.map(init => {
    const end = monthPosition(init.targetDate) ?? 5.9
    // Prefer the initiative's real Start Date; fall back to inferring one
    // from its earliest milestone for older seed data without one.
    const declaredStart = monthPosition(init.startDate)
    const earliestMilestone = init.milestones.map(m => monthPosition(m.date)).filter((p): p is number => p !== null).sort((a, b) => a - b)[0]
    const start = declaredStart ?? (earliestMilestone !== undefined ? Math.min(earliestMilestone, end - 0.2) : Math.max(0, end - 2))
    return {
      id: init.id, label: init.title,
      start: Math.max(0, start), end: Math.max(start + 0.2, end),
      colorClass: ganttBarClass(initiativeHealth(init)),
      onClick: () => navigate('initiative-detail', init.id),
    }
  })
  const milestones = RELEASES.map(r => ({ label: r.name, month: monthPosition(r.targetDate) })).filter((m): m is { label: string; month: number } => m.month !== null)
  return <GanttTimeline rows={rows} milestones={milestones} />
}

// ─── Requests ─────────────────────────────────────────────────────────────────

const REQUEST_STAGES: RequestStatus[] = ['New', 'Under Review', 'Accepted', 'Linked to Initiative', 'In Progress', 'Released', 'Closed', 'Rejected']

function RequestsBoard({ navigate }: { navigate: PlanNav }) {
  const columns = REQUEST_STAGES.map(s => ({ id: s, label: s, items: CUSTOMER_REQUESTS.filter(r => r.stage === s) }))
  return (
    <KanbanBoard
      columns={columns}
      cardKey={(r: CustomerRequest) => r.id}
      renderCard={(req: CustomerRequest) => {
        const linked = initiativesForRequest(req)
        return (
          <CardShell className="p-3" onClick={linked.length > 0 ? () => navigate('initiative-detail', linked[0].id) : undefined}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{req.title}</p>
              <Tag label={req.priority} variant={req.priority === 'Critical' ? 'dark' : 'outline'} />
            </div>
            <p className="text-[10px] text-[#AAAAAA]">{req.source} · {req.requestedAt}</p>
            {linked.length > 0 && (
              <p className="text-[10.5px] text-[#555] mt-2">→ {linked[0].title}{linked.length > 1 ? ` +${linked.length - 1}` : ''}</p>
            )}
          </CardShell>
        )
      }}
    />
  )
}

// ─── Releases ─────────────────────────────────────────────────────────────────

const RELEASE_STAGES: WorkflowState[] = ['Draft', 'Planning', 'In Progress', 'Testing', 'Released']

function ReleasesBoard({ navigate }: { navigate: PlanNav }) {
  const columns = RELEASE_STAGES.map(s => ({ id: s, label: s, items: RELEASES.filter(r => r.workflowState === s) }))
  return (
    <KanbanBoard
      columns={columns}
      cardKey={(r: Release) => r.id}
      renderCard={(rel: Release) => {
        const linkedInits = initiativesForRelease(rel)
        return (
          <CardShell className="p-3" onClick={() => navigate('release-detail', rel.id)}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{rel.name}</p>
              <HealthBadge health={releaseHealth(rel)} />
            </div>
            <ProgressBar pct={releasePct(rel)} thin />
            <div className="flex items-center justify-between mt-2 text-[10px] text-[#BBBBBB]">
              <span>Target: {rel.targetDate}</span>
              <span>{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length} gates</span>
            </div>
            {linkedInits.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mt-2">
                {linkedInits.slice(0, 2).map(i => <Tag key={i.id} label={i.title} variant="outline" />)}
                {linkedInits.length > 2 && <span className="text-[9.5px] text-[#CCCCCC]">+{linkedInits.length - 2}</span>}
              </div>
            )}
          </CardShell>
        )
      }}
    />
  )
}

function ReleasesGantt({ navigate }: { navigate: PlanNav }) {
  const rows = RELEASES.map(rel => {
    const pos = monthPosition(rel.targetDate) ?? 5.9
    return {
      id: rel.id, label: rel.name, start: pos, end: pos,
      colorClass: ganttDotClass(releaseHealth(rel)),
      onClick: () => navigate('release-detail', rel.id),
    }
  })
  return <GanttTimeline rows={rows} />
}
