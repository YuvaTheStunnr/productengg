import { useState } from 'react'
import {
  INITIATIVES, IDEAS, RELEASES, epicsForInitiative, initiativeHealth, initiativePct, releaseHealth,
} from './data'
import { HealthBadge, StatusPair, CardShell, SectionLabel, ProgressBar, KPITile, Breadcrumb, SidebarShell, WorkspaceShell, Btn, Divider, Tag } from './ui'
import {
  IdeaDetail, CreateIdea, InitiativeDetail, CreateInitiative, ReleaseDetail, type Nav,
} from './entities'

type Screen =
  | 'dashboard'
  | 'idea-list' | 'idea-detail' | 'create-idea'
  | 'initiative-list' | 'initiative-detail' | 'create-initiative'
  | 'planning-calendar' | 'release-detail'
  | 'reports'

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ nav, navigate }: { nav: Screen; navigate: (s: Screen) => void }) {
  const openIdeas = IDEAS.filter(i => i.status === 'Idea').length
  return (
    <SidebarShell
      items={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'idea-list', label: 'Ideas', badge: openIdeas || undefined },
        { id: 'initiative-list', label: 'Initiatives' },
        { id: 'planning-calendar', label: 'Planning Calendar' },
        { id: 'reports', label: 'Reports' },
        { id: 'create-initiative', label: '+ New Initiative', action: true } as any,
      ]}
      nav={nav}
      navigate={navigate}
      spaceColor="bg-[#444]"
      userName="Jamie Okonkwo"
      userRole="VP Product"
      projectName="Leadership Space"
    />
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const needsAttention = INITIATIVES.filter(i => { const h = initiativeHealth(i); return h === 'Blocked' || h === 'Overdue' })
  const onTrack = INITIATIVES.filter(i => initiativeHealth(i) === 'On Track').length
  const completed = INITIATIVES.filter(i => initiativeHealth(i) === 'Completed').length
  const openIdeas = IDEAS.filter(i => i.status === 'Idea')
  const avgConfidence = Math.round(INITIATIVES.reduce((a, i) => a + initiativePct(i), 0) / INITIATIVES.length)

  return (
    <WorkspaceShell title="Portfolio Overview" subtitle={`Q3–Q4 2026 · ${INITIATIVES.length} active initiatives across ${new Set(INITIATIVES.flatMap(i => i.productIds)).size} products`}
      actions={<Btn variant="primary" onClick={() => navigate('create-initiative')}>+ New Initiative</Btn>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPITile label="Active Initiatives" value={String(INITIATIVES.length)} />
        <KPITile label="On Track" value={String(onTrack)} />
        <KPITile label="Needs Attention" value={String(needsAttention.length)} alert={needsAttention.length > 0} />
        <KPITile label="Delivery Confidence" value={`${avgConfidence}%`} sub="Based on current progress" />
      </div>

      <div className="grid grid-cols-[1fr_296px] gap-4">
        <div className="flex flex-col gap-4">
          {/* Initiative Health */}
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Initiative Health</span>
              <div className="flex items-center gap-3 text-[10px] text-[#AAAAAA]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#444] rounded-sm"/>Workflow State</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-[#888]"/>Health</span>
              </div>
            </div>
            {INITIATIVES.map(init => (
              <div key={init.id} onClick={() => navigate('initiative-detail', init.id)}
                className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-[#1A1A1A] truncate">{init.title}</p>
                    <p className="text-[10px] text-[#AAAAAA] mt-0.5 truncate">{init.goal.slice(0, 65)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20"><ProgressBar pct={initiativePct(init)} /></div>
                  <span className="text-[11px] text-[#888] w-8 text-right">{initiativePct(init)}%</span>
                  <StatusPair workflow={init.workflowState} health={initiativeHealth(init)} />
                  <span className="text-[11px] text-[#BBBBBB] w-24 text-right">{init.targetDate}</span>
                </div>
              </div>
            ))}
          </CardShell>

          {/* Upcoming Milestones */}
          <CardShell className="p-4">
            <SectionLabel>Upcoming Milestones</SectionLabel>
            {INITIATIVES.flatMap(i => i.milestones.filter(m => !m.done).map(m => ({ ...m, initiative: i.title })))
              .slice(0, 6).map((m, idx) => (
              <div key={m.initiative + m.label + idx} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full border border-[#888] flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-[#333]">{m.label}</p>
                    <p className="text-[10px] text-[#AAAAAA]">{m.initiative}</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#888] flex-shrink-0">{m.date}</span>
              </div>
            ))}
          </CardShell>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {needsAttention.length > 0 && (
            <CardShell className="p-4">
              <SectionLabel>Needs Attention</SectionLabel>
              {needsAttention.map(init => (
                <div key={init.id} onClick={() => navigate('initiative-detail', init.id)}
                  className="py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-semibold text-[#333]">{init.title}</p>
                    <HealthBadge health={initiativeHealth(init)} />
                  </div>
                  <ProgressBar pct={initiativePct(init)} />
                  <p className="text-[10px] text-[#CCCCCC] mt-1">Target: {init.targetDate} · {initiativePct(init)}% complete</p>
                  {init.risks.filter(r => r.severity === 'High').map((r, i) => (
                    <p key={i} className="text-[10.5px] text-[#CC4444] mt-1.5">⚠ {r.text}</p>
                  ))}
                </div>
              ))}
            </CardShell>
          )}

          <CardShell className="p-4">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>AI Executive Summary</SectionLabel>
              <span className="text-[9px] text-[#BBBBBB] uppercase tracking-wider">DXOne AI</span>
            </div>
            <p className="text-[11.5px] text-[#444] leading-relaxed">
              Portfolio delivery confidence is <span className="font-semibold text-[#333]">{avgConfidence}%</span> across {INITIATIVES.length} initiatives. {needsAttention.length} need attention — recommend a review focused on unblocking the highest-severity risks before the next milestone window.
            </p>
            <div className="mt-3 pt-3 border-t border-[#EBEBEB] flex gap-2">
              <Btn small onClick={() => navigate('reports')}>View Full Report</Btn>
              <Btn variant="primary" small>Schedule Review</Btn>
            </div>
          </CardShell>

          <CardShell className="p-4">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Ideas Awaiting Review</SectionLabel>
              <span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{openIdeas.length}</span>
            </div>
            {openIdeas.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-2">No open ideas.</p>}
            {openIdeas.map(idea => (
              <div key={idea.id} onClick={() => navigate('idea-detail', idea.id)} className="py-2 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
                <p className="text-[12px] font-medium text-[#333]">{idea.title}</p>
                <p className="text-[10px] text-[#AAAAAA] mt-0.5">{idea.createdBy} · {idea.createdAt}</p>
              </div>
            ))}
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── Idea List ────────────────────────────────────────────────────────────────

function IdeaList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'Idea' | 'Converted' | 'Rejected'>('all')
  const filtered = filter === 'all' ? IDEAS : IDEAS.filter(i => i.status === filter)

  return (
    <WorkspaceShell title="Ideas" subtitle="Leadership captures ideas early — they can stay ideas, be rejected, or convert into initiatives."
      actions={<Btn variant="primary" onClick={() => navigate('create-idea')}>+ New Idea</Btn>}>
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'Idea', 'Converted', 'Rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map(idea => (
          <CardShell key={idea.id} onClick={() => navigate('idea-detail', idea.id)}>
            <div className="px-5 py-4 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{idea.title}</h3>
                  <Tag label={idea.status} variant={idea.status === 'Converted' ? 'dark' : idea.status === 'Rejected' ? 'outline' : 'default'} />
                </div>
                <p className="text-[12px] text-[#666] leading-relaxed mb-2 line-clamp-2">{idea.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-[#AAAAAA]">
                  <span>{idea.createdBy} · {idea.createdByRole}</span>
                  <span>{idea.createdAt}</span>
                </div>
              </div>
            </div>
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Initiative List ──────────────────────────────────────────────────────────

function InitiativeList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? INITIATIVES
    : filter === 'attention' ? INITIATIVES.filter(i => { const h = initiativeHealth(i); return h === 'Blocked' || h === 'Overdue' })
    : INITIATIVES.filter(i => i.workflowState === filter)

  return (
    <WorkspaceShell
      title={<div className="flex items-center gap-3"><h1 className="text-[15px] font-semibold text-[#1A1A1A]">Initiatives</h1><span className="text-[11px] bg-[#EBEBEB] text-[#666] px-2 py-0.5 rounded-full">{filtered.length}</span></div>}
      subtitle="Cross-product business commitments — Leadership works across every product"
      actions={<Btn variant="primary" onClick={() => navigate('create-initiative')}>+ New Initiative</Btn>}
    >
      <div className="flex items-center gap-2 mb-4">
        {['all', 'In Progress', 'Planning', 'attention', 'Draft'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>
            {f === 'attention' ? 'Needs Attention' : f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(init => (
          <CardShell key={init.id} onClick={() => navigate('initiative-detail', init.id)}>
            <div className="px-5 py-4 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{init.title}</h3>
                  <StatusPair workflow={init.workflowState} health={initiativeHealth(init)} />
                </div>
                <p className="text-[12px] text-[#666] leading-relaxed mb-3">{init.goal}</p>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {init.productIds.map(pid => <Tag key={pid} label={pid.replace('prod-', '')} variant="outline" />)}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#AAAAAA]">
                  <span>PM: <span className="text-[#555]">{init.pm}</span></span>
                  <span>Eng: <span className="text-[#555]">{init.engLead}</span></span>
                  <span>{epicsForInitiative(init.id).length} epics</span>
                  <span>Target: <span className="text-[#555]">{init.targetDate}</span></span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 w-40">
                <div className="text-right mb-1">
                  <span className="text-[18px] font-bold text-[#1A1A1A]">{initiativePct(init)}%</span>
                  <p className="text-[10px] text-[#BBBBBB]">complete</p>
                </div>
                <ProgressBar pct={initiativePct(init)} />
                {init.risks.filter(r => r.severity === 'High').length > 0 && (
                  <p className="text-[10px] text-[#CC4444]">⚠ {init.risks.filter(r => r.severity === 'High').length} high risk</p>
                )}
              </div>
            </div>
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Planning Calendar ────────────────────────────────────────────────────────

function PlanningCalendar({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const months = ['Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026']
  const bars = INITIATIVES.map((init, i) => ({ init, start: i * 0.4, end: Math.min(5.9, i * 0.4 + 2.6), health: initiativeHealth(init) }))
  const milestones = [
    { label: 'v2.4.1 Beta', month: 1.4 },
    { label: 'v2.4.1 GA', month: 1.9 },
    { label: 'v3.0', month: 2.9 },
  ]

  return (
    <WorkspaceShell title="Planning Calendar" subtitle="Q3–Q4 2026 initiative timeline and milestones — cross-product view">
      <div className="bg-white border border-[#E4E4E4] rounded-md overflow-hidden mb-5">
        <div className="grid border-b border-[#E4E4E4]" style={{ gridTemplateColumns: '160px repeat(6, 1fr)' }}>
          <div className="px-4 py-3 border-r border-[#E4E4E4] bg-[#FAFAFA]" />
          {months.map(m => (
            <div key={m} className="px-3 py-3 text-[11px] font-semibold text-[#888] border-r border-[#E4E4E4] last:border-0 text-center uppercase tracking-wider">{m}</div>
          ))}
        </div>

        <div className="grid border-b border-[#F0F0F0] bg-[#FAFAFA]" style={{ gridTemplateColumns: '160px 1fr' }}>
          <div className="px-4 py-2 border-r border-[#E4E4E4] text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider flex items-center">Milestones</div>
          <div className="relative h-8">
            {milestones.map(m => (
              <div key={m.label} className="absolute flex flex-col items-center" style={{ left: `${(m.month / 6) * 100}%` }}>
                <div className="w-px h-3 bg-[#888] mt-1" />
                <div className="w-2 h-2 bg-[#888] rotate-45 -mt-1" />
                <span className="text-[9px] text-[#555] whitespace-nowrap mt-1 -translate-x-1/2">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {bars.map((bar, i) => (
          <div key={i} className="grid border-b border-[#F5F5F5] last:border-0 items-center" style={{ gridTemplateColumns: '160px 1fr' }}>
            <div className="px-4 py-3 border-r border-[#E4E4E4] text-[11.5px] font-medium text-[#444] truncate">{bar.init.title}</div>
            <div className="relative h-10 px-2 flex items-center">
              <div className="absolute inset-x-0 flex">
                {Array.from({ length: 6 }, (_, j) => <div key={j} className="flex-1 h-10 border-r border-[#F5F5F5] last:border-0" />)}
              </div>
              <div
                onClick={() => navigate('initiative-detail', bar.init.id)}
                className={`absolute h-5 rounded flex items-center px-2 text-[10px] font-medium cursor-pointer
                  ${bar.health === 'Blocked' ? 'bg-[#F5E8E8] border border-[#E8CCCC] text-[#CC4444]'
                  : bar.health === 'Overdue' ? 'bg-[#1A1A1A] border border-[#1A1A1A] text-white'
                  : bar.health === 'Not Started' ? 'bg-[#F5F5F5] border border-dashed border-[#CCCCCC] text-[#AAAAAA]'
                  : 'bg-[#EBEBEB] border border-[#D8D8D8] text-[#555]'}`}
                style={{ left: `${(bar.start / 6) * 100}%`, width: `${((bar.end - bar.start) / 6) * 100}%` }}
              >
                <span className="truncate">{bar.init.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <CardShell className="p-4">
          <SectionLabel>Release Schedule</SectionLabel>
          {RELEASES.map(rel => (
            <div key={rel.id} onClick={() => navigate('release-detail', rel.id)} className="flex items-start justify-between py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
              <div>
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{rel.name}</p>
                <p className="text-[11px] text-[#888] mt-1">{rel.description}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-[12px] font-medium text-[#333]">{rel.targetDate}</p>
                <div className="mt-1"><StatusPair workflow={rel.workflowState} health={releaseHealth(rel)} /></div>
                <p className="text-[10px] text-[#BBBBBB] mt-1">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length} gates</p>
              </div>
            </div>
          ))}
        </CardShell>
        <CardShell className="p-4">
          <SectionLabel>Legend</SectionLabel>
          {[
            { label: 'On Track', style: 'bg-[#EBEBEB] border border-[#D8D8D8]' },
            { label: 'Blocked', style: 'bg-[#F5E8E8] border border-[#E8CCCC]' },
            { label: 'Overdue', style: 'bg-[#1A1A1A] border border-[#1A1A1A]' },
            { label: 'Not Started', style: 'bg-[#F5F5F5] border border-dashed border-[#CCCCCC]' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-3 py-1.5">
              <div className={`w-8 h-3 rounded ${l.style}`} />
              <span className="text-[11.5px] text-[#555]">{l.label}</span>
            </div>
          ))}
          <Divider className="my-2" />
          <div className="flex items-center gap-3 py-1.5">
            <div className="flex items-center gap-1"><div className="w-px h-4 bg-[#888]" /><div className="w-2 h-2 bg-[#888] rotate-45 -ml-1" /></div>
            <span className="text-[11.5px] text-[#555]">Release Milestone</span>
          </div>
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ─── Reports ────────────────────────────────────────────────────────────────

function Reports() {
  const byHealth = ['On Track', 'Blocked', 'Overdue', 'Not Started', 'Completed'] as const
  return (
    <WorkspaceShell title="Reports" subtitle="Portfolio-level rollups across all products">
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <CardShell>
          <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Initiatives by Health</span></div>
          {byHealth.map(h => {
            const count = INITIATIVES.filter(i => initiativeHealth(i) === h).length
            return (
              <div key={h} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center gap-3">
                <span className="text-[11.5px] text-[#555] w-28 flex-shrink-0">{h}</span>
                <div className="flex-1"><ProgressBar pct={INITIATIVES.length ? Math.round(count / INITIATIVES.length * 100) : 0} /></div>
                <span className="text-[11px] text-[#888] w-6 text-right">{count}</span>
              </div>
            )
          })}
        </CardShell>
        <CardShell className="p-4">
          <SectionLabel>Delivery by Initiative</SectionLabel>
          {INITIATIVES.map(init => (
            <div key={init.id} className="py-1.5">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#555] truncate mr-2">{init.title}</span>
                <span className="text-[#888] flex-shrink-0">{initiativePct(init)}%</span>
              </div>
              <ProgressBar pct={initiativePct(init)} thin />
            </div>
          ))}
        </CardShell>
      </div>
    </WorkspaceShell>
  )
}

// ─── Space Root ────────────────────────────────────────────────────────────────

export type LeadershipNav = { screen: Screen; id?: string }

export function LeadershipSpace({ onContextChange }: { onContextChange: (ctx: { title: string; prompts: string[] }) => void }) {
  const [nav, setNav] = useState<LeadershipNav>({ screen: 'dashboard' })
  const shared: Nav = (screen, id) => navigate(screen as Screen, id)

  const navigate = (screen: Screen, id?: string) => {
    setNav({ screen, id })
    const ctx: Record<Screen, { title: string; prompts: string[] }> = {
      'dashboard': { title: 'Portfolio Dashboard', prompts: ['Summarize portfolio health', 'Identify delivery risks', 'Review submitted ideas', 'Forecast Q3 delivery'] },
      'idea-list': { title: 'Ideas', prompts: ['Summarise open ideas', 'Suggest ideas to convert', 'Draft a rejection rationale'] },
      'idea-detail': { title: 'Idea Detail', prompts: ['Draft an initiative brief from this idea', 'Summarise this idea', 'Suggest a rejection rationale'] },
      'create-idea': { title: 'New Idea', prompts: ['Help write this idea up', 'Suggest similar past ideas'] },
      'initiative-list': { title: 'Initiatives', prompts: ['Compare initiative progress', 'Identify at-risk initiatives', 'Export summary for board', 'Suggest reprioritisation'] },
      'initiative-detail': { title: 'Initiative Detail', prompts: ['Summarize this initiative', 'Predict delivery date', 'Generate stakeholder update', 'Identify top risks'] },
      'create-initiative': { title: 'New Initiative', prompts: ['Help write a business goal', 'Suggest success metrics', 'Draft initiative brief', 'Estimate timeline'] },
      'planning-calendar': { title: 'Planning Calendar', prompts: ['Identify scheduling conflicts', 'Optimise release dates', 'Show Q3 milestones', 'Summarise upcoming deadlines'] },
      'release-detail': { title: 'Release Detail', prompts: ['Summarise release readiness', 'What is blocking this release?'] },
      'reports': { title: 'Reports', prompts: ['Summarise portfolio health', 'Draft board update', 'Compare products by delivery confidence'] },
    }
    onContextChange(ctx[screen])
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <Sidebar nav={nav.screen} navigate={navigate} />
      <main className="flex-1 overflow-hidden">
        {nav.screen === 'dashboard' && <Dashboard navigate={navigate} />}
        {nav.screen === 'idea-list' && <IdeaList navigate={navigate} />}
        {nav.screen === 'idea-detail' && <IdeaDetail id={nav.id ?? IDEAS[0].id} nav={shared} role="leadership" />}
        {nav.screen === 'create-idea' && <CreateIdea nav={shared} role="leadership" />}
        {nav.screen === 'initiative-list' && <InitiativeList navigate={navigate} />}
        {nav.screen === 'initiative-detail' && <InitiativeDetail id={nav.id ?? INITIATIVES[0].id} nav={shared} role="leadership" />}
        {nav.screen === 'create-initiative' && <CreateInitiative nav={shared} role="leadership" />}
        {nav.screen === 'planning-calendar' && <PlanningCalendar navigate={navigate} />}
        {nav.screen === 'release-detail' && <ReleaseDetail id={nav.id ?? RELEASES[0].id} nav={shared} role="leadership" />}
        {nav.screen === 'reports' && <Reports />}
      </main>
    </div>
  )
}
