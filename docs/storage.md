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
Create → Store → [Classify] → [Annotate] → [Resolve] → [Reopen]
```

- **Classify:** Update severity level
- **Annotate:** Add markdown notes
- **Resolve:** Add resolved timestamp
- **Reopen:** Remove resolved timestamp

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

# Utility Functions

Key construction and parsing utilities in `src/server/tools/cache.ts`:

- `policyKey(page, source, language?)` - Construct policy cache keys
- `issueKey(page, issueId)` - Construct issue cache keys
- `keyPage(key)` - Extract page ID from cache key
- `policyKeySource(key)` - Extract source ID from policy key
- `policyKeyLanguage(key)` - Extract language from policy key
