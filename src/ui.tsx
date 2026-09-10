import { useRef, useState, useEffect } from 'react'
import type { WorkflowState, Health, Priority, Product, WorkflowTask, Attachment, ActivityItem, Comment, RequestStatus } from './data'

// ─── Status Badges ─────────────────────────────────────────────────────────────

const wfStyles: Record<WorkflowState, string> = {
  'Draft':       'border border-dashed border-[#CCCCCC] text-[#AAAAAA]',
  'Planning':    'border border-[#CCCCCC] text-[#777]',
  'In Progress': 'bg-[#4F46E5] text-white border border-[#4F46E5]',
  'Testing':     'border-2 border-[#888] text-[#555]',
  'Released':    'bg-[#444] text-white border border-[#444]',
  'Paused':      'border border-[#DDDDDD] text-[#BBBBBB] bg-[#F9F9F9]',
}

// Health is the app's core status vocabulary, so its colors carry real
// meaning rather than a uniform gray: green reads "healthy" (soft = still
// moving, solid = done), amber reads "needs a look," red reads "stopped."
// Overdue and Completed used to be nearly the same dark pill — now green vs.
// amber makes "done" and "late" tell apart at a glance, not just by icon.
const healthIcons: Record<Health, string> = {
  'On Track':   '●',
  'Blocked':    '!',
  'Overdue':    '⏰',
  'Not Started':'○',
  'Completed':  '✓',
}

const healthStyles: Record<Health, string> = {
  'On Track':   'bg-[#EAF5EC] text-[#2F7A42] border border-[#CFE8D3]',
  'Blocked':    'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]',
  'Overdue':    'bg-[#FDF6E8] text-[#9A6B00] border border-[#EEDBAF]',
  'Not Started':'bg-[#FAFAFA] text-[#999999] border border-dashed border-[#DDDDDD]',
  'Completed':  'bg-[#2F7A42] text-white border border-[#2F7A42]',
}

export function WorkflowBadge({ state }: { state: WorkflowState }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${wfStyles[state]}`}>
      {state}
    </span>
  )
}

export function HealthBadge({ health }: { health: Health }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${healthStyles[health]}`}>
      <span className="text-[9px]">{healthIcons[health]}</span>
      {health}
    </span>
  )
}

// Escalating, not four unrelated colors: Low (neutral) → Medium (amber, same
// "needs a look" amber as Overdue) → High (red, same alarm red as Blocked) →
// Critical (solid red fill — reads as more urgent than an outlined High,
// where a black/neutral Critical used to read as calmer than a red High).
const severityStyles: Record<Priority, string> = {
  Critical: 'bg-[#8A1F1A] text-white border border-[#8A1F1A]',
  High:     'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]',
  Medium:   'bg-[#FDF6E8] text-[#9A6B00] border border-[#EEDBAF]',
  Low:      'bg-[#FAFAFA] text-[#999999] border border-[#E4E4E4]',
}

export function SeverityBadge({ severity }: { severity: Priority }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${severityStyles[severity]}`}>{severity}</span>
}

// Customer Request lifecycle — distinct from WorkflowState/Health, which
// describe engineering delivery. A request's stage tracks where it stands
// as a customer-facing commitment, independent of any linked Initiative's
// own progress.
const requestStageStyles: Record<RequestStatus, string> = {
  'New':                  'border border-dashed border-[#CCCCCC] text-[#AAAAAA]',
  'Under Review':         'border border-[#CCCCCC] text-[#777]',
  'Accepted':             'bg-[#F0F0F0] text-[#555] border border-[#DCDCDC]',
  'Linked to Initiative': 'bg-[#EBEBEB] text-[#555] border border-[#D8D8D8]',
  'In Progress':          'bg-[#4F46E5] text-white border border-[#4F46E5]',
  'Released':             'bg-[#444] text-white border border-[#444]',
  'Closed':                'bg-[#FAFAFA] text-[#BBBBBB] border border-[#E4E4E4]',
  'Rejected':             'bg-[#FDF0F0] text-[#CC4444] border border-[#E8CCCC]',
}

export function RequestStageBadge({ stage }: { stage: RequestStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${requestStageStyles[stage]}`}>{stage}</span>
}

