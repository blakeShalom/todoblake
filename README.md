# TodoBlake

TodoBlake is a personal PWA built around Greg McKeown's 1-2-3 method: choose one
essential task, two priorities, and three outcomes each day. It uses Next.js,
Firebase Authentication and Firestore, with optional Firebase Cloud Messaging.

## Fork safety

Every installation must use a Firebase project and Vercel project controlled by
that installation's owner. This repository contains no live project identifiers,
tokens, service-account files, Vercel links, or private keys.

Firebase web configuration uses `NEXT_PUBLIC_` variables and is visible in the
built browser bundle by design. It identifies a backend; it is not authorization.
Firestore rules and the server-managed access list are the security boundary.

The checked-in Firestore rules deny all application data access unless the
authenticated user's UID has a corresponding `access/{uid}` document. Clients
cannot create or modify these documents. This prevents a fork—or an unknown
person using the public Firebase configuration from a deployed site—from
enrolling itself and charging the configured project for arbitrary database use.

No cloud provider offers a perfect hard spending cap for every product. Before a
production deployment, also configure Google Cloud budget alerts, conservative
service quotas where available, Firebase App Check, API-key application
restrictions, and Vercel spend notifications/controls in the provider consoles.

## Local setup

1. Create a new Firebase project that you control.
2. Add a Web app and enable Authentication > Google.
3. Create Firestore in production mode.
4. Copy `.env.example` to `.env.local` and paste that Web app's config.
5. Copy `.firebaserc.example` to `.firebaserc` and replace the project ID.
6. Install and run:

```bash
npm ci
npm run dev
```

After signing in once, find your UID in Firebase Authentication. In the
Firestore console, create an empty document at `access/YOUR_UID`. Sign out and
back in. Add a separate access document for each person who should use the app.
Deleting that document revokes database access.

Deploy the rules and indexes before using the app:

```bash
firebase deploy --only firestore
```

Do not weaken the rules to `request.auth != null`. That permits any Google user
to create data at the project owner's expense. Do not commit `.env.local`,
`.firebaserc`, service-account JSON, private keys, or notification secrets.

## Vercel deployment

Import your fork into a new Vercel project and add the values from `.env.example`
to that project. Never copy environment variables from someone else's
deployment. Restrict the Firebase API key to the APIs this app uses and to your
production domains (retain localhost only while needed for development). Add
each production domain to Firebase Authentication's authorized domains.

Vercel preview deployments need their own authorized-domain and API-key policy.
For a personal app, disabling automatic preview deployments for untrusted
branches is the simplest option.

## Optional push notifications

Push notifications require Firebase Cloud Messaging, a Web Push/VAPID key,
Cloud Functions, Cloud Scheduler, and Secret Manager. These may require billing.
The scheduled function runs every 15 minutes and now examines only the
administrator-managed `access` collection.

Set the public notification variables from `.env.example`, then create the
private signing secret and deploy:

```bash
firebase functions:secrets:set NOTIFICATION_ACTION_SECRET
npm --prefix functions ci
npm --prefix functions test
firebase deploy --only functions
```

If notifications are not needed, do not deploy Functions and leave the VAPID
and Functions variables empty. This avoids their recurring cloud cost entirely.

## Billing and abuse checklist

- Use a dedicated Firebase project, Vercel project, and API key per installation.
- Deploy `firestore.rules`; verify an unlisted Google account receives
  `permission-denied`.
- Keep `access/*` writable only through the console or trusted Admin SDK.
- Enable Firebase App Check enforcement after monitoring valid traffic.
- Restrict the Firebase browser API key by API and allowed web origins.
- Configure Google Cloud budgets/alerts and applicable quotas. Alerts notify;
  they do not automatically cap all charges.
- Configure Vercel spend notifications/controls and deployment protection.
- Do not deploy optional scheduled Functions unless notifications are wanted.
- Review Auth, Firestore, Functions, Scheduler, and Vercel usage periodically.

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run test
npm run build

npm --prefix functions test
npm --prefix functions run build
```
