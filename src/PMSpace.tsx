import { useState } from 'react'
import {
  PRODUCTS, INITIATIVES, EPICS, STORIES, RELEASES, CYCLES, IDEAS, WORKFLOW_TASKS, HOTFIXES,
  initiativesForProduct, epicsForProduct, storiesForProduct, epicsForInitiative, storiesForEpic,
  initiativeHealth, initiativePct, epicHealth, epicPct, storyHealth, storyPct, releaseHealth, releasePct,
  workflowTasksForSpace, pendingWorkflowCount, testCasesForStory, bugsForStory,
  hotfixesForProduct, acknowledgeWorkflowTask, completeWorkflowTask,
} from './data'
import {
  HealthBadge, StatusPair, CardShell, SectionLabel, ProgressBar, KPITile, SidebarShell, WorkspaceShell, Btn, Tag,
  ProductSwitcher, WorkflowQueue, EmptyState, Modal,
} from './ui'
import {
  IdeaDetail, CreateIdea, InitiativeDetail, CreateInitiative,
  EpicDetail, CreateEpic, StoryDetail, CreateStory, TaskDetail, CreateSubtask, BugDetail, TestCaseDetail, ReleaseDetail, CreateRelease,
  HotfixList, HotfixDetail, CreateHotfix,
  type Nav,
} from './entities'
import { PlanningWorkspace } from './PlanningWorkspace'

type Screen =
  | 'dashboard'
  | 'idea-list' | 'idea-detail' | 'create-idea'
  | 'initiative-list' | 'initiative-detail' | 'create-initiative'
  | 'planning'
  | 'epic-list' | 'epic-detail' | 'create-epic'
  | 'story-detail' | 'create-story'
  | 'backlog'
  | 'release-list' | 'release-detail' | 'create-release'
  | 'hotfix-list' | 'hotfix-detail' | 'create-hotfix'
  | 'task-detail' | 'create-subtask' | 'bug-detail' | 'test-case-detail'

