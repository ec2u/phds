# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), adapted for continuous deployment with
date-based releases.

## [Unreleased]

Changes deployed to development, pending production promotion.

### Added

- Runtime schema validation for Gemini structured responses, replacing silent fallback on invalid output
- Non-blank pattern constraints on Gemini analysis response schema

### Fixed

- Gemini API errors reported as raw JSON dumps instead of human-readable messages with actionable hints (#8)
- Spurious whitespace and newlines in issue title and description from LLM output

- "Refresh Analysis" button disabled when no analysis has been performed (#18)
- "Clear Policies" button enabled while individual policy extraction is in progress (#18)
- Stale issues and sidebar controls shown during refresh and clear operations
- "Clear Policies" not evicting cached individual policy documents from local cache
- Stale policy content shown when switching between policies in sidebar (#6)
- Progress spinner stuck on "Scheduling Request…" during policy extraction and translation (#6)
- Flash of "No Policy Documents" empty state on page reload (#6)
- Selected policy not cleared when clearing all policies (#26)
- "Clear Policies" incorrectly showing empty state instead of preserving policy catalogue (#26)
- Translated policy documents not cached on server across page reloads (#26)
- Status pattern matcher routing activities and traces to value handler when specific handler is missing (#26)
- Stale issue count shown in sidebar after clearing issues (#26)
- Bogus empty issues included in analysis results (#26)
- Stale issues surviving across re-analysis runs (#26)
- Server crash on legacy issues missing description field (#26)
- Issues list not re-sorting after issue state or severity update (#26)
- Event-driven issue and policy updates not propagating to catalogue observers across windows (#26)
- Clear policies and clear issues events not propagating across windows (#26)

### Added

- Separate "Clear Policies" and "Clear Issues" actions replacing the single "Clear" button

### Changed

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
