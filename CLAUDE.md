# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The EC2U PhD Agreements Tool is an application designed to provide AI-based textual analysis for drafting cotutelle PhD
agreements. It supports local PhD coordinators and other stakeholders in the agreement drafting process.

The project follows a client-server architecture:

1. **Client**: A Confluence macro/plugin built with Atlassian Forge and React
2. **Server**: Java backend application built on Metreeca Flow framework, deployable to Google Cloud Platform

## Build Commands

### Client Side (from `/client` directory)

```bash
# Setup the client environment
npm run clean       # Remove node_modules
npm run setup       # Install dependencies (with legacy peer deps)
npm run start       # Start Forge tunnel for local development

# Deployment (requires Forge CLI)
forge deploy        # Deploy the macro to Atlassian Confluence
```

### Server Side (from `/server` directory)

```bash
# Maven build commands
mvn clean           # Clean build artifacts
mvn compile         # Compile the code
mvn test            # Run tests
mvn package         # Create JAR package
mvn deploy          # Deploy to Google App Engine
```

## Project Structure

### Client (`/client`)

- Atlassian Forge app/macro for Confluence
- Uses React for UI rendering
- Communicates with backend via Forge's invoke API
- Configuration in `manifest.yml` defines the macro registration

Key files:

- `/client/src/frontend/index.jsx`: Main React component
- `/client/src/resolvers/index.js`: Forge resolver for handling API calls
- `/client/manifest.yml`: Forge app configuration

### Server (`/server`)

- Java application using Metreeca Flow framework
- Deployable to Google Cloud Platform
- Handles HTTP requests and JSON processing
- Includes caching mechanisms and Google Cloud-specific integrations

Key files:

- `/server/src/main/java/eu/ec2u/phds/PhDs.java`: Main application entry point

## Development Workflow

1. For client development:
    - Use `npm run start` from the client directory
    - Make changes to the React components in `client/src/frontend`
    - Test the macro locally using the Forge tunnel

2. For server development:
    - Make changes to Java code in `server/src/main/java/eu/ec2u/phds`
    - Use Maven to build and test (`mvn compile`, `mvn test`)
    - Deploy with `mvn deploy` when ready to push to Google Cloud

## Dependencies

### Client

- React 18
- Forge Bridge, React, and Resolver libraries
- Forge CLI for development and deployment

### Server

- Metreeca Flow framework
- Google Cloud Platform libraries
- JUnit and AssertJ for testing

## Deployment

- Client deploys as a Confluence macro via Forge
- Server deploys to Google App Engine using the Maven appengine plugin