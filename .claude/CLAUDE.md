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
- **Forge Lifecycle**: See @docs/development/forge.md for deployment, authentication, and environment management
- **Development Resources**: See @docs/development/resources.md for Forge documentation and tools
- **User Documentation**: See @docs/development/honkit.md for the HonKit-based documentation site setup

# Build Commands

```bash
# Environment setup
npm run clean       # Remove build cache and node_modules
npm run setup       # Install dependencies (with legacy peer deps)

# Quality
npm run check       # Run Vitest tests with type checking

# Development
npm run serve       # Start Forge tunnel for local development (requires .env file)

# Documentation
npm run build       # Build HonKit reference docs (see @docs/development/honkit.md)
npm run proof       # Serve HonKit reference docs locally on port 4100

# Deployment
npm run issue       # Deploy and install to development environment (see @docs/development/forge.md)
```

# Development Notes

- Uses `--legacy-peer-deps` flag for npm installation due to Forge dependency requirements
- TypeScript configuration targets ES2020 with CommonJS modules
- The project uses Forge's built-in build system (no custom webpack/build config needed)
- Forge does not support TypeScript path aliases - use relative imports only
- Prefer using type checking utilities from `shared/index.ts` (e.g., `isString()`, `isDefined()`) instead of native
  `typeof` checks for consistency
- Deployment is continuous: changes are deployed to development on each release and later promoted to production
- `README.md` and `docs/reference/index.md` share overlapping content and must be kept in sync when either is updated,
  adapting links and references to the respective context (for instance, absolute GitHub Pages URLs in the README versus
  relative paths in the documentation site)
