# Local Development Guide

## 📧 Checking Local Test Emails (Inbucket)

**To view emails sent by your local Supabase instance:**
- **URL:** http://127.0.0.1:54324
- **What:** Inbucket is a local email catcher that captures ALL emails sent by your app
- **Use for:** 
  - Viewing confirmation emails
  - Password reset emails
  - Welcome emails
  - Any other emails your app sends

### Quick Access
When Supabase is running locally, just open:
```
http://127.0.0.1:54324
```

This shows all emails for any user that signs up or receives emails from your local app.

## 🚀 Starting Local Services

```bash
# Start Supabase (includes Inbucket)
npx supabase start

# Start Edge Functions with secrets
npx supabase functions serve --env-file supabase/functions/.env

# Start the app
npm run dev
```

## 🔑 Local Authentication

### Email/Password (No confirmation needed)
- Email confirmations are disabled for local development
- Sign up with any email (e.g., test@example.com)
- You'll be logged in immediately

### OAuth (Google/GitHub)
- Not available in local development
- Requires production URLs for OAuth redirects

## 📍 Local Service URLs

- **App:** http://localhost:8080
- **Supabase Studio:** http://127.0.0.1:54323
- **Inbucket (Email):** http://127.0.0.1:54324
- **API:** http://127.0.0.1:54321
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres