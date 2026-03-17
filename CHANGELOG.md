# Changelog

All notable changes to this project are documented in this file.

## [2.0.0] - 2026-03-13

This release moves the app from a browser-only library manager to an authenticated, MongoDB-backed application deployed with Vercel functions.

### Completed

- Added single-account authentication with register, login, logout, and authenticated session restore
- Added protected Vercel API routes backed by MongoDB
- Added MongoDB persistence for books, series, collections, upcoming releases, notifications, and user settings
- Added per-user ownership enforcement across authenticated API routes
- Added repository-backed frontend data access for authenticated sessions
- Added legacy IndexedDB import flow with migration detection, summary UI, progress reporting, retry handling, and duplicate protection
- Added authenticated delete-library, reset-library, and delete-account flows
- Added account-aware destructive action confirmations and local-cache cleanup after remote destructive actions
- Added admin bootstrap from environment variables and admin-only access to the admin dashboard
- Added admin user management with user listing, filtering, selected-user inspection, last-login visibility, promote/demote safeguards, admin password reset, permanent account deletion, and persistent admin audit logs
- Added in-app system announcements with admin authoring, per-user seen and dismiss state, environment and app-version targeting, and integration into the Notifications UI under `App Updates`
- Added a richer login entry experience with direct access to changelog, known issues, roadmap, privacy, and about content
- Added logged-in account security settings for changing email, changing password, and syncing preferred name to the account record
- Added password visibility toggles to key auth and account-security password fields
- Reorganized Settings with clearer sections for General, Appearance, Import & Export, Library Management, Account, and Log Out
- Updated the app to support authenticated settings and account-scoped data management

### In Progress

- User-initiated password reset hardening and deployed end-to-end verification
- Quality-of-life polish for Settings and admin information architecture
- Additional last-modified metadata for editable records where it adds value
- Expanded automated and manual test coverage for admin, announcements, account security, migration, and destructive actions

## [1.2.2]

### Fixed

- Fixed an out-of-memory crash when saving edited books
- Resolved an infinite loop in search index rebuild during book updates
- Improved data handling between UI and database layers

## [1.2.1]

### Added

- Added About page with changelog, known issues, roadmap, privacy, and about tabs
- Added footer navigation links

## [1.2.0]

### Added

- Full local-first library manager with books, series, collections, insights, import/export, settings, and API book search

## [1.0.0]

### Added

- Initial release with core library tracking and Google Books integration
