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
- **API**: See @docs/blueprints/api.md for the resource-centric API design
- **Forge Lifecycle**: See @docs/development/forge.md for deployment, authentication, and environment management
- **Development Resources**: See @docs/development/resources.md for Forge documentation and tools

# Build Commands

```bash
# Environment setup
npm run clean       # Remove build cache and node_modules
npm run setup       # Install dependencies (with legacy peer deps)

# Development
npm run serve       # Start Forge tunnel for local development (requires .env file)

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
