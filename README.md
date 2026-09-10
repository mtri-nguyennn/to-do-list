# Coursework

Course checklists with editable deadlines and private, verified email accounts. Vercel hosts the website; Firebase Authentication handles sign-up, email verification and password resets; Cloud Firestore stores each user's courses and tasks.

## Deploy: Firebase + Vercel

### 1. Create a free Firebase project

1. Open https://console.firebase.google.com and create a project named `coursework` (the project ID must be unique).
2. Keep the **Spark (no-cost)** plan. Google Analytics is optional and not used by this app. No billing account, Cloud Functions, or paid Firebase App Hosting is needed.
3. In **Project settings → General → Your apps**, register a **Web app** (`</>`). Name it Coursework. You do not need Firebase Hosting.
4. Copy the four web configuration fields `apiKey`, `authDomain`, `projectId`, and `appId` for step 4 below. These are public client identifiers. Never add a service-account private key to the app.

### 2. Enable verified email accounts

1. Open **Authentication → Get started → Sign-in method** (it may be grouped under Security in the console).
2. Enable **Email/Password** and save. Leave email-link/passwordless sign-in off; the app uses passwords plus a verification email.
3. Under Authentication settings, configure a **required password policy** of at least **12 characters** to match the sign-up form.
4. Keep email enumeration protection enabled where available.
5. Under **Authentication → Settings → Authorized domains**, add your production Vercel hostname, for example `to-do-list.vercel.app`, without `https://` or a path. Add `localhost` and `127.0.0.1` if you need local development. Add any custom domain you later use.
6. Under **Authentication → Templates**, set the app name to Coursework. Keep Firebase's default hosted email action handler. It handles verification and password reset links. No SMTP account is necessary for these built-in Firebase emails.

Users create an account, open the verification email, then return to the app and click **I've verified my email**. Until verification, the UI and database rules both deny access to course data. Anyone with a verified email can use the app; there is no university-domain restriction.

### 3. Create Firestore and publish the access rules

1. Open **Firestore Database → Create database** (may appear under Databases & Storage).
2. Choose **Standard edition**, the `(default)` database, and a region near your users. Use **Production mode**.
3. Open its **Rules** tab.
4. Replace the editor contents with the entire contents of `firestore.rules` in this repository.
5. Click **Publish**. This step is required before sharing the app. Do not use test mode or an `allow read, write: if true` rule.

Alternatively, after installing dependencies and signing into the Firebase CLI:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

The database stores `users/{uid}/courses/{courseId}` and `users/{uid}/tasks/{taskId}`. Rules require a verified Firebase token whose UID matches the path. They also validate document fields and prevent tasks from referencing another user's courses. No initial collections or SQL tables need to be created manually.

### 4. Configure Vercel

Push the updated project to GitHub, then open your project in Vercel (or import the repository for a new project).

Use:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Root directory | Directory containing `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22.x or 24.x |

Add these environment variables under **Settings → Environment Variables**, selecting Production:

| Vercel name | Firebase web config field |
| --- | --- |
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_APP_ID` | `appId` |

These public settings are compiled into the browser bundle. Security comes from Firebase Authentication and Firestore Rules, not from concealing the web API key. Never upload Firebase admin keys. If you enable Vercel Preview builds, supply a separate test project's config and rules to avoid preview edits affecting real users.

Remove the previous `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET` and any Cloudflare database credentials from this Vercel project. The old shared API now returns HTTP 410 and cannot access old records.

Deploy/redeploy after saving the variables. A Vercel build fails if any required Firebase setting is missing. After deployment, add its exact hostname to Firebase Authorized domains as described above.

### 5. Check before sharing

1. Register with an email address you control. Verify that the app asks for email verification.
2. Open the email link; return and click **I've verified my email**.
3. Create BUS 1299 and a task. Set a deadline, edit it, clear it, and mark the task complete.
4. Refresh, sign out, and sign in. Confirm your data remains.
5. Register and verify a second account. Confirm its list starts empty and does not show the first account's courses.
6. Test **Forgot password?**. Check inbox and spam folders; school filters can delay delivery.
7. Share the production Vercel URL once these checks pass.

Real inbox delivery and production connectivity must be checked against your configured project; automated tests use local emulators and do not send real email.

## Free plan limits

Firebase Spark is a no-cost plan, not a 30-day database trial. It is quota-limited, not unlimited hosting. As checked September 10, 2026:

- Firestore: 1 GiB stored data, 50,000 document reads/day, 20,000 writes/day and 20,000 deletes/day, with a free outbound transfer allowance.
- Authentication: 1,000 verification emails/day and 150 password-reset emails/day. New accounts are limited to 100/hour per IP address; this is relevant when students share campus Wi-Fi. Firebase supports requesting a temporary signup-limit increase.
- If Firebase Authentication with Identity Platform is enabled, its Spark daily-active-user limits also apply. Monitor the project usage dashboard before a building-wide rollout.

This app loads records when entering the workspace, refreshing or saving; it does not keep a continuous database listener. Sessions last for the browser tab session, and lists are not persisted in browser storage. Keep the Spark plan if you want a hard no-billing setup; requests may fail when quotas are exhausted. Read the current limits before launch because provider policies can change.

Sources: [Firebase plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [Authentication limits](https://firebase.google.com/docs/auth/limits), [Email verification](https://firebase.google.com/docs/auth/web/manage-users).

## Existing data

The new system starts with private empty accounts. Existing Render/PostgreSQL or local SQLite records are not automatically assigned to any new user. Keep/export your old database before shutting it down, then recreate or explicitly migrate your own records into your verified account. Never expose the old shared dataset to all new accounts. The old database adapter and SQL schema remain only as migration references; the deployed API cannot call them. The former Render blueprint is retired.

## Local development

Use Node.js 22.x or 24.x:

```sh
npm ci
cp .env.example .env
```

Fill in `.env` with a development Firebase project's four web configuration fields, publish the same Firestore rules to that project, then:

```sh
npm run dev
```

Open http://127.0.0.1:3000. Restart the server after editing JavaScript. Without Firebase configuration, the preview shows a setup notice and cannot create accounts or save records. There is deliberately no shared-password or anonymous local database fallback.

## Tests

```sh
npm run build
npm test
npm run test:rules
```

The rules/auth suite requires Java 21 or newer. It starts local Firebase emulators using a `demo-` project and tests verified-owner CRUD, denial of cross-account and unverified access, invalid records, deletion races, sign-up, verification, password reset, sign-out and returning-account persistence. It does not connect to production or send real email.

Source code is in `src/`; `dist/app.js` is generated by the build. HTML and CSS are authored in `dist/`. Vercel builds from source each deployment.
