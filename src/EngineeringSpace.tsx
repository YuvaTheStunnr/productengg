import { useState } from 'react'
import {
  PRODUCTS, STORIES, TASKS, EPICS, CYCLES, RELEASES, HOTFIXES,
  storiesForProduct, tasksForStory, taskHealth, taskPct, storyHealth, releaseHealth,
  workflowTasksForSpace, acknowledgeWorkflowTask, completeWorkflowTask,
} from './data'
import { HealthBadge, StatusPair, CardShell, SectionLabel, ProgressBar, ProgressLabel, KPITile, SidebarShell, WorkspaceShell, Btn, Tag, ProductSwitcher, WorkflowQueue, EmptyState, HScroll, plural } from './ui'
import { StoryDetail, CreateStory, TaskDetail, CreateTask, CreateSubtask, BugDetail, ReleaseDetail, HotfixList, HotfixDetail, CreateHotfix, type Nav } from './entities'

type Screen = 'dashboard' | 'my-tasks' | 'board' | 'story-list' | 'story-detail' | 'create-story' | 'task-detail' | 'create-task' | 'create-subtask' | 'release-list' | 'release-detail' | 'bug-detail' | 'hotfix-list' | 'hotfix-detail' | 'create-hotfix'

const ME = 'Morgan Tse'

function Sidebar({ nav, navigate, product, setProduct }: { nav: Screen; navigate: (s: Screen) => void; product: string; setProduct: (p: string) => void }) {
  const myPending = TASKS.filter(t => t.assignee === ME && t.workflowState !== 'Released').length
  return (
    <SidebarShell
      items={[
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'my-tasks', label: 'My Tasks', badge: myPending || undefined },
        { id: 'board', label: 'Board' },
        { id: 'story-list', label: 'Stories' },
        { id: 'release-list', label: 'Releases' },
        { id: 'hotfix-list', label: 'Hotfixes' },
      ]}
      nav={nav}
      navigate={navigate}
      spaceColor="bg-[#7C3AED]"
      userName={ME}
      userRole="iOS Engineer"
      projectName="Engineering Space"
      topSlot={<ProductSwitcher products={PRODUCTS} selected={product} onChange={setProduct} />}
    />
  )
}

