# EC2U PhDs Confluence Plugin

## Project Overview

- **Type**: Private Confluence plugin
- **Frontend**: React-based UI using Forge toolkit
- **Build Tool**: Vite
- **Backend**: REST/JSON API
- **Deployment**: Forge CLI

## Permissions

- `read:confluence-content.summary`
- `read:confluence-content.all`
- `write:confluence-content`
- `read:confluence-props`
- `write:confluence-props`
- **External**:
    - `fetch:backend: [read, write]`

## Development Workflow

1. Develop code locally
2. Use Forge CLI to deploy to specific environments
    - Run `forge deploy` to deploy to development environment
3. Install directly to Confluence instance
    - Use `forge install --site=https://ec2u.atlassian.net/`

## Technical Stack

- **Frontend**: TypeScript, React, Forge UI components
- **Backend**: Java (as per project structure)
- **Build**: Vite, Maven (for Java components)

## Project Structure

- `src/main/typescript/` - Frontend code
- `src/main/java/` - Backend Java code
- `pom.xml` - Maven configuration for Java backend