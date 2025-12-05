---
title: Storage Layout
---

The EC2U PhD Agreements Tool uses Atlassian Forge's key-value storage with a systematic hierarchical naming
convention. This document outlines the storage schema, key patterns, and data lifecycle.

# Key Patterns

## Policy Documents

**Pattern:** `{page}:policy:{source}[:{language}]`

- **Original documents:** `{page}:policy:{source}`
- **Translations:** `{page}:policy:{source}:{language}`
- **Data Type:** `Document` interface
- **Example:** `abc123:policy:att789` or `abc123:policy:att789:en`

## Issues

**Pattern:** `{page}:issue:{issueId}`

- **Data Type:** `Issue` interface
- **issueId:** UUID generated for each issue
- **Example:** `abc123:issue:f47ac10b-58cc-4372-a567-0e02b2c3d479`

## Job Status

**Pattern:** `job:{jobId}`

- **Data Type:** `Status<T>` (Activity | T | Trace)
- **Purpose:** Track async operation progress
- **Example:** `job:task456`

## System Metadata

**Pattern:** `system:{metadata}`

- **Purge tracking:** `system:purged` (stores timestamp)
- **Global system state and maintenance info**

# Data Structures

Data types stored in the key-value store are defined in the shared layer:

- **Document Interface:** Defined in `src/shared/documents.ts`
- **Issue Interface:** Defined in `src/shared/issues.ts`
- **Status Types:** Defined in `src/shared/tasks.ts` (Status<T>, Activity enum)
- **Language Types:** Defined in `src/shared/languages.ts`

# Caching Strategies

## Timestamp-Based Validation

- Policy documents validated against attachment modification timestamps
- Cache entries purged if `cached.created < attachment.createdAt`
- Automatic staleness detection

## Lazy Purging

- **Global purge:** Runs every 24 hours in background
- **Selective purging:** Removes entries for deleted pages
- **Manual purging:** Available via clear task

## Translation Optimization

- Original documents cached separately from translations
- Each language gets its own cache entry
- Reduces redundant processing for multilingual scenarios

# Data Lifecycle

## Issue Lifecycle

```
Create → Store → [Classify] → [Annotate] → [Transition] → [Transition]
```

- **Classify:** Update severity level
- **Annotate:** Add markdown notes
- **Transition:** Change issue state (e.g., open, resolved, archived)

## Policy Document Lifecycle

```
Extract → Cache → [Translate] → Cache Translation
```

- Original extraction cached immediately
- Translations created on-demand and cached separately
- Each translation maintains separate cache entry

## Job Status Lifecycle

```
Submit → Process (Activity updates) → Complete → Cleanup
```

- Status updated with Activity enums during processing
- Final result or error trace stored on completion
- Entry deleted after successful completion

# Storage Dependencies

## Primary Identifiers

- **Page ID:** Root identifier for all content-related storage
- **Attachment ID:** Links policy storage to Confluence attachments
- **Job ID:** Tracks async operation status

## Inter-Key Relationships

- **Policy-Issue:** Issues reference policies via source IDs
- **Page-Scoped:** All content operations scoped to specific pages
- **Cache Coherence:** Policy invalidation triggers issue re-analysis

## Query Patterns

- **Page scope:** `{page}:*` - all data for a page
- **Issues only:** `{page}:issue:*` - all issues for a page
- **Policies only:** `{page}:policy:*` - all policies for a page
- **System data:** `system:*` - global metadata

# Concurrency Control and Locking

## Lock Management System

The system implements a hierarchical locking mechanism to prevent race conditions and enable cooperative caching when
multiple users access the same resources simultaneously.

### Lock Storage Structure

**Lock Catalog Pattern:** `{page}` (page-scoped lock catalog)

Lock catalogs use the `LockCatalog` interface defined in `src/server/tools/cache.ts:43-48`, storing all active
locks for a page in a single KVS entry with optimistic concurrency control via version tracking.

### Lock Hierarchy (Coarsest → Finest)

#### 1. Page Level - Most Restrictive

**Lock Identifier:** `{page}`

- **Purpose**: Operations affecting the entire page
- **Used by**: `clear` (purge all data), full page operations
- **Blocks**: All other locks on the same page

#### 2. Resource Type Level - Catalog Scoped

**Lock Identifiers:** `policies` | `issues`

- **Purpose**: Operations on resource catalogs (bulk operations)
- **Used by**: `policies` (catalog building), `issues` (bulk issue analysis)
- **Blocks**: Individual resource locks of same type

#### 3. Individual Resource Level - Most Granular

**Lock Identifiers:** `policy:{source}:{language?}` | `issue:{issueId}`

- **Purpose**: Operations on specific resources
- **Used by**: `policy`, `classify`, `annotate`, `transition`
- **Blocks**: Conflicts with catalog operations of same type

### Conflict Detection Algorithm

The system uses hierarchical conflict detection with prefix matching (see `conflicts()` function in
`src/server/tools/cache.ts:360-375`). Lock conflicts occur when:

- **Exact match**: Requested lock identical to existing lock
- **Parent-child hierarchy**: One lock is a prefix of another (e.g., `policies` conflicts with `policy:123`)
- **Bidirectional blocking**: Both upward (fine→coarse) and downward (coarse→fine) conflicts detected

### KVS Platform Limitations

**Current Implementation Status:**

- **Race condition limitation**: KVS API constraints prevent atomic read-check-write operations
- **Probabilistic correctness**: System accepts rare race conditions with extensive monitoring and logging
- **2-minute timeout**: Minimizes impact of stuck locks from race conditions

**Missing Features for Distributed Locking:**

- ❌ Conditional reads (no `.if()`, `.exists()`, `.hasVersion()`)
- ❌ Compare-and-swap operations
- ❌ Read operations within transactions
- ❌ Built-in lock primitives

**Mitigation Strategies:**

- Hierarchical design reduces conflict probability
- 2-minute timeout minimizes stuck lock impact
- Exponential backoff reduces contention
- Extensive logging enables issue detection

## Cooperative Caching Workflow

**Example: Multiple Policy Translation Requests**

1. User A requests `policy:123:fr` translation
2. User A acquires lock `policy:123:fr`
3. Users B & C wait for lock release
4. User A completes work, caches result, releases lock
5. Users B & C find cached result, skip duplicate work

**Result**: Only one AI operation triggered, all users get consistent results.
