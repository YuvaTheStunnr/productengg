// ─────────────────────────────────────────────────────────────────────────────
// Backlog
//
// "What's waiting to be triaged or picked up" — Ideas and Requests that
// haven't been decided on yet, plus the rare still-Draft Initiative that
// hasn't started planning. The moment something is Planned it moves onto the
// Ongoing board instead (see Ongoing.tsx) — Backlog is deliberately just the
// pre-decision queue, not a second home for active work.
//
// Round-3 rework: a backlog is a ranked queue, not a kanban board — that's
// what "doesn't feel like a backlog" was pointing at (think Jira's backlog
// view: one flat, priority-ordered list you drag to re-rank and scan
// top-to-bottom, not swimlanes). List is the default and only real view now;
// Board (the old 3-column kanban) is kept as a secondary toggle for anyone
// who still wants to see triage state at a glance, but it's no longer what
// you land on.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  IDEAS, INITIATIVES, CUSTOMER_REQUESTS,
  epicsForInitiative, initiativeHealth, initiativePct, initiativeTargetLabel, moveInitiativeToPlanning,
  type Idea, type Initiative, type CustomerRequest,
} from './data'
import { WorkspaceShell, CardShell, Tag, SeverityBadge, HealthBadge, ProgressBar, Btn, EmptyState } from './ui'
import { ConversionPicker, TypeTag } from './ConversionPicker'

type BacklogItem =
  | { kind: 'idea'; id: string; data: Idea }
  | { kind: 'request'; id: string; data: CustomerRequest }
  | { kind: 'initiative'; id: string; data: Initiative }

type Stage = 'New' | 'Under Review' | 'Linked to Initiative'

function stageOf(item: BacklogItem): Stage {
  if (item.kind === 'idea') return item.data.status === 'Deferred' ? 'Under Review' : 'New'
  if (item.kind === 'request') {
    if (item.data.stage === 'New') return 'New'
    if (item.data.stage === 'Linked to Initiative') return 'Linked to Initiative'
    return 'Under Review' // Under Review or Accepted — being evaluated either way
  }
  return 'New' // the only Initiatives that reach Backlog are still Draft
}

function backlogItems(): BacklogItem[] {
  // Rejected/Converted ideas, and Closed/Rejected/In-Progress/Released
  // requests, are done — they don't belong in a "what's still waiting"
  // queue, so they're excluded here rather than parked in a dead column.
  const ideas: BacklogItem[] = IDEAS.filter(i => i.status === 'Idea' || i.status === 'Deferred').map(i => ({ kind: 'idea', id: i.id, data: i }))
  const requests: BacklogItem[] = CUSTOMER_REQUESTS.filter(r => !['In Progress', 'Released', 'Closed', 'Rejected'].includes(r.stage)).map(r => ({ kind: 'request', id: r.id, data: r }))
  const initiatives: BacklogItem[] = INITIATIVES.filter(i => i.workflowState === 'Draft').map(i => ({ kind: 'initiative', id: i.id, data: i }))
  return [...ideas, ...requests, ...initiatives]
}

const STAGES: Stage[] = ['New', 'Under Review', 'Linked to Initiative']

const key = (item: BacklogItem) => `${item.kind}:${item.id}`

const TYPE_FILTERS: { value: 'all' | BacklogItem['kind']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'idea', label: 'Ideas' },
  { value: 'initiative', label: 'Initiatives' },
  { value: 'request', label: 'Requests' },
]

