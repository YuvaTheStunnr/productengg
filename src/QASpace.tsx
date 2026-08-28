import { useState } from 'react'
import {
  PRODUCTS, INITIATIVES, EPICS, STORIES, BUGS, TEST_CASES, RELEASES,
  storiesForProduct, storyHealth, releaseHealth, releasePct, workflowTasksForSpace, acknowledgeWorkflowTask, completeWorkflowTask,
  toggleGateCheck, approveRelease,
} from './data'
import { HealthBadge, StatusPair, CardShell, SectionLabel, ProgressBar, KPITile, SidebarShell, WorkspaceShell, Btn, Tag, SeverityBadge, ProductSwitcher, WorkflowQueue, EmptyState } from './ui'
import { StoryDetail, BugDetail, CreateBug, TestCaseDetail, CreateTestCase, type Nav } from './entities'

type Screen = 'dashboard' | 'testing-queue' | 'test-case-list' | 'test-case-detail' | 'create-test-case' | 'bug-list' | 'bug-detail' | 'create-bug' | 'release-readiness' | 'story-detail'

function Sidebar({ nav, navigate, product, setProduct }: { nav: Screen; navigate: (s: Screen) => void; product: string; setProduct: (p: string) => void }) {
  const openBugs = BUGS.filter(b => b.workflowState === 'Open' || b.workflowState === 'In Fix').length
  const queueCount = STORIES.filter(s => s.workflowState === 'Testing' || s.testCaseIds.length > 0).length
  return (
    <SidebarShell
      items={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'testing-queue', label: 'Testing Queue', badge: queueCount },
        { id: 'test-case-list', label: 'Test Cases' },
        { id: 'bug-list', label: 'Bugs', badge: openBugs },
        { id: 'release-readiness', label: 'Release Readiness' },
      ]}
      nav={nav}
      navigate={navigate}
      spaceColor="bg-[#666]"
      userName="Dana Rao"
      userRole="QA Lead"
      projectName="QA Space"
      topSlot={<ProductSwitcher products={PRODUCTS} selected={product} onChange={setProduct} />}
    />
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const rel = RELEASES[0]
  const stories = storiesForProduct(product)
  const critBugs = BUGS.filter(b => b.severity === 'Critical' && b.workflowState !== 'Closed' && b.workflowState !== 'Verified')
  const failedTCs = TEST_CASES.filter(tc => tc.status === 'Failed')
  const readyStories = stories.filter(s => s.workflowState === 'Testing')
  const wfQueue = workflowTasksForSpace('qa')

  return (
    <WorkspaceShell title="QA Dashboard" subtitle={`${rel.name} · Target: ${rel.targetDate}`}
      actions={<><Btn small onClick={() => navigate('release-readiness')}>Release Gates</Btn><Btn variant="primary" small onClick={() => navigate('create-bug')}>+ Log Bug</Btn></>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPITile label="Ready for Testing" value={String(readyStories.length)} />
        <KPITile label="Failed Tests" value={String(failedTCs.length)} alert={failedTCs.length > 0} />
        <KPITile label="Critical Bugs" value={String(critBugs.length)} alert={critBugs.length > 0} />
        <KPITile label="Release Readiness" value={`${releasePct(rel)}%`} sub={`${rel.gateChecks.filter(g => !g.passed).length} of ${rel.gateChecks.length} gates open`} />
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Testing Queue</span>
              <Btn small variant="ghost" onClick={() => navigate('testing-queue')}>View all →</Btn>
            </div>
            {stories.filter(s => s.workflowState === 'Testing' || s.testCaseIds.length > 0).slice(0, 5).map(story => {
              const epic = EPICS.find(e => e.id === story.epicId)
              const init = epic ? INITIATIVES.find(i => i.id === epic.initiativeId) : null
              const tcs = story.testCaseIds.map(id => TEST_CASES.find(t => t.id === id)).filter(Boolean) as typeof TEST_CASES
              const passed = tcs.filter(t => t.status === 'Passed').length
              const failed = tcs.filter(t => t.status === 'Failed').length
              const state = failed > 0 ? 'failed' : story.workflowState === 'Testing' ? 'in-testing' : 'ready'
              return (
                <div key={story.id} onClick={() => navigate('testing-queue')} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-mono text-[#CCCCCC]">{story.id.toUpperCase()}</span><Tag label={init?.title ?? ''} variant="muted" /><Tag label={epic?.title ?? ''} variant="muted" /></div>
                      <p className="text-[12.5px] font-medium text-[#1A1A1A]">{story.title}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border flex-shrink-0 ml-3 ${state === 'failed' ? 'bg-[#FDF0F0] text-[#CC4444] border-[#E8CCCC]' : state === 'in-testing' ? 'border-2 border-[#888] text-[#555]' : 'bg-[#EBEBEB] text-[#555] border-[#D8D8D8]'}`}>
                      {state === 'failed' ? 'Failed' : state === 'in-testing' ? 'In Testing' : 'Ready'}
                    </span>
                  </div>
                  {tcs.length > 0 && <div className="flex items-center gap-3 text-[10px] text-[#BBBBBB]"><span>{passed} passed</span>{failed > 0 && <span className="text-[#CC4444]">{failed} failed</span>}<span>{tcs.filter(t => t.status === 'Not Run').length} not run</span></div>}
                </div>
              )
            })}
            {stories.length === 0 && <div className="px-4 py-6"><EmptyState title="Nothing queued for this product" /></div>}
          </CardShell>

          <CardShell>
            <div className="px-4 py-3 bg-[#FDF7F7] border-b border-[#F5EEEE] flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-[12px] font-semibold text-[#555]">Open Bugs</span><span className="text-[10px] bg-[#F5E0E0] text-[#CC4444] px-1.5 py-0.5 rounded-full">{BUGS.filter(b => b.workflowState === 'Open' || b.workflowState === 'In Fix').length}</span></div>
              <Btn small variant="ghost" onClick={() => navigate('bug-list')}>View all →</Btn>
            </div>
            {BUGS.filter(b => b.workflowState !== 'Closed' && b.workflowState !== 'Verified').map(bug => (
              <div key={bug.id} onClick={() => navigate('bug-detail', bug.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] flex items-center justify-between">
                <div><span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{bug.id.toUpperCase()}</span><span className="text-[12px] text-[#333]">{bug.title}</span><p className="text-[10px] text-[#BBBBBB] mt-0.5">{bug.reporter} · {bug.assignee}</p></div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3"><SeverityBadge severity={bug.severity} /><Tag label={bug.workflowState} variant="muted" /></div>
              </div>
            ))}
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]"><span className="text-[12px] font-semibold text-[#333]">Workflow Tasks for You</span></div>
            <WorkflowQueue tasks={wfQueue} onSelect={t => navigate(t.sourceType === 'Bug' ? 'bug-detail' : 'story-detail', t.sourceId)} emptyLabel="No validation tasks pending" onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Release Readiness — {rel.name}</SectionLabel>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#EBEBEB" strokeWidth="10" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#888" strokeWidth="10" strokeDasharray={`${2 * Math.PI * 38 * (releasePct(rel) / 100)} ${2 * Math.PI * 38}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[22px] font-bold text-[#1A1A1A]">{releasePct(rel)}%</span><span className="text-[9px] text-[#AAAAAA]">Ready</span></div>
              </div>
            </div>
            {[{ l: 'Critical bugs open', v: `${critBugs.length}`, alert: true }, { l: 'Failed tests', v: `${failedTCs.length}`, alert: true }, { l: 'Gates passed', v: `${rel.gateChecks.filter(g => g.passed).length} / ${rel.gateChecks.length}` }].map(r => (
              <div key={r.l} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#F5F5F5] last:border-0"><span className="text-[#888]">{r.l}</span><span className={`font-medium ${r.alert && r.v !== '0' ? 'text-[#CC4444]' : 'text-[#333]'}`}>{r.v}</span></div>
            ))}
            <div className="mt-3 flex gap-2"><Btn small onClick={() => navigate('release-readiness')}>View Gates</Btn><Btn small variant="outline">Approve Build</Btn></div>
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── Testing Queue ────────────────────────────────────────────────────────────

function TestingQueue({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const stories = storiesForProduct(product)
  const columns = [
    { id: 'ready', label: 'Ready', stories: stories.filter(s => s.testCaseIds.length > 0 && !s.bugIds.length && s.workflowState !== 'Released') },
    { id: 'in-testing', label: 'In Testing', stories: stories.filter(s => s.workflowState === 'Testing' && s.testCaseIds.some(id => TEST_CASES.find(t => t.id === id)?.status === 'Not Run')) },
    { id: 'failed', label: 'Failed', stories: stories.filter(s => s.testCaseIds.some(id => TEST_CASES.find(t => t.id === id)?.status === 'Failed')) },
    { id: 'approved', label: 'Approved', stories: stories.filter(s => s.qaState === 'Approved') },
  ]

  return (
    <WorkspaceShell title="Testing Queue" subtitle="Stories ready for QA — each shows Initiative › Epic › Story context" actions={<><Btn small onClick={() => navigate('create-test-case')}>Generate Test Cases</Btn><Btn variant="primary" small onClick={() => navigate('create-bug')}>+ Log Bug</Btn></>} noPad>
      <div className="flex gap-4 overflow-x-auto px-6 py-5 flex-1">
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
            <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[#555]">{col.label}</span><span className="text-[10px] bg-[#EBEBEB] text-[#777] px-1.5 py-0.5 rounded-full">{col.stories.length}</span></div>
            {col.stories.map(story => {
              const epic = EPICS.find(e => e.id === story.epicId)
              const init = epic ? INITIATIVES.find(i => i.id === epic.initiativeId) : null
              const tcs = story.testCaseIds.map(id => TEST_CASES.find(t => t.id === id)).filter(Boolean) as typeof TEST_CASES
              const passed = tcs.filter(t => t.status === 'Passed').length
              return (
                <CardShell key={story.id} className="p-3" onClick={() => navigate('story-detail', story.id)}>
                  <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug mb-2">{story.title}</p>
                  <div className="text-[9px] font-mono text-[#CCCCCC] mb-2">{init?.title} › {epic?.title} › {story.id.toUpperCase()}</div>
                  {tcs.length > 0 && (
                    <>
                      <ProgressBar pct={Math.round(passed / tcs.length * 100)} thin />
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#BBBBBB]"><span>{passed}/{tcs.length} passed</span>{story.bugIds.length > 0 && <span className="text-[#CC4444]">{story.bugIds.length} bug{story.bugIds.length > 1 ? 's' : ''}</span>}</div>
                    </>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F5F5F5]"><span className="text-[10px] text-[#BBBBBB]">{tcs[0]?.assignee ?? story.assignee}</span><HealthBadge health={storyHealth(story)} /></div>
                </CardShell>
              )
            })}
            {col.stories.length === 0 && <p className="text-[11px] text-[#CCCCCC] italic px-1">Nothing here</p>}
          </div>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Test Case List ─────────────────────────────────────────────────────────────

function TestCaseList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'Failed' | 'Blocked' | 'Passed'>('all')
  const filtered = filter === 'all' ? TEST_CASES : TEST_CASES.filter(t => t.status === filter)
  return (
    <WorkspaceShell title="Test Cases" subtitle={`${TEST_CASES.length} total across active stories`} actions={<Btn variant="primary" onClick={() => navigate('create-test-case')}>+ Test Case</Btn>}>
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'Failed', 'Blocked', 'Passed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{f}</button>
        ))}
      </div>
      <CardShell>
        <div className="px-4 py-2 border-b border-[#F0F0F0] bg-[#FAFAFA] grid grid-cols-[1fr_100px_100px_100px] gap-4 text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider">
          <span>Test Case</span><span>Status</span><span>Assignee</span><span>Last Run</span>
        </div>
        {filtered.map(tc => (
          <div key={tc.id} onClick={() => navigate('test-case-detail', tc.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 grid grid-cols-[1fr_100px_100px_100px] gap-4 items-center cursor-pointer hover:bg-[#FAFAFA]">
            <div><span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{tc.id.toUpperCase()}</span><span className="text-[12.5px] font-medium text-[#1A1A1A]">{tc.title}</span></div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded w-fit ${tc.status === 'Passed' ? 'bg-[#F0F0F0] text-[#555]' : tc.status === 'Failed' || tc.status === 'Blocked' ? 'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]' : 'bg-[#FAFAFA] text-[#BBBBBB] border border-[#E4E4E4]'}`}>{tc.status}</span>
            <span className="text-[11px] text-[#666]">{tc.assignee}</span>
            <span className="text-[11px] text-[#888]">{tc.lastRun ?? 'Never'}</span>
          </div>
        ))}
      </CardShell>
    </WorkspaceShell>
  )
}

// ─── Bug List ─────────────────────────────────────────────────────────────────

function BugList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [filter, setFilter] = useState('open')
  const filtered = filter === 'open' ? BUGS.filter(b => b.workflowState === 'Open' || b.workflowState === 'In Fix')
    : filter === 'fixed' ? BUGS.filter(b => b.workflowState === 'Fixed' || b.workflowState === 'Verified')
    : BUGS

  return (
    <WorkspaceShell title="Bugs" subtitle={`${BUGS.filter(b => b.workflowState === 'Open').length} open · ${BUGS.filter(b => b.severity === 'Critical').length} critical`} actions={<Btn variant="primary" small onClick={() => navigate('create-bug')}>+ Log Bug</Btn>}>
      <div className="flex items-center gap-2 mb-4">
        {[{ id: 'open', l: 'Open' }, { id: 'fixed', l: 'Fixed / Verified' }, { id: 'all', l: 'All' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f.id ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{f.l}</button>
        ))}
      </div>
      <CardShell>
        <div className="px-4 py-2 border-b border-[#F0F0F0] bg-[#FAFAFA] grid grid-cols-[1fr_80px_100px_100px_80px] gap-4 text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider">
          <span>Bug</span><span>Severity</span><span>Status</span><span>Assignee</span><span>Reporter</span>
        </div>
        {filtered.map(bug => (
          <div key={bug.id} onClick={() => navigate('bug-detail', bug.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 grid grid-cols-[1fr_80px_100px_100px_80px] gap-4 items-center cursor-pointer hover:bg-[#FAFAFA]">
            <div><span className="text-[10px] font-mono text-[#CCCCCC] mr-2">{bug.id.toUpperCase()}</span><span className="text-[12.5px] font-medium text-[#1A1A1A]">{bug.title}</span></div>
            <SeverityBadge severity={bug.severity} />
            <Tag label={bug.workflowState} variant={bug.workflowState === 'Fixed' || bug.workflowState === 'Verified' ? 'dark' : 'muted'} />
            <span className="text-[11px] text-[#666]">{bug.assignee}</span>
            <span className="text-[11px] text-[#888]">{bug.reporter}</span>
          </div>
        ))}
      </CardShell>
    </WorkspaceShell>
  )
}

// ─── Release Readiness ────────────────────────────────────────────────────────

function ReleaseReadiness({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const [selected, setSelected] = useState(RELEASES[0].id)
  const rel = RELEASES.find(r => r.id === selected)!
  const epics = rel.epicIds.map(eid => EPICS.find(e => e.id === eid)).filter(Boolean) as typeof EPICS
  const gatePct = releasePct(rel)

  return (
    <WorkspaceShell title="Release Readiness" subtitle="Gate-by-gate sign-off for the current release cycle" actions={<><Btn small variant="outline">Request Fix</Btn><Btn variant={gatePct === 100 ? 'primary' : 'outline'} small onClick={gatePct === 100 ? () => approveRelease(rel.id) : undefined}>{gatePct === 100 ? 'Approve Release' : `Release Blocked (${rel.gateChecks.filter(g => !g.passed).length} open)`}</Btn></>}>
      <div className="flex items-center gap-2 mb-5">
        {RELEASES.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${selected === r.id ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{r.name} · {r.targetDate}</button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between"><span className="text-[12px] font-semibold text-[#333]">Epic Readiness</span><span className="text-[11px] text-[#888]">{epics.length} epics in scope</span></div>
            {epics.map(epic => {
              const stories = epic.storyIds.map(id => STORIES.find(s => s.id === id)).filter(Boolean) as typeof STORIES
              const approvedCount = stories.filter(s => s.qaState === 'Approved').length
              const bugs = stories.flatMap(s => s.bugIds.map(id => BUGS.find(b => b.id === id)).filter(Boolean)) as typeof BUGS
              const critBugs = bugs.filter(b => b.severity === 'Critical' && b.workflowState !== 'Fixed' && b.workflowState !== 'Verified' && b.workflowState !== 'Closed')
              return (
                <div key={epic.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="text-[12.5px] font-medium text-[#333]">{epic.title}</span></div>
                    <div className="flex items-center gap-2">{critBugs.length > 0 && <span className="text-[10px] text-[#CC4444]">{critBugs.length} crit bug</span>}<span className="text-[11px] text-[#888]">{approvedCount}/{stories.length} approved</span></div>
                  </div>
                  <ProgressBar pct={stories.length ? Math.round(approvedCount / stories.length * 100) : 0} />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {stories.map(story => {
                      const tcs = story.testCaseIds.map(id => TEST_CASES.find(t => t.id === id)).filter(Boolean) as typeof TEST_CASES
                      const st = tcs.some(t => t.status === 'Failed') ? 'failed' : tcs.length > 0 && tcs.every(t => t.status === 'Passed') ? 'passed' : tcs.some(t => t.status === 'Not Run') ? 'not-run' : storyHealth(story) === 'Blocked' ? 'blocked' : 'ready'
                      return (
                        <span key={story.id} onClick={() => navigate('story-detail', story.id)} className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer ${st === 'failed' || st === 'blocked' ? 'bg-[#FDF0F0] text-[#CC4444] border-[#E8CCCC]' : st === 'passed' ? 'bg-[#F0F0F0] text-[#555] border-[#D8D8D8]' : 'bg-[#FAFAFA] text-[#BBBBBB] border-dashed border-[#DDDDDD]'}`}>{story.title}</span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Regression Suite</SectionLabel>
            {[{ name: 'Auth flows', passed: 24, total: 24, pct: 100 }, { name: 'Checkout path', passed: 18, total: 30, pct: 60 }, { name: 'Profile & settings', passed: 12, total: 12, pct: 100 }, { name: 'Push & permissions', passed: 0, total: 8, pct: 0 }].map(s => (
              <div key={s.name} className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="min-w-0 flex-1 mr-4"><div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-[#555]">{s.name}</span><span className="text-[#888] font-mono">{s.passed}/{s.total}</span></div><ProgressBar pct={s.pct} thin /></div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${s.pct === 100 ? 'bg-[#F0F0F0] text-[#555]' : s.pct === 0 ? 'bg-[#FAFAFA] text-[#BBBBBB] border border-dashed border-[#DDDDDD]' : 'bg-[#EBEBEB] text-[#777]'}`}>{s.pct === 100 ? 'Complete' : s.pct === 0 ? 'Not started' : 'Partial'}</span>
              </div>
            ))}
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell className="p-4">
            <SectionLabel>Release Gates</SectionLabel>
            <div className="mb-4"><div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-[#888]">Overall readiness</span><span className="font-medium text-[#333]">{rel.gateChecks.filter(g => g.passed).length}/{rel.gateChecks.length} passed</span></div><ProgressBar pct={gatePct} /></div>
            {rel.gateChecks.map((gate, i) => (
              <div
                key={i}
                onClick={() => toggleGateCheck(rel.id, i)}
                className="flex items-start gap-2.5 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4"
              >
                <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center ${gate.passed ? 'bg-[#888]' : 'border border-[#D8D8D8]'}`}>{gate.passed && <span className="text-white text-[9px]">✓</span>}</div>
                <div><p className={`text-[12px] ${gate.passed ? 'text-[#888] line-through' : 'text-[#333]'}`}>{gate.label}</p>{gate.note && !gate.passed && <p className="text-[10px] text-[#CC4444] mt-0.5">⚠ {gate.note}</p>}</div>
              </div>
            ))}
            <p className="text-[10.5px] text-[#BBBBBB] mt-1">Click a gate to toggle it passed/open.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Btn small variant="outline">Request Engineer Fix</Btn>
              <Btn small variant="outline">Flag to PM</Btn>
              <Btn small variant={gatePct === 100 ? 'primary' : 'outline'} onClick={gatePct === 100 ? () => approveRelease(rel.id) : undefined}>{gatePct === 100 ? '✓ Approve Release' : `Approve Release (${rel.gateChecks.filter(g => !g.passed).length} open)`}</Btn>
            </div>
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Open Critical Bugs</SectionLabel>
            {BUGS.filter(b => b.severity === 'Critical' && b.workflowState !== 'Closed' && b.workflowState !== 'Verified').map(bug => (
              <div key={bug.id} onClick={() => navigate('bug-detail', bug.id)} className="py-2 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA] -mx-4 px-4">
                <p className="text-[11.5px] font-medium text-[#333]">{bug.title}</p>
                <div className="flex items-center gap-2 mt-1"><SeverityBadge severity={bug.severity} /><Tag label={bug.workflowState} variant="muted" /><span className="text-[10px] text-[#BBBBBB]">{bug.assignee}</span></div>
              </div>
            ))}
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── Space Root ────────────────────────────────────────────────────────────────

export function QASpace({ onContextChange }: { onContextChange: (ctx: { title: string; prompts: string[]; product?: string }) => void }) {
  const [nav, setNav] = useState<{ screen: Screen; id?: string }>({ screen: 'dashboard' })
  const [product, setProduct] = useState('prod-dxone')
  const shared: Nav = (screen, id) => navigate(screen as Screen, id)
  const productName = PRODUCTS.find(p => p.id === product)?.name ?? ''

  const navigate = (screen: Screen, id?: string) => {
    setNav({ screen, id })
    const ctxMap: Record<Screen, { title: string; prompts: string[] }> = {
      'dashboard':         { title: 'QA Dashboard', prompts: ['What needs testing today?', 'Summarise failed tests', 'Check release readiness', 'List critical bugs'] },
      'testing-queue':     { title: 'Testing Queue', prompts: ['Generate test cases', 'Create regression suite', 'Show blocked testing items', 'Prioritise testing queue'] },
      'test-case-list':    { title: 'Test Cases', prompts: ['Summarise test coverage gaps', 'Suggest edge cases'] },
      'test-case-detail':  { title: 'Test Case', prompts: ['Generate edge cases', 'Expand test coverage', 'Create regression variant', 'Suggest accessibility tests'] },
      'create-test-case':  { title: 'New Test Case', prompts: ['Suggest steps for this story'] },
      'bug-list':          { title: 'Bugs', prompts: ['Summarise open bugs', 'Prioritise by severity'] },
      'bug-detail':        { title: 'Bug Detail', prompts: ['Analyse this bug', 'Find similar issues', 'Draft fix request to PM', 'Suggest related test cases'] },
      'create-bug':        { title: 'New Bug', prompts: ['Help write repro steps'] },
      'release-readiness': { title: 'Release Readiness', prompts: ["What's blocking the release?", 'Generate readiness report', 'Identify scope cuts', 'Summarise gate status'] },
      'story-detail':      { title: 'Story Validation', prompts: ['Summarise this story for QA', 'Suggest test cases', 'Check acceptance criteria'] },
    }
    onContextChange({ ...ctxMap[screen], product: productName })
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <Sidebar nav={nav.screen} navigate={navigate} product={product} setProduct={setProduct} />
      <main className="flex-1 overflow-hidden">
        {nav.screen === 'dashboard' && <Dashboard navigate={navigate} product={product} />}
        {nav.screen === 'testing-queue' && <TestingQueue navigate={navigate} product={product} />}
        {nav.screen === 'test-case-list' && <TestCaseList navigate={navigate} />}
        {nav.screen === 'test-case-detail' && <TestCaseDetail id={nav.id ?? TEST_CASES[0].id} nav={shared} role="qa" />}
        {nav.screen === 'create-test-case' && <CreateTestCase nav={shared} storyId={nav.id} />}
        {nav.screen === 'bug-list' && <BugList navigate={navigate} />}
        {nav.screen === 'bug-detail' && <BugDetail id={nav.id ?? BUGS[0].id} nav={shared} role="qa" />}
        {nav.screen === 'create-bug' && <CreateBug nav={shared} storyId={nav.id} />}
        {nav.screen === 'release-readiness' && <ReleaseReadiness navigate={navigate} />}
        {nav.screen === 'story-detail' && <StoryDetail id={nav.id ?? STORIES[0].id} nav={shared} role="qa" />}
      </main>
    </div>
  )
}
