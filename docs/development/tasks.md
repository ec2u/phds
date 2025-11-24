---
title: Adding New Task Types
description: Guide for implementing new asynchronous task types in the system.
---

This guide explains how to add a new task type to the EC2U PhD Agreements Tool's asynchronous task execution system.

# Overview

The system uses a typed task system where each task type:

- Extends the `Provider<T>` interface where T is the return type
- Has a unique `readonly type` discriminator
- Is executed asynchronously via Forge queue consumers
- Uses job-based status tracking for progress updates

# Implementation Steps

## 1. Define Task Interface (`src/shared/tasks.ts`)

Add a new task interface to the shared types:

```typescript
export interface MyNewTask extends Provider<ReturnType> {
    readonly type: "mynew";

    // Add task-specific parameters as readonly properties
    readonly parameter1: string;
    readonly parameter2?: number;
}
```

Update the `Task` union type to include your new task:

```typescript
export type Task =
    | PoliciesTask
    | PolicyTask
    | MyNewTask  // Add your new task here
    // ... other tasks
    ;
```

## 2. Create Task Implementation (`src/server/tasks/mynew.ts`)

Create a new file for your task handler:

```typescript
/*
 * Copyright © 2025 EC2U Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Activity, Payload, MyNewTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { lock } from "../tools/cache";

export async function mynew(
    job: string,
    page: string,
    { parameter1, parameter2 }: Payload<MyNewTask>
): Promise<ReturnType> {

    return await lock(job, `resource-lock-key`, async () => {

        // Update status to indicate processing stage
        await setStatus(job, Activity.Processing);

        // Implement your task logic here
        const result = await doWork(parameter1, parameter2);

        // Return final result
        return result;
    });
}

// Add stub functions for future implementation
async function doWorkStub(param: string): Promise<ReturnType> {
    throw new Error("Not yet implemented");
}
```

**Key Implementation Notes:**

- **License Header**: Include Apache 2.0 license header
- **Function Signature**: `taskname(job: string, page: string, params: Payload<TaskType>)`
- **Status Updates**: Use `setStatus(job, Activity.X)` for progress updates
- **Final Result**: Use `setStatus(job, result)` for completion (handled by returning the result)
- **Resource Locking**: Wrap main logic in `lock()` calls to prevent concurrent execution on same resources
- **Stub Functions**: Add descriptive names ending with "Stub" suffix and proper TypeScript return types

## 3. Update Task Dispatcher (`src/server/tasks/index.ts`)

Register your task in the dispatcher:

```typescript
import { mynew } from "./mynew";

// ... inside the execute resolver switch statement ...

switch ( task.type ) {
    // ... existing cases ...

    case "mynew":
        return await mynew(job, page, task);

    // ... other cases ...
}
```

# Resource Locking

The locking system uses hierarchical keys to prevent concurrent execution:

- **Page Level**: `{page}` - locks entire page
- **Catalog Level**: `policies` | `issues` - locks resource catalogs
- **Resource Level**: `policy:{source}:{language?}` | `issue:{issueId}` - locks individual resources

Choose the appropriate lock granularity for your task:

```typescript
// Page-level lock (most restrictive)
return await lock(job, page, async () => { /* ... */ });

// Catalog-level lock
return await lock(job, policiesKey(page), async () => { /* ... */ });

// Resource-level lock (most granular)
return await lock(job, policyKey(page, source, language), async () => { /* ... */ });
```

# Activity States

Use appropriate `Activity` enum values for status updates:

- `Activity.Submitting` - Task submitted
- `Activity.Scheduling` - Task scheduled for execution
- `Activity.Locking` - Acquiring resource locks
- `Activity.Scanning` - Scanning resources
- `Activity.Fetching` - Fetching data
- `Activity.Caching` - Caching results
- `Activity.Purging` - Cleaning up
- `Activity.Prompting` - Preparing AI prompts
- `Activity.Uploading` - Uploading data
- `Activity.Extracting` - Extracting information
- `Activity.Translating` - Translating content
- `Activity.Analyzing` - Analyzing results

# Error Handling

Tasks should handle errors gracefully:

```typescript
try {
    await setStatus(job, Activity.Processing);
    const result = await riskyOperation();
    return result;
} catch (error) {
    // Error trace will be automatically captured by dispatcher
    throw error;
}
```

The task dispatcher automatically catches errors and converts them to `Trace` objects using `asTrace(error)`.

# Examples

Refer to existing task implementations for patterns:

- **`policies.ts`**: Catalog-level operation with cache validation
- **`policy.ts`**: Individual resource operation with translation
- **`issues.ts`**: Complex multi-stage AI analysis
- **`classify.ts`**: Simple resource update
- **`annotate.ts`**: Resource annotation pattern
- **`transition.ts`**: State transition pattern

# Testing

Test your task implementation:

1. **Unit Test**: Test the task function with mock data
2. **Integration Test**: Test via resolver with real Forge environment
3. **UI Test**: Test from Confluence UI with status monitoring

# Related Documentation

- [System Architecture](../blueprints/architecture.md) - Task execution flow
- [Storage Layout](../blueprints/storage.md) - Lock patterns and data structures
