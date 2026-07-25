# TodoBlake

TodoBlake is a personal todo app built around Greg McKeown's 1-2-3 method: each day you choose one essential task, two priorities, and three outcomes. It is a Next.js PWA with Firebase Auth, Firestore, and optional Firebase Cloud Messaging push notifications.

## Bring Your Own Firebase

This repository is public, so every deployed copy should use its own Firebase project. The values in `.env.example` are placeholders, and any values used in a real deployment should belong to the person or organization deploying that fork.

Firebase web config values such as `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` are public client configuration, not server secrets. They identify which Firebase project the browser should talk to. They still should not be reused by forks because doing so would point another deployment at the original app's Auth, Firestore, and push infrastructure.

Do not commit private keys, service account JSON files, or notification signing secrets. Push notification action signing uses Firebase Secret Manager via `NOTIFICATION_ACTION_SECRET`.

## Local Setup

1. Create a Firebase project.
2. Enable Google Authentication.
3. Create a Firestore database.
4. Copy `.env.example` to `.env.local`.
5. Fill in your Firebase web app values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

6. Install dependencies and run the app:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push Notifications

Push notifications are optional and require a Firebase project that you control.

For a deployed fork, you need:

- Firebase Cloud Messaging enabled.
- A Web Push certificate/VAPID key pair from Firebase Console.
- Firebase Functions enabled. Scheduled Functions and Secret Manager may require the Firebase Blaze plan.
- A secret named `NOTIFICATION_ACTION_SECRET` in Firebase Secret Manager.
- The Functions in `functions/` deployed to your Firebase project.

Set these public web environment variables for the app:

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1
NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL=
```

`NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL` is optional if your functions are deployed at the default Firebase URL for the configured project and region.

Set the private notification action secret and deploy Functions:

```bash
firebase functions:secrets:set NOTIFICATION_ACTION_SECRET --project <your-project-id>
firebase deploy --only functions --project <your-project-id>
```

If someone forks this repo, they should generate their own VAPID key and secret, deploy their own Functions, and use their own Firebase project ID in all environments.

## Useful Commands

```bash
npm run dev        # Start local Next.js dev server
npm run build      # Production build
npx tsc --noEmit   # Type-check
npm run lint       # Lint
npm run test       # Unit tests
```

Functions workspace:

```bash
npm --prefix functions ci
npm --prefix functions test
npm --prefix functions run build
```
