# Kompro Frontend

The Kompro web interface: a self-hosted compliance management console built with
**React + Vite + Tailwind CSS**. It talks to the Kompro backend over a small REST
API and shows Kompro's identity on every screen (logo, favicon, wordmark).

## Stack

- React 18 + React Router 6
- Vite 5 (dev server + production build)
- Tailwind CSS 3 (brand theme in `tailwind.config.js`)
- Axios for API calls (`src/lib/api.js`)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173 (proxies /api -> backend)
npm run build    # production bundle into dist/
npm run preview  # serve the production build locally
```

The backend must be running and reachable. In development the Vite dev server
proxies `/api` to `VITE_BACKEND_URL` (default `http://localhost:5000`), so the
httpOnly session cookie is sent same-origin and no CORS configuration is needed.

## Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Purpose |
| --- | --- |
| `VITE_AUTH_TYPE` | `password` \| `sso` \| `both` — which login methods render. |
| `VITE_SSO_PROVIDERS` | Comma-separated SSO buttons to show (`google,microsoft,github`). |
| `VITE_BACKEND_URL` | Backend URL used by the dev proxy. |
| `VITE_API_URL` | API base path (defaults to `/api`). |

The login screen adapts to `VITE_AUTH_TYPE`: password form, SSO buttons, or both.

> SSO buttons link to `/api/auth/{provider}`. Those backend OAuth endpoints are
> not implemented yet; enable them server-side before relying on SSO in
> production.

## Session awareness

- On load the app calls `GET /api/auth/me`. If the session cookie is still valid
  the user lands on the dashboard; otherwise they are sent to login.
- Closing the tab and reopening keeps the user on the dashboard while the session
  cookie remains valid, and returns them to login once it expires.
- Any API response with a `401` invalidates the local session and redirects to
  login (see `src/lib/api.js` and `src/auth/AuthContext.jsx`).

## Project layout

```
src/
  auth/AuthContext.jsx   # session state + 401 handling
  components/            # ui primitives, icons, layout, SubList
  config.js              # Vite env config (auth type, providers)
  lib/                  # api client, useGet hook
  pages/                # one file per feature area
  App.jsx               # router (login + protected shell)
```

## Branding

Brand color `#6c07c7` (with `#c287f7` as a lighter accent) is defined in
`tailwind.config.js` as the `brand` palette. The logo (`kompro-logo.png`) and
favicon (`favicon.ico`) live in `public/` and are used across the app so every
self-hosted deployment shows Kompro's identity.
