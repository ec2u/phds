---
title: Interaction Workflows
summary: Client-server interaction patterns for the event-driven store
description: |
  Documents the interaction sequences between clients, server, and async
  tasks, covering reads, sync updates, async operations, deduplication,
  error handling, and stale task recovery.
---

See the [sequence diagram](workflow.puml) for the visual flow.

# Read (Cache Hit)

The client store delegates to the server, which reads from KVS. If the cached value is fresh, the server returns it
directly. No event is published — reads are synchronous request/response.

# Sync Update

Sync mutations (for instance issue state or severity updates) follow an optimistic update pattern:

1. **Client store** optimistically updates its local cache and notifies observers immediately
1. **Client store** calls the server resolver
1. **Resolver** writes the updated value to KVS, publishes an event, then returns
1. **Event** arrives via the bus, confirming the update to all connected clients

The server writes KVS and publishes the event within the same resolver call — the response and event are nearly
simultaneous. If the server call fails, the client store replaces the optimistic value with an error trace.

# Async Action

Long-running operations (policy extraction, compliance analysis) use the Forge queue:

1. **Client store** purges local cache, optimistically updates to `Submitting`, and notifies observers
1. **Client store** calls the server resolver
1. **Resolver** calls `schedule()` which pushes the task to the queue and writes a `JobState` to KVS
1. **Resolver** returns `Activity.Scheduling` as the response — no event is published for scheduling

> [!NOTE]
> The scheduling activity is delivered only as the resolver response, not via the event bus. Other clients discover
> the in-progress state when they next read the resource (see [New Client Joins](#new-client-joins)).

## Task Execution

1. **Worker gate** checks the `JobState` — if another worker is active, exits silently
1. **Task** executes, publishing progress events via the store at each stage (`Fetching`, `Uploading`, `Extracting`,
   `Translating`, `Analyzing`)
1. Each publish call updates the `JobState` activity via `report()` and publishes an event carrying the current status
1. On completion, the task writes the final result to KVS and publishes a completion event

Events carry full updated state so client caches update directly without server roundtrips.

# Idempotent Duplicate Request

When a second client requests the same resource while a job is running:

1. **Resolver** calls `schedule()` which reads the `JobState` from KVS
1. **`schedule()`** calls `getJob(id).getStats()` — if `inProgress > 0`, returns the stored activity
1. **Client** receives the current progress stage and joins the event bus for subsequent updates

No duplicate job is queued. See [Job Scheduling](scheduling.md) for the full two-stage deduplication gate design.

# Stale Task Recovery

Tasks can fail silently — Forge may terminate a function without the worker publishing a completion or error event.
Recovery is on-demand, triggered during `schedule()`:

1. **`schedule()`** reads the `JobState` and calls `getStats()`
1. If `inProgress === 0` (completed or failed) or the job no longer exists (`JobDoesNotExistError`), the stale
   `JobState` is deleted
1. **`schedule()`** falls through to re-queue transparently — no event is published for the recovery

The next client request proceeds as if no previous job existed.

# Error Handling

## Server-Side

Server-side operations follow three principles:

- **Best-effort transactional mutations**: mutations use write-before-delete ordering so that resource state is never
  lost on partial failure. New values are written first; stale entries are cleaned up afterwards. If cleanup fails,
  stale data lingers harmlessly until the next operation.
- **Resource state is never altered until task completion**: during async execution, progress stages do not modify
  resource keys in KVS. The actual resource data (policy documents, issues) is written only on the final success call.
- **Progress reports and traces are published but not stored as resources**: activities are tracked in a separate
  `JobState` entry (via `report()`), not in the resource key. Traces are delivered to clients as events and the
  `JobState` is deleted — nothing is written to the resource key on error.

### Async Task Error

When an async task throws:

1. **Task** publishes an error event via the store (for instance `publishIssuesUpdated(trace)`)
1. **Store** deletes the `JobState` from KVS, then publishes the error event
1. **Event** reaches connected clients; UI components display the error

Errors are transient. Clearing the error on the client resets the resource, allowing the next request to trigger a fresh
job.

### Mutation Resilience

- **Issue caching** (`publishIssuesUpdated`): writes new issue entries first, then deletes stale keys not present in the
  new set. If the writes fail mid-way, old entries survive intact. If the deletes fail, stale entries linger harmlessly
  until the next analysis run.
- **Issue update** (`updateIssues`): reads the current value, builds the update in memory, then writes back. If the
  write fails, the previous KVS value is preserved.

## Client-Side

The client cache holds `Status<T>` values — activities and traces are integral to store state, not metadata kept
alongside it. All status types are cached uniformly.

- **Activities** are cached and notified like any other value. Observers see `Submitting` immediately on mutation or
  initial fetch, then receive progress updates as events arrive.
- **Traces** are cached and notified — errors are sticky until the cache entry is evicted or overwritten.

# New Client Joins

A client joining mid-operation receives a sensible initial state:

1. **Client store** calls the server to read the resource
1. **Resolver** finds no cached value and calls `schedule()`
1. **`schedule()`** detects the running job via `getStats()` and returns the stored activity
1. **Client** receives the current progress and subscribes to the event bus for ongoing updates

Progress is **state-based** — the `JobState` tracks the current activity so new clients do not need to replay the event
history.
