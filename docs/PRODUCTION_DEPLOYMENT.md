# A11yFix — Production Deployment & Setup Guide

This guide provides end-to-end instructions for deploying the A11yFix backend API to production (Render/Railway) and connecting it to the live GitHub Pages web application.

---

## 1. Register GitHub OAuth App

1. Go to **[GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)**.
2. Click **New OAuth App**.
3. Fill out the application details:
   - **Application Name**: `A11yFix Production`
   - **Homepage URL**: `https://arnavsharma2005.github.io/a11yfix`
   - **Authorization Callback URL**: `https://<your-backend-host>/api/auth/github/callback` *(e.g. `https://a11yfix-api.onrender.com/api/auth/github/callback`)*
4. Click **Register Application**.
5. Save the **Client ID** and generate a new **Client Secret**.

---

## 2. Deploy Backend API to Render (Option A - Recommended)

1. Connect your GitHub account to **[Render.com](https://render.com)**.
2. Click **New +** → **Blueprint**.
3. Select your `a11yfix` repository. Render will automatically detect the root [`render.yaml`](../render.yaml) file.
4. Fill in the required environment variables when prompted:
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth Client ID.
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth Client Secret.
   - `SESSION_SECRET`: Set automatically by Render or enter a random 32-byte hex string (`openssl rand -hex 32`).
   - `TOKEN_ENCRYPTION_KEY`: Set automatically by Render or enter a random 32-byte hex string (`openssl rand -hex 32`).
5. Click **Apply**. Render will provision:
   - Managed Postgres instance (`a11yfix-db`)
   - Managed Redis instance (`a11yfix-redis`)
   - Web Service (`a11yfix-api`) running `pnpm --filter @a11yfix/api start`

---

## 3. Production Environment Variables Matrix

Ensure the following environment variables are set in your backend host environment:

| Variable Name | Description | Example / Required Value |
|---|---|---|
| `NODE_ENV` | Environment mode (**Enforces Auth**) | `production` |
| `WEB_URL` | Frontend URL for OAuth redirects | `https://arnavsharma2005.github.io/a11yfix` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host/a11yfix` |
| `REDIS_URL` | Redis connection string | `redis://user:pass@host:6379` |
| `SESSION_SECRET` | Secret key for session cookies | 32-byte random hex string |
| `TOKEN_ENCRYPTION_KEY` | Key for encrypting user tokens | 32-byte random hex string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | From GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | From GitHub Developer Settings |

---

## 4. Connect Frontend to Live Backend API

1. Go to your repository on GitHub: `https://github.com/Arnavsharma2005/a11yfix`.
2. Navigate to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
4. Name: `VITE_API_BASE_URL`
5. Value: `https://<your-backend-host>/api` *(e.g. `https://a11yfix-api.onrender.com/api`)*
6. Click **Add Secret**.
7. Re-run or push a commit to `main` to trigger the `.github/workflows/deploy-pages.yml` workflow. The static frontend will compile with `VITE_API_BASE_URL` pointing to your live backend API!

---

## 5. Verification Checklist

- [ ] Health check: `curl https://<your-backend-host>/api/health` returns `{"ok": true}`.
- [ ] Database health: `curl https://<your-backend-host>/api/health/deep` returns `{"ok": true}` with database status.
- [ ] Unauthenticated visit to `https://arnavsharma2005.github.io/a11yfix` presents the GitHub OAuth login gate.
- [ ] Clicking **Sign in with GitHub** initiates OAuth and redirects back to `arnavsharma2005.github.io/a11yfix`.
- [ ] Running a scan queues, crawls, detects violations, and enables opening pull requests against real GitHub repos.
