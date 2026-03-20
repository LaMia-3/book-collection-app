# Authentication, MongoDB, and Vercel Migration Plan

## Scope

This app is moving from a client-only IndexedDB architecture to a single-account authenticated app with:

- Vercel-hosted API/functions in this repo
- MongoDB as the remote source of truth
- Per-user library ownership
- One-time import from legacy IndexedDB for backward compatibility

`notely` is a reference for how to structure auth, API routes/functions, and MongoDB wiring on Vercel. It is not a shared backend and it is not the source of truth for this app's domain model.

## Non-Goals

The following are out of scope for this migration unless explicitly added later:

- Multi-profile support
- Shared backend across multiple apps
- Shared MongoDB across multiple apps
- Cross-application live sync
- Reusing `notely` entities or business logic directly

## Current State

The current app is still a single-user browser app with open routing and local storage behavior centered on IndexedDB.

Relevant current files:

- [src/App.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/App.tsx)
- [src/services/DatabaseService.ts](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/services/DatabaseService.ts)
- [src/services/storage/IndexedDBService.ts](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/services/storage/IndexedDBService.ts)
- [src/components/ImportExportView.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/components/ImportExportView.tsx)
- [src/pages/AdminPage.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/pages/AdminPage.tsx)

## Target Architecture

### Frontend

- Auth context for session bootstrap and auth actions
- Protected route shell
- API client for all authenticated server calls
- Repository layer that can evolve from local-only to remote-backed behavior

### Vercel API Layer

- Auth endpoints for register, login, and current-user lookup
- Protected CRUD endpoints for library resources
- JWT-based auth middleware
- Mongo connection shared by server functions

### Database

Minimum remote collections:

- `users`
- `books`
- `series`
- `collections`
- `upcoming_releases`
- `notifications`
- `user_settings`
- `migration_status`

Each library-facing record should be owned by a single user account, typically through `user_id`.

## Reference Fit From `notely`

Useful reference points from the local `notely` repo:

- [notely/src/lib/AuthContext.jsx](/Users/miprice/Repositories/windsurf-workspace/notely/src/lib/AuthContext.jsx)
- [notely/src/App.jsx](/Users/miprice/Repositories/windsurf-workspace/notely/src/App.jsx)
- [notely/src/api/apiClient.js](/Users/miprice/Repositories/windsurf-workspace/notely/src/api/apiClient.js)
- [notely/api/routes/auth.js](/Users/miprice/Repositories/windsurf-workspace/notely/api/routes/auth.js)

What we should reuse conceptually:

- auth context shape
- protected-route pattern
- token-aware API client
- Vercel/Mongo env-driven backend setup

What we should not copy blindly:

- `notely` data models
- route names that do not fit this app
- simplistic migration assumptions
- account deletion or data deletion behavior without library-specific safeguards

## Environment and Deployment Requirements

Expected environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `VITE_API_URL` for local development if frontend and API do not share origin

Deployment expectations:

- frontend deployed on Vercel
- API/functions deployed from this repo on Vercel
- MongoDB hosted separately and accessed through env vars

## Phase 1: Auth and API Foundation

Goal:
Authenticated app shell with Vercel-hosted auth endpoints and MongoDB connectivity.

Checklist:

- [x] Decide whether auth endpoints live under `api/` or `server/` plus Vercel adapter
- [x] Add server-side Mongo connection utility modeled after `notely`
- [x] Add server-side auth utility for JWT sign/verify
- [x] Add auth middleware for protected routes
- [x] Add `User` model with required fields and timestamps
- [x] Add `POST /auth/register`
- [x] Add `POST /auth/login`
- [x] Add `GET /auth/me`
- [x] Add password hashing and credential validation
- [x] Add consistent API error response format
- [x] Add local env handling for API base URL
- [x] Add frontend `apiClient`
- [x] Add frontend `AuthContext`
- [x] Add frontend `ProtectedRoute`
- [x] Add `Login` page
- [x] Add `Register` page
- [x] Update [src/App.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/App.tsx) to support public and protected routes
- [x] Add authenticated loading state during session bootstrap
- [x] Redirect unauthenticated users away from protected pages
- [x] Add logout behavior
- [ ] Verify auth flow locally end to end

