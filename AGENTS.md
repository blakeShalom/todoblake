<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TodoBlake — Agent Guide

A personal todo app implementing Greg McKeown's 1-2-3 method: each day you choose 1 essential task, 2 priorities, and 3 outcomes. Built as a PWA for mobile + desktop.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database/Auth**: Firebase (Firestore + Google Sign-in)
- **Styling**: Tailwind CSS + shadcn/ui components
- **PWA**: Manual service worker (`public/sw.js`) + web manifest
- **Deploy**: Vercel

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build (verifies types + compiles)
npx tsc --noEmit   # Type-check without building
```

## Setup (New Dev)

1. Create Firebase project at console.firebase.google.com
2. Enable Authentication > Google provider
3. Create Firestore database (start in production mode)
4. Copy `.env.example` to `.env.local` and fill in Firebase config values
5. Add localhost + production domain to Firebase Auth > Authorized domains
6. Deploy Firestore security rules (see below)
7. Create required Firestore indexes (see below)

## Architecture

### Routing (all `"use client"` pages)

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Redirect to `/today` or `/login` | No |
| `/login` | Google Sign-in | No |
| `/today` | Daily 1-2-3 view + daily tasks + upcoming deadlines | Yes |
| `/backlog` | All backlog items + selection/promote + scheduled view | Yes |
| `/daily-tasks` | Manage recurring daily habits | Yes |
| `/history` | Completed items with time + slot filters | Yes |

### Data Flow Pattern

All pages follow the same pattern:
1. Page component wraps in `<ProtectedRoute>` + `<AppShell>`
2. Uses a custom hook from `src/lib/hooks/` that calls `onSnapshot()` for real-time Firestore listeners
3. Mutations go through helper functions in `src/lib/firebase/firestore.ts`
4. Firebase is initialized lazily via getter functions in `src/lib/firebase/config.ts` (avoids SSR issues at build time)

### Key Design Decisions

- **Single `todoItems` collection with `slot` field** — promotes between backlog/today slots by updating `slot` + `assignedDate`, no data duplication
- **`assignedDate` and `scheduledDate` as ISO strings** (e.g. "2026-05-14") — avoids timezone issues in Firestore queries; "today" is determined client-side
- **Lazy Firebase initialization** — `getFirebaseAuth()` / `getFirebaseDb()` are functions, not top-level values, because Next.js 16 precompiles pages and Firebase fails without env vars at build time
- **Two Firestore queries for backlog** — Firestore can't do `scheduledDate <= today OR scheduledDate == null`, so unscheduled + due items are queried separately and merged client-side
- **Recurrence creates new documents** — when a recurring item is completed, `updateTodoItem()` auto-creates a new item with the next scheduled date (fixed schedule, not sliding)

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (AuthProvider, PWA registration, fonts)
│   ├── page.tsx                  # / — redirect based on auth state
│   ├── login/page.tsx            # Google sign-in page
│   ├── today/page.tsx            # Main 1-2-3 daily view
│   ├── backlog/page.tsx          # Backlog with selection + scheduling
│   ├── daily-tasks/page.tsx      # Daily recurring tasks CRUD
│   └── history/page.tsx          # Completed items history
├── components/
│   ├── auth/
│   │   ├── auth-provider.tsx     # AuthContext + useAuth() hook
│   │   └── protected-route.tsx   # Redirect to /login if not authed
│   ├── layout/
│   │   └── app-shell.tsx         # Header + bottom nav (mobile) + sidebar (desktop)
│   ├── pwa/
│   │   └── register-sw.tsx       # Service worker registration (production only)
│   ├── todo/
│   │   ├── daily-task-item.tsx   # Single daily task row with checkbox
│   │   ├── quick-add-dialog.tsx  # Global "c" hotkey dialog for fast task creation
│   │   ├── slot-section.tsx      # 1-2-3 slot container with capacity enforcement
│   │   ├── todo-item.tsx         # Single todo item (checkbox, badges, expand desc)
│   │   └── todo-item-form.tsx    # Create/edit dialog (deadline, schedule, recurrence)
│   └── ui/                       # shadcn/ui primitives (don't edit directly)
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Firebase app init (lazy getters)
│   │   ├── auth.ts               # signInWithGoogle, signOut, createOrUpdateUserProfile
│   │   └── firestore.ts          # All Firestore queries + mutations + recurrence logic
│   ├── hooks/
│   │   ├── use-today-items.ts    # Real-time listener for today's assigned items
│   │   ├── use-backlog.ts        # Backlog (unscheduled + due) + scheduled future items
│   │   ├── use-daily-tasks.ts    # Daily tasks + today's completions
│   │   ├── use-history.ts        # Completed items + daily completions with time filter
│   │   └── use-upcoming-deadlines.ts  # Items with deadlines in next 30 days
│   ├── types/index.ts            # All TypeScript interfaces + constants
│   └── utils.ts                  # cn() classname helper (shadcn)
public/
├── manifest.json                 # PWA manifest (standalone, start_url: /today)
├── sw.js                         # Service worker (network-first with cache fallback)
└── icons/                        # App icons (192x192, 512x512 PNG)
```

