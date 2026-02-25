---
title: Storage Layout
summary: KVS key patterns, data lifecycle, and concurrency control
description: Describes the key-value storage schema, caching strategies, and job tracking namespace.
---

The EC2U PhD Agreements Tool uses Atlassian Forge's key-value storage (KVS) with a hierarchical naming convention. All
content keys are page-scoped — the page identifier is the root segment.

# Key Patterns

## Policy Documents

**Pattern:** `{page}:policies:{source}[:{language}]`

- **Original documents:** `{page}:policies:{source}`
- **Translations:** `{page}:policies:{source}:{language}`
- **Data Type:** `Document` (defined in `src/shared/items/documents.ts`)
- **Example:** `abc123:policies:att789` or `abc123:policies:att789:en`

## Issues

**Pattern:** `{page}:issues:{issueId}`

- **Data Type:** `Issue` (defined in `src/shared/items/issues.ts`)
- **issueId:** UUID generated for each detected issue
- **Example:** `abc123:issues:f47ac10b-58cc-4372-a567-0e02b2c3d479`

## Collection Sentinels

**Pattern:** `{page}:issues`

- **Data Type:** `Status<void>` — `Activity` during analysis, `Trace` on failure, empty on success
- **Purpose:** signals analysis progress on the issues collection

## Job Tracking

**Pattern:** `{page}:convert:{source}[:{language}]` | `{page}:analyse`

- **Data Type:** `JobState` — job identifier and current `Activity`
- **Purpose:** tracks active async jobs for deduplication and progress reporting
- **Namespace isolation:** keys use `:convert:` and `:analyse` prefixes, deliberately outside `:policies:` and
  `:issues:` to avoid collisions with `beginsWith` scans on data keys

## System Metadata

**Pattern:** `system:{key}`

- **Purge tracking:** `system:purged` stores the last global purge timestamp
- **Purpose:** global system state and maintenance information

# Catalogue Caching

The two resource catalogues differ in caching and unpacking:

- **Policies catalogue** (`getPolicies`): derived dynamically from attached PDF documents — not cached itself.
  Individual policy content (`policyKey`) is extracted, optionally translated, and cached independently.
- **Issues catalogue** (`getIssues`): an aggregate of individual issue entries (`issueKey`). The array is unpacked into
  individual cache entries on the client.

# Catalogue Caching

The two resource catalogues differ in caching and unpacking:

- **Policies catalogue** (`getPolicies`): derived dynamically from attached PDF documents — not cached itself.
  Individual policy content (`policyKey`) is extracted, optionally translated, and cached independently.
- **Issues catalogue** (`getIssues`): an aggregate of individual issue entries (`issueKey`). The array is unpacked into
  individual cache entries on the client.

# Caching Strategies

## Timestamp-Based Validation

- Policy content validated against attachment modification timestamps
- Content cache entries purged if `cached.created < attachment.createdAt`
- Automatic staleness detection on read

## Lazy Purging

- **Global purge:** runs every 24 hours in background after each async task
- **Selective purging:** removes entries for deleted Confluence pages
- **Manual purging:** available via `clearCache()` resolver

## Translation Optimisation

- Original documents cached separately from translations
- Each language gets its own cache entry
- Avoids redundant extraction when only a new translation is needed

# Data Lifecycle

## Policy Document Lifecycle

```
Read → [Extract → Cache] → [Translate → Cache Translation]
```

- Extraction triggered on first read or when cached value is stale
- Original and translations cached as separate keys
- Staleness checked against source attachment metadata

## Issue Lifecycle

```
Analyse → Store → [Update state] → [Update severity] → [Annotate]
```

- Issues are append-only — new analysis adds issues without overwriting existing ones
- Individual issue mutations write directly to the per-issue key
- Collection semantics: the collection sentinel signals progress; individual issue keys hold the data

# Query Patterns

- **Page scope:** `{page}:*` — all data for a page
- **Policies only:** `{page}:policies:*` — all policies for a page
- **Issues only:** `{page}:issues:*` — all issues for a page
- **Job tracking:** `{page}:convert:*` and `{page}:analyse` — active async jobs
- **System data:** `system:*` — global metadata

# Concurrency Control

Concurrent access to the same resource is handled by lockless two-stage job deduplication — see
[Job Scheduling](scheduling.md) for the full design. Job tracking keys (`{page}:convert:*`, `{page}:analyse`) store the
current `JobState`, which the resolver gate and worker gate both check before proceeding.
