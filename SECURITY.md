# Kompro Security Guide

This document is a **deployment security checklist and hardening guide** for
teams self-hosting Kompro. It complements [`SETUP.md`](./SETUP.md), which covers
*how* to deploy; this file covers *how to deploy securely*.

Kompro is a compliance tool that stores sensitive control, risk, evidence, and
personnel data. A breach of the host compromises your entire compliance
posture, so treat the deployment as a production-grade system from day one.

---

## 1. Security model — what the platform already provides

| Control | Status | Notes |
| --- | --- | --- |
| Password hashing | ✅ bcrypt | Passwords are hashed; never stored in plaintext. |
| Session token | ✅ Signed JWT in `httpOnly` cookie | HS256, signed with `JWT_SECRET`. Not readable by JS. |
| SQL injection | ✅ Prisma parameterized queries | Use the ORM; never build raw SQL with user input. |
| Security headers | ⚠️ `helmet()` baseline | Enabled, but HSTS/CSP are **not** on by default (see §9). |
| CORS | ✅ Allowlist (`CORS_ORIGIN`) | Credentials only allowed from configured origins. |
| Login brute-force | ⚠️ In-memory rate limit | Keyed by email; **per process**, resets on restart (see §10). |
| Input validation | ✅ `express-validator` | Enforced on most write paths. |
| Audit trail | ✅ Audit log | Mutations record actor + before/after (see §12). |

Everything else in this guide is your responsibility as the operator.

---

## 2. Secrets management

**The single most common cause of breaches is leaked or weak secrets.**

- **Never commit real secrets.** `.env` and `.env.*` are git-ignored; only
  `.env.example` files are committed. Confirm your deployment pipeline does
  the same (do not bake secrets into images).
- **Use a secret manager** (Vault, AWS Secrets Manager, GCP Secret Manager,
  Doppler, etc.) or your platform's encrypted env store (Render/Vercel). Inject
  at runtime.
- **Rotate `JWT_SECRET` immediately** on any suspected exposure. Generate a
  strong value:

  ```bash
  openssl rand -base64 48
  ```

- **Critical secrets to protect:**

  | Secret | Risk if leaked |
  | --- | --- |
  | `JWT_SECRET` | Anyone can forge session tokens → full account takeover. |
  | `DATABASE_URL` / `DIRECT_URL` | Full DB read/write; exfiltration of all data. |
  | `SMTP_PASS` | Mail relay abuse / phishing from your domain. |
  | `S3_SECRET_ACCESS_KEY` | Evidence bucket read/write. |
  | `GOOGLE_*` / `MICROSOFT_*` client secrets | SSO abuse. |
  | `INITIAL_ADMIN_PASSWORD` | Bootstrap admin takeover. |

- **Don't reuse passwords** across SMTP, DB, and OS accounts.
- **Scrub secrets from logs.** Ensure your logging layer redacts
  `Authorization`, cookies, and connection strings.

---

## 3. Transport security (TLS)

The session cookie is only marked `secure` when `NODE_ENV=production`, so
**HTTPS is mandatory in any real deployment** — without it the token can
traverse the network in cleartext.

