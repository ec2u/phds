# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), adapted for continuous deployment with
date-based releases.

## [Unreleased]

Changes deployed to development, pending production promotion.

### Added

- Automated Forge deployment via GitHub Actions on release branch push (#7)
- Configurable sort mode and direction for issues list (#29)
- Title filter in issues sidebar with word-boundary stem matching (#15)
- Server-side agreement content management with observable store integration (#28)
- Distinct error states for agreement and policy retrieval failures (#28)
- Dismiss action on error traces across all views (#18)
- Runtime schema validation for Gemini structured responses, replacing silent fallback on invalid output
- Non-blank pattern constraints on Gemini analysis response schema

### Fixed

- Gemini API errors reported as raw JSON dumps instead of human-readable messages with actionable hints (#8)
- Spurious whitespace and newlines in issue title and description from LLM output

- Issue mutation errors (rejections and server-reported traces) leaving UI stuck on activity spinner (#18)
- "Refresh Analysis" button disabled when no analysis has been performed (#18)
- Stale issues and sidebar controls shown during refresh and clear operations
- Annotation text area blank when entering edit mode after cross-window sync (#31)
- Stale policy content shown when switching between policies in sidebar (#6)
- Progress spinner stuck on "Scheduling Request…" during policy extraction and translation (#6)
- Flash of "No Policy Documents" empty state on page reload (#6)
- Translated policy documents not cached on server across page reloads (#26)
- Status pattern matcher routing activities and traces to value handler when specific handler is missing (#26)
- Stale issue count shown in sidebar after clearing issues (#26)
- Bogus empty issues included in analysis results (#26)
- Stale issues surviving across re-analysis runs (#26)
- Server crash on legacy issues missing description field (#26)
- Issues list not re-sorting after issue state or severity update (#26)
- Event-driven issue and policy updates not propagating to catalogue observers across windows (#26)
- Stale job-tracking entries left in KVS after async task completion (#31)
- Analysis results lost on partial KVS write failure during issue caching (#31)
- Issues endpoint returning stale results instead of current progress during analysis (#31)
- Title filter losing focus after each keystroke due to nested sidebar component remounting (#15)

### Added

- "Refresh Content" action for clearing individual policy cache, replacing bulk "Clear Policies" (#31)
- Separate "Clear Issues" action replacing the combined "Clear" button

### Changed

- Tighten border radii across UI components from medium/large to small
- Error traces cached uniformly — errors persist until explicitly dismissed instead of silently retried (#18)
- Reassign state colors: pending=red, active=yellow
- Use catalog-specific state ordering (blocked < active < pending < resolved) in issues list
- Migrate prompt management from Langfuse to local codebase files

### Removed

- Langfuse dependency and external permission

## [2026-01-09]

### Added

- Lane item count in kanban view

### Fixed

- Document structure detection ignores trailing empty paragraphs

## [2025-12-05]

Initial production baseline.
