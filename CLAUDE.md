# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The EC2U PhD Agreements Tool is an application designed to provide AI-based textual analysis for drafting cotutelle PhD
agreements. It supports local PhD coordinators and other stakeholders in the agreement drafting process.

The project follows a client-server architecture:

1. **Client**: A Confluence macro/plugin built with Atlassian Forge and React
2. **Server**: Java backend application built on Metreeca Flow framework, deployable to Google Cloud Platform

## Build Commands

### Client-Side Development

```bash
# Environment setup
npm run clean       # Remove node_modules
npm run setup       # Install dependencies (with legacy peer deps)
npm run start       # Start Forge tunnel for local development

# TypeScript compilation and type checking
npx tsc --noEmit    # Run TypeScript type checking without emitting files
npx tsc --watch     # Run TypeScript compiler in watch mode

# Deployment (requires Forge CLI)
forge deploy        # Deploy the macro to Atlassian Confluence
forge install --upgrade # Install or upgrade the app in a development site
```

### Server-Side Development

```bash
# Maven build commands
mvn clean           # Clean build artifacts
mvn compile         # Compile the code
mvn test            # Run tests
mvn package         # Create JAR package
mvn deploy          # Deploy to Google App Engine

# Running specific tests
mvn test -Dtest=TestClassName     # Run a specific test class
mvn test -Dtest=TestClass#method  # Run a specific test method
```

## Project Structure

### Client

- Atlassian Forge app/macro for Confluence
- Uses React for UI rendering
- Communicates with backend via Forge's invoke API
- Configuration in `manifest.yml` defines the macro registration

Key files:

- `/src/main/typescript/frontend/index.tsx`: Main React component with tabbed UI
- `/src/main/typescript/frontend/config.tsx`: Configuration UI for the macro
- `/src/main/typescript/resolvers/index.ts`: Forge resolver for handling API calls
- `/manifest.yml`: Forge app configuration defining the macro and resources

### Server

- Java application using Metreeca Flow framework
- Deployable to Google Cloud Platform
- Handles HTTP requests and JSON processing
- Includes caching mechanisms and Google Cloud-specific integrations

Key files:

- `/src/main/java/eu/ec2u/phds/PhDs.java`: Main application entry point and REST router

## Code Architecture

### Client Architecture

The client follows Atlassian Forge architecture patterns:

1. **Frontend (React Components)**:
   - Uses Atlassian's Forge React library for UI components
   - Has a tabbed interface for displaying different content types
   - Reads macro body content and configuration

2. **Resolver Layer**:
   - Handles communication between frontend and backend
   - Exposes methods that can be invoked by the frontend
   - Currently implements a simple "getText" method

3. **Configuration System**:
   - Separate configuration UI for macro settings
   - Uses Forge view API for submitting configuration

### Server Architecture

The server is built on Metreeca Flow framework with:

1. **GCP Integration**:
   - Uses GCPServer for deployment
   - Integrates with GCP services like GCPVault

2. **REST API Layer**:
   - Router-based HTTP handling
   - Path-based routing for API endpoints

3. **Caching System**:
   - FileCache with configurable TTL
   - Production vs. development environment detection

## Development Workflow

1. For client development:
   - Use `npm run start` from the client directory
   - Make changes to the React components in `src/main/typescript/frontend`
   - Test the macro locally using the Forge tunnel

2. For server development:
   - Make changes to Java code in `src/main/java/eu/ec2u/phds`
   - Use Maven to build and test (`mvn compile`, `mvn test`)
   - Deploy with `mvn deploy` when ready to push to Google Cloud

## Dependencies

### Client

- React 18
- TypeScript 5.8+
- Forge Bridge, React, and Resolver libraries
- Forge CLI for development and deployment

### Server

- Metreeca Flow framework
- Google Cloud Platform libraries
- JUnit and AssertJ for testing

## Deployment

- Client deploys as a Confluence macro via Forge
- Server deploys to Google App Engine using the Maven appengine plugin