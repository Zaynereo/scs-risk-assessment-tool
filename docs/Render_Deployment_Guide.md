# 🚀 Render Deployment Guide
### SCS Risk Assessment Tool

> **Audience:** Company Users & Administrators  
> **Platform:** Render.com  
> **Version:** 1.0

---

## Table of Contents

1. [What is Render?](#1-what-is-render)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-Step: Deploying to Render](#3-step-by-step-deploying-to-render)
4. [Automatic Deployments (CI/CD)](#4-automatic-deployments-cicd)
5. [Viewing Logs and Monitoring](#5-viewing-logs-and-monitoring)
6. [Custom Domain (Optional)](#6-custom-domain-optional)
7. [Where to Push Your Code on GitHub](#7-where-to-push-your-code-on-github)
8. [Troubleshooting](#8-troubleshooting)
9. [Quick Reference](#9-quick-reference)

---

## 1. What is Render?

Render is a cloud hosting platform that makes it simple to deploy web applications, APIs, and background services without needing to manage servers. For the SCS Risk Assessment Tool, Render hosts the application so it is accessible via a web browser from anywhere.

**Key benefits of using Render for this application:**

- ✅ No server management — Render handles infrastructure automatically
- ✅ Automatic deployments — updates go live when code is pushed to GitHub
- ✅ Free SSL/HTTPS — your app is always served securely
- ✅ Built-in logs and monitoring — diagnose issues quickly
- ✅ Easy environment variable management — keep secrets safe

---

## 2. Prerequisites

Before deploying to Render, ensure the following are in place:

| Requirement | Details |
|---|---|
| Render Account | Sign up free at render.com using your company email |
| GitHub Repository | The SCS Risk Assessment Tool code must be in a GitHub repo |
| Supabase Database | Your Supabase project URL and API keys (see Supabase Guide) |
| Environment Variables | A list of all required `.env` values for the application |

---

## 3. Step-by-Step: Deploying to Render

### 3.1 Create a Render Account

**Step 1 —** Go to [https://render.com](https://render.com)

**Step 2 —** Click **Get Started for Free**. Use your company Google account or email to register.

**Step 3 —** Check your inbox and verify your email address before continuing.

---

### 3.2 Connect Your GitHub Repository

Render deploys directly from GitHub. You need to connect your repository once.

**Step 1 —** After logging in, go to the Render dashboard at [dashboard.render.com](https://dashboard.render.com)

**Step 2 —** Click **New +** in the top right corner of the dashboard.

**Step 3 —** From the dropdown menu, choose **Web Service**.

**Step 4 —** Click **Connect account** under GitHub. Authorise Render to access your GitHub account when prompted.

**Step 5 —** Search for and select the `scs-risk-assessment-tool` repository.

---

### 3.3 Configure the Web Service

Fill in the following settings on the configuration page:

| Setting | Value |
|---|---|
| Name | `scs-risk-assessment-tool` (or your preferred name) |
| Region | Singapore (Southeast Asia) — closest to your users |
| Branch | `main` (or the branch you want to deploy) |
| Runtime | Node (or as required by your app) |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Plan | Free (for testing) or Starter ($7/mo) for production |

> ⚠️ **TIP:** The Free plan spins down after 15 minutes of inactivity and has a slow first load. Use the **Starter plan** for a production environment to ensure the app is always responsive.

---

### 3.4 Add Environment Variables

Environment variables hold sensitive configuration values such as your Supabase credentials. **Never hardcode these in your code.**

**Step 1 —** On the service configuration page, scroll down to the **Environment** section.

**Step 2 —** Click **Add Environment Variable** and enter each key-value pair.

**Required environment variables for the SCS Risk Assessment Tool:**

| Variable Name | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (from Supabase dashboard) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key |
| `NODE_ENV` | Set to: `production` |

> ⚠️ **IMPORTANT:** Copy these values exactly from your Supabase project settings. Any typo will cause the application to fail to connect to the database.

---

### 3.5 Deploy the Service

**Step 1 —** Scroll to the bottom of the configuration page and click **Create Web Service**.

**Step 2 —** Render will pull your code from GitHub, install dependencies, and build the app. This typically takes 2–5 minutes.

**Step 3 —** Watch the build logs in real time. A successful build ends with: `Your service is live`.

**Step 4 —** Once deployed, Render provides a URL in the format:
```
https://your-app-name.onrender.com
```
Click it to open the live application.

---

## 4. Automatic Deployments (CI/CD)

Once connected, every time you push code to the `main` branch on GitHub, Render will automatically build and redeploy the application. No manual action is needed.

> ✅ **WORKFLOW:**
> Developer pushes code to GitHub → Render detects the change → Render builds the new version → New version goes live → Users see the updated application.

To trigger a **manual redeploy** at any time:

1. Go to your service on the Render dashboard
2. Click the **Manual Deploy** button
3. Select **Deploy latest commit**

---

## 5. Viewing Logs and Monitoring

Render provides real-time logs to help troubleshoot issues.

### 5.1 Accessing Logs

1. Open your service on the Render dashboard
2. Click the **Logs** tab in the left sidebar
3. Logs are shown in real time — errors will appear in red

### 5.2 Common Log Messages

| Log Message | Meaning / Action |
|---|---|
| `Build successful` | App compiled without errors — deployment proceeding |
| `Your service is live` | Deployment complete — app is accessible |
| `Build failed` | Code error — check logs, fix code, push again |
| `Error: Missing env variable` | An environment variable is not set — add it in dashboard |
| `Service spinning down` | Free plan inactivity — first request may be slow |

---

## 6. Custom Domain (Optional)

By default your app is accessible at `https://your-app-name.onrender.com`. To use a custom domain such as `tool.yourcompany.com`:

**Step 1 —** Go to your service and click **Settings**, then **Custom Domains**.

**Step 2 —** Enter your domain name and click **Add**.

**Step 3 —** Render will show you a CNAME record. Add this to your DNS provider (e.g. Cloudflare, GoDaddy).

**Step 4 —** DNS propagation takes up to 24 hours. Render will automatically issue an SSL certificate.

---

## 7. Where to Push Your Code on GitHub

> 📌 Your GitHub repository is the single source of truth for your application code. Render reads directly from it.

### 7.1 Repository URL

```
https://github.com/Zaynereo/scs-risk-assessment-tool
```

### 7.2 Recommended Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production code — Render deploys from this branch automatically |
| `develop` | Development/testing — merge to `main` when ready to go live |
| `feature/*` | Individual feature branches — merge into `develop` when complete |

### 7.3 Pushing Code

Standard workflow for deploying updates:

```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: describe what you changed"

# Push to GitHub (triggers automatic Render deployment)
git push origin main
```

> ⚠️ **IMPORTANT:** Only push tested, working code to the `main` branch. Broken code pushed to `main` will automatically deploy a broken version to your users.

---

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| App shows white screen / error | Check Render logs for errors. Usually a missing environment variable or build failure. |
| Build keeps failing | Check the build logs. Common causes: missing dependencies, syntax errors, wrong build command. |
| App is very slow on first load | You are on the Free plan. The service spun down. Upgrade to Starter to prevent this. |
| Environment variable not found | Go to **Environment** in your service settings, verify the variable name matches exactly (case-sensitive). |
| Deployment not triggering | Verify Render is connected to the correct branch. Check **Settings > Build & Deploy**. |
| App deployed but database not working | Your Supabase environment variables may be wrong. Cross-reference with the Supabase Guide. |

---

## 9. Quick Reference

| Task | Where / How |
|---|---|
| Access Render Dashboard | https://dashboard.render.com |
| View App Logs | Dashboard → Your Service → Logs |
| Add/Edit Env Variables | Dashboard → Your Service → Environment |
| Manual Redeploy | Dashboard → Your Service → Manual Deploy |
| GitHub Repository | https://github.com/Zaynereo/scs-risk-assessment-tool |
| Push code to deploy | `git push origin main` |

---

> 📄 For assistance with database setup and configuration, refer to the companion document: **[Supabase Setup Guide](./Supabase_Setup_Guide.md)**

---
*Confidential — Internal Use Only*