function TaskStatusDot({ state }: { state: string }) {
  if (state === 'In Progress') return <div className="w-3 h-3 rounded-full border-2 border-[#888] flex-shrink-0" />
  if (state === 'Released') return <div className="w-3 h-3 rounded-full bg-[#888] flex-shrink-0" />
  if (state === 'Testing') return <div className="w-3 h-3 rounded-full border-2 border-[#555] bg-transparent flex-shrink-0" />
  return <div className="w-3 h-3 rounded-full border border-[#CCCCCC] flex-shrink-0" />
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const cycle = CYCLES.find(c => c.current && c.productId === product)
  const myTasks = TASKS.filter(t => t.assignee === ME)
  const inProgress = myTasks.filter(t => t.workflowState === 'In Progress')
  const blocked = myTasks.filter(t => taskHealth(t) === 'Blocked')
  const wfQueue = workflowTasksForSpace('engineering')
  const cyclePts = cycle ? cycle.storyIds.reduce((a, sid) => a + (STORIES.find(s => s.id === sid)?.points ?? 0), 0) : 0
  const cycleDonePts = cycle ? cycle.storyIds.reduce((a, sid) => { const s = STORIES.find(x => x.id === sid); return a + (s && s.workflowState === 'Released' ? s.points : 0) }, 0) : 0

  return (
    <WorkspaceShell title="Engineering Dashboard" subtitle={cycle ? `${cycle.name} · ${cycle.startDate} – ${cycle.endDate}` : `${PRODUCTS.find(p => p.id === product)?.name} · unscheduled work`}
      actions={<><Btn small onClick={() => navigate('board')}>Start Branch</Btn><Btn variant="primary" small onClick={() => navigate('create-story')}>+ Create Story</Btn></>}>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPITile label="Assigned to me" value={String(myTasks.length)} />
        <KPITile label="In Progress" value={String(inProgress.length)} />
        <KPITile label="Blockers" value={String(blocked.length)} alert={blocked.length > 0} />
        <KPITile label="Workflow Tasks" value={String(wfQueue.filter(t => t.status !== 'Done').length)} alert={wfQueue.some(t => t.status === 'Pending')} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_296px] gap-4">
        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#333]">Assigned Work</span>
              <Btn small variant="ghost" onClick={() => navigate('my-tasks')}>View all →</Btn>
            </div>
            {myTasks.slice(0, 5).map(task => {
              const story = STORIES.find(s => s.id === task.storyId)
              const epic = story ? EPICS.find(e => e.id === story.epicId) : null
              return (
                <div key={task.id} onClick={() => navigate('task-detail', task.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <TaskStatusDot state={task.workflowState} />
                      <span className="text-[10px] font-mono text-[#CCCCCC]">{task.id.toUpperCase()}</span>
                      <span className="text-[12.5px] font-medium text-[#1A1A1A]">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0"><Tag label={`${task.estimate}h`} variant="muted" /><StatusPair workflow={task.workflowState} health={taskHealth(task)} /></div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#CCCCCC] font-mono">
                    <span>{epic?.title}</span><span className="text-[#DDDDDD]">›</span><span>{story?.id?.toUpperCase()}</span>
                    {task.branch && <span className="ml-2 bg-[#F5F5F5] px-1.5 py-0.5 rounded text-[#888]">{task.branch}</span>}
                  </div>
                </div>
              )
            })}
            {myTasks.length === 0 && <div className="px-4 py-6"><EmptyState title="Nothing assigned yet" /></div>}
          </CardShell>

          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center gap-2"><span className="text-[12px] font-semibold text-[#333]">Code Reviews Pending</span><span className="text-[10px] bg-[#4F46E5] text-white px-1.5 py-0.5 rounded-full">2</span></div>
            {[
              { pr: 'PR-89', title: 'feat: checkout flow redesign', author: 'Sam Liu', age: '18h', lines: '+342 / -128', story: 'STORY-8' },
              { pr: 'PR-91', title: 'fix: session expiry edge case', author: 'Sam Liu', age: '4h', lines: '+22 / -8', story: 'STORY-2' },
            ].map(pr => (
              <div key={pr.pr} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-mono text-[#AAAAAA]">{pr.pr}</span><Tag label={pr.story} variant="code" /></div>
                  <p className="text-[12.5px] font-medium text-[#1A1A1A]">{pr.title}</p>
                  <p className="text-[10px] text-[#BBBBBB] mt-0.5 font-mono">{pr.author} · {pr.age} ago · {pr.lines}</p>
                </div>
                <div className="flex gap-2"><Btn small variant="outline">Approve</Btn><Btn small variant="outline">Review</Btn></div>
              </div>
            ))}
          </CardShell>
        </div>

        <div className="flex flex-col gap-4">
          <CardShell>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center gap-2"><span className="text-[12px] font-semibold text-[#333]">Workflow Tasks for You</span></div>
            <WorkflowQueue tasks={wfQueue} onSelect={t => navigate(t.sourceType === 'Bug' ? 'bug-detail' : 'story-detail', t.sourceId)} emptyLabel="No cross-role tasks right now" onAcknowledge={acknowledgeWorkflowTask} onComplete={completeWorkflowTask} />
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Cycle Progress</SectionLabel>
            {cycle ? (
              <>
                <div className="flex justify-between text-[11px] mb-2"><span className="text-[#888]">{cycle.name}</span><span className="font-medium text-[#333]">{cyclePts ? Math.round(cycleDonePts / cyclePts * 100) : 0}% · {cycleDonePts}/{cyclePts} pts</span></div>
                <ProgressBar pct={cyclePts ? Math.round(cycleDonePts / cyclePts * 100) : 0} />
              </>
            ) : <p className="text-[11.5px] text-[#CCCCCC] italic">No active cycle for this product — work here rolls up on target date.</p>}
          </CardShell>

          <CardShell className="p-4">
            <SectionLabel>Build Status</SectionLabel>
            {[{ name: 'main', status: 'Passing', time: '6m ago', color: true }, { name: 'feat/auth-refactor', status: 'Failing', time: '12m ago', color: false }, { name: 'feat/payment-v2', status: 'Passing', time: '1h ago', color: true }].map(b => (
              <div key={b.name} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
                <div><p className="font-mono text-[11px] text-[#444]">{b.name}</p><p className="text-[10px] text-[#BBBBBB]">{b.time}</p></div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${b.color ? 'bg-[#F0F0F0] text-[#555]' : 'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]'}`}>{b.status}</span>
              </div>
            ))}
          </CardShell>
        </div>
      </div>
    </WorkspaceShell>
  )
}

// ─── My Tasks ────────────────────────────────────────────────────────────────

function MyTasks({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  const myTasks = TASKS.filter(t => t.assignee === ME)
  const groups: { label: string; tasks: typeof TASKS }[] = [
    { label: 'In Progress', tasks: myTasks.filter(t => t.workflowState === 'In Progress') },
    { label: 'Assigned / Todo', tasks: myTasks.filter(t => t.workflowState === 'Planning' || t.workflowState === 'Draft') },
    { label: 'In Review', tasks: myTasks.filter(t => t.workflowState === 'Testing') },
    { label: 'Blocked', tasks: myTasks.filter(t => taskHealth(t) === 'Blocked') },
    { label: 'Completed', tasks: myTasks.filter(t => t.workflowState === 'Released') },
  ].filter(g => g.tasks.length > 0)

  return (
    <WorkspaceShell title="My Tasks" subtitle={`${myTasks.length} tasks assigned`} actions={<><Btn small>Start Branch</Btn><Btn small>Raise Blocker</Btn><Btn variant="primary" small onClick={() => navigate('create-task')}>+ Create Task</Btn></>}>
      <div className="flex flex-col gap-4 max-w-4xl">
        {groups.map(group => (
          <CardShell key={group.label}>
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0] flex items-center gap-2"><span className="text-[12px] font-semibold text-[#333]">{group.label}</span><span className="text-[10px] bg-[#EBEBEB] text-[#555] px-1.5 py-0.5 rounded-full">{group.tasks.length}</span></div>
            {group.tasks.map(task => {
              const story = STORIES.find(s => s.id === task.storyId)
              const epic = story ? EPICS.find(e => e.id === story.epicId) : null
              return (
                <div key={task.id} onClick={() => navigate('task-detail', task.id)} className="px-4 py-3 border-b border-[#F5F5F5] last:border-0 cursor-pointer hover:bg-[#FAFAFA]">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <TaskStatusDot state={task.workflowState} />
                      <span className="text-[10px] font-mono text-[#CCCCCC] flex-shrink-0">{task.id.toUpperCase()}</span>
                      <span className="text-[12.5px] font-medium text-[#1A1A1A] truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3"><Tag label={`${task.estimate}h`} variant="muted" /><StatusPair workflow={task.workflowState} health={taskHealth(task)} /></div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    {epic && <span className="text-[#CCCCCC]">{epic.title}</span>}
                    {story && <><span className="text-[#DDDDDD]">›</span><button className="text-[#AAAAAA] hover:underline" onClick={e => { e.stopPropagation(); navigate('story-detail', story.id) }}>{story.id.toUpperCase()}</button></>}
                    {task.branch && <span className="ml-2 bg-[#F5F5F5] px-1.5 py-0.5 rounded text-[#888]">{task.branch}</span>}
                    {task.prNumber && <span className="text-[#AAAAAA]">PR #{task.prNumber}</span>}
                  </div>
                  {taskPct(task) > 0 && task.workflowState !== 'Released' && (
                    <div className="flex items-center gap-2 mt-1.5"><div className="w-24"><ProgressBar pct={taskPct(task)} thin health={taskHealth(task)} /></div><ProgressLabel pct={taskPct(task)} health={taskHealth(task)} className="text-[10px] text-[#BBBBBB]" /></div>
                  )}
                </div>
              )
            })}
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Board (Cycle) ────────────────────────────────────────────────────────────

function Board({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const cycle = CYCLES.find(c => c.current && c.productId === product)
  const cycleStoryIds = cycle ? cycle.storyIds : []
  const allTasks = TASKS.filter(t => cycleStoryIds.includes(t.storyId))
  const columns: { id: string; label: string; tasks: typeof TASKS }[] = [
    { id: 'todo', label: 'Todo', tasks: allTasks.filter(t => t.workflowState === 'Planning' || t.workflowState === 'Draft') },
    { id: 'progress', label: 'In Progress', tasks: allTasks.filter(t => t.workflowState === 'In Progress') },
    { id: 'review', label: 'In Review', tasks: allTasks.filter(t => t.workflowState === 'Testing') },
    { id: 'done', label: 'Done', tasks: allTasks.filter(t => t.workflowState === 'Released') },
  ]

  return (
    <WorkspaceShell title={cycle ? `${cycle.name} Board` : 'Board'} subtitle={cycle ? `${cycle.startDate} – ${cycle.endDate}` : 'No active cycle for this product'} actions={<><Btn small>Filter: Me</Btn><Btn variant="primary" small onClick={() => navigate('create-task')}>+ Task</Btn></>} noPad>
      <HScroll className="flex gap-4 px-6 py-5" fullHeight>
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-64 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#555]">{col.label}</span>
              <div className="flex items-center gap-1.5"><span className="text-[10px] bg-[#EBEBEB] text-[#555] px-1.5 py-0.5 rounded-full">{col.tasks.length}</span><span className="text-[10px] text-[#BBBBBB]">{col.tasks.reduce((a, t) => a + t.estimate, 0)}h</span></div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {col.tasks.map(task => {
                const story = STORIES.find(s => s.id === task.storyId)
                const epic = story ? EPICS.find(e => e.id === story.epicId) : null
                return (
                  <CardShell key={task.id} className="p-3" onClick={() => navigate('task-detail', task.id)}>
                    <div className="flex items-start justify-between gap-2 mb-2"><p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{task.title}</p><Tag label={`${task.estimate}h`} variant="muted" /></div>
                    {task.branch && <p className="font-mono text-[10px] text-[#AAAAAA] mb-2 truncate">{task.branch}</p>}
                    <div className="flex flex-wrap gap-1 mb-2"><span className="text-[9px] text-[#CCCCCC] font-mono">{story?.id?.toUpperCase()}</span>{epic && <Tag label={epic.title} variant="muted" />}</div>
                    <div className="flex items-center justify-between mt-1"><span className="text-[10px] text-[#BBBBBB]">{task.assignee.split(' ')[0]}</span><HealthBadge health={taskHealth(task)} /></div>
                    {taskPct(task) > 0 && <div className="mt-2 pt-2 border-t border-[#F5F5F5]"><ProgressBar pct={taskPct(task)} thin health={taskHealth(task)} /></div>}
                  </CardShell>
                )
              })}
              <button className="w-full py-2 border-2 border-dashed border-[#E4E4E4] rounded-md text-[11px] text-[#CCCCCC] hover:border-[#D0D0D0] hover:text-[#AAA] transition-colors" onClick={() => navigate('create-task')}>+ Add task</button>
            </div>
          </div>
        ))}
      </HScroll>
    </WorkspaceShell>
  )
}

// ─── Story List ───────────────────────────────────────────────────────────────

function StoryList({ navigate, product }: { navigate: (s: Screen, id?: string) => void; product: string }) {
  const [filter, setFilter] = useState<'mine' | 'all'>('mine')
  const stories = storiesForProduct(product).filter(s => filter === 'all' || s.assignee === ME)

  return (
    <WorkspaceShell title="Stories" subtitle="Engineering works at the story level — initiatives appear only as contextual metadata" actions={<Btn variant="primary" onClick={() => navigate('create-story')}>+ Create Story</Btn>}>
      <div className="flex items-center gap-2 mb-4">
        {(['mine', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>{f === 'mine' ? 'Assigned to me' : 'All stories'}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {stories.map(story => {
          const tasks = tasksForStory(story.id)
          return (
            <CardShell key={story.id} onClick={() => navigate('story-detail', story.id)}>
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono text-[#CCCCCC] flex-shrink-0">{story.id.toUpperCase()}</span>
                  <span className="text-[12.5px] text-[#333] truncate">{story.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0"><span className="text-[10px] text-[#BBBBBB]">{tasks.length} {plural(tasks.length, 'task')}</span><Tag label={`${story.points} pts`} variant="muted" /><StatusPair workflow={story.workflowState} health={storyHealth(story)} /></div>
              </div>
            </CardShell>
          )
        })}
        {stories.length === 0 && <EmptyState title="No stories match" />}
      </div>
    </WorkspaceShell>
  )
}

// ─── Release List (read-only visibility) ───────────────────────────────────────

function ReleaseList({ navigate }: { navigate: (s: Screen, id?: string) => void }) {
  return (
    <WorkspaceShell title="Releases" subtitle="Visibility into upcoming releases your work ships in">
      <div className="flex flex-col gap-3">
        {RELEASES.map(rel => (
          <CardShell key={rel.id} onClick={() => navigate('release-detail', rel.id)}>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div><h3 className="text-[13.5px] font-semibold text-[#1A1A1A] mb-1">{rel.name}</h3><p className="text-[12px] text-[#666]">{rel.description}</p></div>
              <div className="text-right flex-shrink-0"><p className="text-[12px] font-medium text-[#333]">{rel.targetDate}</p><StatusPair workflow={rel.workflowState} health={releaseHealth(rel)} /></div>
            </div>
          </CardShell>
        ))}
      </div>
    </WorkspaceShell>
  )
}

// ─── Space Root ────────────────────────────────────────────────────────────────

export function EngineeringSpace({ onContextChange }: { onContextChange: (ctx: { title: string; prompts: string[]; product?: string }) => void }) {
  const [nav, setNav] = useState<{ screen: Screen; id?: string }>({ screen: 'dashboard' })
  const [product, setProduct] = useState('prod-dxone')
  const shared: Nav = (screen, id) => navigate(screen as Screen, id)
  const productName = PRODUCTS.find(p => p.id === product)?.name ?? ''

  const navigate = (screen: Screen, id?: string) => {
    setNav({ screen, id })
    const ctxMap: Record<Screen, { title: string; prompts: string[] }> = {
      'dashboard':    { title: 'Engineering Dashboard', prompts: ['What should I work on?', 'Summarise my blockers', 'Review open PRs', 'Show failing builds'] },
      'my-tasks':     { title: 'My Tasks', prompts: ['What is highest priority?', 'Summarise my progress', 'Find dependencies', 'Break task into subtasks'] },
      'board':        { title: 'Cycle Board', prompts: ['Show blocked tasks', 'Estimate remaining work', 'Identify cycle risks', 'Suggest task order'] },
      'story-list':   { title: 'Stories', prompts: ['Suggest which story to split', 'Estimate my open stories'] },
      'story-detail': { title: 'Story Requirement', prompts: ['Explain this story', 'Generate task breakdown', 'Check acceptance criteria', 'Suggest edge cases'] },
      'create-story': { title: 'New Story', prompts: ['Suggest acceptance criteria', 'Estimate points'] },
      'task-detail':  { title: 'Task Detail', prompts: ['Explain this requirement', 'Create implementation plan', 'Break into subtasks', 'Review implementation'] },
      'create-task':  { title: 'New Task', prompts: ['Suggest an estimate', 'Break into subtasks'] },
      'create-subtask': { title: 'New Subtask', prompts: ['Suggest subtasks for this task'] },
      'release-list': { title: 'Releases', prompts: ['What ships in the next release?'] },
      'release-detail': { title: 'Release Detail', prompts: ['What is blocking this release?'] },
      'bug-detail':   { title: 'Bug Detail', prompts: ['Suggest a root cause', 'Draft a fix plan'] },
      'hotfix-list':  { title: 'Hotfixes', prompts: ['Summarise recent hotfixes'] },
      'hotfix-detail': { title: 'Hotfix Detail', prompts: ['Summarise this hotfix'] },
      'create-hotfix': { title: 'Log Hotfix', prompts: ['Help write up the root cause'] },
    }
    onContextChange({ ...ctxMap[screen], product: productName })
  }

  return (
    <div className="flex flex-1 h-full min-w-0 overflow-hidden">
      <Sidebar nav={nav.screen} navigate={navigate} product={product} setProduct={setProduct} />
      <main className="flex-1 min-w-0 overflow-hidden">
        {nav.screen === 'dashboard' && <Dashboard navigate={navigate} product={product} />}
        {nav.screen === 'my-tasks' && <MyTasks navigate={navigate} />}
        {nav.screen === 'board' && <Board navigate={navigate} product={product} />}
        {nav.screen === 'story-list' && <StoryList navigate={navigate} product={product} />}
        {nav.screen === 'story-detail' && <StoryDetail id={nav.id ?? STORIES[1].id} nav={shared} role="engineering" />}
        {nav.screen === 'create-story' && <CreateStory nav={shared} role="engineering" />}
        {nav.screen === 'task-detail' && <TaskDetail id={nav.id ?? TASKS[1].id} nav={shared} role="engineering" />}
        {nav.screen === 'create-task' && <CreateTask nav={shared} storyId={nav.id} />}
        {nav.screen === 'create-subtask' && <CreateSubtask nav={shared} taskId={nav.id} />}
        {nav.screen === 'release-list' && <ReleaseList navigate={navigate} />}
        {nav.screen === 'release-detail' && <ReleaseDetail id={nav.id ?? RELEASES[0].id} nav={shared} role="engineering" />}
        {nav.screen === 'bug-detail' && <BugDetail id={nav.id ?? ''} nav={shared} role="engineering" />}
        {nav.screen === 'hotfix-list' && <HotfixList nav={shared} productId={product} />}
        {nav.screen === 'hotfix-detail' && <HotfixDetail id={nav.id ?? HOTFIXES[0].id} nav={shared} />}
        {nav.screen === 'create-hotfix' && <CreateHotfix nav={shared} productId={product} />}
      </main>
    </div>
  )
}
