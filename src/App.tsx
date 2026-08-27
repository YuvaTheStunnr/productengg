import { useState, useRef, useEffect } from 'react'
import type { Space } from './data'
import { LeadershipSpace } from './LeadershipSpace'
import { PMSpace } from './PMSpace'
import { EngineeringSpace } from './EngineeringSpace'
import { QASpace } from './QASpace'
import { CustomerSuccessSpace } from './CustomerSuccessSpace'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIContext {
  title: string
  prompts: string[]
  product?: string
  entity?: string
}

interface Message {
  from: 'ai' | 'user'
  text: string
  context?: string
}

// ─── Space config ─────────────────────────────────────────────────────────────

const SPACES: { id: Space; label: string; user: string; role: string; color: string }[] = [
  { id: 'leadership', label: 'Leadership', user: 'Jamie Okonkwo', role: 'VP Product', color: 'bg-[#444]' },
  { id: 'pm', label: 'Product Manager', user: 'Alex Chen', role: 'Product Lead', color: 'bg-[#555]' },
  { id: 'engineering', label: 'Engineering', user: 'Morgan Tse', role: 'iOS Engineer', color: 'bg-[#333]' },
  { id: 'qa', label: 'QA', user: 'Dana Rao', role: 'QA Lead', color: 'bg-[#666]' },
  { id: 'customer-success', label: 'Customer Success', user: 'Nina Patel', role: 'Customer Success Lead', color: 'bg-[#8A6D4B]' },
]

// ─── Seed AI conversations per space ────────────────────────────────────────

const SEED_MESSAGES: Record<Space, Message[]> = {
  leadership: [
    { from: 'ai', text: 'Good morning. Portfolio delivery confidence is 71% for Q3. Two initiatives are at risk — Payment v2 is blocked on an external merchant certificate and Onboarding Redesign has design dependencies open in Feature Tour. Want a briefing?' },
    { from: 'user', text: 'Summarise at-risk initiatives.' },
    { from: 'ai', text: 'Onboarding Redesign (62% done, target Sep 30): Feature Tour is at risk — design approval delayed and no dedicated QA assigned. Payment v2 (35% done, target Sep 30): fully blocked on Apple Pay merchant cert. ETA from merchant portal: 3–5 business days. Recommend leadership escalation before Aug 14 beta.' },
  ],
  pm: [
    { from: 'ai', text: "Cycle 14 is 58% complete with 5 days remaining. Engineering has 2 blockers and QA has 3 failed tests pending fix. The Apple Pay cert is the critical path item blocking both teams." },
    { from: 'user', text: 'Show cross-team blockers.' },
    { from: 'ai', text: "Cross-team blockers: (1) Apple Pay cert — blocks ENG-415 and QA TC-5. Owner: Jordan Mills. External dependency. (2) Feature Tour design — blocks story-5 and story-6. Owner: Riley Kim. In review. Both require your action: escalate cert to leadership, approve design review." },
  ],
  engineering: [
    { from: 'ai', text: 'Your build on feat/auth-refactor is failing. 3 issues: test timeout in TokenRefreshService, null assertion in UserSession.ts:142, and missing OAUTH_SECRET in CI config. Want me to walk through fixes?' },
    { from: 'user', text: 'Fix the null assertion first.' },
    { from: 'ai', text: 'In UserSession.ts:142, `user.session` can be null when the refresh token expires mid-request. Add a null guard: `if (!user.session) return redirectToLogin()` before the assertion. This should unblock the CI failure.' },
  ],
  qa: [
    { from: 'ai', text: `Release v2.4.1 readiness is 47%. 4 critical bugs are open and regression is 68% complete. The Apple Pay flow and checkout CVV loop are the two highest-severity open issues. Should I generate a test plan for the gaps?` },
    { from: 'user', text: 'Generate test cases for checkout.' },
    { from: 'ai', text: 'Generated 12 test cases for the checkout path: happy path (3), error states (4), edge cases (3), accessibility (2). Linked to Epic: Checkout Redesign, Story: STORY-8. All assigned to Priya Sinha. Ready to add to queue?' },
  ],
  'customer-success': [
    { from: 'ai', text: '2 requests need triage and Apple Pay support is running behind for Globex Retail — worth a proactive note before they ask. Want me to draft one?' },
    { from: 'user', text: 'Draft an update for Globex Retail.' },
    { from: 'ai', text: "Draft: \"Apple Pay support is in progress — we're currently waiting on a certificate from Apple before we can finish testing. We expect this to move quickly once it arrives and will keep you posted on timing.\" No mention of the merchant cert ticket or internal blockers — just what changed and what's next." },
  ],
}

