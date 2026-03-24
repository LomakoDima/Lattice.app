# Deploy: Vercel (frontend) + Render (API)

## 1. PostgreSQL on Render

Create a **PostgreSQL** instance, copy **Internal Database URL** (for API on Render) or **External** if you ever run API elsewhere.

## 2. Web service (API) on Render

- **New → Blueprint** (connect repo, select `render.yaml`) or **Web Service** manually:
  - **Root directory:** repo root  
  - **Build:** `npm ci`  
  - **Start:** `npm run start:api`  
  - **Health check path:** `/api/health`

**Environment variables** (Render → service → Environment):

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Render sets automatically; optional) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | Long random string (≥16 chars) |
| `SESSION_SECRET` | Long random string (≥16 chars) |
| `FRONTEND_ORIGIN` | `https://your-app.vercel.app` (no trailing slash) |
| `API_PUBLIC_URL` | `https://<this-service>.onrender.com` — **same as** the public URL of the API |

OAuth (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

In **Google Cloud / GitHub** OAuth apps, set authorized redirect URI to:

`https://<your-api>.onrender.com/api/auth/oauth/google/callback`  
`https://<your-api>.onrender.com/api/auth/oauth/github/callback`

## 3. Vercel (static SPA)

- Import the same repo, **Framework Preset:** Vite (or use `vercel.json`).
- **Root directory:** repo root  
- **Build command:** `npm run build`  
- **Output:** `dist`

**Environment variables** (Vercel → Project → Settings → Environment Variables):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://<your-api>.onrender.com` — **no trailing slash** |

Redeploy after changing env.

## 4. Notes

- **Split origin:** `API_PUBLIC_URL` + `FRONTEND_ORIGIN` enable correct OAuth `redirect_uri` and `SameSite=None` cookies for `fetch(..., { credentials: 'include' })` from the Vercel origin to the Render API.
- **Local dev:** leave `VITE_API_URL` empty and use Vite proxy; do not set `API_PUBLIC_URL` on the server unless you test split deploy locally.

See `.env.example` for a full template.
