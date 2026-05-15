# Free deployment guide

Total cost: **$0**. Web on Vercel, server on Render. Both auto-deploy on `git push` to `main`.

## 1. Deploy the server to Render

1. Sign up at https://render.com with your GitHub account.
2. Dashboard → **New +** → **Blueprint**.
3. Connect this repo (`keithxun/Singaporean-Bridge`). Render reads `render.yaml` and creates the `sgb-server` service.
4. Click **Apply**. First build takes ~3–5 min (Docker).
5. When deployed, copy the URL (e.g. `https://sgb-server.onrender.com`).
6. **Test it:** open `https://sgb-server.onrender.com/health` — should return `{"ok":true}`.

> **Render free tier note:** the service sleeps after 15 minutes of inactivity. First request after sleep takes ~30s to wake. Fine for casual play.

## 2. Deploy the web app to Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New… → Project** → import `keithxun/Singaporean-Bridge`.
3. Vercel detects `vercel.json`. Confirm the framework is **Next.js**.
4. **Environment Variables** → add:
   - Name: `NEXT_PUBLIC_SERVER_URL`
   - Value: the Render URL from step 1.6 (e.g. `https://sgb-server.onrender.com`)
5. Click **Deploy**. ~2 min.
6. Copy the Vercel URL (e.g. `https://singaporean-bridge.vercel.app`).

## 3. Lock down CORS (optional but recommended)

1. Back in Render → your service → **Environment** tab.
2. Add env var:
   - Key: `ALLOWED_ORIGINS`
   - Value: your Vercel URL, e.g. `https://singaporean-bridge.vercel.app`
3. Save — Render auto-redeploys.

Without this, the server accepts requests from any origin (`*`), which is fine for casual play but not ideal.

## 4. Play

Share the Vercel URL with 3 friends. Each picks a name → one creates a room, the others join with the 4-char code. No accounts, no installs.

## Updating

`git push origin main` → Render redeploys the server, Vercel redeploys the web. Both take ~2–5 min.

## Troubleshooting

- **"Connecting…" forever**: the Render server is sleeping. Visit `/health` once to wake it, then refresh the room page. Or check `ALLOWED_ORIGINS` matches your Vercel URL exactly (no trailing slash).
- **CORS error in browser console**: `ALLOWED_ORIGINS` on Render doesn't match the Vercel URL. Update and let it redeploy.
- **Build fails on Vercel**: confirm `vercel.json` is at the repo root and `NEXT_PUBLIC_SERVER_URL` is set.
- **Build fails on Render**: check the Render build logs; usually a missing file in the Docker context. The Dockerfile expects to be built from the **repo root** (which `render.yaml` sets via `dockerContext: .`).

## Alternative: one host (Fly.io)

If you'd rather have one URL for everything and don't mind a credit card on file (free tier still $0), Fly.io can serve both. Ask and I'll add a `fly.toml`.
