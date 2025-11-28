---
title: System Architecture
---

The EC2U PhD Agreements Tool is a **client-server Atlassian Forge application** for drafting cotutelle PhD agreements
within Confluence.

# Project Structure

## Key Components

- `src/client/body.tsx`: Main React component with tabbed UI interface
- `src/server/ports/index.ts`: Forge resolver exposing task submission and monitoring endpoints
- `src/server/tasks/index.ts`: Async task executor handling long-running background tasks
- `src/shared/`: Shared type definitions and utilities used by both client and server
- `manifest.yml`: Forge app configuration defining the macro, resolvers, and async consumers

## Application Layers

### 1. Client Layer (`src/client/`)

- **Entry Point**: `body.tsx` provides the main tabbed UI interface
- **View Components**: React components in `views/` providing Agreement, Policies, Issues, Chat interfaces
- **Hooks**: Custom React hooks in `hooks/` for data management (cache, agreement, policies, issues)
- **Cache System**: `ToolCache` context provider for client-side state management

### 2. Server Layer (`src/server/`)

- **Ports**: `ports/index.ts` defines Forge resolver functions callable from client via `invoke()`
- **Task Dispatcher**: `tasks/index.ts` routes different task types to specific handlers
- **Task Handlers**: Individual modules (policies, policy, issues, classify, annotate, transition, clear)
- **Tools**: Utilities for external integrations (Gemini AI, Langfuse tracing, Confluence pages, caching)

### 3. Shared Layer (`src/shared/`)

- **Task System**: `tasks.ts` defines task types, status tracking, and activity states
- **Type Definitions**: Common types for documents, issues, languages across client/server
- **Utilities**: Type checking functions (`isString()`, `isDefined()`, etc.)

### 4. External Systems

- **Key-Value Store**: Forge's persistent storage for caching documents, issues, and task status
- **Async Worker**: Background task execution system for long-running operations
- **Langfuse**: Prompt management and tracing system for AI operations
- **Gemini AI**: Google's AI service for document analysis and natural language processing

# Forge Application Architecture

## Application Structure

The application follows Atlassian Forge architecture with async task execution:

1. **Frontend Components**: React components using Forge UI library that render within Confluence
2. **Resolver Functions**: Server-side functions that can be invoked from the client via `invoke()`
3. **Async Task System**: Long-running tasks executed via queue consumers with job-based status tracking
4. **Configuration System**: UI for macro configuration (currently disabled in manifest.yml)

## Component Communication

- Frontend components use `invoke()` from `@forge/bridge` to call resolver functions
- Long-running tasks are submitted via `submitTask()` and monitored via `monitorTask()` resolvers
- Task execution uses Forge queue consumers with job IDs for tracking
- Configuration data is accessed through `useConfig()` hook

## Key Patterns

- All React components are wrapped in `React.StrictMode`
- Resolver functions are defined using `Resolver.define()` and exported as `handler`
- Tasks extend `Provider<T>` interface and include a `readonly type` discriminator
- Task implementations use `setStatus(job, Activity.X)` for progress updates
- Resource locking prevents concurrent task execution on the same resources

# System Workflow

The system follows an asynchronous task execution pattern with multiple interacting components:

## Task Execution Flow

### 1. Task Initiation

- **Client** launches task via UI interaction
- **Server** receives task request through Forge resolver
- **Key-Value Store** initialized with task status (Activity.Submitting)
- **Async Worker** receives delegated task for background processing
- **Client** receives task ID for status polling

### 2. Background Processing

The async worker executes tasks through iterative AI operations:

- **Langfuse Integration**: Worker retrieves optimized prompts for specific task types
- **Gemini AI Processing**: Worker executes prompts against Gemini API for document analysis
- **Status Updates**: Worker continuously updates task status in Key-Value Store with Activity states
- **Result Assembly**: Worker processes AI responses and assembles final task results

### 3. Status Monitoring

Parallel to background processing:

- **Client Polling**: Client periodically checks task status via server resolver
- **Server Mediation**: Server retrieves current status from Key-Value Store
- **Status Propagation**: Current activity state returned to client for UI updates

### 4. Task Completion

- **Result Storage**: Worker stores final results in Key-Value Store
- **Status Cleanup**: Server clears task status after successful result retrieval
- **Result Delivery**: Final task results delivered to client

## Component Interactions

### Client Layer Interactions

- **UI State Management**: `ToolCache` context maintains local state for immediate UI responsiveness
- **Task Orchestration**: React hooks coordinate multiple concurrent tasks and status updates
- **Forge Bridge**: All server communication flows through `@forge/bridge` invoke mechanism

### Server Layer Interactions

- **Task Dispatch**: Central dispatcher routes tasks to appropriate handlers based on task type
- **Resource Management**: Tools layer manages external service connections and caching strategies
- **Data Persistence**: All persistent state managed through Key-Value Store with hierarchical keys

### External System Integration

- **Langfuse**: Centralized prompt management enables prompt optimization without code changes
- **Gemini AI**: Provides document analysis, issue detection, and natural language processing
- **Key-Value Store**: Serves as both cache and persistent state store with timestamp-based validation
- **Async Worker**: Ensures long-running AI operations don't block user interface interactions

This architecture enables responsive user experience while handling computationally intensive AI operations,
with comprehensive status tracking and robust error handling throughout the execution pipeline.
