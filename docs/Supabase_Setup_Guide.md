# 🗄️ Supabase Database Setup Guide
### SCS Risk Assessment Tool

> **Audience:** Company Users & Administrators  
> **Platform:** Supabase  
> **Version:** 1.0

---

## Table of Contents

1. [What is Supabase?](#1-what-is-supabase)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-Step: Setting Up Supabase](#3-step-by-step-setting-up-supabase)
4. [Authentication Setup](#4-authentication-setup)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Connecting Supabase to Render](#6-connecting-supabase-to-render)
7. [Using the Supabase Dashboard](#7-using-the-supabase-dashboard)
8. [Backups and Data Safety](#8-backups-and-data-safety)
9. [Troubleshooting](#9-troubleshooting)
10. [Quick Reference](#10-quick-reference)

---

## 1. What is Supabase?

Supabase is the database backend for the SCS Risk Assessment Tool. It provides a PostgreSQL database, user authentication, and real-time data capabilities — all without needing to manage a separate database server.

**Supabase handles the following for the SCS Risk Assessment Tool:**

- ✅ Storing all risk assessment data, user records, and configuration
- ✅ Authenticating users who log in to the application
- ✅ Providing a secure API that the application uses to read and write data
- ✅ Row Level Security (RLS) — ensuring users can only see data they are permitted to access

---

## 2. Prerequisites

Before setting up Supabase, ensure the following:

| Requirement | Details |
|---|---|
| Supabase Account | Free account at supabase.com — use your company email |
| Web Browser | Any modern browser (Chrome, Edge, Firefox) |
| Render Deployment | Your app must be hosted on Render (see Render Deployment Guide) |
| Admin Access | You need permission to create and manage Supabase projects |

---

## 3. Step-by-Step: Setting Up Supabase

### 3.1 Create a Supabase Account

**Step 1 —** Go to [https://supabase.com](https://supabase.com)

**Step 2 —** Click **Start your project** on the homepage.

**Step 3 —** Create an account using GitHub (recommended) or your company email address.

**Step 4 —** Verify your email if prompted, then log in to the Supabase dashboard.

---

### 3.2 Create a New Project

**Step 1 —** From the Supabase dashboard, click **New Project**.

**Step 2 —** If prompted, create a new organisation with your company name.

**Step 3 —** Fill in the project details:

| Field | Recommended Value |
|---|---|
| Project Name | `scs-risk-assessment` (or your preferred name) |
| Database Password | Use a strong, unique password. **SAVE THIS SECURELY.** |
| Region | Southeast Asia (Singapore) |
| Plan | Free tier for development. Pro ($25/mo) for production. |

**Step 4 —** Click **Create new project** and wait 2–3 minutes while Supabase provisions your database.

---

### 3.3 Retrieve Your API Keys

The application needs two pieces of information to connect to Supabase. These go into your Render environment variables.

**Step 1 —** In the left sidebar of your project, click **Settings** (gear icon).

**Step 2 —** Under Settings, select **API** from the menu.

**Step 3 —** Copy the following values:

| What to Copy | Where to Find It | Render Variable Name |
|---|---|---|
| Project URL | Settings → API → Project URL | `VITE_SUPABASE_URL` |
| anon / public key | Settings → API → Project API Keys → anon public | `VITE_SUPABASE_ANON_KEY` |

> 🔴 **SECURITY:** Never share the `service_role` key with anyone or put it in your frontend code. Only use the `anon` (public) key for the application. The `service_role` key has **full admin access** to your database.

---

### 3.4 Set Up the Database Schema

The SCS Risk Assessment Tool requires specific tables and policies to be created in the database. This is done by running migration scripts from the project repository.

**Step 1 —** In your Supabase project, click **SQL Editor** in the left sidebar.

**Step 2 —** In your project code repository on GitHub, look for a folder named `supabase/migrations` or `database/`. This contains `.sql` files.

**Step 3 —** Copy the contents of each `.sql` migration file **(in order, oldest to newest)** and paste into the SQL Editor. Click **Run** after each one.

**Step 4 —** Click **Table Editor** in the left sidebar. You should see all the application tables listed.

> 💡 **TIP:** Migration files are numbered (e.g. `001_initial.sql`, `002_add_users.sql`). Always run them in numerical order to avoid errors.

---

## 4. Authentication Setup

Supabase handles user login for the SCS Risk Assessment Tool.

### 4.1 Enabling Email Authentication

**Step 1 —** In the left sidebar, click **Authentication**.

**Step 2 —** Select **Providers** from the Authentication menu.

**Step 3 —** Ensure the **Email** provider is turned on. Configure whether to require email confirmation for new sign-ups.

---

### 4.2 Adding Users Manually

To add company users directly without requiring them to self-register:

**Step 1 —** Click **Authentication**, then select **Users**.

**Step 2 —** Click the **Invite** button and enter the user's company email address.

**Step 3 —** The user will receive an email with a link to set their password and log in.

---

### 4.3 Configuring the Site URL

Supabase needs to know your application's URL to send correct links in emails (e.g. password reset, email confirmation).

**Step 1 —** Click **Authentication**, then **URL Configuration**.

**Step 2 —** Set the **Site URL** to your Render app URL, for example:
```
https://scs-risk-assessment-tool.onrender.com
```

**Step 3 —** Add the same URL to the **Redirect URLs** list. Click **Save**.

---

## 5. Row Level Security (RLS)

Row Level Security (RLS) is a critical security feature that ensures users can only access their own data. The SCS Risk Assessment Tool requires RLS to be enabled on all tables.

> 🔴 **IMPORTANT:** If RLS is disabled, any logged-in user could read or modify every record in the database. **Always keep RLS enabled in production.**

### 5.1 Checking RLS Status

1. Go to **Table Editor** in the left sidebar
2. Click on any table name
3. Look for the **RLS Enabled** badge at the top of the table view
4. If it shows **RLS Disabled**, click it and enable it immediately

### 5.2 Verifying Policies

Policies control what data each user can see. They are created by the migration scripts. To verify:

1. Go to **Authentication → Policies** in the left sidebar
2. Check that each table has appropriate policies (INSERT, SELECT, UPDATE, DELETE)
3. If policies are missing, re-run the relevant migration SQL file

---

## 6. Connecting Supabase to Render

Once your Supabase project is set up, add the API keys to your Render deployment to connect the two services.

**Step 1 —** From **Supabase Settings → API**, copy the **Project URL** and the **anon public** key.

**Step 2 —** Go to [dashboard.render.com](https://dashboard.render.com) and open your SCS Risk Assessment Tool service.

**Step 3 —** Click **Environment** in the left sidebar of your Render service.

**Step 4 —** Add the following environment variables:

| Variable Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Paste your Project URL here (e.g. `https://abc.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Paste your anon public key here (long string starting with `eyJ...`) |

**Step 5 —** Click **Save Changes**. Render will automatically redeploy the application with the new credentials.

---

## 7. Using the Supabase Dashboard

The Supabase dashboard is your control centre for the database. Key areas you will use regularly:

| Section | What You Can Do |
|---|---|
| **Table Editor** | View, add, edit, and delete records directly in the database tables |
| **SQL Editor** | Run custom SQL queries for advanced data operations |
| **Authentication → Users** | View registered users, invite new users, reset passwords |
| **Authentication → Policies** | Manage Row Level Security policies |
| **Logs** | View database and API access logs for debugging |
| **Settings → API** | Get your project URL and API keys |
| **Settings → Database** | Get direct database connection string (for admin tools) |

---

## 8. Backups and Data Safety

Supabase provides automatic daily backups on the Pro plan. On the Free plan, you are responsible for your own backups.

### 8.1 Free Plan Backups

> 🔴 **WARNING:** The Supabase Free plan **does not include automatic backups**. For a production system with real company data, upgrade to the **Pro plan ($25/month)** or export data regularly.

To manually export data on the Free plan:

1. Go to **Settings → Database** in the Supabase dashboard
2. Use the connection string with a tool like pgAdmin or TablePlus to connect
3. Export tables as CSV or SQL dump files and store securely

### 8.2 Pro Plan Backups

On the Pro plan, Supabase automatically takes a backup every 24 hours and retains them for 7 days. To restore a backup:

1. Go to **Settings → Backups** in your project
2. Select the backup point you want to restore to
3. Click **Restore** and confirm — this will overwrite current data

---

## 9. Troubleshooting

| Problem | Solution |
|---|---|
| App cannot connect to database | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly in Render environment variables. |
| Login not working | Verify Authentication is enabled in Supabase and the Site URL is set to your Render app URL. |
| Users cannot see their data | Check that RLS is enabled and the correct policies are in place on all tables. |
| No tables visible in dashboard | Migration scripts may not have run. Re-run all SQL migration files in the SQL Editor. |
| Password reset email not arriving | Check spam folder. Verify the Site URL and Redirect URLs are configured correctly in Authentication settings. |
| Database usage limit reached | You have hit the Free plan limits. Upgrade to the Supabase Pro plan. |

---

## 10. Quick Reference

| Task | Where / How |
|---|---|
| Access Supabase Dashboard | https://supabase.com/dashboard |
| Get API Keys | Project Settings → API |
| Invite a User | Authentication → Users → Invite |
| View / Edit Data | Table Editor |
| Run SQL | SQL Editor |
| Check RLS | Authentication → Policies |
| View Logs | Logs → API / Database |
| Manage Backups | Settings → Backups (Pro plan) |

---

> 📄 For help with deploying the application to the web, refer to the companion document: **[Render Deployment Guide](./Render_Deployment_Guide.md)**

---
*Confidential — Internal Use Only*