Definition of done:

- user can register
- user can log in
- `GET /auth/me` works with the stored token
- main app shell is protected

## Phase 2: Remote Data Model and Repository Conversion

Goal:
MongoDB-backed library data exists and the frontend can read/write it through authenticated API routes.

Checklist:

- [x] Define Mongo schema for `Book`
- [x] Define Mongo schema for `Series`
- [x] Define Mongo schema for `Collection`
- [x] Define Mongo schema for `UpcomingRelease`
- [x] Define Mongo schema for `Notification`
- [x] Define Mongo schema for `UserSettings`
- [x] Add `user_id` ownership to `Book`
- [x] Add `user_id` ownership to `Series`
- [x] Add `user_id` ownership to `Collection`
- [x] Add `user_id` ownership to `UpcomingRelease`
- [x] Add `user_id` ownership to `Notification`
- [x] Add `user_id` ownership to `UserSettings`
- [x] Decide whether `user_settings` is one document per user or embedded in `users`
- [x] Add API route structure for books
- [x] Add API route structure for series
- [x] Add API route structure for collections
- [x] Add API route structure for upcoming releases
- [x] Add API route structure for notifications
- [x] Add API route structure for user settings
- [x] Add protected `GET /books`
- [x] Add protected create/update/delete book endpoints
- [x] Add ownership enforcement in every protected book route
- [x] Add server-side validation for book payloads
- [x] Add ownership enforcement in every protected series route
- [x] Add server-side validation for series payloads
- [x] Add ownership enforcement in every protected collection route
- [x] Add server-side validation for collection payloads
- [x] Add ownership enforcement in every protected upcoming release route
- [x] Add server-side validation for upcoming release payloads
- [x] Add ownership enforcement in every protected notification route
- [x] Add server-side validation for notification payloads
- [x] Add ownership enforcement in every protected user settings route
- [x] Add server-side validation for user settings payloads
- [x] Introduce a repository boundary in the frontend if one is missing for remote-backed flows
- [x] Refactor book reads to come from the API instead of directly from IndexedDB for authenticated users
- [x] Refactor book writes to go through the API for authenticated users
- [x] Refactor settings reads/writes to use remote persistence for authenticated users
- [x] Decide how unauthenticated local state behaves before login
- [x] Verify one authenticated user cannot access another user's records

Definition of done:

- authenticated users can create, read, update, and delete books in MongoDB
- settings and related entities are owned by the signed-in user
- frontend library views can load from remote data

## Phase 3: IndexedDB Import and Backward Compatibility

Goal:
Existing local users can bring their library into the authenticated MongoDB-backed app without losing data.

Checklist:

- [x] Inventory all IndexedDB stores that contain user data
- [x] Define the canonical import order for related entities
- [x] Decide duplicate-handling rules for imported books, series, and collections
- [x] Add a `migration_status` collection or equivalent tracking field
- [x] Detect whether legacy IndexedDB data exists for the current browser
- [x] Detect whether the signed-in user already completed migration
- [x] Build a client-side export/collection step from IndexedDB data
- [x] Build protected import endpoints or batch import handling
- [x] Add migration summary UI before import starts
- [x] Add progress UI during import
- [x] Add failure reporting for partial imports
- [x] Add idempotency protection so refresh/retry does not duplicate records
- [x] Add retry path for failed migration attempts
- [x] Keep IndexedDB intact until migration is confirmed complete
- [x] Decide whether post-migration local cache is cleared, retained, or marked stale
- [x] Test migration with realistic legacy data

Definition of done:

- a legacy IndexedDB user can sign in and import their library once
- repeated imports do not silently duplicate data
- failures can be retried safely

## Phase 4: Admin, Import/Export, and Destructive Actions

Goal:
Operational tooling reflects the new remote source of truth and does not perform unsafe local-only actions.

Checklist:

- [x] Audit [src/pages/AdminPage.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/pages/AdminPage.tsx) and all debug utilities for local-only assumptions
- [x] Separate local cache diagnostics from remote database diagnostics
- [x] Add session/account diagnostics to admin
- [x] Add migration diagnostics and retry controls to admin
- [x] Review [src/components/ImportExportView.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/components/ImportExportView.tsx) for remote-data assumptions
- [x] Decide export source of truth: Mongo only, local cache only, or both
- [x] Update export flow to clearly communicate what is being exported
- [x] Update import flow to distinguish legacy migration from normal import
- [x] Redesign delete-library action for remote library deletion only
- [x] Add separate clear-local-cache-only action
- [x] Add separate account-deletion action if account deletion is in scope
- [x] Add confirmation UX that reflects the actual destructive scope
- [x] Prevent local reset utilities from implying remote deletion
- [x] Prevent remote deletion from silently leaving stale local state behind

Definition of done:

- admin/debug tools reflect remote plus local state correctly
- import/export is explicit about scope
- destructive actions are clearly separated and safe

## Phase 4a: System Update Announcements

Goal:
Add an in-app announcement system for product updates, maintenance notices, and other app-level messages without conflating them with reading or release notifications.

Checklist:

- [x] Define a separate `SystemAnnouncement` model instead of reusing release notifications directly
- [x] Define a per-user `UserAnnouncementState` model for `seen` and `dismissed` tracking
- [x] Decide the initial announcement fields:
  - `title`
  - `body`
  - `kind`
  - `severity`
  - `isActive`
  - `startsAt`
  - `endsAt`
  - `minAppVersion`
  - `maxAppVersion`
  - `environment`
  - `ctaLabel`
  - `ctaUrl`
- [x] Decide announcement authoring scope for v1:
  - admin-created only
  - optionally seeded manually from the database or deployment scripts
  - no end-user authoring
- [x] Decide targeting rules for v1:
  - all signed-in users by default
  - optional app-version targeting
  - optional environment targeting (`preview`, `production`, or `all`)
- [x] Add Mongo schema for `SystemAnnouncement`
- [x] Add Mongo schema for `UserAnnouncementState`
- [x] Add protected API route to fetch active announcements for the current user
- [x] Add protected API route to mark an announcement as seen
- [x] Add protected API route to dismiss an announcement
- [x] Add admin-only API routes to create, update, activate, deactivate, and delete system announcements
- [x] Add server-side filtering so users only receive active announcements that match their app version and environment
- [x] Keep announcement content centralized instead of duplicating one notification document per user
- [x] Decide where app version is read from at runtime for matching announcements
  - use the `X-App-Version` request header from the client with `APP_VERSION` or `2.0.0` fallback on the server
- [x] Add frontend repository or API client for system announcements
- [x] Add an initial in-app announcement surface for authenticated users
- [x] Route app updates into the existing `Notifications` entry point instead of keeping a separate announcement surface
- [x] Split the notifications UI into separate tabs for:
  - `App Updates`
  - `Book Alerts`
- [x] Keep app updates and book alerts separate in the UI while sharing one notification entry point
- [x] Add unread indicator logic for unseen announcements
- [x] Add dismiss behavior that permanently hides the specific announcement for that user
- [x] Decide critical-announcement behavior for v1:
  - critical announcements remain dismissible
  - pinned or forced-visible announcements are out of scope
- [x] Add admin/debug diagnostics for active announcements and per-user state
- [x] Add admin UI for composing and sending system announcements
- [x] Decide deploy-time publishing behavior for v1:
  - admin authoring is the only publishing path for now
  - deploy-time seeding is out of scope
- [ ] Add tests for visibility targeting, seen tracking, dismiss behavior, and version/environment filtering

Current implementation:

- announcements are authored by admins from the admin dashboard
- announcement content lives in `system_announcements`
- per-user read and dismiss state lives in `user_announcement_states`
- users receive app updates through the existing `Notifications` button
- the notifications UI now separates:
  - `App Updates` for system announcements
  - `Book Alerts` for release and reading-related notifications
- unread counts combine both sources at the header level, but state management remains separate under the hood
- the standalone floating or inline "What's New" treatment is no longer the product direction