// ─── Space Selector Dropdown ──────────────────────────────────────────────────

function SpaceSelector({ space, setSpace }: { space: Space; setSpace: (s: Space) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = SPACES.find(s => s.id === space)!

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
        className="flex items-center gap-2.5 px-3 py-1.5 border border-[#E0E0E0] rounded-md bg-white hover:bg-[#F5F5F5] transition-colors"
      >
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${current.color}`} />
        <span className="text-[12.5px] font-medium text-[#1A1A1A]">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l3 3 3-3" stroke="#888" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-[#E4E4E4] rounded-md shadow-lg z-50 min-w-[200px] py-1">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#BBBBBB] px-3 pt-2 pb-1">Switch Space</p>
          {SPACES.map(s => (
            <button
              key={s.id}
              onClick={() => { setSpace(s.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${space === s.id ? 'bg-[#F5F5F5]' : 'hover:bg-[#F9F9F9]'}`}
            >
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${s.color}`}>
                <span className="text-[8px] font-bold text-white">{s.user.split(' ').map(w => w[0]).join('')}</span>
              </div>
              <div>
                <p className={`text-[12px] font-medium ${space === s.id ? 'text-[#1A1A1A]' : 'text-[#444]'}`}>{s.label}</p>
                <p className="text-[10px] text-[#AAAAAA]">{s.user} · {s.role}</p>
              </div>
              {space === s.id && <span className="ml-auto text-[10px] text-[#888]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({ space, context, onClose }: { space: Space; context: AIContext; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES[space])
  const [input, setInput] = useState('')
  const prevSpace = useRef(space)

  useEffect(() => {
    if (prevSpace.current !== space) {
      setMessages(SEED_MESSAGES[space])
      prevSpace.current = space
    }
  }, [space])

  const send = () => {
    if (!input.trim()) return
    const userMsg: Message = { from: 'user', text: input }
    const aiMsg: Message = { from: 'ai', text: `Understood — "${input}". Let me analyse the current context (${context.title}) and provide relevant information.`, context: context.title }
    setMessages(m => [...m, userMsg, aiMsg])
    setInput('')
  }

  return (
    <aside className="w-[320px] flex-shrink-0 bg-white border-l border-[#E4E4E4] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E4E4E4] flex items-center justify-between flex-shrink-0">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1A1A]">DXOne AI</p>
          <p className="text-[10px] text-[#AAAAAA] truncate">
            {SPACES.find(s => s.id === space)?.label}
            {context.product && <> · {context.product}</>}
            {' · '}{context.title}
            {context.entity && <> · {context.entity}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#888]" />
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-[#CCCCCC] hover:text-[#888] transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="px-4 py-3 border-b border-[#EBEBEB] flex-shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#AAAAAA] mb-2">Suggested for {context.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {context.prompts.map(p => (
            <button key={p} onClick={() => setInput(p)}
              className="text-[10.5px] px-2 py-1 rounded border border-[#D8D8D8] text-[#555] bg-[#FAFAFA] hover:bg-[#F0F0F0] transition-colors leading-tight">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.from === 'ai' && (
              <div className="w-6 h-6 bg-[#1A1A1A] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5">
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-white mt-0.5" />
              </div>
            )}
            <div className={`max-w-[220px] px-3 py-2 rounded-lg text-[11.5px] leading-relaxed
              ${m.from === 'ai' ? 'bg-[#F5F5F5] text-[#333] rounded-tl-none' : 'bg-[#1A1A1A] text-white rounded-tr-none'}`}>
              {m.context && m.from === 'ai' && <p className="text-[9px] text-[#AAAAAA] mb-1 uppercase tracking-wider">{m.context}</p>}
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#E4E4E4] flex-shrink-0">
        <div className="flex items-center gap-2 border border-[#D8D8D8] rounded-lg px-3 py-2 bg-[#FAFAFA]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask DXOne AI..."
            className="flex-1 bg-transparent text-[12px] text-[#333] placeholder-[#BBBBBB] outline-none"
          />
          <button onClick={send} className="w-6 h-6 bg-[#1A1A1A] rounded flex items-center justify-center flex-shrink-0 hover:bg-[#333]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 8V2M2 5l3-3 3 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

function AppHeader({ space, setSpace, aiOpen, setAIOpen }: {
  space: Space
  setSpace: (s: Space) => void
  aiOpen: boolean
  setAIOpen: (v: boolean) => void
}) {
  const current = SPACES.find(s => s.id === space)!

  return (
    <header className="h-11 bg-white border-b border-[#E4E4E4] flex items-center justify-between px-4 flex-shrink-0 z-10">
      {/* Left: brand + space selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#1A1A1A] rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-white rounded-sm" />
          </div>
          <span className="text-[13px] font-semibold text-[#1A1A1A]">DXOne</span>
          <span className="text-[#DCDCDC] mx-1">/</span>
          <span className="text-[12px] text-[#888]">Product Engineering</span>
        </div>
        <div className="h-5 w-px bg-[#E4E4E4]" />
        <SpaceSelector space={space} setSpace={setSpace} />
      </div>

      {/* Right: user + AI toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] text-[#888]">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${current.color}`}>
            <span className="text-[8px] font-bold text-white">{current.user.split(' ').map(w => w[0]).join('')}</span>
          </div>
          <span>{current.user}</span>
          <span className="text-[#CCCCCC]">·</span>
          <span className="text-[#BBBBBB]">{current.role}</span>
        </div>
        <button
          onClick={() => setAIOpen(!aiOpen)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded border text-[11.5px] font-medium transition-colors
            ${aiOpen ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-[#E0E0E0] text-[#555] hover:bg-[#F5F5F5]'}`}
        >
          DXOne AI
        </button>
      </div>
    </header>
  )
}

// ─── Collapsed AI Toggle ──────────────────────────────────────────────────────

function AICollapseButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="w-8 flex-shrink-0 border-l border-[#E4E4E4] bg-[#FAFAFA] flex flex-col items-center justify-center">
      <button onClick={onOpen} className="w-full flex-1 flex flex-col items-center justify-center gap-3 hover:bg-[#F0F0F0] transition-colors py-4">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="#888" strokeWidth="1.2"/>
          <path d="M4 5c0-1.1.9-2 2-2s2 .9 2 2c0 .9-.6 1.6-1.5 1.9V8" stroke="#888" strokeWidth="1.1" strokeLinecap="round"/>
          <circle cx="6" cy="9.5" r="0.5" fill="#888"/>
        </svg>
        <span className="text-[9px] text-[#AAAAAA] font-semibold uppercase tracking-wider" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>DXOne AI</span>
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [space, setSpace] = useState<Space>('leadership')
  const [aiOpen, setAIOpen] = useState(true)
  const [aiContext, setAIContext] = useState<AIContext>({
    title: 'Portfolio Dashboard',
    prompts: ['Summarize portfolio health', 'Identify delivery risks', 'Review submitted ideas', 'Forecast Q3 delivery'],
  })

  const handleSpaceChange = (s: Space) => {
    setSpace(s)
    // Reset context to dashboard when switching spaces
    const defaults: Record<Space, AIContext> = {
      leadership: { title: 'Portfolio Dashboard', prompts: ['Summarize portfolio health', 'Identify delivery risks', 'Review submitted ideas', 'Forecast Q3 delivery'] },
      pm:         { title: 'PM Dashboard', prompts: ['Show cross-team workflow tasks', 'What needs my attention?', 'Generate cycle summary', 'Identify scope risks'] },
      engineering:{ title: 'Engineering Dashboard', prompts: ['What should I work on?', 'Summarise my blockers', 'Review open PRs', 'Show failing builds'] },
      qa:         { title: 'QA Dashboard', prompts: ['What needs testing today?', 'Summarise failed tests', 'Check release readiness', 'List critical bugs'] },
      'customer-success': { title: 'CS Dashboard', prompts: ['Summarise requests needing triage', 'What should I update customers on today?', 'Show accounts with open asks'] },
    }
    setAIContext(defaults[s])
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5F5F5] font-sans">
      <AppHeader space={space} setSpace={handleSpaceChange} aiOpen={aiOpen} setAIOpen={setAIOpen} />

      <div className="flex flex-1 overflow-hidden">
        {space === 'leadership' && <LeadershipSpace onContextChange={setAIContext} />}
        {space === 'pm' && <PMSpace onContextChange={setAIContext} />}
        {space === 'engineering' && <EngineeringSpace onContextChange={setAIContext} />}
        {space === 'qa' && <QASpace onContextChange={setAIContext} />}
        {space === 'customer-success' && <CustomerSuccessSpace onContextChange={setAIContext} />}

        {aiOpen
          ? <AIPanel space={space} context={aiContext} onClose={() => setAIOpen(false)} />
          : <AICollapseButton onOpen={() => setAIOpen(true)} />}
      </div>
    </div>
  )
}
