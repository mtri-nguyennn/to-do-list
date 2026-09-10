# Coursework

A personal, password-protected workspace for class checklists. Create courses (BUS 1299, for example), add subtasks with optional due dates, check them off, rename items, and delete them. Course deletion also deletes its subtasks. Layout adapts to phones and desktops.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Local development automatically initializes SQLite at `.data/coursework.sqlite`. Your records persist across restarts. Local mode has no password and binds only to localhost. Never upload `.data` or `.env` to GitHub. Stop the server before copying the SQLite file for backup.

## Vercel app + Render database

1. Push this repository to your GitHub account.
2. Create a PostgreSQL database on Render. Select a persistent plan appropriate for your needs; Render's free databases expire after 30 days. Keep database backups enabled where supported.
3. Import the repository in Vercel. Select **Other** for the framework; the included `vercel.json` sets build command `npm run build` and output directory `dist`. Select Node.js 22.x or newer.
4. Add these server-side environment variables in Vercel:
   - `DATABASE_URL`: Render's **external** PostgreSQL connection URL. Append `?sslmode=require` (or `&sslmode=require` if it already has query parameters).
   - `APP_PASSWORD`: your long, unique workspace password.
   - `SESSION_SECRET`: a separate random secret of at least 32 characters. Generate one with `openssl rand -hex 32`.
5. Deploy and open your Vercel URL. Enter your workspace password. Database tables initialize automatically on the first authenticated request. Render database networking must allow connections from your Vercel service.

Vercel serves both the interface and API; Render stores your data. No cross-origin cookies or additional backend service are needed. Environment variables must never be prefixed with a public/client prefix. Redeploy after changing Vercel environment variables. Use separate databases for previews if you do not want preview edits affecting production.

## Host the whole app on Render instead

Use **New → Blueprint** in Render and connect this repository. `render.yaml` provisions the Node web service and PostgreSQL database. Review Render's charges before approving provisioning. Set `APP_PASSWORD` when prompted; Render generates the session secret and supplies the internal database URL. Open the resulting `onrender.com` address.

For manual setup: create a Node web service, set build command `npm ci && npm run build`, start command `npm start`, and set `NODE_ENV=production`, `DATABASE_URL`, `APP_PASSWORD`, and `SESSION_SECRET`. The server listens on Render's `PORT` at `0.0.0.0`. Use the internal PostgreSQL URL for a Render app in the same region.

## Data and access

This is a single personal workspace, not separate accounts for multiple students. Anyone with the password accesses the same courses. Hosted access uses a signed, HttpOnly, Secure, SameSite cookie that expires after seven days. Production refuses to run without password/secret configuration and never falls back to ephemeral SQLite. Queries are parameterized. Submissions show errors when saving fails; data is only displayed as saved after the server accepts it. Back up the production database through your database provider. Existing Cloudflare D1 configuration remains supported by the original database adapter, but PostgreSQL is the documented deployment path.

## Checks

```sh
npm run build
npm test
```

Tests exercise actual SQLite CRUD, validation, cascading deletion, and hosted authentication. Production PostgreSQL connectivity must be verified after setting your deployment credentials.

Official deployment references: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Render PostgreSQL connections](https://render.com/docs/postgresql-creating-connecting), [Render web services](https://render.com/docs/web-services).