Current direction:

- keep one notifications entry point in the header
- keep app updates and book alerts separate in the UI and data model
- use admin authoring as the primary publishing path for v1
- treat browser push notifications as explicitly out of scope
- keep critical announcements dismissible in v1
- do not add deploy-time seeding in v1

Definition of done:

- app-update messages are delivered in-app to the intended users through the notifications UI
- announcements are distinct from release/book notifications in both data model and tab behavior
- users can see, read, and dismiss announcements without duplicating announcement content per user
- announcement targeting works for version and environment rules
- the notifications entry point clearly separates `App Updates` from `Book Alerts`

## Phase 4b: Admin Users and Role Management

Goal:
Introduce admin-capable users so privileged operational actions are restricted to authorized accounts instead of being available to every signed-in user, including full user-management authority for signed-up accounts.

Checklist:

- [x] Define the initial role model for v1:
  - `user`
  - `admin`
  - optional future `super_admin` or equivalent, but do not overbuild it now
- [x] Decide where role data lives:
  - embedded on `users`
  - separate role-assignment collection only if there is a concrete need
- [x] Add role fields to the `User` model and server-side user serializers
- [x] Decide how the first admin user is created:
  - bootstrap from `ADMIN_USER_EMAIL`
  - bootstrap from `ADMIN_USER_PASSWORD`
  - create or reconcile the first admin user during server startup or a protected bootstrap path
- [x] Define the exact bootstrap behavior for `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD`:
  - create the admin if no matching user exists
  - upgrade the matching user to admin if the email already exists
  - decide whether the env password overwrites an existing admin password or only applies on first creation
- [x] Add environment variable requirements for admin bootstrap:
  - `ADMIN_USER_EMAIL`
  - `ADMIN_USER_PASSWORD`
- [x] Decide whether admins are global across the whole app or limited to specific capabilities
  - admins are global across the app in v1
- [x] Define the exact permissions for v1 admins:
  - view admin dashboard
  - view the existing admin dashboard in the context of a specific user account
  - create and send system announcements
  - manage existing system announcements
  - view migration diagnostics across users if needed
  - list signed-up users
  - inspect an individual user's account/library/admin state
  - reset user passwords
  - delete user accounts
  - promote users to admin
  - demote other admins with safeguards
- [x] Define whether admins can impersonate/switch context into a target user's admin dashboard or whether the dashboard loads a selected user's data without full impersonation
  - v1 uses selected-user inspection context, not impersonation
- [x] Add backend user-management routes for admins:
  - list users
  - get user details/admin diagnostics
  - reset a user's password
  - delete a user's account
  - promote a user to admin
  - demote an admin user
- [ ] Add admin-only announcement-management routes or reuse the Phase 4a announcement routes with admin guards
- [x] Decide the safe password-reset flow for v1:
  - admin sets a temporary password
  - admin triggers a reset token/email flow
  - another explicit mechanism
- [x] Decide whether user deletion by admins performs the same full cleanup path as self-service account deletion
- [x] Decide that admin user deletion is permanent, not soft-deleted
- [x] Require a second confirmation before admin account deletion proceeds
- [x] Prevent admins from deleting their own account
- [x] Show a deletion summary before admin account deletion proceeds
- [x] Prevent admins from demoting themselves
- [x] Prevent removing the last remaining admin
- [x] Add server-side role helpers and permission guards for protected admin routes
- [x] Prevent non-admin users from accessing admin-only API routes
- [x] Prevent non-admin users from accessing admin-only UI surfaces
- [x] Update auth bootstrap so the frontend knows whether the current user is an admin
- [x] Add route protection for admin pages and components
- [x] Make [src/pages/AdminPage.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/pages/AdminPage.tsx) accessible only to admin users
- [x] Refactor [src/pages/AdminPage.tsx](/Users/miprice/Repositories/windsurf-workspace/book-collection-app/book-collection-app/src/pages/AdminPage.tsx) to support an admin-only user selector / selected-user context switcher
- [ ] Add admin user-management UI:
  - user list/search
  - user detail view
  - password reset action
  - account deletion action
  - promote-to-admin action
  - remove-admin action
  - system announcement composer/manager
  - entry point into the selected user's admin dashboard
