# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), adapted for continuous deployment with
date-based releases.

## [Unreleased]

Changes deployed to development, pending production promotion.

### Fixed

- Stale policy content shown when switching between policies in sidebar (#6)
- Progress spinner stuck on "Scheduling Request…" during policy extraction and translation (#6)
- Flash of "No Policy Documents" empty state on page reload (#6)

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
