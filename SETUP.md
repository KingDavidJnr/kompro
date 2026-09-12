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
| `DIRECT_URL` | – | **Direct, non-pooled** Postgres connection used by Prisma for migrations (port `5432`). Must **not** be the PgBouncer pooler or migrations hang. |
| `JWT_SECRET` | – | Long random string used to sign session JWTs (**HS256**). **Required in production.** |
| `JWT_TTL` | `2h` | Access-token expiry (e.g. `2h`, `30m`). |
| `BACKEND_PORT` | `5000` | Port the Express server binds. |
| `NODE_ENV` | `development` | Set to `production` in any deployed environment (enables secure cookies, production logging). |
| `SESSION_TTL_DAYS` | `30` | Session cookie lifetime in days. |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated list of allowed browser origins for credentialed API calls. |
| `APP_URL` | `http://localhost:5173` | Public base URL used to build invitation/SSO links (no trailing slash). |
| `COOKIE_SAME_SITE` | `lax` | `sameSite` attribute for the session cookie. Use `lax` when the frontend and backend share the same domain or are behind a proxy on one domain. Use `none` when they are on **separate domains** — `none` requires HTTPS on both ends. |
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
| `VITE_API_URL` | `/api` | Base URL for all API calls. Use `/api` for same-origin or proxied deployments. Set to the full backend URL (e.g. `https://api.example.com/api`) when the frontend and backend are on separate domains. |
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
| `npm run migrate` | `prisma migrate dev --name init` | One-time bootstrap that creates the **initial** migration. Normal use applies the committed migrations with `migrate:deploy`; create new migrations with `npx prisma migrate dev`. |
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
npm run migrate:deploy       # apply the committed migrations (creates all tables)
#   For NEW schema changes during development, generate a migration with:
#   npx prisma migrate dev    (prompts for a name, then applies it)
#   If the database already has tables from an earlier `db push`, baseline it
#   (mark the initial migration applied) before running migrate:deploy.
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
npm run migrate:deploy      # apply the committed migrations
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

### 6.3 Frontend on Vercel (or any static host)

Vercel serves the built frontend only. All API calls go directly from the
browser to wherever the backend is hosted — there is no proxy involved.

1. Import the repo. `vercel.json` builds from `frontend/` and serves
   `frontend/dist` with an SPA fallback to `index.html`.
2. Set these Vercel project environment variables:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | Full backend URL e.g. `https://api.example.com/api` |
   | `VITE_AUTH_TYPE` | `both` (or `password` / `sso`) |
   | `VITE_SSO_PROVIDERS` | `google,microsoft` |

3. Set the corresponding backend env vars:

   ```
   CORS_ORIGIN=https://your-frontend-domain.com
   APP_URL=https://your-frontend-domain.com
   COOKIE_SAME_SITE=none
   SSO_REDIRECT_BASE=https://api.example.com
   ```

   `COOKIE_SAME_SITE=none` is required because the browser is calling the
   backend from a different origin. This forces `secure: true` on the cookie
   automatically — HTTPS is required on both ends.

4. Register the SSO callback URI in your OAuth console as
   `https://api.example.com/api/auth/<provider>/callback` (see §8).

### 6.4 Seed frameworks
After both are live, log in at the frontend URL as admin and click
**Frameworks → Seed catalog**.

---

## 7. Cross-origin cookie nuance (read this if splitting hosts)

Kompro authenticates with an `httpOnly` session cookie. The `sameSite`
attribute is controlled by the `COOKIE_SAME_SITE` env var (default `lax`).

| Setup | `COOKIE_SAME_SITE` | Why |
| --- | --- | --- |
| Frontend and backend on the same domain / behind a single reverse proxy | `lax` (default) | Browser sees one origin — cookie is first-party |
| Frontend and backend on different domains (e.g. Vercel + any backend host) | `none` | Browser makes cross-origin requests — `lax` blocks the cookie |

`sameSite: 'none'` **requires** `secure: true` and HTTPS on both ends. The
backend enforces this automatically when `COOKIE_SAME_SITE=none` is set.

Also ensure `CORS_ORIGIN` lists the exact frontend origin (no trailing slash)
so the browser's preflight requests are accepted.

---

## 8. SSO provider setup (Google & Microsoft)

SSO is disabled by default. To enable a provider, create an OAuth 2.0 app in
that provider's console, paste the credentials into `backend/.env`, and
register the correct **redirect / callback URI**. Getting the URI wrong is the
most common SSO setup mistake — the provider will reject the callback with an
`redirect_uri_mismatch` error.

### 8.1 What the callback URI looks like

The callback path is always:

```
<base>/api/auth/<provider>/callback
```

Where `<base>` is determined by your deployment:

