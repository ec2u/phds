---
title: System Architecture
summary: Application layers, component structure, and execution flow
description: Describes the client-server architecture, application layers, and async execution model.
---

The EC2U PhD Agreements Tool is a **client-server Atlassian Forge application** for drafting cotutelle PhD agreements
within Confluence.

# Project Structure

## Key Components

- `src/client/macro.tsx`: main React component with tabbed UI interface
- `src/server/ports/index.ts`: Forge resolver exposing resource-centric endpoints
- `src/server/tasks/index.ts`: async task dispatcher and executor handling long-running background tasks
- `src/shared/`: shared type definitions and utilities used by both client and server
- `manifest.yml`: Forge app configuration defining the macro, resolvers, and async consumers

## Application Layers

### 1. Client Layer (`src/client/`)

- **Entry Point**: `macro.tsx` provides the main tabbed UI interface
- **View Components**: React components in `views/` providing Agreement, Policies, Issues, Chat interfaces
- **Hooks**: custom React hooks in `hooks/` for resource data management (policies, issues, cache)
- **Ports**: bridge functions in `ports/` wrapping `invoke()` calls to server resolvers

### 2. Server Layer (`src/server/`)

- **Ports**: `ports/index.ts` registers Forge resolver functions; `ports/resources.ts` implements resource-centric
  handlers (`getPolicies`, `getPolicy`, `getIssues`, `refreshIssues`, `getIssue`, `updateIssue`, `clearCache`)
- **Task Handlers**: `tasks/policy/` for document extraction and translation, `tasks/analyze/` for compliance analysis
- **Task Dispatcher**: `tasks/index.ts` routes queued tasks to the appropriate handler
- **Tools**: utilities for external integrations (Gemini AI, Confluence pages, attachments, caching, locking)

### 3. Shared Layer (`src/shared/`)

- **Status System**: `index.ts` defines `Status<T>`, `Activity` enum, `Trace`, and type guards
- **Type Definitions**: `items/documents.ts`, `items/issues.ts`, `items/languages.ts`
- **Utilities**: type checking functions (`isString()`, `isDefined()`, etc.)

### 4. External Systems

- **Key-Value Store**: Forge's persistent storage for caching documents, issues, and resource status
- **Event Queue**: Forge queue consumer for async task execution
- **Gemini AI**: Google's AI service for document analysis and natural language processing

# Forge Application Structure

The application follows Atlassian Forge architecture with resource-centric resolvers and async task execution:

1. **Frontend Components**: React components using Forge UI library that render within Confluence
1. **Resolver Functions**: server-side resource handlers invoked from the client via `invoke()`
1. **Event Queue Consumer**: long-running tasks (policy extraction, compliance analysis) executed via a queue consumer
1. **Configuration System**: UI for macro configuration (currently disabled in manifest.yml)

## Component Communication

- Client hooks call port functions that use `invoke()` from `@forge/bridge` to reach server resolvers
- Resolvers return `Status<T>` — clients poll the same resource endpoint for progress (`Activity`) or results
- Long-running work is queued via `Queue.push()` and executed by the async consumer
- The async handler writes progress and results directly to the resource key in KVS

## Key Patterns

- Resolver functions are defined using `Resolver.define()` and exported as `handler`
- Resource status is stored as `Status<T>` on the resource key — `Activity` for progress, value for results, `Trace`
  for errors
- Client hooks poll the resource endpoint; `Activity` responses trigger continued polling
- Resource locking prevents concurrent task execution on the same resources
- See [Resource-Centric API](api.md) for endpoint details and [Storage Layout](storage.md) for key patterns

# Execution Flow

## Read with Async Trigger

1. **Client** requests a resource via hook (for example `usePolicy()`)
1. **Resolver** checks the resource key in KVS — returns cached value if fresh
1. If uncached or stale, resolver writes `Activity.Scheduling` sentinel and queues a task
1. **Client** receives `Activity` and starts polling the same resource endpoint
1. **Async handler** acquires lock, progresses through activity states, writes final value
1. **Client** poll receives the value and stops polling

## Background Processing

The async handler executes tasks through iterative AI operations:

- **Prompt Loading**: reads local prompt templates from co-located `.sys.md` files
- **Gemini AI Processing**: executes prompts against Gemini API for document extraction and analysis
- **Progress Updates**: writes `Activity` states directly to the resource key in KVS
- **Result Storage**: writes final value to the resource key on completion

## Error Recovery

- If the async job throws, the handler writes a `Trace` to the resource key
- Subsequent reads return the error to the client
- Error dismissal (#18) clears the `Trace`, allowing the next read to trigger a fresh job
- See [Resource-Centric API](api.md) for resolver branching details
