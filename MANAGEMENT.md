# Management Guide

This guide covers the complete app lifecycle management for the EC2U PhD Agreements Tool using Atlassian Forge.

## Prerequisites

- Atlassian Developer Account
- Forge CLI installed globally: `npm install -g @forge/cli`
- Access to Confluence Cloud site for development/testing

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
   npm run start
   # OR
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
   npm run issue
   # OR
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

For local development with `forge tunnel`, use environment variables:

1. **Create .env File**
   ```bash
   # Create .env in project root
   touch .env
   ```

2. **Add Variables to .env**
   ```dotenv
   # .env file format
   FORGE_USER_VAR_GEMINI_KEY=your-local-gemini-key
   ```

3. **Run Tunnel with Environment Variables**
   ```bash
   npx dotenv -- forge tunnel
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
   npm run setup          # Install dependencies
   forge login            # Authenticate
   forge register         # Register app (first time)
   forge install          # Install in dev site
   ```

2. **Daily Development**
   ```bash
   npm run start          # Start tunnel for live development
   # Make changes, test in Confluence
   # Changes are reflected immediately via tunnel
   ```

3. **Deploy Changes**
   ```bash
   npm run issue          # Deploy to Forge
   forge install --upgrade # Upgrade installation
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
npm run start

# 2. Develop and test locally
# (changes reflect immediately)

# 3. Deploy when ready
npm run issue
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