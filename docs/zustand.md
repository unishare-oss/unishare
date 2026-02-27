# Zustand — State Management Guide

This guide covers how Zustand is used in the `web` app and how to work with it as a contributor.

---

## What is Zustand and why do we use it?

Zustand is a small state management library for React. We use it for **client-side UI state** that needs to be shared across components and persisted between page navigations.

The rule of thumb for what goes where:

| Type of state                                    | Tool           |
| ------------------------------------------------ | -------------- |
| Server data (posts, users, courses, saved posts) | TanStack Query |
| Auth session                                     | better-auth    |
| Shared UI state (read status)                    | Zustand        |
| Local component state (form inputs, open/close)  | `useState`     |

Zustand sits between `useState` (too local) and a full server state manager (too heavy) for things like "which posts has the user read?".

> **Why not saved posts?** Saved posts live in the database, so they're server state. They belong in TanStack Query with an optimistic `useMutation` — not in localStorage. Zustand is only for state that has no server representation.

---

## The store

The store lives at `apps/web/lib/store.ts`.

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIStore {
  readPostIds: string[]
  markRead: (id: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      readPostIds: [],
      markRead: (id) => {
        if (!get().readPostIds.includes(id)) {
          set((s) => ({ readPostIds: [...s.readPostIds, id] }))
        }
      },
    }),
    { name: 'unishare-ui', skipHydration: true },
  ),
)
```

`persist` saves the store to `localStorage` under the key `unishare-ui`. `skipHydration: true` defers loading from localStorage until `rehydrate()` is called manually — this prevents SSR mismatches (see Hydration section below).

---

## Reading state

Import `useUIStore` and pass a **selector** — a function that picks out only the piece of state you need. The component only re-renders when that specific piece changes.

```tsx
// ✅ Good — only re-renders when readPostIds changes
const readPostIds = useUIStore((s) => s.readPostIds)

// ✅ Good — derived boolean, only re-renders when this post's read status changes
const isRead = useUIStore((s) => s.readPostIds.includes(post.id))

// ✅ Good — subscribing to an action (actions never change, so this never causes re-renders)
const markRead = useUIStore((s) => s.markRead)

// ❌ Bad — subscribing to the whole store, re-renders on any change
const store = useUIStore()
```

---

## Writing state (calling actions)

Actions are just functions in the store. Call them directly:

```tsx
const markRead = useUIStore((s) => s.markRead)

// Call anywhere — on click, in useEffect, wherever
markRead(post.id)
```

---

## Real examples from this codebase

### Checking if a post is read (PostCard)

```tsx
const isRead = useUIStore((s) => s.readPostIds.includes(post.id))

<h3 className={cn('...', isRead ? 'text-text-muted' : 'text-foreground')}>
  {post.title}
</h3>
```

### Marking a post as read on mount (PostDetailPage)

```tsx
const markRead = useUIStore((s) => s.markRead)

useEffect(() => {
  markRead(post.id)
}, [post.id, markRead])
```

The `useEffect` ensures it runs after the component mounts (client-side only), not during SSR.

---

## Adding new state

Say you want to track which filters the user last used on the feed so it persists across navigations.

**Step 1 — Add the shape to the interface:**

```ts
interface UIStore {
  readPostIds: string[]
  activeFilter: string // new
  markRead: (id: string) => void
  setFilter: (f: string) => void // new
}
```

**Step 2 — Add the initial value and action inside `create`:**

```ts
(set, get) => ({
  readPostIds: [],
  activeFilter: 'ALL',        // new
  markRead: ...,
  setFilter: (f) => set({ activeFilter: f }),  // new
})
```

**Step 3 — Use it in a component:**

```tsx
const activeFilter = useUIStore((s) => s.activeFilter)
const setFilter = useUIStore((s) => s.setFilter)
```

That's it. Because `persist` is already wired up, `activeFilter` is automatically saved to localStorage — no extra steps.

---

## Hydration and SSR

The `persist` middleware loads from `localStorage` **only on the client**. During server-side rendering, the store always starts with its initial values (`[]`, etc.).

We use `skipHydration: true` in the persist config and call `rehydrate()` once inside `Providers` (via `useEffect`):

```tsx
// src/providers/index.tsx
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useUIStore.persist.rehydrate()
  }, [])
  return <QueryProvider>{children}</QueryProvider>
}
```

This means localStorage is loaded exactly once, after the first client render, across the entire app. No per-page `mounted` guards needed.

---

## When NOT to use Zustand

- **Server data** — use TanStack Query. Saved posts, post lists, user profiles — anything with a DB table belongs here, not in Zustand.
- **Form state** — use `useState` in the form component. Zustand is overkill for inputs.
- **Ephemeral UI** — modals open/close, tooltip visibility, hover state — use `useState` locally. No need to share these globally.
- **Auth** — use better-auth's hooks. Don't duplicate session data into Zustand.
