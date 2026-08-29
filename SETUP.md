# Kompro — Setup & Deployment Guide

Kompro is a self-hosted, single-tenant compliance management platform. This
repository is a small monorepo:

```
kompro/
├── backend/        Express + Prisma + PostgreSQL API (listens on :5000)
├── frontend/       React + Vite single-page app (builds to frontend/dist)
├── vercel.json     Vercel config for deploying the frontend (see §8)
├── package.json    Root scripts that orchestrate backend + frontend
└── SETUP.md        (this file)
```

- The API is served under `/api`.
- Authentication uses a signed session JWT stored in an `httpOnly` cookie
  (`token`). There is no root `.env` — **configuration lives in each
  component's own directory** (`backend/.env` and `frontend/.env`), which is
  the layout assumed throughout this guide.

Repository: <https://github.com/KingDavidJnr/kompro>

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js 18+** | Backend uses `node --watch` (18.11+) and Prisma 5. Frontend uses Vite 5 (needs 18+). Node 20 LTS recommended. |
| **PostgreSQL 14+** | Any managed Postgres (Supabase, Neon, Render Postgres, AWS RDS, Azure) or a local install. |
| **Build toolchain** (Linux) | `bcrypt` ships prebuilt binaries for common platforms; if `npm install` fails on a build step, install `build-essential`/`python3` (Debian/Ubuntu) or Xcode CLT (macOS). |
| **SMTP server** (optional) | Needed to send user invitations/emails. Leave `SMTP_HOST` empty to disable email. |
| **S3-compatible storage** (optional) | Needed only if you want evidence files in object storage instead of local disk. |

---

## 2. Environment variables

There are **two separate env files**, one per component. Copy each
`.env.example` to `.env` and edit.

### 2.1 `backend/.env` (read by the API from the `backend/` directory)

> `backend/src/config.js` loads variables via `dotenv` and exposes them. All
> values below are read at startup.

| Variable | Default | Purpose / Notes |
| --- | --- | --- |
| `DATABASE_URL` | – | **Pooled** Postgres connection used by the app at runtime. On managed Postgres (Supabase/Neon) use the transaction-pooler URL (usually port `6543`, `?pgbouncer=true`). |
| `DIRECT_URL` | – | **Direct, non-pooled** Postgres connection used by Prisma for migrations/schema pushes (port `5432`). Must **not** be the PgBouncer pooler or migrations hang. |
| `JWT_SECRET` | – | Long random string used to sign session JWTs (**HS256**). **Required in production.** |
| `JWT_TTL` | `2h` | Access-token expiry (e.g. `2h`, `30m`). |
| `BACKEND_PORT` | `5000` | Port the Express server binds. |
| `NODE_ENV` | `development` | Set to `production` in any deployed environment (enables secure cookies, production logging). |
| `SESSION_TTL_DAYS` | `30` | Session cookie lifetime in days. |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed browser origins for credentialed API calls. |
| `APP_URL` | `http://localhost:5173` | Public base URL used to build invitation/SSO links (no trailing slash). |
| `INVITE_TTL_HOURS` | `72` | How long an invitation link stays valid. |
| `ORG_NAME` | `My Organization` | Default organization name seeded on first run. |
| `INITIAL_ADMIN_EMAIL` | – | Bootstrap admin email. Used by `npm run seed`. |
| `INITIAL_ADMIN_PASSWORD` | – | Bootstrap admin password. Used by `npm run seed`. |
| `SMTP_HOST` | – | SMTP host. Leave empty to disable email. |
| `SMTP_PORT` | `587` | SMTP port. |
| `SMTP_USER` | – | SMTP username (leave empty if no auth). |
| `SMTP_PASS` | – | SMTP password. |
| `SMTP_SECURE` | `false` | `true` for implicit TLS (usually port 465). |
| `MAIL_FROM` | – | **Required and must match the authenticated SMTP account**, or the SMTP server rejects mail at the transport layer. No fallback by design. |
| `MAIL_FROM_NAME` | `Kompro` | Display name next to `MAIL_FROM`. |
| `UPLOAD_DIR` | `backend/uploads` | Local directory for evidence files when S3 is not configured. |
| `MAX_UPLOAD_MB` | `10` | Max upload size per file (MB). |
| `BODY_LIMIT_MB` | `1` | Max JSON request body size (MB). |
| `AUDIT_RETENTION_DAYS` | `365` | Audit-log retention before purge (`npm run audit:purge`). |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_ENDPOINT` | – | Set `S3_BUCKET` + `S3_REGION` to store evidence in S3-compatible storage (AWS S3, MinIO, etc.). Leave empty for local disk. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | – | Google SSO (leave blank to disable). |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT` | `common` | Microsoft Entra SSO (leave blank to disable). |
| `SSO_AUTO_PROVISION` | `true` | Auto-create a user on first SSO sign-in (`false` = link to pre-existing email only). |
| `SSO_REDIRECT_BASE` | – | Optional explicit SSO callback base URL. When empty, the callback is derived from the incoming request host (recommended for same-origin deployments). |

