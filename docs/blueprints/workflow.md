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
1. **Task** executes, publishing progress events via the store at each stage (`Fetching`, `Extracting`, `Analysing`)
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

# Error

When an async task throws:

1. **Task** publishes an error event via the store (for instance `publishIssuesAnalysed(trace)`)
1. **Event** reaches connected clients; UI components display the error
1. The `JobState` remains in KVS — it is cleaned up by the next `schedule()` call (stale task recovery)

Errors are transient. Clearing the error on the client resets the resource, allowing the next request to trigger a fresh
job.

# New Client Joins

A client joining mid-operation receives a sensible initial state:

1. **Client store** calls the server to read the resource
1. **Resolver** finds no cached value and calls `schedule()`
1. **`schedule()`** detects the running job via `getStats()` and returns the stored activity
1. **Client** receives the current progress and subscribes to the event bus for ongoing updates

Progress is **state-based** — the `JobState` tracks the current activity so new clients do not need to replay the event
history.