| Deployment | `<base>` | Example callback URI |
| --- | --- | --- |
| Same-origin (nginx, single domain) | your domain | `https://kompro.example.com/api/auth/google/callback` |
| Vercel frontend + separate backend | **backend** URL | `https://api.example.com/api/auth/google/callback` |
| Local development | `http://localhost:5000` | `http://localhost:5000/api/auth/google/callback` |

> The callback always goes to the **backend**, never the frontend. On a
> Vercel + separate backend setup, do not use your Vercel domain here — use
> your backend domain and set `SSO_REDIRECT_BASE` accordingly (see §2.1).

---

### 8.2 Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorised redirect URIs** add:
   ```
   https://<your-backend-domain>/api/auth/google/callback
   ```
   For local dev also add:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
4. Copy the **Client ID** and **Client secret** into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=<client-id>
   GOOGLE_CLIENT_SECRET=<client-secret>
   ```
5. Make sure the **OAuth consent screen** is configured (app name, support
   email, scopes: `openid`, `email`, `profile`) and set to the correct
   publishing status (Internal for a corporate workspace, External + test users
   or verified for public).

---

### 8.3 Microsoft (Entra / Azure AD)

1. Go to [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** →
   **App registrations** → **New registration**.
2. **Supported account types:**
   - *Accounts in this organizational directory only* — single-tenant (set
     `MICROSOFT_TENANT` to your tenant ID).
   - *Accounts in any organizational directory* — multi-tenant (keep
     `MICROSOFT_TENANT=common`).
   - *Accounts in any organizational directory and personal Microsoft accounts*
     — multi-tenant + personal (keep `MICROSOFT_TENANT=common`).
3. **Redirect URI** — select **Web** and enter:
   ```
   https://<your-backend-domain>/api/auth/microsoft/callback
   ```
   For local dev also add:
   ```
   http://localhost:5000/api/auth/microsoft/callback
   ```
4. After creating the app, go to **Certificates & secrets** → **New client
   secret**. Copy the secret value immediately (it is only shown once).
5. Copy credentials into `backend/.env`:
   ```
   MICROSOFT_CLIENT_ID=<application-id>
   MICROSOFT_CLIENT_SECRET=<client-secret-value>
   MICROSOFT_TENANT=common          # or your tenant ID
   ```

---

### 8.4 `SSO_REDIRECT_BASE` — when to set it

| Situation | Set `SSO_REDIRECT_BASE`? | Value |
| --- | --- | --- |
| Single domain (nginx proxy, frontend + backend on same host) | No — leave empty | |
| Vercel proxy (`VITE_API_URL=/api`, browser never hits backend directly) | No — leave empty | |
| Custom domain split (`app.x.com` frontend, `api.x.com` backend) | **Yes** | `https://api.x.com` |
| Backend behind a reverse proxy that rewrites the `Host` header | **Yes** | public backend URL |

When `SSO_REDIRECT_BASE` is empty the callback URI is derived from the
incoming request's host header, which works correctly when the OAuth redirect
lands on the same host Node.js sees. It breaks when a proxy changes the host,
or when the frontend and backend are on separate domains.

---

## 9. Evidence file storage (local disk vs S3)

- **Local disk (default):** files are saved under `UPLOAD_DIR` (default
  `backend/uploads`). Simple, no extra setup. Back these up if the server is
  ephemeral (e.g. Render free tier wipes disks).
- **S3-compatible:** set `S3_BUCKET` + `S3_REGION` (and credentials/endpoint if
  not AWS) to store evidence in object storage. Recommended for ephemeral or
  scaled deployments.

### 8.1 Local disk: directory permissions (Linux / other POSIX hosts)

When using local disk, the **OS user that runs the Node process** must be able
to create files and directories under `UPLOAD_DIR`. The app calls
`mkdir(recursive: true)` on startup, but that only succeeds if the process can
already write to the parent path, and uploads will fail at write time
(`EACCES` / permission denied) if it cannot.

This matters most when:

- you point `UPLOAD_DIR` at a directory **outside** the backend folder
  (for example `UPLOAD_DIR=/var/lib/kompro/uploads`),
- you run the API as a dedicated, unprivileged system user (recommended) but
  the directory is owned by `root` or another user, or
- the directory lives on a mounted volume with restrictive options.

Steps:

1. **Create the directory** if it does not exist:
   ```bash
   sudo mkdir -p /var/lib/kompro/uploads
   ```
2. **Make the app user the owner** of that directory and its contents:
   ```bash
   sudo chown -R kompro:kompro /var/lib/kompro/uploads
   ```
   Replace `kompro` with the actual user that runs `node src/index.js`
   (the systemd or pm2 user, or `node` / `www-data` depending on your setup).
