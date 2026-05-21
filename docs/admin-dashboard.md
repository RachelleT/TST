# Admin dashboard

A separate Next.js web app, accessible only to admins, sharing the Supabase backend with the mobile app.

## Purpose

The admin needs to:
- Manage the facts catalog (add, edit, deactivate, view stats)
- Triage user-submitted fact reports
- Manage starter words and interest areas
- View basic usage analytics (DAU, retention, feature usage)
- Handle support cases that require viewing a specific user's data

The admin dashboard is not customer-facing and never ships to app stores.

## Tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui
- **Auth:** Supabase Auth (same as mobile app), with an additional check against the `app_users` table for admin role
- **Hosting:** Vercel
- **State:** React Query for server data

## Repo location

A subdirectory `admin/` in the main repo, deployed independently. Shared types live in `shared/`.

## Access control

1. Admin must sign in with their existing TST account.
2. After auth, check `app_users` table for their `user_id`. If not present, show an "unauthorized" page.
3. Admin role gives Supabase row-level access to ALL user data (via RLS policies that grant SELECT to admins on user-data tables).
4. All admin actions are logged in an `admin_audit_log` table (data model addition).

### `admin_audit_log` table

Added to the Supabase schema for the admin dashboard:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `admin_user_id` | uuid FK → profiles.id | Who did the action |
| `action` | text | E.g. `'fact_created'`, `'fact_updated'`, `'user_viewed'`, `'report_resolved'` |
| `target_id` | text | The id of the affected record (fact_id, user_id, report_id, etc.) |
| `details` | jsonb | Action-specific details |
| `created_at` | timestamptz | |

Every admin action that touches user data writes a log row. Privacy and accountability.

## Screens

### Sign in

Standard Supabase email/password sign-in. After auth, the role check happens; non-admins see an "unauthorized" page with a sign-out button.

### Overview (home)

A simple dashboard with:

- Total signed-up users (count)
- DAU (last 24h)
- New saves today
- New quiz sessions today
- Open fact reports count
- Recent activity feed (last 20 admin actions, last 20 reports)

No fancy charts. Numbers + small line indicators for week-over-week change.

### Facts catalog

A table view of all facts with:

- Filter: category, region, active/inactive
- Search: by name or id
- Columns: ID, name, category, region, # times assigned, status

Click a row → fact detail/edit page:

- All fields editable
- Illustration upload (uploads to Supabase Storage; stored at `facts/{category}/{id}.svg`)
- "Active" toggle
- "Save changes" button writes to `facts` table and to `admin_audit_log`
- Stats panel: how many users have this fact assigned, when it was created, last edited

"New fact" button opens a blank fact form.

"Deactivate" button (on edit page) sets `active = false`. A follow-up dialog asks: "Do you want to reassign affected users' cards?" (Yes triggers a re-assignment job; No leaves them as-is.)

### Reports queue

A table of `fact_reports` with `status = 'open'`, default sort by most recent.

Columns: reported at, fact name, category (the report category), user note, admin response.

Click a row → report detail:

- Full context (the fact in question, the user's note)
- Buttons:
  - "Mark fixed" (sets status = `'fixed'`, prompts for an admin response if desired)
  - "Dismiss" (sets status = `'dismissed'`)
  - "Edit fact" (deep-links to the fact's edit page)

### Starter words

Manage the curated starter word pool used in onboarding.

- View by interest area (10 areas).
- Each area has a list of curated words. Add, remove, or edit.
- Words here aren't full dictionary lookups — they reference real dictionary entries by `(word, sense_index)`. The admin enters the word and the system fetches its definition/synonyms/etc. for preview.

Schema addition needed: `starter_words` table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `interest_area` | text | E.g. `'emotions_feelings'` |
| `word` | text | |
| `sense_index` | int | Default 0 |
| `display_order` | int | Within the area |
| `active` | boolean | |
| `created_at` | timestamptz | |

### Interest areas

A simpler config table for the 10 interest areas.

Schema addition: `interest_areas` table.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | E.g. `'emotions_feelings'` |
| `display_name` | text | E.g. `'Emotions & feelings'` |
| `description` | text | Subtitle shown in onboarding |
| `examples` | text[] | E.g. `['melancholy','ecstatic','wistful']` |
| `active` | boolean | |
| `display_order` | int | |

Admin can reorder, edit, deactivate. Cannot delete (since `profiles.interest_areas` references these IDs).

### Users

A list of all users (search by email, ID, or display name) with basic stats per user:
- Saved words count
- Quiz attempts count
- Last active

Click a user → user detail page with:
- Profile info
- List of saved words (no PII shown — just the words)
- List of fact assignments
- Quiz history summary
- Action: "Send password reset email" (one-click)
- Action: "Delete account" (with confirmation — uses the same edge function as user-initiated deletion)

**Privacy:** the admin can view what a user has saved and how they're performing, but cannot see content the user has typed (we don't store free-text content beyond fact reports). Viewing a user's detail page writes to `admin_audit_log`.

### Settings

Admin-only settings:
- Manage admin allowlist (add/remove other admins from `app_users`)
- Catalog refresh interval (currently 24h, can be tuned)
- Feature flags (toggle paywall enforcement, toggle analytics, etc.)

A small set of feature flags lives in a `feature_flags` table. The mobile app reads these on launch.

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | E.g. `'paywall_enabled'` |
| `value` | jsonb | E.g. `{"enabled": false, "cap": 50}` |
| `description` | text | What this flag controls |
| `updated_at` | timestamptz | |

## Layout & UX notes

- Sidebar nav with the main sections (Overview, Facts, Reports, Starter Words, Interest Areas, Users, Settings).
- Top bar with sign-out and the admin's name.
- Compact table styling — admin is power-user-oriented, prioritize info density over breathing room.
- Confirmation dialogs for destructive actions (deactivate fact, delete user).
- Use the same color palette as the mobile app for visual consistency, but feel free to make the layout dense.

## Build phases for admin

The admin dashboard is **not on the critical path** for the developer's first build. Suggested order:

1. **Mobile app v1 build** — complete all mobile features first.
2. **Admin v0.5** — minimal version: facts catalog CRUD + reports queue. Enough to manage content.
3. **Admin v1** — add users, starter words, interest areas, analytics overview.

The admin can be built directly against the production Supabase project; it does not require a separate environment for the initial phase.

## Open questions for admin

- What level of analytics is enough? (Suggest: just the basics in v1, expand based on operational needs.)
- Should there be a public-facing changelog of catalog updates? (Out of scope for v1.)
- Should there be a bulk-import for facts? (Yes, eventually — CSV upload. Out of scope for first version of admin.)