- [x] Add audit/logging plan for privileged admin actions
- [x] Ensure destructive admin actions require explicit confirmation and are clearly role-gated
- [ ] Add tests for:
  - admin access allowed
  - non-admin access denied
  - admin-only API route enforcement
  - role exposure during auth bootstrap
  - admin can list users
  - admin can open a selected user's dashboard context
  - admin password reset flow works as designed
  - admin account deletion performs the intended cleanup
  - admin promotion and demotion work with the intended safeguards
- [ ] Add deployment/setup documentation for creating and maintaining admin users
- [ ] Document admin bootstrap safety requirements for Vercel environments so these credentials are not omitted or changed accidentally

Current slice status:

- [x] Add backend admin route for listing users
- [x] Add basic read-only admin user list UI
- [x] Add backend admin route for selected-user detail and counts
- [x] Add selected-user inspection panel to the admin dashboard
  - include last-login visibility for admins
- [x] Add backend admin account-deletion route
- [x] Add permanent admin account-deletion UI with self-delete blocked
- [x] Add second-confirmation requirement and pre-delete summary for admin account deletion
- [x] Add backend admin role-change route
- [x] Add admin promote/demote controls in the selected-user panel
- [x] Enforce no self-demotion and no removal of the last remaining admin
- [x] Decide the v1 admin password reset flow: generate a temporary password and invalidate existing sessions
- [x] Add backend admin password-reset route
- [x] Add admin temporary-password UI in the selected-user panel
- [x] Invalidate existing sessions when an admin resets a user's password
- [x] Add persistent `admin_audit_logs` collection writes for privileged admin mutation routes
- [x] Expose admin audit logs in a dedicated admin tab

Remaining coding work in Phase 4b:

- [ ] Finish the remaining admin user-management UI scope by adding system announcement management when Phase 4a starts
- [ ] Add admin-only announcement-management routes and UI once Phase 4a implementation starts
- [ ] Add deployment/setup documentation for admin bootstrap and maintenance
- [ ] Document admin bootstrap safety requirements for Vercel environments
- [ ] Add automated coverage in Phase 5 for admin access control and admin mutation flows

Definition of done:

- admin-only capabilities are inaccessible to normal users
- the app has a defined, repeatable process for creating the first admin user from `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD`
- frontend and API both enforce admin-only access to the admin page and admin surfaces
- admins can manage signed-up users, reset passwords, delete accounts, promote or demote admins with safeguards, and inspect the existing admin dashboard for a selected user
- admins can create and send system notifications to users through the app's announcement system
- privileged operational actions are intentionally scoped and documented

## Phase 4c: User-Initiated Password Reset (Paused)

Goal:
Allow signed-up users to request and complete their own password resets through a secure self-service flow instead of relying only on admin intervention.

Checklist:

- [x] Decide the reset delivery mechanism for v1:
  - email OTP
  - one-time recovery code shown through another verified channel
  - do not implement insecure plain-text reset flows
- [x] Decide the email provider or delivery mechanism if email is used
- [x] Add environment variable requirements for password-reset delivery and token signing
- [x] Define password-reset OTP fields and storage:
  - otp hash
  - user id
  - expiration timestamp
  - consumed timestamp
  - attempt count
  - request metadata as needed for audit/rate limiting
- [x] Decide whether OTP records live on the `users` collection or in a separate password-reset collection
- [x] Add protected/unprotected API routes for:
  - requesting a password reset
  - verifying an emailed OTP
  - submitting a new password with a valid OTP
- [x] Ensure password-reset requests do not leak whether an email address exists
- [ ] Add rate limiting and abuse protection for password-reset requests
- [x] Add expiration, attempt-limit, and single-use enforcement for OTP records
- [x] Invalidate prior OTPs after a successful password reset
- [x] Decide whether resetting a password invalidates existing sessions for that user
- [x] Add frontend UI for:
  - "Forgot password" entry point on login
  - request-reset form
  - verify-OTP form
  - reset-password form
  - success and failure states
