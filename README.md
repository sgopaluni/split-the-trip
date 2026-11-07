# SplitTheTrip

A polished trip expense app for a Smokies getaway with friends. React + Vite, Google sign-in through Firebase Authentication, and live shared data through Cloud Firestore. Built for GitHub Pages; no application server required.

## Try it now

```sh
npm ci
npm run dev
```

Open the printed localhost URL. The app starts with an empty workspace: no sample trips, people, or expenses. The supplied Firebase project is configured in `src/firebase-config.js`. Google sign-in is the default; the optional local workspace stores changes in this browser only. Previously seeded sample trips are removed automatically while your own locally created trips are preserved. Connect Firebase before using shared trips with friends.

## Included

- Multiple trips, archives, dates, group budgets, and up to 12 friends per trip.
- Google account login and realtime trip sharing after Firebase setup.
- Equal, exact, percentage, and weighted splits, with penny-safe rounding.
- Single or multiple payers; USD throughout.
- All 13 expense categories, notes, receipt links, comments, editing, duplication, deletion, search, filtering, and sorting.
- Group debt simplification or pairwise balances.
- Payment records with mutual confirmation: one person records, the other confirms or declines. Pending records do not change balances; confirmed payments are immutable.
- Category charts, daily spending, per-person paid/share totals, and budget progress.
- Expense and balance CSV exports and a JSON backup download.
- Mobile layouts, keyboard-accessible dialogs, and reduced-motion support.

## Enable Google login and shared trips

1. Create a project at https://console.firebase.google.com and register a **Web app**.
2. In **Authentication → Sign-in method**, enable **Google** and set the support email.
3. In **Authentication → Settings → Authorized domains**, add your GitHub Pages hostname, e.g. `yourname.github.io`, and `localhost` for development. Use the hostname without a path.
4. Create a **Cloud Firestore** database in production mode. In its **Rules** tab, paste the complete contents of `firestore.rules` and publish them. Do not use test-mode/open rules. Alternatively run `npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID` after authenticating with Firebase CLI.
5. This copy already uses project `splitthetrip-37dd7`. Its public Web app configuration is in `src/firebase-config.js`. To use a different project, replace that configuration or override the four values using `.env.example` copied to `.env.local`.
6. Restart the development server. Sign in, create the real Smokies trip, and add friends using the exact email addresses they use for Google login. Share your app URL with them. Invitations do not send emails.

Firebase browser configuration is public by design; it contains no service-account credentials. Database access is enforced by the included Firestore rules. Never put a service-account private key in this app or repository. The rules restrict access to verified trip members, validate cent totals, and enforce confirmation by the other party on the server. All trip members can manage shared expenses. Only the organizer can change trip settings and add friends. Existing membership is retained to preserve balances; use a new trip if membership must change.

## GitHub Pages — when ready

The included `.github/workflows/deploy.yml` builds and publishes automatically from `main`.

1. Create an empty GitHub repository and push these project files to `main`.
2. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included public Firebase configuration works in GitHub Pages builds automatically. The four repository variables listed in `.env.example` are optional overrides for a different Firebase project.
4. Add `yourname.github.io` to Firebase authorized domains as above, and publish `firestore.rules` to Firebase.
5. Push a commit or run the deployment workflow manually. Your app will be at `https://yourname.github.io/REPOSITORY/`. Your existing account website can stay at `https://yourname.github.io/`; each separate repository can have its own project site. For your account, a repository named `split-the-trip` will use `https://sgopaluni.github.io/split-the-trip/`.

Vite uses relative asset paths, so repository subpaths and custom domains work without changing source. No history-router rewrites are needed. The configured project is used even when GitHub repository variables are omitted. Google login must be enabled and Firestore rules must be published in that Firebase project before friends use it.

## Commands

```sh
npm test          # money allocation, debt simplification, payment semantics, CSV safety
npm run build     # production assets in dist/
npm run preview   # serve the production build
```

## Practical scope

This is an independent app, not an official Splitwise client or complete feature-for-feature clone. Payments are recorded, not processed. Receipt attachments are links, not file uploads. Weekly/monthly repeat reminders let you explicitly create the next expense; they do not run scheduled charges. The activity view shows current records and their latest edits, not an immutable audit log. JSON export is a backup download, not an import/restore feature. Live sync requires a connection; there is no offline write queue. No foreign-exchange service, banking integration, push/email reminders, or OCR is included. Real Google login and cross-account sharing must be tested after Firebase is configured; local workspace testing cannot validate your cloud configuration.

Reference: [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy).