### 2.2 `frontend/.env` (read by Vite from the `frontend/` directory)

> Only variables prefixed with `VITE_` are exposed to the browser bundle.

| Variable | Default | Purpose / Notes |
| --- | --- | --- |
| `VITE_AUTH_TYPE` | `both` | Login screen mode: `password` \| `sso` \| `both`. |
| `VITE_SSO_PROVIDERS` | `google,microsoft,github` | Comma-separated SSO providers to show. (Backend currently supports `google` and `microsoft`.) |
| `VITE_API_URL` | `/api` | API base path. Keep `/api` so the Vite dev proxy **and** a same-origin production build both work. |
| `VITE_BACKEND_URL` | `http://localhost:5000` | Backend URL used **only by the Vite dev proxy** (`/api` → this). Ignored in production builds. |

> **Why two `.env` files and no root `.env`?** Each component is started from
> its own directory (`backend/` and `frontend/`), and `dotenv` / Vite resolve
> `.env` relative to the current working directory. Running the components from
> their own folders means `backend/.env` configures the API and
> `frontend/.env` configures the UI — no root env is needed.

---

## 3. npm scripts — what each one does

### 3.1 Root (`package.json`)

| Script | Command | Role |
| --- | --- | --- |
| `npm run setup` | `npm install --prefix backend && npm install --prefix frontend` | Install dependencies in **both** components. |
| `npm run ci` | `npm ci --prefix backend && npm ci --prefix frontend` | Clean, reproducible install for CI/build agents. |
| `npm run dev` | `concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"` | Run **both** in watch mode for local development. |
| `npm run dev:backend` | `npm run dev --prefix backend` | Run only the API (`node --watch`). |
| `npm run dev:frontend` | `npm run dev --prefix frontend` | Run only the Vite dev server. |
| `npm run build` | `npm run build --prefix frontend` | Build the production frontend bundle into `frontend/dist`. |
| `npm run start` | `concurrently "npm start --prefix backend" "npm start --prefix frontend"` | Run both in production mode (frontend served by `vite preview`). |
| `npm run start:backend` | `npm start --prefix backend` | Run only the API (`node src/index.js`). |
| `npm run start:frontend` | `npm start --prefix frontend` | Serve only the built frontend (`vite preview`). |
| `npm run lint` | `npm run lint --prefix frontend` | Lint the frontend. |

### 3.2 Backend (`backend/package.json`)

| Script | Command | Role |
| --- | --- | --- |
| `npm run dev` | `node --watch src/index.js` | Start the API with auto-restart on file changes. |
| `npm run start` | `node src/index.js` | Start the API (production). |
| `npm run generate` | `prisma generate` | (Re)generate the Prisma Client after schema changes. Runs automatically on `postinstall`. |
| `npm run migrate` | `prisma migrate dev --name init` | Create the **initial** migration and apply it (development). Run once to bootstrap `prisma/migrations`. |
| `npm run migrate:deploy` | `prisma migrate deploy` | Apply pending migrations **without** generating new ones (production). Uses `DATABASE_URL` + `DIRECT_URL`. |
| `npm run seed` | `node prisma/seed.js` | Idempotently create permissions, the default `admin`/`auditor`/`member` roles, the org row, and the bootstrap admin (from `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`). |
| `npm run notify:due` | `node scripts/notify-due.js` | Send due-date reminders (wire to a cron job if needed). |
| `npm run test` | `cross-env NODE_ENV=test ... jest` | Run the Jest test suite. |
| `npm run pretest` | `node prisma/seed.js` | (Auto-runs before `test`) seeds a test database. |
| `postinstall` | `prisma generate` | Ensures the Prisma Client is generated whenever `npm install` runs. |

### 3.3 Frontend (`frontend/package.json`)

| Script | Command | Role |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the Vite dev server (with the `/api` proxy to `VITE_BACKEND_URL`). |
| `npm run build` | `vite build` | Build the optimized SPA into `frontend/dist`. |
| `npm run preview` | `vite preview` | Serve the built `dist` locally for testing. |

---

## 4. Local development (everything on one machine)

