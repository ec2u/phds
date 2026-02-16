---
title: Storage Layout
summary: KVS key patterns, data lifecycle, and concurrency control
description: Describes the hierarchical key-value storage schema, caching strategies, and locking mechanism.
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
- **Purpose:** signals analysis progress on the issues collection (see
  [Issue Collection](api.md#issue-collection))

## Lock Catalogues

**Pattern:** `{page}`

- **Data Type:** `LockCatalog` (defined in `src/server/tools/cache.ts`)
- **Purpose:** stores all active locks for a page with optimistic concurrency control via version tracking

## System Metadata

**Pattern:** `system:{key}`

- **Purge tracking:** `system:purged` stores the last global purge timestamp
- **Purpose:** global system state and maintenance information

# Data Structures

Data types stored in KVS are defined in the shared layer:

- **Document:** `src/shared/items/documents.ts`
- **Issue:** `src/shared/items/issues.ts`
- **Language:** `src/shared/items/languages.ts`
- **Status, Activity, Trace:** `src/shared/index.ts`

# Caching Strategies

## Timestamp-Based Validation

- Policy documents validated against attachment modification timestamps
- Cache entries purged if `cached.created < attachment.createdAt`
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
- See [Issue Collection](api.md#issue-collection) for collection key semantics

# Query Patterns

- **Page scope:** `{page}:*` — all data for a page
- **Policies only:** `{page}:policies:*` — all policies for a page
- **Issues only:** `{page}:issues:*` — all issues for a page
- **System data:** `system:*` — global metadata

# Concurrency Control

## Lock Hierarchy

The system implements hierarchical locking with prefix-based conflict detection. Locks are stored in a page-scoped
`LockCatalog` entry.

### Page Level (most restrictive)

**Key:** `{page}`

- **Purpose:** operations affecting the entire page (for example `clearCache`)
- **Conflicts with:** all other locks on the same page

### Catalogue Level

**Key:** `{page}:policies` | `{page}:issues`

- **Purpose:** bulk operations on resource catalogues (for example `getPolicies`, `refreshIssues`)
- **Conflicts with:** individual resource locks of the same type and page-level locks

### Resource Level (most granular)

**Key:** `{page}:policies:{source}[:{language}]` | `{page}:issues:{issueId}`

- **Purpose:** operations on individual resources (for example `getPolicy`, `updateIssue`)
- **Conflicts with:** catalogue-level locks of the same type and page-level locks

## Conflict Detection

Lock conflicts occur when either key is a prefix of the other, or the keys are identical. This provides bidirectional
blocking — both upward (fine → coarse) and downward (coarse → fine) — ensuring that bulk and individual operations on
the same resource type are mutually exclusive.

## Lock Ownership

Each lock entry carries an **owner** identifier (for example `getPolicies:1738000000000-4821` or `policy:job-abc123`)
and an expiration timestamp. The owner string includes the caller site name and a unique code for diagnostics.

## Cooperative Caching

When multiple users request the same resource concurrently:

1. First request acquires the lock and starts processing
1. Subsequent requests wait for the lock to be released
1. On release, waiters find the cached result and skip duplicate work

Only one AI operation is triggered; all users receive consistent results.

## Platform Limitations

Forge KVS lacks compare-and-swap primitives, so `acquire()` uses optimistic concurrency control with version tracking.
This leaves a TOCTOU race window (#25). Mitigations include hierarchical design to reduce conflict probability,
2-minute lock timeout, exponential backoff, and resource-level deduplication via `Activity` sentinels.
