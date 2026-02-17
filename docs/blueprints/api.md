---
title: Resource-Centric API
summary: Resource-centric API design with conceptual REST mapping
description: Defines the resource-centric API model and its conceptual REST mapping for future HTTP migration.
---

The application exposes a resource-centric API where each operation targets a specific resource by identity. Clients
poll the resource itself for progress — two views requesting the same resource naturally converge on the same status
without coordination.

The current transport is the Forge bridge (`invoke()`). The API is designed so that it can be migrated to REST/HTTP with
minimal changes. The table below shows both the resolver handlers and their conceptual REST equivalents.

# Resources

| REST Equivalent           | Method   | Handler         | Description            | Status      | Notes                              |
|---------------------------|----------|-----------------|------------------------|-------------|------------------------------------|
| `/policies`               | `GET`    | `getPolicies`   | list policy catalogue  | `200`       |                                    |
| `/policies/{source}`      | `GET`    | `getPolicy`     | get/extract policy     | `200`/`202` | triggers extraction on first call  |
| `/policies/{source}?lang` | `GET`    | `getPolicy`     | get/translate policy   | `200`/`202` | triggers translation on first call |
| `/issues`                 | `GET`    | `getIssues`     | list compliance issues | `200`/`202` | `202` if analysis in progress      |
| `/issues`                 | `POST`   | `refreshIssues` | trigger analysis       | `202`       |                                    |
| `/issues/{issue}`         | `GET`    | `getIssue`      | get single issue       | `200`       |                                    |
| `/issues/{issue}`         | `PATCH`  | `updateIssue`   | update issue           | `204`       | state, severity, and annotations   |
| `/`                       | `DELETE` | `clearCache`    | clear all cached data  | `204`       |                                    |

Status codes map to `Status<T>` discrimination: `isActivity()` → `202`, value → `200`, `isTrace()` → error. The page
identifier is implicit from the Forge extension context (and would become a URL path segment in a REST transport).

# Resource Key States

Each resource is backed by a key in Forge KVS holding a `Status<T>` value. The key is the single source of truth for
both cached results and async progress.

| Key State   | Meaning             | Response                                                   |
|-------------|---------------------|------------------------------------------------------------|
| empty       | uncached            | write `Activity.Scheduling`, queue async job, return `202` |
| `Activity`  | computation running | return `202` with current activity                         |
| value (`T`) | cached result       | return `200` with value                                    |
| `Trace`     | failed              | return error                                               |

# Read Behaviour

A read handler (for example `getPolicy()`) reads the resource key and branches:

1. **Empty** → write `Activity.Scheduling` sentinel, queue async job, return `202`
1. **`Activity`** → check lock presence via `isLocked()`; if lock held return `202` with current activity, if no lock
   held purge stale sentinel and fall through to step 1 (crashed job recovery)
1. **Value** → check staleness against source metadata; if fresh return `200`, if stale purge and fall through to step 1
1. **`Trace`** → return error

# Async Handover

The resolver writes `Activity.Scheduling` as a sentinel before queuing the job — best-effort deduplication backed by
lock-based sentinel recovery. The async task then acquires the lock and updates the resource key as it progresses (
`Activity.Fetching` → `Activity.Extracting` → …). The final value is written when done.

As a safety net, after acquiring the lock the job checks the key state and bails out if a fresh value is already present
(guards against duplicate jobs from the sentinel race).

If the async job throws, the handler catches the error, writes a `Trace` to the resource key, and releases the lock.
Subsequent reads return the error to the client. Clearing the `Trace` resets the key to empty, allowing the next read to
trigger a fresh job.

# Issue Collection

Issues are append-only — `refreshIssues()` generates new issues with fresh UUIDs and writes them to per-issue keys
(`{page}:issues:{id}`), never overwriting or deleting existing ones. Existing issues retain their state, severity, and
annotations.

The collection key (`{page}:issues`) holds `Status` for analysis progress. On successful completion, the async handler
clears the collection key so that subsequent reads see an empty key. `getIssues()` checks the collection key first: if
it holds an `Activity` or `Trace`, return that directly without enumerating individual issues. Only when the collection
key is empty does `getIssues()` enumerate per-issue keys to assemble the array.

Issue updates write directly to the per-issue key — no read-modify-write on the collection.

# Client Hooks

Specialised hooks map to the API under the hood. Each hook returns `Status<T>` and exposes resource-specific actions.
The transport mapping is internal to the port layer — hook consumers are transport-agnostic.

| Hook                           | Returns                        | Actions                                    |
|--------------------------------|--------------------------------|--------------------------------------------|
| `usePolicies()`                | `Status<Catalog>`              |                                            |
| `usePolicy(source, language?)` | `Status<Document>`             |                                            |
| `useIssues()`                  | `Status<ReadonlyArray<Issue>>` | `analyze()`                                |
| `useIssue(issue)`              | `Status<Issue>`                | `transition()`, `classify()`, `annotate()` |
| `useCache()`                   |                                | `clear()`                                  |

# Error Handling

Client-side transport errors (bridge failures, network timeouts) produce a `Trace` in hook state but are not stored on
the server. Dismissal always sends a clear request to the server; the server treats it as a no-op if the resource key
does not hold a `Trace`. This avoids the need to distinguish client-side from server-side traces on the client.

`clearCache()` acquires the lock like all update operations — if a job is running, clear waits for it to finish before
wiping the resource keys. No cancellation mechanism is needed.