```bash
# 1. Clone
git clone https://github.com/KingDavidJnr/kompro.git
cd kompro

# 2. Install dependencies (backend + frontend)
npm run setup

# 3. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
#   - edit backend/.env: set DATABASE_URL + DIRECT_URL to your local Postgres,
#     set a strong JWT_SECRET, and set INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD.
#   - frontend/.env can keep the defaults for local dev.

# 4. Create the schema + seed
cd backend
npx prisma db push          # quickest: pushes schema, no migration history
#   OR, to use tracked migrations:  npm run migrate   (creates prisma/migrations)
npm run seed                # creates org, roles, and the bootstrap admin
cd ..

# 5. Run both (API on :5000, UI on :5173)
npm run dev
```

Open <http://localhost:5173> and sign in with the `INITIAL_ADMIN_EMAIL` /
`INITIAL_ADMIN_PASSWORD` you set.

> After logging in, go to **Frameworks → Seed catalog** to populate the
> standard SOC 2 / ISO 27001 / GDPR requirement catalogs.

---

## 5. Production — single Linux machine (simplest)

Run the database, API, and static UI on one host (e.g. a $5 VPS). Use nginx as a
reverse proxy so the UI and API share one domain (avoids cross-origin cookie
issues — see §7).

### 5.1 Database
Use a local PostgreSQL, or point `DATABASE_URL`/`DIRECT_URL` at an external
managed Postgres.

### 5.2 API
```bash
cd /opt/kompro/backend
npm ci                      # install + prisma generate (postinstall)
npm run migrate:deploy      # apply migrations (or: npx prisma db push)
npm run seed                # bootstrap org/roles/admin (first time only)
```
Create `backend/.env` with production values:
```
NODE_ENV=production
JWT_SECRET=<long-random>
DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/kompro
DIRECT_URL=postgresql://<user>:<pass>@localhost:5432/kompro
CORS_ORIGIN=https://kompro.example.com
APP_URL=https://kompro.example.com
SMTP_HOST=...
MAIL_FROM=no-reply@kompro.example.com
```
Run the API under a process manager (pm2 or systemd) on port `5000`:
```bash
pm2 start "node src/index.js" --name kompro-api
```

### 5.3 Frontend (static)
```bash
cd /opt/kompro/frontend
npm ci
npm run build               # outputs frontend/dist
```
Serve `frontend/dist` with nginx and proxy `/api` to the API. Example nginx
server block:

```nginx
server {
  listen 443 ssl;
  server_name kompro.example.com;

  # Static SPA
  root /opt/kompro/frontend/dist;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;   # SPA fallback for client routing
  }

  # API reverse proxy (same origin → cookies work with sameSite: 'lax')
  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Set `frontend/.env` for the build:
```
VITE_API_URL=/api
```
(rebuild after changing env: `npm run build`). Because the UI and API share
`kompro.example.com`, the session cookie is **first-party** and works with the
default `sameSite: 'lax'`.

---

## 6. Production — split (Backend on Render, Frontend on Vercel, DB elsewhere)

This is the "best of both worlds" path: managed DB (Supabase/Neon), API on
Render, UI on Vercel.

### 6.1 Database (Supabase / Neon)
Create a project and copy **two** connection strings:
- **Pooled / transaction** URL → `DATABASE_URL` (port `6543`, `?pgbouncer=true`).
- **Direct / session** URL → `DIRECT_URL` (port `5432`, **no** PgBouncer).

### 6.2 Backend on Render
1. New **Web Service**, connect the repo, set **Root Directory** = `backend`.
2. **Build Command:** `npm install` (the `postinstall` step runs `prisma generate`).
3. **Start Command:** `node src/index.js`.
4. **Health Check Path:** `/health` (also `/api/health`).
5. Add environment variables (same as §5.2) including:
   - `DATABASE_URL` = pooled URL
   - `DIRECT_URL` = direct URL
   - `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`
   - `CORS_ORIGIN` = your Vercel URL, e.g. `https://kompro.vercel.app`
   - `APP_URL` = your Vercel URL
6. Deploy. Note the backend URL, e.g. `https://kompro-api.onrender.com`.

### 6.3 Frontend on Vercel
1. Import the repo. The included `vercel.json` already:
   - builds from `frontend/` → `frontend/dist`,
   - rewrites `/api/*` to `${BACKEND_URL}/api/*`,
   - adds an SPA fallback to `index.html`.
2. **Add the Vercel project environment variable** `BACKEND_URL` =
   `https://kompro-api.onrender.com` (your Render backend, **no trailing
   slash**). This drives the `/api` proxy rewrite.
3. `frontend/.env` (Vercel project env) — leave `VITE_API_URL=/api` (default).