export function Tag({ label, variant = 'default' }: { label: string; variant?: 'default' | 'dark' | 'outline' | 'muted' | 'code' }) {
  const s: Record<string, string> = {
    default: 'bg-[#EBEBEB] text-[#444] border border-[#D8D8D8]',
    dark:    'bg-[#4F46E5] text-white border border-[#4F46E5]',
    outline: 'bg-white text-[#555] border border-[#C8C8C8]',
    muted:   'bg-[#F5F5F5] text-[#888] border border-[#E4E4E4]',
    code:    'bg-[#F5F5F5] text-[#444] border border-[#E4E4E4] font-mono',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${s[variant]}`}>{label}</span>
}

// ─── Layout Primitives ─────────────────────────────────────────────────────────

export function CardShell({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-[#E4E4E4] rounded-md ${onClick ? 'cursor-pointer hover:border-[#CCCCCC] hover:shadow-sm transition-all' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// A lightweight modal for "View all" style drill-ins from a Dashboard card —
// keeps the underlying screen mounted (and its data live) rather than
// navigating away to a whole separate route.
export function Modal({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 p-6" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl border border-[#E4E4E4] w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[85vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">{title}</h2>
            {subtitle && <p className="text-[11.5px] text-[#888] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[#AAAAAA] hover:text-[#333] text-[18px] leading-none px-1">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// "1 epics" reads as a typo, not a wireframe — this is the one place count
// copy gets pluralized, so every "{n} {noun}" label goes through it instead
// of a bare template string.
export function plural(n: number, word: string, pluralForm?: string): string {
  return n === 1 ? word : (pluralForm ?? `${word}s`)
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-[#AAAAAA] mb-2">{children}</p>
}

// `health` is optional and only changes the visual when it's 'Blocked': a
// percentage implies steady forward motion, which is misleading for
// something stalled, so a blocked bar reads as a static red hazard stripe
// instead of a fill amount. Pair with ProgressLabel below, which swaps the
// "NN%" text for "Blocked" the same way, so the number and the bar never
// disagree about whether something is actually progressing.
export function ProgressBar({ pct, thin, health }: { pct: number; thin?: boolean; health?: Health }) {
  const blocked = health === 'Blocked'
  return (
    <div className={`bg-[#EBEBEB] rounded-full overflow-hidden w-full relative ${thin ? 'h-1' : 'h-1.5'}`}>
      {blocked ? (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #E8B8B3 0, #E8B8B3 3px, transparent 3px, transparent 7px)' }}
        />
      ) : (
        <div className="h-full bg-[#4F46E5] rounded-full transition-all" style={{ width: `${pct}%` }} />
      )}
    </div>
  )
}

export function ProgressLabel({ pct, health, className }: { pct: number; health?: Health; className?: string }) {
  // Blocked color is set inline so it always wins over any text-color utility the caller passes in
  // className (e.g. a muted "text-[#888]" used for the normal percentage) — class-vs-class precedence
  // in Tailwind isn't determined by source order, so a plain class here could lose that fight.
  if (health === 'Blocked') return <span className={`font-medium ${className ?? ''}`} style={{ color: '#CC4444' }}>Blocked</span>
  return <span className={className}>{pct}%</span>
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-[#EBEBEB] ${className}`} />
}

export function KPITile({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <CardShell className="p-4 text-center">
      <p className={`text-[24px] font-bold ${alert ? 'text-[#CC4444]' : 'text-[#1A1A1A]'}`}>{value}</p>
      <p className="text-[11px] text-[#999] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#CCCCCC] mt-0.5">{sub}</p>}
    </CardShell>
  )
}

export function Breadcrumb({ items, onNavigate }: { items: { label: string; screen?: string }[]; onNavigate?: (s: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[#AAAAAA] mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#DCDCDC]">›</span>}
          {item.screen && onNavigate
            ? <button onClick={() => onNavigate(item.screen!)} className="hover:text-[#555] transition-colors">{item.label}</button>
            : <span className={i === items.length - 1 ? 'text-[#555] font-medium' : ''}>{item.label}</span>}
        </span>
      ))}
    </div>
  )
}

