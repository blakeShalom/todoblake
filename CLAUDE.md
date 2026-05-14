@AGENTS.md

# TodoBlake

A todo app using the 1-2-3 method (Greg McKeown): 1 essential, 2 priorities, 3 outcomes per day.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- Firebase (Auth with Google Sign-in, Firestore)
- Tailwind CSS + shadcn/ui
- PWA (manual service worker, manifest.json)
- Deploy to Vercel

## Development

```bash
npm run dev    # Start dev server
npm run build  # Production build
```

## Setup

1. Create a Firebase project at console.firebase.google.com
2. Enable Authentication > Google provider
3. Create a Firestore database
4. Copy Firebase config to `.env.local` (see `.env.example`)
5. Add your domain to Firebase Auth authorized domains

## Project Structure

- `src/app/` — Pages (today, backlog, daily-tasks, login)
- `src/components/` — UI components (auth, layout, todo, pwa)
- `src/lib/firebase/` — Firebase config, auth helpers, Firestore queries
- `src/lib/hooks/` — React hooks for data fetching
- `src/lib/types/` — TypeScript interfaces

## Data Model

All data lives in Firestore under `users/{uid}/`:
- `todoItems/` — All items (slot: essential|priority|outcome|backlog)
- `dailyTasks/` — Recurring daily task definitions
- `dailyTaskCompletions/` — Per-day completion records

## Firestore Indexes Required

1. `todoItems`: assignedDate ASC, sortOrder ASC
2. `todoItems`: slot ASC, completed ASC, sortOrder ASC
3. `todoItems`: completed ASC, completedAt DESC (for history view)
4. `dailyTaskCompletions`: date ASC