- Terminate TLS at your reverse proxy / load balancer (nginx, Caddy, ALB,
  Vercel, Render) with a valid certificate (Let's Encrypt / ACME is fine).
- Forward the original protocol: `proxy_set_header X-Forwarded-Proto $scheme;`
  so the app knows the request is secure.
- **Redirect all HTTP → HTTPS.**
- Enable **HSTS** (see §9) and OCSP stapling.
- Disable old protocols (TLS 1.0/1.1) and weak ciphers.

---

## 4. Cookie & session security

`backend/src/modules/auth/auth.controller.js` issues the session cookie with:

```js
httpOnly: true,
secure: config.nodeEnv === 'production',
sameSite: 'lax',
```

- `httpOnly` prevents JavaScript from reading the token (mitigates XSS token
  theft). Keep it.
- `secure` is automatically `true` in production — never run the API over plain
  HTTP in production or the cookie won't be protected.
- **Same-site nuance:** `sameSite: 'lax'` blocks the cookie on *cross-site*
  requests. If you split the UI and API across different registrable domains
  (e.g. `*.vercel.app` ↔ `*.onrender.com`), authentication will silently fail.
  Either (a) keep both on **same-site subdomains** of your own domain, (b) proxy
  `/api` through the UI's origin (the Vercel rewrite in `SETUP.md §6.3`), or
  (c) patch `sameSite: 'none'` **with** `secure: true` plus TLS on both ends.
  See [`SETUP.md §7`](./SETUP.md).
- **Use a strong, unique `JWT_SECRET`** (§2) and keep `JWT_TTL` short (default
  `2h`). Rotate the secret to invalidate all existing sessions.
- After first login, **change the bootstrap admin password** and consider
  rotating `INITIAL_ADMIN_PASSWORD` / removing it from the environment.
- Ensure logout invalidates the session server-side (it does — the Session
  record is deleted on logout). Invalidate all sessions by rotating
  `JWT_SECRET` during an incident.

---

## 5. Authentication, authorization & SSO

- **Change the bootstrap admin credentials immediately** after first deploy.
  The seed creates an admin from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
  only on first run; leaving a weak/known password is the top risk.
- **Apply least privilege.** Kompro uses RBAC (`admin`, `auditor`, `member`)
  with fine-grained permissions. Grant users only the permissions they need;
  reserve `users:*`, `roles:*`, `audit:purge`, and `frameworks:*` for admins.
- **SSO (Google / Microsoft):**
  - Only enable providers you actually use, and **restrict the IdP to your
    organization's verified email domain**.
  - `SSO_AUTO_PROVISION=true` (default) auto-creates a Kompro account for any
    successful IdP login. Combined with a misconfigured/"allow-all" IdP tenant,
    this lets outsiders self-provision. Set it to `false` if you pre-provision
    every account, or lock down the IdP.
  - Account linking is by **verified email**. Ensure the IdP guarantees email
    verification; otherwise an attacker controlling a matching address could
    assume an existing account.
  - **Require MFA at the IdP** for all SSO users.
- **Brute-force protection:** the login route is protected by an in-memory
  rate limiter keyed by email (a small number of attempts per 15-minute
  window). This is **per process** and resets on restart — it is **not**
  sufficient on its own for production (see §10).
- Kompro does **not** currently ship built-in MFA/TOTP. If your risk profile
  requires it, enforce MFA at the IdP (SSO) or in front of the app (an SSO
  proxy / Cloudflare Access).

---

## 6. Database security

- Use a **dedicated, least-privilege database role** for the application
  (connect/login, DML on the app's schemas, no superuser, no DDL in prod if you
  use `migrate:deploy` from a separate role).
- **Encrypt the connection** with TLS: append `?sslmode=require` (or
  `verify-full`) to `DATABASE_URL` / `DIRECT_URL` when connecting over a network
  you do not fully trust.
- **Network-isolate the database.** Prefer the provider's private network
  (Supabase/Neon private endpoints, RDS in a private subnet). Never expose the
  Postgres port to the public internet.
- **Connection strings:** `DATABASE_URL` is the pooled/app connection (PgBouncer
  on managed providers); `DIRECT_URL` is the direct, non-pooled connection used
  for migrations. Never point migrations at the pooler — they will hang.
- **Encrypt at rest** (managed providers do this by default; verify for
  self-hosted).
- **Backups:** enable automated backups, **encrypt** them, and periodically
  **test restores**. This is your last line of defense against ransomware or
  corruption.
- Never store the DB password in code or in images.

---

## 7. CORS

- Set `CORS_ORIGIN` to the **exact, explicit** origin(s) of your frontend
  (comma-separated). Example: `https://kompro.example.com`.
- **Never** use `*` together with credentials — the app rejects that, but don't
  "reflect" the `Origin` header either. Keep the allowlist strict.
- CORS and the cookie `sameSite` rule work together: a cross-origin frontend
  that is not in `CORS_ORIGIN` will be blocked from reading responses, and the
  session cookie will not be sent (see §4).

---

## 8. File uploads / evidence storage

Evidence files are sensitive. Handle them carefully:

- **Validate uploads** on type and size. `MAX_UPLOAD_MB` (default 10) caps
  file size; keep it conservative. Reject unexpected MIME types.
- **Scan for malware** where feasible (e.g., an AV sidecar / ClamAV) before
  accepting evidence, especially if external parties upload.
- **Storage:**
  - **S3 (recommended for shared/cloud):** set `S3_BUCKET` + `S3_REGION`; keep
    the bucket **private** — never public. Serve files only through the
    authenticated API (use pre-signed URLs generated server-side if you must
    hand a URL to the browser, and scope/timeout them).
  - **Local disk:** files go to `UPLOAD_DIR` (default `backend/uploads`,
    git-ignored). **Do not expose this directory as static web content** — your
    nginx config must *not* map `/uploads` (or any upload path) as a static
    location. Evidence is served only via authenticated API routes.
- Ensure object/disk permissions are restrictive (the API process user only).

---

## 9. HTTP response hardening

`helmet()` is enabled in `backend/src/index.js`, providing a baseline set of
headers. Two important ones are **not** enabled by default in modern Helmet
and should be added explicitly:

```js
// backend/src/index.js (example hardening)
const helmet = require('helmet');
app.use(helmet());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      // Tighten for your deployment; the app is a Vite/React SPA + JSON API.
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind injects inline styles in dev
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  })
);
```

- **HSTS** prevents SSL-strip downgrade attacks.
- **CSP** significantly reduces XSS impact; tune it (dev uses inline styles, so
  `unsafe-inline` may be needed, or switch to a hashed/nonce approach for prod).
- Hide `X-Powered-By` (Express): `app.disable('x-powered-by')`.
- Ensure the **error handler does not leak stack traces or internals** to
  clients. Use generic messages in production and log details server-side only.
- Limit request body size with `BODY_LIMIT_MB`.

---

## 10. Rate limiting & DDoS resilience

- The built-in login limiter is **in-memory and per process**. It does **not**
  share state across multiple API instances and **resets when the process
  restarts**. Do not rely on it as your only brute-force defense.
- Add **edge/perimeter rate limiting**:
  - nginx: `limit_req_zone` + `limit_req` on `/api/auth/login`.
  - Cloudflare / cloud WAF in front of the app.
  - A **Redis-backed** `express-rate-limit` store if you run multiple API
    replicas.
- Keep `BODY_LIMIT_MB` low and reject oversized payloads at the proxy.
- Consider geo/rate restrictions on admin endpoints if appropriate.

---

## 11. Dependency & supply-chain security

- Install reproducibly with `npm ci` (uses lockfiles) in CI and production.
- Run **`npm audit`** (or `npm audit signatures`) in CI and fail the build on
  high-severity advisories.
- Enable **Dependabot / Renovate** to keep Express, Prisma, bcrypt, axios,
  helmet, etc. patched.
- Review what `postinstall` does (it runs `prisma generate` — safe, no network
  exfiltration). Pin and verify the toolchain.
- Build immutable images; don't patch running containers.

---

## 12. Runtime, audit & monitoring

- **Run as a non-root user** with a read-only root filesystem where possible;
  drop Linux capabilities; use a restrictive seccomp/AppArmor profile.
- **Audit log:** Kompro records actor + before/after for mutating actions.
  - Restrict `audit:read` and `audit:purge` to admins.
  - Configure `AUDIT_RETENTION_DAYS` per your retention policy; purge with
    `npm run audit:purge` on a schedule.
  - Ship the audit log to your SIEM / central store for tamper-evident retention.
- **Centralized logging** (without secrets) and **alerting** on:
  - authentication failures / rate-limit trips,
  - privilege changes (role/user edits),
  - 5xx spikes,
  - unexpected data exports.
- **Network segmentation:** API and DB on a private segment; only the UI/proxy
  and required ports are public.
- **Firewall** to expose only `443` (and `80`→`443` redirect) plus the API port
  if it faces the internet directly.

---

## 13. Data privacy & compliance

As a compliance platform, your instance is itself in scope:

- **Encryption in transit** (§3) and **at rest** (§6, §8) for all data and
  backups.
- **Data residency:** choose a DB region that meets your obligations; note the
  UI↔API latency implications of cross-region hosting.
- **Retention & minimization:** enforce retention for audit and evidence;
  delete on request where required.
- **Access logging:** the audit trail shows *who* changed *what* — review it
  regularly.
- **Backup confidentiality:** encrypt backups and restrict access.

---

## 14. Incident response

- Maintain a runbook. Key containment actions:
  - **Rotate all secrets** (`JWT_SECRET`, DB, SMTP, S3, OAuth).
  - **Invalidate all sessions** by rotating `JWT_SECRET`.
  - **Isolate** the instance (stop public access) and **snapshot** the DB for
    forensics before any cleanup.
  - Review the **audit log** for the window of compromise.
- Ensure you can quickly redeploy from a known-good image + restore from a
  tested backup.

---

## 15. Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Report suspected vulnerabilities privately to the maintainers at:

> **security@kompro.example**  *(replace with your real contact)*

Include steps to reproduce, impact, and any suggested mitigation. We aim to
acknowledge within 72 hours and will coordinate disclosure.

---

## 16. Pre-deployment security checklist

- [ ] All `.env` secrets generated strong & unique; none committed to git.
- [ ] `JWT_SECRET` set from a secret manager; not a default/guessable value.
- [ ] `NODE_ENV=production`; TLS terminated; HTTP→HTTPS redirect; `X-Forwarded-Proto` set.
- [ ] HSTS + CSP added; `x-powered-by` disabled; no stack traces to clients.
- [ ] `CORS_ORIGIN` is an explicit allowlist (no `*`).
- [ ] Session cookie `secure` + `httpOnly` confirmed; same-site/cross-site plan per `SETUP.md §7`.
- [ ] Bootstrap admin password changed; `INITIAL_ADMIN_PASSWORD` rotated/removed.
- [ ] RBAC least-privilege; SSO locked to org domain; MFA enforced at IdP.
- [ ] Database: least-privilege role, TLS to DB, private networking, encrypted at rest.
- [ ] `DATABASE_URL` (pooled) vs `DIRECT_URL` (direct) correctly set.
- [ ] Evidence stored in private S3 bucket or non-web-exposed local dir; upload validation on.
- [ ] Edge/perimeter rate limiting in place (login); API not the only limiter.
- [ ] `npm ci` + `npm audit` clean in CI; Dependabot/Renovate enabled.
- [ ] API runs non-root, segmented network, firewall exposing only needed ports.
- [ ] Audit log shipped to central store; retention configured.
- [ ] Monitoring/alerting on auth failures, 5xx, privilege changes.
- [ ] Backups automated, encrypted, and restore-tested.
- [ ] Incident runbook (secret rotation + session invalidation) documented.
- [ ] Vulnerability reporting contact published.
