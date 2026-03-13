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
- Added authenticated delete-library, reset-library, clear-local-cache, and delete-account flows
- Added account-aware destructive action confirmations and local-cache cleanup after remote destructive actions
- Updated the app to support authenticated settings and account-scoped data management

### In Progress

- Admin and debug tooling audit for remote-versus-local assumptions
- Import and export UX clarification for remote data versus legacy/local data
- Final destructive-action cleanup and explicit remote-library wording across the UI
- Expanded automated and manual test coverage for auth, migration, and destructive actions

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