- [x] Add clear UX copy for expired OTPs, invalid OTPs, attempt exhaustion, and already-consumed OTPs
- [ ] Add audit/logging for password-reset requests and completions
- [ ] Add tests for:
  - request flow
  - non-enumerating responses
  - OTP validation
  - OTP expiration
  - attempt exhaustion
  - single-use behavior
  - successful password reset
  - session invalidation behavior if enabled
- [ ] Come back after deployment and manually verify the full password-reset flow end to end:
  - request OTP
  - receive OTP email
  - verify OTP in the app
  - set a new password
  - confirm old sessions are rejected
- [x] Add deployment/setup documentation for the password-reset delivery provider and related env vars

Definition of done:

- users can securely request their own password reset
- the flow does not leak account existence
- emailed OTPs are single-use, rate-limited, and expire correctly
- password reset behavior is tested and documented

## Phase 4d: Entry Experience and Login Page Enhancement

Goal:
Turn the login page into a real entry experience that explains what the app does, who it is for, and why a visitor should sign in instead of presenting only a bare authentication form.

Checklist:

- [x] Audit the current login and register pages for missing product context
- [ ] Decide the primary goals of the entry page:
  - explain the app's purpose
  - highlight key features
  - set expectations about accounts and cloud sync
  - direct returning users to sign in quickly
- [x] Decide whether login and register remain separate pages or become a shared entry shell with auth mode switching
- [x] Define the key product messaging for first-time visitors:
  - what the app is
  - what users can track
  - why signing in matters now that MongoDB/account storage exists
- [x] Add visible explanation of the app's core value without overwhelming the auth flow
- [x] Add product highlights or feature bullets for the authenticated experience
- [x] Add clear account/storage messaging:
  - account-backed library
  - remote sync/persistence
  - legacy browser import support if relevant
- [x] Add direct access from the entry experience to:
  - changelog
  - known issues
  - roadmap
  - privacy
  - about
- [x] Decide whether to include supporting visuals:
  - screenshot/mock device frame
  - branded illustration
  - feature cards
- [x] Ensure the page still keeps the sign-in form immediately accessible on desktop and mobile
- [ ] Add clear navigation between sign in, register, and forgot-password flows
- [ ] Review privacy and trust messaging on the entry page so it matches the new Mongo/account model
- [ ] Ensure the page works for:
  - returning users who want fast login
  - new users who need product explanation
  - mobile layouts
  - visitors who want to inspect product/legal/project information before creating an account
- [ ] Add tests or manual QA checklist for:
  - auth flow still works
  - responsive layout
  - entry-page links to changelog, known issues, roadmap, privacy, and about work correctly
  - no misleading local-only messaging remains

Definition of done:

- the login page explains the app clearly to first-time visitors
- the auth form remains fast and usable for returning users
- visitors can reach changelog, known issues, roadmap, privacy, and about information from the entry page
- entry-page messaging matches the authenticated Mongo-backed product model

## Phase 4e: Logged-In Account Security Settings (Completed)

Goal:
Allow authenticated users to manage their own account credentials while signed in, including changing their email address and password from inside the app.

Checklist:

- [x] Decide where account-security settings live in the signed-in UI:
  - settings modal
  - dedicated account page
  - dedicated security subsection
- [x] Add authenticated API route for changing a user's email address
- [x] Add authenticated API route for changing a user's password
- [x] Require current-password verification before changing email
- [x] Require current-password verification before changing password
- [x] Enforce unique-email validation when changing email
- [x] Decide whether email changes require re-verification before taking effect
- [x] Invalidate existing sessions after a password change
- [x] Decide whether email changes also invalidate existing sessions
- [x] Add frontend UI for:
  - updating email
  - updating password
  - success and error states
- [x] Add clear UX copy for incorrect current password, email already in use, weak password, and session expiration after credential changes
- [x] Add audit/logging for user-initiated email and password changes
- [x] Manually verify:
  - successful email change
  - duplicate-email rejection
  - successful password change
  - incorrect current-password rejection
  - session invalidation behavior after password change
