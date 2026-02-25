---
title: Forge Platform
summary: Platform constraints, Realtime event bus, and app lifecycle management
description: |
  Covers Forge platform constraints, Realtime event bus configuration,
  and app lifecycle management for the EC2U PhD Agreements Tool.
---

# Platform Constraints

| Constraint          | Detail                                                 |
|---------------------|--------------------------------------------------------|
| HTTP model          | Request/response only, no streaming (no SSE/WebSocket) |
| Function timeout    | 55s default, 15 min for queue consumers                |
| Resolver rate limit | ~20 req/2s                                             |
| Event payload limit | ~200 KB                                                |
| Realtime status     | **Preview**                                            |

# Forge Realtime

The application uses [Forge Realtime](https://developer.atlassian.com/platform/forge/realtime/) as the event bus for
the [event-driven store](../blueprints/architecture.md#event-driven-store). Server resolvers and queue consumers publish
events via `publishGlobal`; clients subscribe via `subscribeGlobal`.

## Dependencies

- `@forge/realtime` (server-side): `publishGlobal`, `signRealtimeToken`
- `@forge/bridge` >= 5.x (client-side): `realtime.subscribeGlobal`

Forge Realtime requires no manifest declaration. Adding `realtime` to `app.features` causes a validation error.

## Authentication

Token signing via `signRealtimeToken` is **optional** — `publishGlobal` and `subscribeGlobal` work without explicit
tokens. `signRealtimeToken` returns an `expiresAt` timestamp for use cases requiring channel-level access control.

## Known Behaviours

- `publishGlobal` returns `eventId: null` and `timestamp: null` when no subscribers are active on the channel — this is
  documented Forge behaviour, not an error
- `useProductContext()` resolves asynchronously — subscriptions depending on the page identifier must guard against
  empty values on the initial render
- `publish` (non-global) is restricted to functions invoked from the app frontend; `publishGlobal` has **no such
  restriction** and works from both resolvers and queue consumers
- Forge functions are stateless and request-scoped — server-side `subscribeGlobal` is **not feasible**; the server
  package only exposes `publishGlobal` and `signRealtimeToken`

## Preview Status

Forge Realtime remains in **Preview** as of early 2026 (no GA timeline published).

| Aspect                 | Preview                               | GA (for comparison)  |
|------------------------|---------------------------------------|----------------------|
| Production use         | Suitable (passed stability standards) | Same                 |
| Operational support    | Supported                             | Same                 |
| Breaking change notice | **1 month minimum**                   | 6 months minimum     |
| Enablement             | Explicit opt-in required              | Available by default |

> [!WARNING]
> No documented message delivery guarantees (at-least-once, exactly-once) or Realtime-specific quotas (connection
> limits, throughput, channel count). The 1-month deprecation window requires rapid adaptation if the API changes.

## References

- [Forge Realtime](https://developer.atlassian.com/platform/forge/realtime/)
- [Realtime Events API](https://developer.atlassian.com/platform/forge/runtime-reference/realtime-events-api/)
- [Long-Running Functions](https://developer.atlassian.com/platform/forge/use-a-long-running-function/)
- [Forge Release Phases](https://developer.atlassian.com/platform/forge/whats-coming/)

# App Lifecycle Management

This section covers app lifecycle management using the Forge CLI.

## Prerequisites

- Atlassian Developer Account
- Forge CLI installed globally: `npm install -g @forge/cli`
- Access to Confluence Cloud site for development/testing
- Access to Atlassian Developer Console: https://developer.atlassian.com/console/myapps/

## Authentication

### Forge CLI Credentials

The Forge CLI uses **separate** authentication from your application's runtime variables:

- **CLI Authentication**: Stored in `~/.forge/` directory
  - Used by `forge` commands (deploy, tunnel, install, etc.)
  - Managed via `forge login` command
  - Must be refreshed when token expires

- **Application Runtime Variables**: Stored in `.env` file or Forge variables
  - Used by your application code at runtime
  - Accessed via `process.env.VARIABLE_NAME`
  - Not used by Forge CLI

**Token Expiration**: If you get "API token is no longer valid" error, run:

```bash
forge login
```

This will prompt for re-authentication and update the CLI credentials in `~/.forge/`.

### CI/CD Authentication

In CI environments (GitHub Actions), the Forge CLI authenticates via environment variables instead of `forge login`:

- `FORGE_EMAIL`: Atlassian account email of the CI service account
- `FORGE_API_TOKEN`: API token generated at https://id.atlassian.com/manage-profile/security/api-tokens

Both variables are stored as GitHub repository secrets and referenced in the
[publish workflow](../../.github/workflows/publish.yml).

> [!IMPORTANT]
> The CI account must be added as a **contributor** to the Forge app in the
> [Developer Console](https://developer.atlassian.com/console/myapps/). Deployment requires contributor access.

> [!WARNING]
> Installation and upgrade require **site admin** privileges on the target Confluence site, so `forge install` is
> run manually via `npm run issue` rather than automated in CI.

## App Registration

### Initial Setup

1. **Login to Forge**
   ```bash
   forge login
   ```

2. **Create New App** (first time only)
   ```bash
   forge create
   # Follow prompts to select app type and name
   ```

3. **Register App in Development Site**
   ```bash
   forge register
   # Select your Confluence site from the list
   ```

## Environment Management

### Development Environment

1. **Install App in Development Site**
   ```bash
   forge install
   # Select the site where you want to install the app
   ```

2. **Start Development Tunnel**
   ```bash
   forge tunnel
   ```

3. **View App Details**
   ```bash
   forge whoami
   forge settings list
   ```

### Production Deployment

1. **Deploy to Production**
   ```bash
   forge deploy
   ```

2. **Install in Production Site**
   ```bash
   forge install --site {site-url}
   # OR use interactive selection
   forge install
   ```

3. **Upgrade Existing Installation**
   ```bash
   forge install --upgrade
   ```

## Secret Management

**IMPORTANT**: After setting or updating environment variables, the app must be redeployed to the target environment to
pick up the new secret values.

### Deployment Environment Variables

Forge provides encrypted environment variables for production deployments:

1. **List All Variables**
   ```bash
   forge variables list
   ```

2. **Set Encrypted Variable**
   ```bash
   forge variables set --encrypt --environment development GEMINI_KEY "your-dev-gemini-key"
   forge variables set --encrypt --environment staging GEMINI_KEY "your-staging-gemini-key"
   forge variables set --encrypt --environment production GEMINI_KEY "your-prod-gemini-key"
   ```

3. **Update Existing Variable**
   ```bash
   forge variables set --encrypt --environment production GEMINI_KEY "new-gemini-key"
   ```

4. **Remove Variable**
   ```bash
   forge variables unset --encrypt --environment production GEMINI_KEY
   ```

5. **View Variable (value will be masked)**
   ```bash
   forge variables list --environment production
   ```

### Local Development with .env

For local development with `forge tunnel`, you can use environment variables from a `.env` file:

1. **Create .env File**
   ```bash
   touch .env
   ```

2. **Add Variables to .env**
   ```bash
   FORGE_USER_VAR_GEMINI_KEY=your-local-gemini-key
   ```

3. **Run Tunnel with Environment Variables**
   ```bash
   # Load .env and run tunnel (requires dotenv-cli or similar)
   npx dotenv-cli -- forge tunnel
   ```

4. **Access Variables in Code**
   ```typescript
   // In your resolver functions
   const geminiKey = process.env.GEMINI_KEY; // No FORGE_USER_VAR_ prefix in code
   ```

## App Lifecycle Commands

### Development Workflow

1. **Setup Project**
   ```bash
   npm install            # Install dependencies
   forge login            # Authenticate
   forge register         # Register app (first time)
   forge install          # Install in dev site
   ```

2. **Daily Development**
   ```bash
   forge tunnel           # Start tunnel for live development
   # Make changes, test in Confluence
   # Changes are reflected immediately via tunnel
   ```

3. **Deploy Changes**
   ```bash
   # Deployment is automated via GitHub Actions on push to release/* branches
   # If manifest scopes change, manually upgrade the installation:
   npm run issue
   ```

### Production Deployment

1. **Prepare for Production**
   ```bash
   # Set production environment variables
   forge variables set --encrypt --environment production GEMINI_KEY "prod-gemini-key"
   ```

2. **Deploy to Production**
   ```bash
   forge deploy --environment production
   ```

3. **Install in Production Site**
   ```bash
   forge install --site your-production-site.atlassian.net --environment production
   ```

## Monitoring and Maintenance

### App Information

```bash
forge whoami                    # Current user and app info
forge settings list             # App settings
forge lint                      # Check for issues
forge logs                      # View app logs
```

### Developer Console Management

Access the Atlassian Developer Console to manage your apps via web interface:

- **Console URL**: https://developer.atlassian.com/console/myapps/
- **Features Available**:
  - View all registered apps
  - Manage app installations across sites
  - View app analytics and usage metrics
  - Manage environment variables through UI
  - Monitor app health and performance
  - Configure app permissions and scopes
  - Access real-time and historical logs

### Site Management

```bash
forge install --list           # List all installations
forge uninstall --site {url}   # Remove from specific site
```

### Troubleshooting

```bash
forge logs --follow            # Live log streaming
forge logs --environment production --follow
forge whoami                   # Verify authentication
forge settings list            # Check app configuration
```

## Security Best Practices

1. **Never commit secrets to version control**

- Add `.env` to `.gitignore`
- Use forge variables for all sensitive data

2. **Use different keys per environment**

- Development keys for local/dev
- Production keys for live sites

3. **Rotate keys regularly**
   ```bash
   forge variables set --encrypt --environment production GEMINI_KEY "new-rotated-gemini-key"
   ```

4. **Audit access regularly**
   ```bash
   forge variables list  # Review what variables exist
   forge settings list   # Review app permissions
   ```

## Common Workflows

### New Feature Development

```bash
# 1. Start tunnel for development
forge tunnel

# 2. Develop and test locally
# (changes reflect immediately)

# 3. Deploy when ready
forge deploy
forge install --upgrade
```

### Environment Promotion

```bash
# 1. Test in development
forge tunnel

# 2. Deploy to staging
forge variables set --encrypt --environment staging GEMINI_KEY "staging-gemini-key"
forge deploy --environment staging
forge install --site staging-site.atlassian.net --environment staging

# 3. Deploy to production
forge variables set --encrypt --environment production GEMINI_KEY "prod-gemini-key"
forge deploy --environment production
forge install --site prod-site.atlassian.net --environment production
```

### Emergency Rollback

```bash
# View previous deployments
forge deployments

# Rollback to previous version
forge deploy --environment production --version {previous-version}
```
