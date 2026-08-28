// ─────────────────────────────────────────────────────────────────────────────
// Tiny session-only store.
//
// Every entity array in data.ts (STORIES, EPICS, BUGS, …) is a plain mutable
// array — mutation functions in data.ts push/modify objects on it directly.
// React doesn't know when that happens, so every mutation calls notify()
// here, and App.tsx subscribes once at the root with useSyncExternalStore.
// That's enough to re-render whatever screen is on-screen after any create
// or status change, without threading state through every component.
//
// This is intentionally NOT persisted anywhere — it resets on reload. That's
// fine for this build: the goal is "buttons actually do something for the
// rest of your session," not a real backend.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = () => void
const listeners = new Set<Listener>()
let version = 0

export function subscribeStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getStoreVersion(): number {
  return version
}

export function notify(): void {
  version++
  listeners.forEach(l => l())
}