- [ ] Add automated tests in Phase 5 for:
  - successful email change
  - duplicate-email rejection
  - successful password change
  - incorrect current-password rejection
  - session invalidation behavior after password change

Definition of done:

- signed-in users can securely change their own email and password
- credential-change flows require current-password confirmation
- password changes invalidate prior sessions as intended
- account-security settings are clear and tested

## Phase 4f: Quality-of-Life Updates

Goal:
Improve everyday usability without changing the underlying data or auth model.

Checklist:

- [ ] Reorganize the Settings information architecture so related controls are grouped more clearly
  - reduce the sense of a long flat list of unrelated sections
  - make destructive actions visually separate from normal preferences
  - improve discoverability of account/security controls versus library/view controls
- [ ] Review the Settings navigation order and labels for clarity
- [ ] Improve the Settings layout so high-frequency tasks are easier to find
- [ ] Revisit the admin dashboard presentation of `Session & Account Diagnostics` and `Settings Snapshot`
  - decide whether they should be simplified, merged, moved, or redesigned
  - reduce clutter if they are no longer the right default admin landing content
- [ ] Add or expose `last modified` metadata for records that users can change
  - decide which entities should surface this in the UI
  - ensure the timestamps are updated consistently on edits
  - decide where `last modified` is helpful versus noisy
- [x] Prefill the `Preferred Name` field from the signed-in user's account record
  - use the current account value as the default instead of a blank or divergent local value
  - keep the settings form and account document in sync
- [x] Persist preferred-name edits back to the user account record
  - update the database when the preferred name changes
  - ensure the refreshed value is reflected consistently across the app
- [ ] Add password-visibility toggles to relevant password inputs across the app
  - login
  - register
  - forgot-password reset form
  - logged-in password-change form
- [ ] Use an eyeball icon control with clear accessible labels for show/hide password
- [ ] Ensure the password toggle works correctly on desktop and mobile
- [ ] Ensure toggling visibility does not break autofill or password-manager behavior
- [ ] Add consistent spacing and interaction states for the password-visibility control
- [ ] Add manual QA for:
  - login password visibility
  - register password visibility
  - reset-password visibility
  - settings password-change visibility

Definition of done:

- settings feel more organized and easier to scan
- users can reveal or hide password fields where it improves usability
- password visibility controls are accessible and consistent
- password entry flows remain stable with browser autofill and password managers

## Phase 5: Testing, Deployment, and Hardening

Goal:
Ship the migration safely on Vercel with predictable auth and data behavior.

Checklist:

### Phase 5a: Manual Production-Readiness QA

- [ ] Verify auth bootstrap and protected-route behavior end to end
- [ ] Verify login, register, logout, and `me` behavior in the deployed app
- [ ] Verify book CRUD through the authenticated app shell
- [ ] Verify series and collections flows end to end
- [ ] Verify import/export flows, including JSON and backup restore behavior
- [ ] Verify legacy migration with realistic IndexedDB/localStorage data
- [ ] Verify destructive actions:
  - `Clear Books`
  - `Start Fresh`
  - `Delete Account`
- [ ] Verify admin actions:
  - view/filter users
  - inspect selected user
  - promote/demote with safeguards
  - admin password reset
  - admin account deletion
- [ ] Verify system announcements in Notifications:
  - admin create/update/delete
  - user seen/dismiss behavior
  - `App Updates` / `Book Alerts` tab behavior
- [ ] Verify paused Phase 4c password-reset flow end to end in deployed environments

### Phase 5b: Deployment and Environment Verification

- [ ] Add Vercel deployment configuration review
- [ ] Verify env var names and runtime expectations in Vercel
- [ ] Verify cold-start-safe Mongo connection behavior
- [ ] Verify JWT behavior across local and deployed environments
- [ ] Verify deployed OTP email delivery and related password-reset env configuration
- [ ] Add local development setup instructions for Mongo and env vars

### Phase 5c: Automated Coverage