export function Backlog({ navigate }: { navigate: (s: string, id?: string) => void }) {
  const [view, setView] = useState<'list' | 'board'>('list')
  const [typeFilter, setTypeFilter] = useState<'all' | BacklogItem['kind']>('all')
  const [converting, setConverting] = useState<{ kind: 'idea' | 'request'; data: Idea | CustomerRequest } | null>(null)
  // Manual rank order — a backlog's whole point is that you control the
  // order, not the system. Starts empty; merged against the live item set on
  // every render so newly-created items land at the bottom automatically and
  // converted/rejected ones just drop out, with no sync effect needed.
  const [order, setOrder] = useState<string[]>([])
  const [dragKey, setDragKey] = useState<string | null>(null)

  const items = backlogItems()
  const byKey = new Map(items.map(i => [key(i), i]))
  const rankedKeys = [...order.filter(k => byKey.has(k)), ...items.map(key).filter(k => !order.includes(k))]
  const rankOf = new Map(rankedKeys.map((k, i) => [k, i + 1]))
  const visibleKeys = typeFilter === 'all' ? rankedKeys : rankedKeys.filter(k => k.startsWith(typeFilter + ':'))

  const reorder = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return
    const next = rankedKeys.slice()
    const from = next.indexOf(dragKey)
    const to = next.indexOf(targetKey)
    if (from === -1 || to === -1) return
    next.splice(from, 1)
    next.splice(to, 0, dragKey)
    setOrder(next)
    setDragKey(null)
  }

  const openDetail = (item: BacklogItem) => {
    if (item.kind === 'idea') navigate('idea-detail', item.id)
    else if (item.kind === 'initiative') navigate('initiative-detail', item.id)
    // Requests have no Leadership detail screen — read-only card, convert inline.
  }

  return (
    <WorkspaceShell
      title="Backlog"
      subtitle="Ideas, requests and not-yet-planned initiatives, ranked in the order you want to get to them — drag a row to re-rank it."
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#E0E0E0] rounded-md overflow-hidden">
            <button onClick={() => setView('list')} className={`text-[11px] px-2.5 py-1 transition-colors ${view === 'list' ? 'bg-[#4F46E5] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>List</button>
            <button onClick={() => setView('board')} className={`text-[11px] px-2.5 py-1 transition-colors ${view === 'board' ? 'bg-[#4F46E5] text-white' : 'text-[#666] hover:bg-[#F5F5F5]'}`}>Board</button>
          </div>
          <Btn variant="primary" small onClick={() => navigate('create-idea')}>+ New Idea</Btn>
          <Btn small onClick={() => navigate('create-initiative')}>+ New Initiative</Btn>
        </div>
      }
    >
      {items.length === 0 && <EmptyState icon="◇" title="Backlog is empty" sub="Nothing waiting to be triaged right now." />}

      {items.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {TYPE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${typeFilter === f.value ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>
                {f.label}{f.value !== 'all' && <span className="ml-1 opacity-60">{items.filter(i => i.kind === f.value).length}</span>}
              </button>
            ))}
          </div>
          <CardShell className="overflow-hidden">
            {visibleKeys.length === 0 && <p className="text-[11.5px] text-[#CCCCCC] italic px-4 py-6 text-center">Nothing matches this filter.</p>}
            {visibleKeys.map(k => {
              const item = byKey.get(k)!
              return (
                <BacklogRankedRow key={k} item={item} rank={rankOf.get(k)!} dragging={dragKey === k}
                  onOpen={() => openDetail(item)}
                  onConvert={item.kind !== 'initiative' ? () => setConverting({ kind: item.kind, data: item.data as Idea | CustomerRequest }) : undefined}
                  onDragStart={() => setDragKey(k)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => reorder(k)}
                  onDragEnd={() => setDragKey(null)}
                />
              )
            })}
          </CardShell>
        </div>
      )}

      {items.length > 0 && view === 'board' && (
        <div className="grid grid-cols-3 gap-4 items-start">
          {STAGES.map(stage => {
            const col = items.filter(i => stageOf(i) === stage)
            return (
              <div key={stage} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">{stage}</span>
                  <span className="text-[10px] text-[#BBBBBB]">{col.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {col.map(item => (
                    <BacklogCard key={key(item)} item={item} onOpen={() => openDetail(item)}
                      onConvert={item.kind !== 'initiative' ? () => setConverting({ kind: item.kind, data: item.data as Idea | CustomerRequest }) : undefined} />
                  ))}
                  {col.length === 0 && <div className="text-[11px] text-[#DDDDDD] italic px-1 py-3 border border-dashed border-[#EEEEEE] rounded-md text-center">Empty</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {converting && <ConversionPicker source={converting.data} kind={converting.kind} onClose={() => setConverting(null)} />}
    </WorkspaceShell>
  )
}

// One flat, ranked row per item — the "#" is the drag handle's own rank, not
// a stage or a column. Stage still matters (New / Under Review / Linked to
// Initiative) so it rides along as a small badge instead of organizing the
// page.
function BacklogRankedRow({ item, rank, dragging, onOpen, onConvert, onDragStart, onDragOver, onDrop, onDragEnd }: {
  item: BacklogItem; rank: number; dragging: boolean; onOpen: () => void; onConvert?: () => void
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void; onDragEnd: () => void
}) {
  const clickable = item.kind !== 'request'
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`px-3 py-3 flex items-center gap-3 border-b border-[#F5F5F5] last:border-0 transition-colors ${dragging ? 'opacity-40' : ''} ${clickable ? 'hover:bg-[#FAFAFA]' : ''}`}
    >
      <span className="cursor-grab text-[#CCCCCC] hover:text-[#999] select-none flex-shrink-0 px-0.5" title="Drag to re-rank">⠿⠿</span>
      <span className="text-[10.5px] text-[#BBBBBB] w-5 flex-shrink-0 text-right tabular-nums">{rank}</span>
      <TypeTag kind={item.kind} />
      <Tag label={stageOf(item)} variant="muted" />
      <div className={`flex-1 min-w-0 ${clickable ? 'cursor-pointer' : ''}`} onClick={clickable ? onOpen : undefined}>
        <span className="text-[12.5px] font-medium text-[#1A1A1A] truncate block">{item.data.title}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-[11px] text-[#888]">
        {item.kind === 'idea' && (
          <>
            <span>{item.data.createdBy}</span>
            {item.data.intendedConversion && <Tag label={`→ ${item.data.intendedConversion.level}`} variant="muted" />}
          </>
        )}
        {item.kind === 'request' && <SeverityBadge severity={item.data.priority} />}
        {item.kind === 'initiative' && (
          <>
            <span className="w-28 text-right">{epicsForInitiative(item.data.id).length} epics · PM {item.data.pm}</span>
            <HealthBadge health={initiativeHealth(item.data)} />
            <span className="w-24 text-right">{initiativeTargetLabel(item.data)}</span>
            <button onClick={e => { e.stopPropagation(); moveInitiativeToPlanning(item.data.id, item.data.pm !== 'Unassigned' ? item.data.pm : 'Alex Chen') }} className="text-[#4F46E5] hover:underline">Start Planning →</button>
          </>
        )}
        {onConvert && <button onClick={e => { e.stopPropagation(); onConvert() }} className="text-[#4F46E5] hover:underline">Convert →</button>}
      </div>
    </div>
  )
}

function BacklogCard({ item, onOpen, onConvert }: { item: BacklogItem; onOpen: () => void; onConvert?: () => void }) {
  return (
    <CardShell className="p-3" onClick={item.kind !== 'request' ? onOpen : undefined}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[12px] font-medium text-[#1A1A1A] leading-snug">{item.data.title}</p>
        <TypeTag kind={item.kind} />
      </div>
      {item.kind === 'idea' && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#AAAAAA]">{item.data.createdBy} · {item.data.createdAt}</p>
          {item.data.intendedConversion && <Tag label={`→ ${item.data.intendedConversion.level}`} variant="muted" />}
        </div>
      )}
      {item.kind === 'request' && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#AAAAAA]">{item.data.source} · {item.data.requestedAt}</p>
          <SeverityBadge severity={item.data.priority} />
        </div>
      )}
      {item.kind === 'initiative' && (
        <>
          <ProgressBar pct={initiativePct(item.data)} thin health={initiativeHealth(item.data)} />
          <div className="flex items-center justify-between mt-2 text-[10px] text-[#BBBBBB]">
            <span>{epicsForInitiative(item.data.id).length} epics · PM {item.data.pm}</span>
            <span>{initiativeTargetLabel(item.data)}</span>
          </div>
          <button onClick={e => { e.stopPropagation(); moveInitiativeToPlanning(item.data.id, item.data.pm !== 'Unassigned' ? item.data.pm : 'Alex Chen') }}
            className="mt-2 text-[10.5px] text-[#4F46E5] hover:underline">
            Start Planning →
          </button>
        </>
      )}
      {onConvert && (
        <button onClick={e => { e.stopPropagation(); onConvert() }} className="mt-2 text-[10.5px] text-[#4F46E5] hover:underline">
          Convert →
        </button>
      )}
    </CardShell>
  )
}