3. **Restrict permissions** so only that user can read and write the evidence
   (evidence files may contain sensitive compliance data):
   ```bash
   sudo chmod 750 /var/lib/kompro/uploads
   # recursively, in case files already exist:
   sudo chmod -R u+rwX,go-rwx /var/lib/kompro/uploads
   ```
   `750` means owner read/write/execute, group read/execute, others none.
   Use `700` if no other local user needs access.
4. **If you run under systemd**, make sure the service runs as that same user
   (the directory owner). Example `/etc/systemd/system/kompro-api.service`:
   ```ini
   [Service]
   User=kompro
   Group=kompro
   ```
   Then `sudo systemctl daemon-reload && sudo systemctl restart kompro-api`
   and re-check the ownership from step 2.
5. **Mounted volumes:** if `UPLOAD_DIR` is on a separate mount, ensure it is
   mounted read-write (not `ro`) and does not strip ownership. A vfat/ntfs
   mount maps every file to a single UID, so set its `uid` / `gid` mount
   options to the app user.
6. **SELinux (RHEL / CentOS / Fedora):** if SELinux is enforcing and you place
   uploads outside the default paths, the kernel may still deny writes. Either
   label the directory writable, for example
   `sudo semanage fcontext -a -t httpd_sys_rw_content_t "/var/lib/kompro/uploads(/.*)?" && sudo restorecon -Rv /var/lib/kompro/uploads`,
   or run the API in a context already permitted to write there.

**macOS / Windows:** the user that starts the process normally owns its own
directories, so permissions are rarely a problem. On Windows, make sure the
folder is not marked read-only and that the service account (if running as a
service) has modify rights.

**Verify:** after starting the API, upload a small evidence file from the UI.
If it fails, check the API logs for `EACCES` and confirm the owner and
permissions above match the process user:

```bash
ps -o user= -p "$(pgrep -f 'node src/index.js')"
```

---

## 10. Post-deployment checklist

1. Log in as the bootstrap admin.
2. **Frameworks → Seed catalog** to load SOC 2 / ISO 27001 / GDPR.
3. **Organization** settings → set your real org name.
4. Configure **SMTP** (test by inviting a user) — or note email is disabled.
5. (Optional) Configure **SSO** — follow §8 to create the OAuth app and register the redirect URI.
6. Create **Roles** / **Users** as needed; invite teammates.

---

## 11. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `prisma migrate deploy` hangs or fails | You used the **pooled** URL for migrations. Set `DIRECT_URL` to the **direct** (port `5432`, no PgBouncer) connection. |
| Logged in but immediately logged out / 401 on every call | Session cookie not sent. Cross-site cookie blocked (see §7) — use same-site domains or the Vercel proxy, or patch `sameSite`. |
| Emails not sending / "transport auth failed" | `MAIL_FROM` doesn't match the authenticated SMTP account, or `SMTP_HOST` is empty (email disabled). |
| `npm install` fails on a native build | Install the OS build toolchain (`build-essential`, `python3`) and retry. |
| Login rate-limited during testing | The API rate-limits login to 5 attempts / 15 min per email (in-memory). Restart the API to reset during dev/testing. |
| Frontend can't reach API in dev | Ensure `VITE_BACKEND_URL` points at the running API and the Vite dev server is up (it proxies `/api`). |
| Vercel deploy: API calls return 404 or 405 | The rewrite destination in `vercel.json` is wrong or still uses the old `${BACKEND_URL}` placeholder (env var interpolation is not supported in `vercel.json`). Hardcode the backend URL directly in the rewrite destination. |
| Custom domain split (e.g. `app.x.com` + `api.x.com`): login works but session lost on next request | `VITE_API_URL` was set to the API domain directly instead of `/api`. Keep `VITE_API_URL=/api` and let the Vercel proxy forward requests — see §6.3 Option B. |
| SSO callback fails on custom domain split | `SSO_REDIRECT_BASE` is not set or points at the frontend. Set it to the **backend** base URL (e.g. `https://api.example.com`) and register `https://api.example.com/api/auth/<provider>/callback` in your OAuth app console. |
| `404` on deep links after deploy | SPA fallback missing. On Vercel the `vercel.json` rewrite handles it; on nginx use `try_files $uri /index.html`. |
| Evidence upload fails / 500 on upload, logs show `EACCES` | The Node process user cannot write to `UPLOAD_DIR`. Create the directory and fix ownership/permissions per §8.1 (the process user must own it). |

---

## 11. Quick reference

```bash
# Dev (one machine)
npm run setup
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
cd backend && npm run migrate:deploy && npm run seed && cd ..
npm run dev

# Backend only
cd backend && npm run dev            # or: npm start (production)

# Frontend only
cd frontend && npm run dev           # or: npm run build && npm run preview

# Production backend (migrations + seed)
cd backend && npm run migrate:deploy && npm run seed
```