- [x] Add frontend tests for auth bootstrap and protected route behavior
- [x] Add API tests for register, login, and `me`
- [x] Add API tests for per-user data ownership enforcement
- [x] Add tests for book CRUD through authenticated routes
- [x] Add tests for migration happy path
- [x] Add tests for migration retry and duplicate prevention
- [x] Add tests for destructive actions
- [x] Add tests for admin access control and admin mutation flows
- [x] Add tests for system announcement targeting, seen tracking, and dismiss behavior
- [x] Add automated coverage for Phase 4e account-security flows

### Phase 5d: Operations and Recovery

- [ ] Document rollback or recovery strategy if migration issues are found after deploy
- [ ] Document deployment-time verification and release signoff steps

Definition of done:

- app works locally and on Vercel
- auth and CRUD are stable
- migration is tested
- operational risks are documented
- high-risk user and admin flows have both manual QA and targeted automated coverage

## Open Decisions

- [x] Choose exact server structure for Vercel in this repo: use `api/`
- [ ] Decide whether the frontend should keep any offline-first cache after remote sync is introduced
- [ ] Decide the exact `User` fields required for v1
- [ ] Decide the exact export format for Mongo-backed user data
- [ ] Decide whether account deletion is part of v1
- [ ] Decide whether migration is prompted immediately after login or from a separate screen
- [x] Decide whether system announcements live in the notification center, a dedicated "What's New" surface, or both
  - v1 uses a dedicated "What's New" surface
- [ ] Decide how system announcements are authored for v1: direct Mongo seed data, admin UI, or deploy-time script
- [ ] Decide whether critical system announcements are dismissible or pinned until acknowledged
- [ ] Decide whether admin access to a user's dashboard is full impersonation or selected-user inspection context
- [ ] Decide the v1 password-reset mechanism for admin-managed users
- [x] Decide whether `ADMIN_USER_PASSWORD` is bootstrap-only or a standing password source for the bootstrap admin account
- [ ] Decide whether admins can demote themselves and what protections prevent removing the final admin
- [ ] Decide whether all admins can send system notifications or whether that should be a narrower permission later
- [x] Decide the delivery mechanism and provider for user-initiated password reset
- [ ] Decide whether logged-in email changes require email verification before completion
- [ ] Decide whether email changes should invalidate existing sessions the same way password changes do

## Working Notes

- The branch name is now slightly misleading for the actual feature scope. It can be renamed later, but that is not required to start Phase 1.
- API routes/functions will live under `api/` in this repo.
- Phase 4a system announcements should be in-app only for v1. Browser push notifications are explicitly out of scope for that phase.
- Phase 4b should start with the smallest role model that safely gates admin-only behavior. Do not build a full RBAC system unless the requirements actually demand it.
- Phase 4b now explicitly includes user management. The admin dashboard should be admin-only and needs a selected-user context model, not just a hidden route.
- The first admin account should be bootstrapped from `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD`.
- `ADMIN_USER_PASSWORD` is bootstrap-only in v1. If the env email already belongs to a user, that user is upgraded to admin and the existing password is not overwritten.
- Phase 4b includes admin promotion and demotion in v1, but only with explicit safeguards: no self-demotion and no removal of the final remaining admin.
- Admin-authored system notifications should use the Phase 4a announcement system, not the book/release notification model.
- Phase 4c should remain separate from admin resets. User self-service password reset has a different threat model and should not be implemented as a shortcut on top of admin tooling.
- Phase 4c now uses a Resend-backed email OTP flow with `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL`. Existing JWT sessions are invalidated after a successful password reset.
- Phase 4c is paused pending deployed end-to-end verification, rate limiting, audit logging, and tests.
- Phase 4e is user-managed account security, not admin-managed user administration. Keep those flows separate.
- Phase 4e has been manually verified and is complete for feature work. Automated coverage belongs to Phase 5.
- Phase 4e v1 keeps account-security settings in the signed-in settings modal.
- Phase 4e v1 applies email changes immediately without re-verification and refreshes the auth token instead of signing the user out.
- Phase 4f should stay limited to low-risk usability improvements and should not silently expand into auth-model changes.
- This document should be updated by checking off tasks as implementation lands.
