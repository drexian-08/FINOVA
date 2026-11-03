# FINOVA Cloud Setup (Supabase)

This guide prepares the cloud foundation. It does not claim cloud sync is active yet.

## 1. Create a Supabase project
1. Open https://supabase.com and create a project.
2. Choose a strong database password and keep it private.
3. Wait until the database is ready.
4. Open **SQL Editor → New query**.
5. Paste and run `supabase/migrations/0001_finova_core.sql`.

## 2. Configure Authentication
In **Authentication → URL Configuration**:
- Set the Site URL to the deployed FINOVA URL (or localhost during development).
- Add the deployed URL and localhost development URL to the Redirect URLs list.

In **Authentication → Providers**, enable Email. For production, configure email delivery and decide whether email confirmation is required.

## 3. Browser credentials
The frontend will eventually need only:
- Supabase Project URL
- Supabase publishable/anon key

These values are intended for browser use when Row Level Security is enabled. Never put the `service_role` secret in HTML, JavaScript, GitHub, or any browser app.

Do not commit real project credentials to this public repository. Use local configuration during development and hosting environment configuration where supported.

## 4. Security model
- Each financial row has a `user_id` linked to Supabase Auth.
- Row Level Security policies restrict users to their own records.
- License and subscription records are readable by their owner but cannot be edited by browser clients.
- Payment events have no client access policy; trusted server-side functions process them.
- Do not collect bank passwords, card numbers, or online banking credentials.

## 5. Current status
The SQL migration is a proposed schema foundation and has not yet been run against a live Supabase project. The current deployed MVP continues to use browser Local Storage. Cloud sync, login and licence checks are not active until a project is configured and integration is implemented and tested.

## 6. Planned integration sequence
1. Create and verify the Supabase project.
2. Add a safe public client configuration.
3. Implement sign-up, sign-in, sign-out and password recovery.
4. Add explicit cloud backup/restore first.
5. Add background sync with offline queue, conflict handling and deletion markers.
6. Test RLS using two separate test accounts before production.
