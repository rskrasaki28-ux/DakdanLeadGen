# Vercel Deployment Guide

Use these settings so the dashboard deploys correctly from the **dev** branch.

## 1. Production branch

- **Settings → Git → Production Branch**
- Set to **`dev`** (not `main`).

## 2. Root directory (monorepo)

- **Settings → General → Root Directory**
- Set to **`dashboard`**.
- Save.

## 3. Framework preset

- **Settings → General → Framework Preset**
- Set to **Vite** (this app is Vite + React, not Next.js).
- Build Command: `npm run build` (default)
- Output Directory: `dist` (default)

## 4. Environment variables

- **Settings → Environment Variables**
- Add these for **Production** (and optionally Preview):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dcpryaduyfbguvwlhhgz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcHJ5YWR1eWZiZ3V2d2xoaGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDkxNzgsImV4cCI6MjA4MjY4NTE3OH0.hSWGhRtUCtzD7xtVc2MJw7I93xxBhlRpFt30dC1NbWY` |

Save after adding each variable.

## 5. Deploy

- Push to the **dev** branch, or use **Deployments → Redeploy** after changing settings.
- The live URL will be shown on the deployment (e.g. `https://your-project.vercel.app`).

Share that URL with the frontend team once the deployment succeeds.