## Data Model (Firestore)

All data scoped under `users/{uid}/`:

### `todoItems/{itemId}`

```typescript
{
  title: string;             // Required
  description: string;       // Optional rich text
  slot: "essential" | "priority" | "outcome" | "backlog";
  assignedDate: string | null;     // "2026-05-14" when in today's 1-2-3, null for backlog
  scheduledDate: string | null;    // Future date when item should appear in backlog
  deadline: string | null;         // Optional deadline date
  completed: boolean;
  completedAt: Timestamp | null;
  recurrence: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | null;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Slot capacity rules** (enforced client-side in `slot-section.tsx`):
- `essential`: max 1 per day
- `priority`: max 2 per day
- `outcome`: max 3 per day
- `backlog`: unlimited

**Scheduling behavior**:
- `scheduledDate == null` → item appears immediately in backlog
- `scheduledDate <= today` → item appears in backlog (due)
- `scheduledDate > today` → item hidden, shown in "Upcoming Scheduled" view

**Recurrence behavior** (handled in `firestore.ts` `updateTodoItem()`):
- On completion of a recurring item, a new item is created with `scheduledDate` advanced by the frequency interval
- Fixed schedule: next date is calculated from the current `scheduledDate`, not the completion date

### `dailyTasks/{taskId}`

```typescript
{
  title: string;
  description: string;
  sortOrder: number;
  active: boolean;         // Can deactivate without deleting
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `dailyTaskCompletions/{completionId}`

```typescript
{
  taskId: string;          // Reference to dailyTasks doc
  date: string;            // "2026-05-14"
  completedAt: Timestamp;
}
```

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Firestore Composite Indexes Required

1. `todoItems`: `assignedDate` ASC, `sortOrder` ASC
2. `todoItems`: `slot` ASC, `scheduledDate` ASC, `sortOrder` ASC
3. `todoItems`: `slot` ASC, `scheduledDate` ASC, `completed` ASC, `sortOrder` ASC
4. `todoItems`: `completed` ASC, `completedAt` DESC
5. `todoItems`: `completed` ASC, `deadline` ASC
6. `dailyTaskCompletions`: `date` ASC
7. `dailyTaskCompletions`: `completedAt` DESC

Tip: Firestore logs missing index errors in the browser console with a direct link to create each one.

## Features & UX

- **1-2-3 Method**: Today page enforces 1 essential + 2 priorities + 3 outcomes
- **Backlog**: Unlimited items, filterable (all/active/completed), multi-select to promote to today's slots
- **Daily Tasks**: Recurring habits that reset each day, tracked via separate completions collection
- **Scheduling**: Schedule backlog items for future dates; they appear when due
- **Recurrence**: Daily/weekly/biweekly/monthly/quarterly on a fixed schedule
- **Deadlines**: Optional per-item deadlines with color-coded badges (red=overdue, yellow=today)
- **Upcoming Deadlines**: Today page shows items due within 7 days and 8-30 days
- **History**: View completed items filtered by time (24h/7d/30d/all) and type (slot or daily)
- **Quick Add**: Press `c` from any page to open fast task creation dialog; defaults to current page's context
- **PWA**: Installable on mobile via "Add to Home Screen", works offline for cached pages
- **Responsive**: Mobile bottom tab nav + desktop sidebar

## Conventions

- All pages are `"use client"` (no server components beyond root layout)
- Firebase is never imported at module top-level scope outside of `src/lib/firebase/`
- Real-time data uses `onSnapshot`; mutations use direct Firestore SDK calls
- UI components from shadcn/ui live in `src/components/ui/` — regenerate with `npx shadcn@latest add <component>`
- Dates stored as ISO strings ("yyyy-MM-dd"), timestamps as Firestore `Timestamp` objects
- No API routes — all data access is client-side with Firestore security rules enforcing ownership
- The `updateTodoItem()` function accepts an optional `fullItem` parameter — pass it when toggling completion so recurrence logic can spawn the next instance