export function CommentThread({ comments }: { comments: { id: string; author: string; role: string; text: string; time: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-[#DCDCDC] flex-shrink-0 mt-0.5 flex items-center justify-center">
            <span className="text-[9px] font-bold text-[#888]">{c.author.split(' ').map(w => w[0]).join('')}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-semibold text-[#1A1A1A]">{c.author}</span>
              <Tag label={c.role} variant="muted" />
              <span className="text-[10px] text-[#CCCCCC] ml-auto">{c.time}</span>
            </div>
            <p className="text-[12px] text-[#444] leading-relaxed">{c.text}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-3 mt-2">
        <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex-shrink-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">AC</span>
        </div>
        <div className="flex-1 border border-[#E4E4E4] rounded-lg px-3 py-2 bg-[#FAFAFA] flex items-center gap-2">
          <input type="text" placeholder="Add a comment..." className="flex-1 bg-transparent text-[12px] text-[#333] placeholder-[#BBBBBB] outline-none" />
          <button className="text-[11px] text-[#888] hover:text-[#333] px-2 py-0.5 border border-[#E0E0E0] rounded">Post</button>
        </div>
      </div>
    </div>
  )
}

export function TabBar<T extends string>({ tabs, active, onSelect }: { tabs: { id: T; label: string; count?: number }[]; active: T; onSelect: (t: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-[#E4E4E4] bg-white px-6 flex-shrink-0">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-4 py-2.5 text-[12.5px] border-b-2 transition-colors whitespace-nowrap
            ${active === t.id ? 'border-[#4F46E5] text-[#4F46E5] font-semibold' : 'border-transparent text-[#888] hover:text-[#555]'}`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active === t.id ? 'bg-[#4F46E5] text-white' : 'bg-[#EBEBEB] text-[#666]'}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Horizontal scroll affordance ───────────────────────────────────────────
// Wraps any horizontally-scrolling row (a kanban board's columns, most often)
// with edge fades that only appear on the side there's actually more to see.
// Without this, a board that overflows just looks cut off — nothing on
// screen says "scroll for more," so the last column reads as broken rather
// than as one swipe away. `fadeColor` should match the surface behind the
// scroller (every WorkspaceShell body is #F7F7F7) so the fade blends in.
export function HScroll({ children, className, fadeColor = '#F7F7F7', fullHeight }: { children: React.ReactNode; className?: string; fadeColor?: string; fullHeight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [])

  return (
    <div className={`relative min-w-0 ${fullHeight ? 'h-full' : ''}`}>
      <div ref={ref} className={`overflow-x-auto ${fullHeight ? 'h-full' : ''} ${className ?? ''}`}>{children}</div>
      {canLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8" style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }} />
      )}
      {canRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 flex items-center justify-end pr-1" style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}>
          <span className="text-[#999999] text-[13px]">→</span>
        </div>
      )}
    </div>
  )
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
// Generic multi-column board — each column is a lifecycle stage, each card is
// whatever the caller renders. Shared by every space's Planning workspace so
// Ideas/Initiatives/Requests/Releases all get identical board mechanics
// instead of four bespoke re-implementations.

export function KanbanBoard<T>({ columns, cardKey, renderCard }: {
  columns: { id: string; label: string; items: T[] }[]
  cardKey: (item: T) => string
  renderCard: (item: T) => React.ReactNode
}) {
  return (
    <HScroll className="flex gap-4 pb-2">
      {columns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-64 flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-semibold text-[#555]">{col.label}</span>
            <span className="text-[10px] bg-[#EBEBEB] text-[#555] px-1.5 py-0.5 rounded-full">{col.items.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {col.items.map(item => <div key={cardKey(item)}>{renderCard(item)}</div>)}
            {col.items.length === 0 && (
              <div className="text-[10.5px] text-[#CCCCCC] italic py-5 text-center border border-dashed border-[#E4E4E4] rounded-md">Empty</div>
            )}
          </div>
        </div>
      ))}
    </HScroll>
  )
}

// ─── Gantt Timeline ────────────────────────────────────────────────────────────
// Shared date math + rendering for every timeline view in the app (previously
// duplicated per-space, and disconnected from any real date field — see the
// Leadership Planning Calendar fix). A row whose start and end land in the
// same place renders as a milestone diamond instead of a zero-width bar —
// this lets Releases (a single target date) plot on the same timeline as
// Initiatives (a start + target date) without a separate rendering path.

export const GANTT_MONTHS = ['Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026']
const GANTT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthPosition(dateStr?: string): number | null {
  if (!dateStr) return null
  const m = dateStr.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2})/)
  if (!m) return null
  const monthIdx = GANTT_MONTH_NAMES.findIndex(mn => mn.toLowerCase() === m[1].slice(0, 3).toLowerCase())
  if (monthIdx === -1) return null
  const day = parseInt(m[2], 10)
  const pos = (monthIdx - 6) + (day - 1) / 30 // window starts at July (index 6)
  return Math.max(0, Math.min(5.95, pos))
}

// Kept in sync with healthStyles above — a Gantt bar for an Overdue or
// Completed initiative should read the same amber/green as its HealthBadge
// anywhere else in the app, not a leftover black/gray from before that
// system existed.
export function ganttBarClass(health: Health): string {
  switch (health) {
    case 'Blocked': return 'bg-[#F5E8E8] border border-[#E8CCCC] text-[#CC4444]'
    case 'Overdue': return 'bg-[#FDF6E8] border border-[#EEDBAF] text-[#9A6B00]'
    case 'Not Started': return 'bg-[#F5F5F5] border border-dashed border-[#CCCCCC] text-[#AAAAAA]'
    case 'Completed': return 'bg-[#2F7A42] border border-[#2F7A42] text-white'
    default: return 'bg-[#EAF5EC] border border-[#CFE8D3] text-[#2F7A42]'
  }
}

export function ganttDotClass(health: Health): string {
  switch (health) {
    case 'Blocked': return 'bg-[#CC4444]'
    case 'Overdue': return 'bg-[#C98A00]'
    case 'Not Started': return 'bg-[#CCCCCC]'
    case 'Completed': return 'bg-[#2F7A42]'
    default: return 'bg-[#4CAF6F]'
  }
}

export function GanttTimeline({ rows, milestones }: {
  rows: { id: string; label: string; start: number; end: number; colorClass: string; onClick?: () => void }[]
  milestones?: { label: string; month: number }[]
}) {
  return (
    <div className="bg-white border border-[#E4E4E4] rounded-md overflow-hidden">
      <div className="grid border-b border-[#E4E4E4]" style={{ gridTemplateColumns: '160px repeat(6, 1fr)' }}>
        <div className="px-4 py-3 border-r border-[#E4E4E4] bg-[#FAFAFA]" />
        {GANTT_MONTHS.map(m => (
          <div key={m} className="px-3 py-3 text-[11px] font-semibold text-[#888] border-r border-[#E4E4E4] last:border-0 text-center uppercase tracking-wider">{m}</div>
        ))}
      </div>

      {milestones && milestones.length > 0 && (
        <div className="grid border-b border-[#F0F0F0] bg-[#FAFAFA]" style={{ gridTemplateColumns: '160px 1fr' }}>
          <div className="px-4 py-2 border-r border-[#E4E4E4] text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wider flex items-center">Milestones</div>
          <div className="relative h-8">
            {milestones.map(m => (
              <div key={m.label} className="absolute flex flex-col items-center" style={{ left: `${(m.month / 6) * 100}%` }}>
                <div className="w-px h-3 bg-[#4F46E5] mt-1" />
                <div className="w-2 h-2 bg-[#4F46E5] rotate-45 -mt-1" />
                <span className="text-[9px] text-[#555] whitespace-nowrap mt-1 -translate-x-1/2">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && <div className="px-4 py-8 text-center text-[11.5px] text-[#CCCCCC] italic">Nothing to show on the timeline.</div>}

      {rows.map(row => {
        const isPoint = Math.abs(row.end - row.start) < 0.05
        return (
          <div key={row.id} className="grid border-b border-[#F5F5F5] last:border-0 items-center" style={{ gridTemplateColumns: '160px 1fr' }}>
            <div className="px-4 py-3 border-r border-[#E4E4E4] text-[11.5px] font-medium text-[#444] truncate">{row.label}</div>
            <div className="relative h-10 px-2 flex items-center">
              <div className="absolute inset-x-0 flex">
                {Array.from({ length: 6 }, (_, j) => <div key={j} className="flex-1 h-10 border-r border-[#F5F5F5] last:border-0" />)}
              </div>
              {isPoint ? (
                <div
                  onClick={row.onClick}
                  className={`absolute flex flex-col items-center ${row.onClick ? 'cursor-pointer' : ''}`}
                  style={{ left: `${(row.start / 6) * 100}%` }}
                >
                  <div className={`w-3 h-3 rotate-45 ${row.colorClass}`} />
                </div>
              ) : (
                <div
                  onClick={row.onClick}
                  className={`absolute h-5 rounded flex items-center px-2 text-[10px] font-medium ${row.onClick ? 'cursor-pointer' : ''} ${row.colorClass}`}
                  style={{ left: `${(row.start / 6) * 100}%`, width: `${((row.end - row.start) / 6) * 100}%` }}
                >
                  <span className="truncate">{row.label}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Workspace Shell ──────────────────────────────────────────────────────────

export function WorkspaceShell({ title, subtitle, actions, children, noPad }: {
  title?: React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  noPad?: boolean
}) {
  return (
    // min-w-0 matters here: without it, a flex child's default min-width is
    // its content's natural width, so a wide dashboard grid refuses to
    // shrink to the space actually left by the sidebar + AI panel and
    // overflows sideways instead — which reads as content clipped behind
    // the AI panel, not as a sizing bug. See also the grid-cols
    // minmax(0,1fr) fix on the two-column dashboard/detail layouts.
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#F7F7F7]">
      {title && (
        <div className="bg-white border-b border-[#E4E4E4] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            {typeof title === 'string' ? <h1 className="text-[15px] font-semibold text-[#1A1A1A]">{title}</h1> : title}
            {subtitle && <p className="text-[11px] text-[#AAAAAA] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`flex-1 min-w-0 overflow-y-auto ${noPad ? '' : 'px-6 py-5'}`}>{children}</div>
    </div>
  )
}

// ─── Sidebar Shell ─────────────────────────────────────────────────────────────

export type SidebarItem<T extends string> = {
  id: T; label: string
  children?: { id: T; label: string }[]
  badge?: string | number
  action?: boolean
}

export function SidebarShell<T extends string>({
  items, nav, navigate, spaceColor, userName, userRole, projectName, topSlot,
}: {
  items: SidebarItem<T>[]
  nav: T
  navigate: (s: T) => void
  spaceColor?: string
  userName: string
  userRole: string
  projectName: string
  topSlot?: React.ReactNode
}) {
  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#FAFAFA] border-r border-[#E4E4E4] flex flex-col h-full overflow-y-auto">
      <div className="px-3 pt-3 pb-2 border-b border-[#E4E4E4]">
        <p className="text-[10px] text-[#AAAAAA] px-1 mb-0.5">Nexus Mobile App</p>
        <p className="text-[11px] font-medium text-[#555] px-1">{projectName}</p>
      </div>
      {topSlot && <div className="px-2 pt-2.5 pb-1 border-b border-[#E4E4E4]">{topSlot}</div>}
      <nav className="px-2 pt-2.5 flex-1">
        {items.map((item) => (
          <div key={item.id + item.label}>
            <button
              onClick={() => !item.children && navigate(item.id)}
              className={`w-full text-left px-3 py-1.5 rounded text-[12px] flex items-center justify-between mb-0.5 transition-colors
                ${!item.children && nav === item.id ? 'bg-[#4F46E5] text-white font-medium' : item.action ? 'text-[#888] hover:text-[#555] hover:bg-[#F0F0F0]' : 'text-[#555] hover:bg-[#F0F0F0]'}`}
            >
              <span className={item.action ? 'flex items-center gap-1' : ''}>{item.action && <span className="text-[11px]">+</span>}{item.label}</span>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0
                  ${!item.children && nav === item.id ? 'bg-white/20 text-white' : 'bg-[#EBEBEB] text-[#555]'}`}>
                  {item.badge}
                </span>
              )}
              {item.children && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 4l2 2 2-2" stroke="#AAA" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            </button>
            {item.children && (
              <div className="ml-3 mb-1 border-l border-[#E0E0E0] pl-3 flex flex-col gap-0.5">
                {item.children.map((child) => (
                  <button
                    key={child.id + child.label}
                    onClick={() => navigate(child.id)}
                    className={`text-left px-2 py-1.5 rounded text-[11.5px] transition-colors
                      ${nav === child.id ? 'bg-[#EEF2FF] text-[#3730A3] font-semibold' : 'text-[#777] hover:bg-[#F0F0F0]'}`}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[#E4E4E4]">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${spaceColor ?? 'bg-[#DCDCDC]'}`}>
            <span className="text-[9px] font-bold text-white">{userName.split(' ').map(w => w[0]).join('')}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#333] truncate">{userName}</p>
            <p className="text-[10px] text-[#999]">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Detail Row ─────────────────────────────────────────────────────────────────

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-[#F5F5F5] last:border-0">
      <span className="text-[11px] text-[#AAAAAA] w-28 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-[12px] text-[#333]">{children}</div>
    </div>
  )
}

// ─── Status Pill pair ─────────────────────────────────────────────────────────

export function StatusPair({ workflow, health }: { workflow: WorkflowState; health: Health }) {
  return (
    <div className="flex items-center gap-1.5">
      <WorkflowBadge state={workflow} />
      <HealthBadge health={health} />
    </div>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

export function Btn({ children, variant = 'outline', onClick, small }: { children: React.ReactNode; variant?: 'primary' | 'outline' | 'ghost'; onClick?: () => void; small?: boolean }) {
  const base = `rounded font-medium transition-colors cursor-pointer ${small ? 'text-[11px] px-3 py-1' : 'text-[12px] px-4 py-1.5'}`
  const v = { primary: 'bg-[#4F46E5] text-white hover:bg-[#4338CA]', outline: 'border border-[#E0E0E0] text-[#555] hover:bg-[#F5F5F5]', ghost: 'text-[#888] hover:text-[#333] hover:bg-[#F5F5F5]' }
  return <button className={`${base} ${v[variant]}`} onClick={onClick}>{children}</button>
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="text-center">
        {icon && <div className="text-[28px] mb-2 text-[#CCCCCC]">{icon}</div>}
        <p className="text-[13px] font-medium text-[#888]">{title}</p>
        {sub && <p className="text-[11px] text-[#CCCCCC] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Product Switcher ──────────────────────────────────────────────────────────
// Shown in PM, Engineering and QA — never in Leadership, which works across
// products. Changing product re-scopes dashboards, backlog, stories, releases.

export function ProductSwitcher({ products, selected, onChange }: { products: Product[]; selected: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = products.find(p => p.id === selected)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 border border-[#E0E0E0] rounded-md bg-white hover:bg-[#F5F5F5] transition-colors w-full"
      >
        <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${current?.color ?? 'bg-[#CCCCCC]'}`} />
        <span className="text-[11.5px] font-medium text-[#1A1A1A] truncate flex-1 text-left">{current?.name ?? 'All Products'}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l3 3 3-3" stroke="#888" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-[#E4E4E4] rounded-md shadow-lg z-50 min-w-[190px] py-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#BBBBBB] px-3 pt-2 pb-1">Switch Product</p>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${selected === p.id ? 'bg-[#EEF2FF]' : 'hover:bg-[#F9F9F9]'}`}
            >
              <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${p.color}`} />
              <div className="min-w-0">
                <p className={`text-[12px] font-medium truncate ${selected === p.id ? 'text-[#3730A3]' : 'text-[#444]'}`}>{p.name}</p>
              </div>
              {selected === p.id && <span className="ml-auto text-[10px] text-[#4F46E5] flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Workflow Orchestration ─────────────────────────────────────────────────────
// System-generated cross-role tasks — the defining feature of the platform.
// Rendered distinctly (dashed accent + "Auto-generated" marker) so they read
// as automatic handoffs rather than manually created work.

const wfTypeStyles: Record<WorkflowTask['type'], string> = {
  'Bug Fix': 'bg-[#FDF0F0] text-[#CC4444] border-[#E8CCCC]',
  'Smoke Test / UAT': 'bg-[#F0F0F0] text-[#555] border-[#D8D8D8]',
  'Story Review': 'bg-[#EBEBEB] text-[#555] border-[#D8D8D8]',
  'Scope Review': 'bg-[#EBEBEB] text-[#555] border-[#D8D8D8]',
  'Validation': 'bg-[#F0F0F0] text-[#555] border-[#D8D8D8]',
  'Clarification': 'bg-[#FDF8F0] text-[#996633] border-[#E8D8CC]',
  'Customer Update': 'bg-[#F0EAE0] text-[#8A6D4B] border-[#DCCFB8]',
}

export function WorkflowTypeTag({ type }: { type: WorkflowTask['type'] }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${wfTypeStyles[type]}`}>{type}</span>
}

export function WorkflowTaskRow({ task, onClick, onAcknowledge, onComplete }: { task: WorkflowTask; onClick?: () => void; onAcknowledge?: () => void; onComplete?: () => void }) {
  return (
    <div className={`px-4 py-3 border-b border-[#F5F5F5] last:border-0 flex items-start justify-between gap-3 ${onClick ? 'hover:bg-[#FAFAFA]' : ''}`}>
      <div onClick={onClick} className={`flex items-start gap-2.5 min-w-0 flex-1 ${onClick ? 'cursor-pointer' : ''}`}>
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-[#BBBBBB] flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <WorkflowTypeTag type={task.type} />
            <span className="text-[9px] text-[#CCCCCC] uppercase tracking-wider">Auto-generated</span>
          </div>
          <p className="text-[12.5px] font-medium text-[#1A1A1A] line-clamp-2" title={task.title}>{task.title}</p>
          <p className="text-[10.5px] text-[#AAAAAA] mt-0.5">{task.triggeredBy} · {task.createdAt}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Tag label={task.status} variant={task.status === 'Done' ? 'dark' : task.status === 'Acknowledged' ? 'default' : 'outline'} />
        <span className="text-[10px] text-[#BBBBBB]">{task.assignee}</span>
        {(onAcknowledge || onComplete) && task.status !== 'Done' && (
          <div className="flex gap-1.5 mt-0.5">
            {task.status === 'Pending' && onAcknowledge && (
              <button onClick={e => { e.stopPropagation(); onAcknowledge() }} className="text-[9.5px] text-[#888] hover:text-[#333] px-1.5 py-0.5 border border-[#E0E0E0] rounded">Acknowledge</button>
            )}
            {onComplete && (
              <button onClick={e => { e.stopPropagation(); onComplete() }} className="text-[9.5px] text-[#888] hover:text-[#333] px-1.5 py-0.5 border border-[#E0E0E0] rounded">Mark Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function WorkflowQueue({ tasks, onSelect, emptyLabel, onAcknowledge, onComplete }: { tasks: WorkflowTask[]; onSelect?: (t: WorkflowTask) => void; emptyLabel?: string; onAcknowledge?: (id: string) => void; onComplete?: (id: string) => void }) {
  if (tasks.length === 0) return <EmptyState icon="✓" title={emptyLabel ?? 'No pending workflow tasks'} sub="Cross-role handoffs will appear here automatically." />
  return <div>{tasks.map(t => <WorkflowTaskRow key={t.id} task={t} onClick={onSelect ? () => onSelect(t) : undefined} onAcknowledge={onAcknowledge ? () => onAcknowledge(t.id) : undefined} onComplete={onComplete ? () => onComplete(t.id) : undefined} />)}</div>
}

// ─── Attachments ────────────────────────────────────────────────────────────────

const attachmentIcons: Record<Attachment['type'], string> = { image: '🖼', video: '🎬', document: '📄', link: '🔗' }

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return <p className="text-[11.5px] text-[#CCCCCC] italic py-2">No attachments yet.</p>
  return (
    <div className="flex flex-col gap-0.5">
      {attachments.map(a => (
        <div key={a.id} className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
          <div className="w-8 h-8 rounded bg-[#F5F5F5] border border-[#EBEBEB] flex items-center justify-center flex-shrink-0 text-[14px]">{attachmentIcons[a.type]}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[#333] truncate">{a.name}</p>
            <p className="text-[10px] text-[#BBBBBB]">{a.uploadedBy} · {a.uploadedAt} · {a.meta}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Activity Timeline ──────────────────────────────────────────────────────────

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <p className="text-[11.5px] text-[#CCCCCC] italic py-2">No activity recorded yet.</p>
  return (
    <div className="relative">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-[#EBEBEB]" />
      {items.map(a => (
        <div key={a.id} className="flex items-start gap-3 py-2 relative">
          <div className="w-6 h-6 rounded-full bg-white border border-[#DCDCDC] flex-shrink-0 flex items-center justify-center z-10">
            <span className="text-[8px] font-bold text-[#888]">{a.who.split(' ').map(w => w[0]).join('')}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[11.5px] text-[#444]"><span className="font-medium text-[#1A1A1A]">{a.who}</span> {a.action}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tag label={a.role} variant="muted" />
            <span className="text-[10px] text-[#CCCCCC]">{a.time}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Relationships ──────────────────────────────────────────────────────────────

export function RelationshipRow({ label, value, onClick, badge }: { label: string; value: string; onClick?: () => void; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
      <span className="text-[11px] text-[#AAAAAA]">{label}</span>
      {value === '—' || value === ''
        ? <span className="text-[11.5px] text-[#CCCCCC] italic">Not linked</span>
        : onClick
          ? <button onClick={onClick} className="text-[11.5px] font-medium text-[#4F46E5] hover:underline text-right">{value}</button>
          : <span className="text-[11.5px] font-medium text-[#333] text-right">{value}</span>}
      {badge && <Tag label={badge} variant="muted" />}
    </div>
  )
}

// ─── Named comment list wrapper (typed re-export convenience) ─────────────────

export type { Comment }