**Why this works without code changes:** the browser only ever talks to the
Vercel domain. Vercel proxies `/api/*` to Render *server-side*, and the
Set-Cookie comes back on the Vercel domain → the session cookie is
**first-party**, so the default `sameSite: 'lax'` works fine.

> If instead you point the frontend **directly** at the Render backend
> (e.g. `VITE_API_URL=https://kompro-api.onrender.com/api`), the cookie becomes
> **cross-site** and `sameSite: 'lax'` blocks it. Either keep the Vercel proxy
> (recommended) or apply the §7 patch.

### 6.4 Seed frameworks
After both are live, log in at the Vercel URL as admin and click
**Frameworks → Seed catalog**.

---

## 7. Cross-origin cookie nuance (read this if splitting hosts)

Kompro authenticates with an `httpOnly` session cookie. In
`backend/src/modules/auth/auth.controller.js`, `cookieOptions()` currently sets:

```js
httpOnly: true,
secure: config.nodeEnv === 'production',   // true on HTTPS
sameSite: 'lax',                            // <-- hardcoded
```

- `sameSite: 'lax'` cookies are sent for **same-site** requests (same
  registrable domain, including subdomains) but are **not** sent on
  cross-site `fetch`/XHR.
- The cookie is **only** set when `secure` is true, which happens automatically
  in `production` (HTTPS).

**Recommended (no code change):** ensure the UI and API are effectively
same-site:
- Vercel + Render behind **your own domain** as subdomains
  (`app.yourdomain.com` and `api.yourdomain.com`) → same-site → `lax` works.
- Or use the Vercel `/api` proxy rewrite (§6.3) so the browser only sees one
  origin.

**If you must call the backend from a different domain directly** (truly
cross-site, e.g. `*.vercel.app` ↔ `*.onrender.com`), patch the cookie to allow
cross-site credentialed requests:

```js
// backend/src/modules/auth/auth.controller.js
function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,                       // HTTPS required
    sameSite: 'none',                   // allow cross-site
    maxAge: config.sessionTtlMs,
  };
}
```
`sameSite: 'none'` **requires** `secure: true` and a TLS connection on both
ends. Also make sure `CORS_ORIGIN` lists the frontend origin and the API is
served over HTTPS.

---

## 8. Evidence file storage

- **Local disk (default):** files are saved under `UPLOAD_DIR` (default
  `backend/uploads`). Simple, no extra setup. Back these up if the server is
  ephemeral (e.g. Render free tier wipes disks).
- **S3-compatible:** set `S3_BUCKET` + `S3_REGION` (and credentials/endpoint if
  not AWS) to store evidence in object storage. Recommended for ephemeral or
  scaled deployments.

---

## 9. Post-deployment checklist

1. Log in as the bootstrap admin.
2. **Frameworks → Seed catalog** to load SOC 2 / ISO 27001 / GDPR.
3. **Organization** settings → set your real org name.
4. Configure **SMTP** (test by inviting a user) — or note email is disabled.
5. (Optional) Configure **SSO** via Google/Microsoft env vars.
6. Create **Roles** / **Users** as needed; invite teammates.

---

## 10. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `prisma migrate deploy` hangs or fails | You used the **pooled** URL for migrations. Set `DIRECT_URL` to the **direct** (port `5432`, no PgBouncer) connection. |
| Logged in but immediately logged out / 401 on every call | Session cookie not sent. Cross-site cookie blocked (see §7) — use same-site domains or the Vercel proxy, or patch `sameSite`. |
| Emails not sending / "transport auth failed" | `MAIL_FROM` doesn't match the authenticated SMTP account, or `SMTP_HOST` is empty (email disabled). |
| `npm install` fails on a native build | Install the OS build toolchain (`build-essential`, `python3`) and retry. |
| Login rate-limited during testing | The API rate-limits login to 5 attempts / 15 min per email (in-memory). Restart the API to reset during dev/testing. |
| Frontend can't reach API in dev | Ensure `VITE_BACKEND_URL` points at the running API and the Vite dev server is up (it proxies `/api`). |
| `404` on deep links after deploy | SPA fallback missing. On Vercel the `vercel.json` rewrite handles it; on nginx use `try_files $uri /index.html`. |

---

## 11. Quick reference

```bash
# Dev (one machine)
npm run setup
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
cd backend && npx prisma db push && npm run seed && cd ..
npm run dev

# Backend only
cd backend && npm run dev            # or: npm start (production)

# Frontend only
cd frontend && npm run dev           # or: npm run build && npm run preview

# Production backend (migrations + seed)
cd backend && npm run migrate:deploy && npm run seed
```
