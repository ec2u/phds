# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The EC2U PhD Agreements Tool is an AI-based Confluence macro supporting drafting of cotutelle PhD agreements. It
supports local PhD coordinators and other stakeholders in the agreement drafting process.

This is an Atlassian Forge application built with React and TypeScript that runs as a macro within Confluence.

## Build Commands

```bash
# Environment setup
npm run clean       # Remove node_modules
npm run setup       # Install dependencies (with legacy peer deps)

# Development
npm run start       # Start Forge tunnel for local development (alias: forge tunnel)

# Deployment
npm run issue       # Deploy the macro to Atlassian Confluence (alias: forge deploy)
forge install --upgrade # Install or upgrade the app in a development site
```

## Project Structure

This is a client-side only Forge application with the following key components:

- `src/client/index.tsx`: Main React component with tabbed UI interface
- `src/client/config.tsx`: Configuration UI for the macro with form submission
- `src/server/index.ts`: Forge resolver that handles backend function calls
- `manifest.yml`: Forge app configuration defining the macro registration and resources

## Architecture

### Forge Application Structure

The application follows Atlassian Forge architecture:

1. **Frontend Components**: React components using Forge UI library that render within Confluence
2. **Resolver Functions**: Server-side functions that can be invoked from the client via `invoke()`
3. **Configuration System**: Separate UI for macro configuration with form submission via `view.submit()`

### Component Communication

- Frontend components use `invoke()` from `@forge/bridge` to call resolver functions
- Configuration data is managed through `useConfig()` hook
- Macro body content is accessed via `useProductContext().extension.macro.body`

### Key Patterns

- All React components are wrapped in `React.StrictMode`
- Configuration UI uses `useSubmit` custom hook for form handling
- Resolver functions are defined using `Resolver.define()` and exported as `handler`

## Development Notes

- Uses `--legacy-peer-deps` flag for npm installation due to Forge dependency requirements
- TypeScript configuration targets ES2020 with CommonJS modules
- All source files include Apache 2.0 license headers
- The project uses Forge's built-in build system (no custom webpack/build config needed)