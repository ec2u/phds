---
title: Two-Stage Job Deduplication Gate
summary: Lockless two-stage gate preventing duplicate Forge queue jobs
description: |
  Describes the layered deduplication gates and stale task recovery
  mechanism for preventing duplicate Forge queue jobs using KVS-based
  coordination.
---

# Problem

Multiple clients viewing the same Confluence page can trigger the same long-running task (policy extraction, compliance
analysis) simultaneously. Without coordination, duplicate jobs waste Gemini API quota, produce redundant KVS writes, and
confuse clients with interleaved progress events from parallel workers processing the same resource.

Forge provides no built-in deduplication for queued jobs, and its stateless function model rules out in-process
coordination. The store must therefore implement its own mechanism using KVS as the only shared state available.

# Approach

A **lockless two-stage gate** prevents duplicate execution without distributed locks. Each gate reads the same
resource-scoped KVS key and queries the Forge queue for live job status, so neither gate requires atomic
compare-and-swap operations.

See the [activity diagram](scheduling.puml) for the visual flow.

# Job State Tracking

Each resource-task combination gets a dedicated KVS key storing a `JobState` (`id` + current `Activity`):

- `{page}:analyse`
- `{page}:convert:{source}`
- `{page}:convert:{source}:{language}`

> [!IMPORTANT]
> Job tracking keys MUST be placed outside the data catalogue prefixes (`{page}:policies:*` and `{page}:issues:*`) to
> avoid colliding with `beginsWith` scan queries used by `getPolicies` and `getIssues`.

Workers update the `activity` field as they progress through stages (`Fetching`, `Uploading`, `Extracting`,
`Translating`, `Analyzing`), so resolvers can return the actual current activity when a duplicate request arrives.

# Resolver Gate

The resolver gate runs **before queuing** a new job (`schedule` function). Its purpose is to avoid pushing duplicate
jobs onto the queue when a task is already running for the same resource.

The resolver reads the resource-scoped `JobState`. If a job is present and `getJob(id).getStats()` reports
`inProgress > 0`, the resolver skips queuing entirely and returns the stored `activity` (the actual current progress
stage). Stale entries (completed, failed, or expired jobs) are cleared before re-queuing.

This gate handles the common case: a second client requests the same resource while the first job is still running.

# Worker Gate

The worker gate runs **on task entry** (`isActive` function), before the worker begins execution. Its purpose is to
catch race conditions that the resolver gate cannot prevent — for instance, two resolvers checking the same key
near-simultaneously, both finding no running job, and both queuing a new task.

The worker reads the same resource-scoped `JobState` and checks:

1. If no `JobState` exists or the stored `id` matches the worker's own `jobId`, proceed immediately
1. Otherwise, call `getJob(storedId).getStats()` to verify the other job's status
1. If `inProgress > 0`, the other job is still active — exit silently
1. If `inProgress === 0` or the job no longer exists (`JobDoesNotExistError`), proceed

This gate is a second safeguard. Since the resolver gate is not atomic, a small window exists where duplicate jobs can
slip through. The worker gate closes that window.

# Stale Task Recovery

Tasks can fail silently — Forge may terminate a function due to timeout, memory limits, or infrastructure errors without
the worker publishing a completion or error event. This leaves a zombie `JobState` in KVS that blocks all future
requests for that resource.

During the resolver gate check, if a `JobState` exists but `getStats()` returns `inProgress === 0` (completed or failed)
or the job no longer exists (`JobDoesNotExistError`), the stale entry is deleted and the request proceeds to re-queue.
Recovery is on-demand — triggered by the next client request rather than by a background sweep.

# Idempotent Work

No additional safeguard is needed beyond the two gates. LLM-based analysis produces equivalent results if duplicated, so
a rare slip-through causes wasted compute but no data corruption.
