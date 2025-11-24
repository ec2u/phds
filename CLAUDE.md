---
title: CLAUDE.md
description: Development guidelines for Claude Code when working with this repository.
---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Overview

The EC2U PhD Agreements Tool is an AI-based Confluence macro supporting drafting of cotutelle PhD agreements. It
supports local PhD coordinators and other stakeholders in the agreement drafting process.

This is an Atlassian Forge application built with React and TypeScript that runs as a macro within Confluence.

# Extended Documentation

- **Architecture**: See @docs/blueprints/architecture.md for system architecture and component details
- **Storage**: See @docs/blueprints/storage.md for storage patterns and data lifecycle
- **Adding Tasks**: See @docs/development/tasks.md for implementing new asynchronous task types
- **Lifecycle Management**: See @docs/development/lifecycle.md for deployment and environment setup
- **Development Resources**: See @docs/development/resources.md for Forge documentation and tools

# Build Commands

```bash
# Environment setup
npm run clean       # Remove node_modules
npm run setup       # Install dependencies (with legacy peer deps)

# Development
npm run serve       # Start Forge tunnel for local development (requires .env file)

# Deployment
npm run issue       # Deploy and install to development/production environments (see @docs/development/lifecycle.md)
```

# Development Notes

- Uses `--legacy-peer-deps` flag for npm installation due to Forge dependency requirements
- TypeScript configuration targets ES2020 with CommonJS modules
- All source files include Apache 2.0 license headers
- The project uses Forge's built-in build system (no custom webpack/build config needed)
- Follow modern TypeScript naming conventions: use camelCase for constants, not SCREAMING_SNAKE_CASE
- Forge does not support TypeScript path aliases - use relative imports only
- Prefer using type checking utilities from `shared/index.ts` (e.g., `isString()`, `isDefined()`) instead of native
  `typeof` checks for consistency
- DO NOT reformat existing code formatting/spacing - preserve the author's original style
- Inline comments (`//`) must be lowercase and followed by an empty line for readability
- Use functional programming style unless imperative style is specifically required

# Adding New Task Types

For detailed instructions on implementing new asynchronous task types, see @docs/development/tasks.md

This guide covers:

- Task interface definition
- Task implementation patterns
- Resource locking strategies
- Activity state management
- Error handling best practices