// Workflow tasks can point at any level of the hierarchy (a Bug, Story, Epic
// or Initiative) — route to whichever detail screen actually matches, rather
// than assuming Story/Bug like the earlier PM-only version did.
function wfDetailScreen(sourceType: 'Bug' | 'Story' | 'Epic' | 'Initiative'): Screen {
  switch (sourceType) {
    case 'Bug': return 'bug-detail'
    case 'Epic': return 'epic-detail'
    case 'Initiative': return 'initiative-detail'
    default: return 'story-detail'
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
// Customer Requests moved out of PM entirely — that lifecycle now belongs to
// Customer Success (see CustomerSuccessSpace.tsx). PM still sees a request's
// existence the moment it's linked to one of its initiatives (via the
// Initiative's "Originated From" card), which is all planning needs.
// Backlog and Planning are merged below into one screen with a List/Board
// toggle: they showed the same stories in two different navigation items,
// which meant an extra click to discover "the other view" of identical work.

function Sidebar({ nav, navigate, product, setProduct }: { nav: Screen; navigate: (s: Screen) => void; product: string; setProduct: (p: string) => void }) {
  const backlogCount = storiesForProduct(product).filter(s => s.workflowState === 'Planning' || s.workflowState === 'Draft').length
  const openIdeas = IDEAS.filter(i => i.status === 'Idea').length
  return (
    <SidebarShell
      items={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'idea-list', label: 'Ideas', badge: openIdeas || undefined },
        { id: 'initiative-list', label: 'Initiatives' },
        { id: 'planning', label: 'Planning' },
        { id: 'epic-list', label: 'Epics' },
        { id: 'backlog', label: 'Backlog & Planning', badge: backlogCount },
        { id: 'release-list', label: 'Releases' },
        { id: 'hotfix-list', label: 'Hotfixes' },
      ]}
      nav={nav}
      navigate={navigate}
      spaceColor="bg-[#555]"
      userName="Alex Chen"
      userRole="Product Lead"
      projectName="PM Space"
      topSlot={<ProductSwitcher products={PRODUCTS} selected={product} onChange={setProduct} />}
    />
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const [showOrchestration, setShowOrchestration] = useState(false)
  const initiatives = initiativesForProduct(product)
  const stories = storiesForProduct(product)
  const cycle = CYCLES.find(c => c.current && c.productId === product)
  const blocked = stories.filter(s => storyHealth(s) === 'Blocked')
  const releases = RELEASES.filter(r => r.epicIds.some(eid => epicsForProduct(product).some(e => e.id === eid)))
  const wfQueue = workflowTasksForSpace('pm').slice(0, 3)
  const cyclePts = cycle ? cycle.storyIds.reduce((a, sid) => { const s = STORIES.find(x => x.id === sid); return a + (s ? s.points : 0) }, 0) : 0
  const cycleDonePts = cycle ? cycle.storyIds.reduce((a, sid) => { const s = STORIES.find(x => x.id === sid); return a + (s && s.workflowState === 'Released' ? s.points : 0) }, 0) : 0

  return (
    <WorkspaceShell title="PM Dashboard" subtitle={cycle ? `${cycle.name} · ${cycle.startDate} – ${cycle.endDate}` : `${PRODUCTS.find(p => p.id === product)?.name} · no active cycle`}
      actions={<><Btn small onClick={() => navigate('create-epic')}>+ Epic</Btn><Btn variant="primary" small onClick={() => navigate('create-initiative')}>+ Initiative</Btn></>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPITile label="Active Initiatives" value={String(initiatives.length)} sub={`${initiatives.filter(i => initiativeHealth(i) === 'Blocked' || initiativeHealth(i) === 'Overdue').length} need attention`} />
        <KPITile label="Cycle Completion" value={cycle ? `${cyclePts ? Math.round(cycleDonePts / cyclePts * 100) : 0}%` : '—'} sub={cycle ? `${cycleDonePts}/${cyclePts} pts` : 'Unscheduled work uses target dates'} />
        <KPITile label="Blocked Stories" value={String(blocked.length)} alert={blocked.length > 0} />
        <KPITile label="Workflow Tasks" value={String(pendingWorkflowCountLocal())} alert={pendingWorkflowCountLocal() > 0} />
      </div>

      <div className="grid grid-cols-[1fr_288px] gap-4">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Initiative Health</span>
              <Btn small variant="ghost" onClick={() => navigate('initiative-list')}>View all →</Btn>
            </div>
            {initiatives.filter(i => i.workflowState === 'In Progress' || i.workflowState === 'Testing').map(init => (
              <div key={init.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]" onClick={() => navigate('initiative-detail', init.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[#1A1A1A]">{init.title}</span>
                    <StatusPair workflow={init.workflowState} health={initiativeHealth(init)} />
                  </div>
                  <span className="text-[11px] text-[#888]">{initiativePct(init)}%</span>
                </div>
                <ProgressBar pct={initiativePct(init)} />
                <div className="flex gap-4 mt-1.5 text-[10px] text-[#BBBBBB]">
                  <span>PM: {init.pm}</span><span>Eng: {init.engLead}</span><span>Target: {init.targetDate}</span>
                </div>
              </div>
            ))}
            {initiatives.length === 0 && <div className="px-4 py-6"><EmptyState title="No initiatives for this product yet" /></div>}
          </CardShell>

          <div className="grid grid-cols-2 gap-4">
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Engineering Progress</span></div>
              {[
                { label: 'In progress stories', val: String(stories.filter(s => s.workflowState === 'In Progress').length) },
                { label: 'Blocked stories', val: String(blocked.length), alert: blocked.length > 0 },
                { label: 'Cycle completion', val: cycle ? `${cyclePts ? Math.round(cycleDonePts / cyclePts * 100) : 0}%` : '—', pct: cycle && cyclePts ? Math.round(cycleDonePts / cyclePts * 100) : undefined },
              ].map(r => (
                <div key={r.label} className="px-4 py-2 border-b border-[#F5F5F5] last:border-0">
                  <div className="flex justify-between text-[11.5px] mb-1"><span className="text-[#666]">{r.label}</span><span className={`font-medium ${r.alert ? 'text-[#CC4444]' : 'text-[#333]'}`}>{r.val}</span></div>
                  {r.pct !== undefined && <ProgressBar pct={r.pct} thin />}
                </div>
              ))}
            </CardShell>
            <CardShell>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">QA Progress</span></div>
              {[
                { label: 'Testing stories', val: String(stories.filter(s => s.workflowState === 'Testing').length) },
                { label: 'Failed test cases', val: String(stories.flatMap(s => testCasesForStory(s.id)).filter(t => t.status === 'Failed').length), alert: true },
                { label: 'Open bugs', val: String(stories.flatMap(s => bugsForStory(s.id)).filter(b => b.workflowState === 'Open').length), alert: true },
              ].map(r => (
                <div key={r.label} className="px-4 py-2 border-b border-[#F5F5F5] last:border-0">
                  <div className="flex justify-between text-[11.5px] mb-1"><span className="text-[#666]">{r.label}</span><span className={`font-medium ${r.alert && r.val !== '0' ? 'text-[#CC4444]' : 'text-[#333]'}`}>{r.val}</span></div>
                </div>
              ))}
            </CardShell>
          </div>

          {blocked.length > 0 && (
            <CardShell>
              <div className="px-4 py-3 bg-[#FDF7F7] border-b border-[#F5EEEE] flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#555]">Blocked Stories</span>
                <span className="text-[10px] bg-[#F5E0E0] text-[#CC4444] px-1.5 py-0.5 rounded-full">{blocked.length}</span>
              </div>
              {blocked.map(story => {
                const epic = EPICS.find(e => e.id === story.epicId)
                const init = epic ? INITIATIVES.find(i => i.id === epic.initiativeId) : null
                return (
                  <div key={story.id} onClick={() => navigate('story-detail', story.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-mono text-[#CCCCCC]">{story.id}</span><Tag label={init?.title ?? ''} variant="muted" /><Tag label={epic?.title ?? ''} variant="muted" /></div>
                      <p className="text-[12.5px] font-medium text-[#333]">{story.title}</p>
                    </div>
                    <HealthBadge health={storyHealth(story)} />
                  </div>
                )
              })}
            </CardShell>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Workflow Orchestration</span>
              <Btn small variant="ghost" onClick={() => setShowOrchestration(true)}>View all →</Btn>
            </div>
            <WorkflowQueue tasks={wfQueue} onSelect={t => navigate(wfDetailScreen(t.sourceType), t.sourceId)} emptyLabel="No pending cross-role tasks" onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Upcoming Releases</SectionLabel>
            {releases.map(rel => (
              <div key={rel.id} className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4" onClick={() => navigate('release-detail', rel.id)}>
                <div>
                  <p className="text-[12px] font-semibold text-[#333]">{rel.name}</p>
                  <p className="text-[10px] text-[#BBBBBB] mt-0.5">{rel.targetDate}</p>
                  <p className="text-[10px] text-[#AAAAAA] mt-0.5">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length} gates passed</p>
                </div>
                <StatusPair workflow={rel.workflowState} health={releaseHealth(rel)} />
              </div>
            ))}
            {releases.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-2">No releases scoped to this product.</p>}
          </CardShell>

          <CardShell className="p-4">
            <div className="flex items-center justify-between mb-2"><SectionLabel>AI Recommendations</SectionLabel><span className="text-[9px] text-[#BBBBBB] uppercase tracking-wider">DXOne AI</span></div>
            {[
              'Escalate Apple Pay cert to leadership — blocks the Aug 14 beta',
              'Defer Bio & Display Name to next cycle — saves 3 pts',
              'Assign Feature Tour a 2nd engineer to recover schedule',
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
          <SectionLabel>Initiative Progress</SectionLabel>
          {initiatives.map(init => (
            <div key={init.id} className="py-1.5">
              <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-[#555] truncate mr-2">{init.title}</span><span className="text-[#888] flex-shrink-0">{initiativePct(init)}%</span></div>
              <ProgressBar pct={initiativePct(init)} thin />
            </div>
          ))}
          {initiatives.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic py-1">No initiatives for this product yet.</p>}
        </CardShell>
        <CardShell className="p-4">
          <SectionLabel>Stories by Workflow State</SectionLabel>
          {(['Draft', 'Planning', 'In Progress', 'Testing', 'Released', 'Paused'] as const).map(ws => {
            const count = stories.filter(s => s.workflowState === ws).length
            return (
              <div key={ws} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#F5F5F5] last:border-0"><span className="text-[#666]">{ws}</span><span className="font-medium text-[#333]">{count}</span></div>
            )
          })}
        </CardShell>
      </div>

      {showOrchestration && (
        <Modal title="Workflow Orchestration" subtitle="Every cross-role handoff the platform has automatically generated — across all five spaces" onClose={() => setShowOrchestration(false)} wide>
          <OrchestrationBoard navigate={navigate} />
        </Modal>
      )}
    </WorkspaceShell>
  )
}

function pendingWorkflowCountLocal() { return pendingWorkflowCount('pm') }

// ─── Ideas ──────────────────────────────────────────────────────────────────

function IdeaList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  return (
    <WorkspaceShell title="Ideas" subtitle="Ideas Leadership or PM has captured — convert into an initiative when ready.">
      <div className="flex flex-col gap-3">
        {IDEAS.map(idea => (
          <CardShell key={idea.id} onClick={() => navigate('idea-detail', idea.id)}>
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1.5"><h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{idea.title}</h3><Tag label={idea.status} variant={idea.status === 'Converted' ? 'dark' : idea.status === 'Rejected' ? 'outline' : 'default'} /></div>
                <p className="text-[12px] text-[#666] leading-relaxed">{idea.description}</p>
              </div>
              <span className="text-[11px] text-[#AAAAAA] flex-shrink-0">{idea.createdBy}</span>
            </div>
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Initiative List ──────────────────────────────────────────────────────────

function InitiativeList({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const initiatives = initiativesForProduct(product)
  return (
    <WorkspaceShell title="Initiatives" subtitle="Full visibility across every initiative, epic, and story for this product"
      actions={<Btn variant="primary" onClick={() => navigate('create-initiative')}>+ New Initiative</Btn>}>
      <div className="flex flex-col gap-3">
        {initiatives.map(init => {
          const epics = epicsForInitiative(init.id)
          const allStories = epics.flatMap(e => storiesForEpic(e.id))
          return (
            <CardShell key={init.id} onClick={() => navigate('initiative-detail', init.id)}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1.5"><h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{init.title}</h3><StatusPair workflow={init.workflowState} health={initiativeHealth(init)} /></div>
                    <p className="text-[11.5px] text-[#666] mb-2">{init.goal}</p>
                    <div className="flex items-center gap-4 text-[11px] text-[#AAAAAA]"><span>PM: <span className="text-[#555]">{init.pm}</span></span><span>Eng: <span className="text-[#555]">{init.engLead}</span></span><span>QA: <span className="text-[#555]">{init.qaLead}</span></span></div>
                  </div>
                  <div className="flex-shrink-0 text-right w-36">
                    <p className="text-[20px] font-bold text-[#1A1A1A]">{initiativePct(init)}%</p>
                    <ProgressBar pct={initiativePct(init)} />
                    <p className="text-[10px] text-[#BBBBBB] mt-1">{init.targetDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-[#F5F5F5] text-[11px] text-[#888]">
                  <span>{epics.length} epics</span><span>{allStories.length} stories</span><span>{allStories.filter(s => storyHealth(s) === 'Blocked').length} blocked</span><span>{init.risks.filter(r => r.severity === 'High').length} high risks</span>
                </div>
              </div>
            </CardShell>
          )
        })}
        {initiatives.length === 0 && <EmptyState title="No initiatives for this product" sub="Switch products or create a new initiative." />}
      </div>
    </WorkspaceShell>
  )
}

// ─── Epic List ──────────────────────────────────────────────────────────────────

function EpicList({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const epics = epicsForProduct(product)
  return (
    <WorkspaceShell title="Epics" subtitle="PM owns epics — deliverable units broken into stories for engineering and QA."
      actions={<Btn variant="primary" onClick={() => navigate('create-epic')}>+ New Epic</Btn>}>
      <div className="flex flex-col gap-3">
        {epics.map(epic => {
          const init = INITIATIVES.find(i => i.id === epic.initiativeId)
          const stories = storiesForEpic(epic.id)
          return (
            <CardShell key={epic.id} onClick={() => navigate('epic-detail', epic.id)}>
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1.5"><h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{epic.title}</h3><StatusPair workflow={epic.workflowState} health={epicHealth(epic)} /></div>
                  <p className="text-[12px] text-[#666] mb-2">{epic.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#AAAAAA]"><Tag label={init?.title ?? ''} variant="muted" /><span>{stories.length} stories</span><span>{epic.assignee}</span></div>
                </div>
                <div className="flex-shrink-0 text-right w-28"><p className="text-[18px] font-bold text-[#1A1A1A]">{epicPct(epic)}%</p><ProgressBar pct={epicPct(epic)} /></div>
              </div>
            </CardShell>
          )
        })}
        {epics.length === 0 && <EmptyState title="No epics for this product" />}
      </div>
    </WorkspaceShell>
  )
}

// ─── Backlog & Planning (merged) ────────────────────────────────────────────
// Previously two separate nav items (Backlog list, Planning kanban) showing
// the same underlying stories for the same product. Merged into one screen
// with a view toggle — same data, no navigation required to see it laid out
// the other way.

function BacklogListView({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const all = storiesForProduct(product)
  const groups = [
    { label: 'Backlog', stories: all.filter(s => s.workflowState === 'Planning' || s.workflowState === 'Draft') },
    { label: 'Active', stories: all.filter(s => s.workflowState === 'In Progress' || s.workflowState === 'Testing') },
    { label: 'Done', stories: all.filter(s => s.workflowState === 'Released') },
  ]
  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {groups.map(group => (
        <CardShell key={group.label}>
          <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-[12px] font-semibold text-[#333]">{group.label}</span><span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{group.stories.length}</span></div>
            <span className="text-[11px] text-[#888]">{group.stories.reduce((a, s) => a + s.points, 0)} pts</span>
          </div>
          {group.stories.map(story => {
            const epic = EPICS.find(e => e.id === story.epicId)
            const init = epic ? INITIATIVES.find(i => i.id === epic.initiativeId) : null
            return (
              <div key={story.id} onClick={() => navigate('story-detail', story.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center gap-4 cursor-pointer hover:bg-[#FAFAFA]">
                <div className="w-3 h-3 border border-[#CCCCCC] rounded flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-mono text-[#CCCCCC]">{story.id.toUpperCase()}</span><Tag label={init?.title ?? ''} variant="muted" /><Tag label={epic?.title ?? ''} variant="muted" /></div>
                  <p className="text-[12.5px] text-[#333]">{story.title}</p>
                  {!story.cycleId && story.targetDate && <p className="text-[10px] text-[#BBBBBB] mt-0.5">Target: {story.targetDate}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0"><span className="text-[11px] text-[#888]">{story.assignee}</span><Tag label={`${story.points} pts`} variant="muted" /><StatusPair workflow={story.workflowState} health={storyHealth(story)} /></div>
              </div>
            )
          })}
          {group.stories.length === 0 && <div className="px-4 py-4 text-[11.5px] text-[#CCCCCC] italic">Nothing here</div>}
        </CardShell>
      ))}
    </div>
  )
}

// ─── Release List ───────────────────────────────────────────────────────────────

function ReleaseList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  return (
    <WorkspaceShell title="Releases" subtitle="Plan and gate releases across epics and QA sign-off" actions={<Btn variant="primary" small onClick={() => navigate('create-release')}>+ New Release</Btn>}>
      <div className="flex flex-col gap-3">
        {RELEASES.map(rel => (
          <CardShell key={rel.id} onClick={() => navigate('release-detail', rel.id)}>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1"><h3 className="text-[13.5px] font-semibold text-[#1A1A1A]">{rel.name}</h3><StatusPair workflow={rel.workflowState} health={releaseHealth(rel)} /></div>
                <p className="text-[12px] text-[#666]">{rel.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[12px] font-medium text-[#333]">{rel.targetDate}</p>
                <p className="text-[10px] text-[#BBBBBB] mt-1">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length} gates · {releasePct(rel)}%</p>
              </div>
            </div>
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

function PlanningBoardView({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const cycle = CYCLES.find(c => c.current && c.productId === product)
  const stories = storiesForProduct(product)
  const columns = [
    { id: 'backlog', label: 'Backlog', stories: stories.filter(s => s.workflowState === 'Draft' || s.workflowState === 'Planning') },
    { id: 'active', label: cycle ? `${cycle.name} ↑` : 'In Progress', stories: stories.filter(s => s.workflowState === 'In Progress') },
    { id: 'testing', label: 'Testing', stories: stories.filter(s => s.workflowState === 'Testing') },
    { id: 'done', label: 'Done', stories: stories.filter(s => s.workflowState === 'Released') },
  ]

  return (
    <div className="flex h-full overflow-x-auto px-6 py-5 gap-4">
      {columns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#555]">{col.label}</span>
            <div className="flex items-center gap-1.5"><span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{col.stories.length}</span><span className="text-[10px] text-[#BBBBBB]">{col.stories.reduce((a, s) => a + s.points, 0)} pts</span></div>
          </div>
          <div className="flex flex-col gap-2">
            {col.stories.map(story => {
              const epic = EPICS.find(e => e.id === story.epicId)
              return (
                <CardShell key={story.id} className="p-3" onClick={() => navigate('story-detail', story.id)}>
                  <div className="flex items-start justify-between gap-2 mb-2"><p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{story.title}</p><Tag label={`${story.points}p`} variant="muted" /></div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">{epic && <Tag label={epic.title} variant="muted" />}</div>
                  <div className="flex items-center justify-between"><span className="text-[10px] text-[#BBBBBB]">{story.assignee}</span><HealthBadge health={storyHealth(story)} /></div>
                </CardShell>
              )
            })}
            <button className="w-full py-2 border-2 border-dashed border-[#E4E4E4] rounded-md text-[11px] text-[#CCCCCC] hover:border-[#D0D0D0] hover:text-[#AAA] transition-colors" onClick={() => navigate('create-story')}>+ Add story</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Backlog({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const cycle = CYCLES.find(c => c.current && c.productId === product)
  return (
    <WorkspaceShell
      title="Backlog & Planning"
      subtitle={cycle ? `${cycle.name} · ${cycle.startDate} – ${cycle.endDate}` : 'No active cycle for this product — stories roll up on target date instead'}
      actions={
        <>
          <div className="flex items-center border border-[#E0E0E0] rounded-md overflow-hidden mr-1">
            <button onClick={() => setView('list')} className={`text-[11px] px-2.5 py-1 transition-colors ${view === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>List</button>
            <button onClick={() => setView('board')} className={`text-[11px] px-2.5 py-1 transition-colors ${view === 'board' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>Board</button>
          </div>
          <Btn variant="primary" small onClick={() => navigate('create-story')}>+ Story</Btn>
        </>
      }
      noPad={view === 'board'}
    >
      {view === 'list'
        ? <div className="px-6 py-5"><BacklogListView navigate={navigate} product={product} /></div>
        : <PlanningBoardView navigate={navigate} product={product} />}
    </WorkspaceShell>
  )
}

// ─── Orchestration ──────────────────────────────────────────────────────────────
// Previously its own nav item + full-screen route; now surfaced as a "View
// all" modal off the Dashboard's Workflow Orchestration card, since it's a
// drill-in on the same data rather than a distinct place of work.

function OrchestrationBoard({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending')
  const filtered = filter === 'all' ? WORKFLOW_TASKS : filter === 'pending' ? WORKFLOW_TASKS.filter(t => t.status !== 'Done') : WORKFLOW_TASKS.filter(t => t.status === 'Done')
  const bySpace = ['leadership', 'pm', 'engineering', 'qa', 'customer-success'] as const

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(['pending', 'all', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors capitalize ${filter === f ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{f}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {bySpace.map(space => {
          const tasks = filtered.filter(t => t.targetSpace === space)
          return (
            <CardShell key={space}>
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#333] capitalize">{space}</span>
                <span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
              </div>
              <WorkflowQueue tasks={tasks} onSelect={t => navigate(wfDetailScreen(t.sourceType), t.sourceId)} emptyLabel="Nothing here" onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
            </CardShell>
          )
        })}
      </div>
    </div>
  )
}

// ─── Space Root ────────────────────────────────────────────────────────────────

export function PMSpace({ onContextChange }: { onContextChange: (ctx: { title: string; prompts: string[]; product?: string }) => void }) {
  const [nav, setNav] = useState<{ screen: Screen; id?: string }>({ screen: 'dashboard' })
  const [product, setProduct] = useState('prod-dxone')
  const shared: Nav = (screen, id) => navigate(screen as Screen, id)
  const productName = PRODUCTS.find(p => p.id === product)?.name ?? ''

  const navigate = (screen: Screen, id?: string) => {
    setNav({ screen, id })
    const ctxMap: Record<Screen, { title: string; prompts: string[] }> = {
      'dashboard': { title: 'PM Dashboard', prompts: ['Show cross-team workflow tasks', 'What needs my attention?', 'Generate cycle summary', 'Identify scope risks'] },
      'idea-list': { title: 'Ideas', prompts: ['Summarise open ideas', 'Suggest ideas to convert'] },
      'idea-detail': { title: 'Idea Detail', prompts: ['Draft an initiative brief from this idea'] },
      'create-idea': { title: 'New Idea', prompts: ['Help write this idea up'] },
      'initiative-list': { title: 'Initiatives', prompts: ['Compare initiative health', 'Find at-risk items', 'Suggest reprioritisation', 'Export status report'] },
      'initiative-detail': { title: 'Initiative Detail', prompts: ['Break into epics', 'Generate stories', 'Plan release', 'Summarise progress'] },
      'create-initiative': { title: 'New Initiative', prompts: ['Write a business goal', 'Suggest success metrics', 'Estimate timeline', 'Draft initiative brief'] },
      'planning': { title: 'Planning', prompts: ['Identify scheduling conflicts', 'Which requests are unlinked?', 'Show Q3 milestones', 'Which ideas are ready to convert?'] },
      'epic-list': { title: 'Epics', prompts: ['Summarise epic progress', 'Identify blocked epics'] },
      'epic-detail': { title: 'Epic Detail', prompts: ['Break into stories', 'Write acceptance criteria', 'Estimate points', 'Identify dependencies'] },
      'create-epic': { title: 'New Epic', prompts: ['Break into stories', 'Write acceptance criteria'] },
      'story-detail': { title: 'Story Detail', prompts: ['Generate test cases', 'Break into tasks', 'Check acceptance criteria', 'Summarise discussion'] },
      'create-story': { title: 'New Story', prompts: ['Write acceptance criteria', 'Estimate points'] },
      'backlog': { title: 'Backlog & Planning', prompts: ['Prioritise backlog', 'Balance cycle load', 'Find dependencies', 'Suggest next cycle scope'] },
      'release-list': { title: 'Releases', prompts: ['Check release readiness', 'Generate release notes'] },
      'release-detail': { title: 'Release Detail', prompts: ['Check release readiness', 'What is blocking this release?', 'Generate release notes', 'Suggest scope cuts'] },
      'create-release': { title: 'New Release', prompts: ['Suggest epics for this release'] },
      'hotfix-list': { title: 'Hotfixes', prompts: ['Summarise recent hotfixes'] },
      'hotfix-detail': { title: 'Hotfix Detail', prompts: ['Summarise this hotfix'] },
      'create-hotfix': { title: 'Log Hotfix', prompts: ['Help write up the root cause'] },
      'task-detail': { title: 'Task Detail', prompts: ['Summarise this task', 'Check subtask progress'] },
      'create-subtask': { title: 'New Subtask', prompts: ['Suggest subtasks for this task'] },
      'bug-detail': { title: 'Bug Detail', prompts: ['Summarise this bug', 'Draft a status update'] },
      'test-case-detail': { title: 'Test Case', prompts: ['Summarise test coverage'] },
    }
    onContextChange({ ...ctxMap[screen], product: productName })
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <Sidebar nav={nav.screen} navigate={navigate} product={product} setProduct={setProduct} />
      <main className="flex-1 overflow-hidden">
        {nav.screen === 'dashboard' && <Dashboard navigate={navigate} product={product} />}
        {nav.screen === 'idea-list' && <IdeaList navigate={navigate} />}
        {nav.screen === 'idea-detail' && <IdeaDetail id={nav.id ?? IDEAS[0].id} nav={shared} role="pm" />}
        {nav.screen === 'create-idea' && <CreateIdea nav={shared} role="pm" />}
        {nav.screen === 'initiative-list' && <InitiativeList navigate={navigate} product={product} />}
        {nav.screen === 'initiative-detail' && <InitiativeDetail id={nav.id ?? INITIATIVES[0].id} nav={shared} role="pm" />}
        {nav.screen === 'create-initiative' && <CreateInitiative nav={shared} role="pm" />}
        {nav.screen === 'planning' && <PlanningWorkspace navigate={(s, id) => navigate(s as Screen, id)} product={product} />}
        {nav.screen === 'epic-list' && <EpicList navigate={navigate} product={product} />}
        {nav.screen === 'epic-detail' && <EpicDetail id={nav.id ?? EPICS[0].id} nav={shared} />}
        {nav.screen === 'create-epic' && <CreateEpic nav={shared} initiativeId={nav.id} />}
        {nav.screen === 'story-detail' && <StoryDetail id={nav.id ?? STORIES[1].id} nav={shared} role="pm" />}
        {nav.screen === 'create-story' && <CreateStory nav={shared} epicId={nav.id} role="pm" />}
        {nav.screen === 'backlog' && <Backlog navigate={navigate} product={product} />}
        {nav.screen === 'release-list' && <ReleaseList navigate={navigate} />}
        {nav.screen === 'release-detail' && <ReleaseDetail id={nav.id ?? RELEASES[0].id} nav={shared} role="pm" />}
        {nav.screen === 'create-release' && <CreateRelease nav={shared} />}
        {nav.screen === 'hotfix-list' && <HotfixList nav={shared} productId={product} />}
        {nav.screen === 'hotfix-detail' && <HotfixDetail id={nav.id ?? HOTFIXES[0].id} nav={shared} />}
        {nav.screen === 'create-hotfix' && <CreateHotfix nav={shared} productId={product} />}
        {nav.screen === 'task-detail' && <TaskDetail id={nav.id ?? ''} nav={shared} role="pm" />}
        {nav.screen === 'create-subtask' && <CreateSubtask nav={shared} taskId={nav.id} />}
        {nav.screen === 'bug-detail' && <BugDetail id={nav.id ?? ''} nav={shared} role="pm" />}
        {nav.screen === 'test-case-detail' && <TestCaseDetail id={nav.id ?? ''} nav={shared} role="pm" />}
      </main>
    </div>
  )
}
