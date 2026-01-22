---
title: Forge-Integrated GitHub Issues Feedback
summary: Collect user feedback in Confluence and submit to GitHub Issues via Forge
description: |
  Implementation approach for collecting feedback from Atlassian-authenticated users
  within a Confluence Forge app and proxying submissions to GitHub Issues.
---

# Overview

Users authenticated via Atlassian submit feedback within Confluence. The Forge backend
proxies submissions to the GitHub Issues API using a stored Personal Access Token (PAT).

```text
Confluence User (Atlassian auth) → Forge UI → Forge Resolver → GitHub Issues API
```

# Implementation

## Add feedback macro

The `macro:` key in `manifest.yml` is a YAML array. Add a dedicated feedback macro alongside
the existing one:

```yaml
modules:

  macro:

    - key: ec2u-phds-macro
      # ... existing macro config

    - key: ec2u-phds-feedback
      title: EC2U PhD Feedback
      description: Submit feedback and feature requests for the EC2U PhD tool.
      resource: feedback
      render: native
      layout: block
      resolver:
        function: resolver
```

Add the corresponding resource:

```yaml
resources:

  - key: macro
    path: src/client/macro.tsx

  - key: feedback
    path: src/client/feedback.tsx
```

## Manifest permissions

Add GitHub API to egress permissions in `manifest.yml`:

```yaml
permissions:
  scopes:
    - storage:app
  external:
    fetch:
      backend:
        - 'https://api.github.com'
```

## Store GitHub PAT securely

```bash
# Set encrypted variable (requires repo or public_repo scope)
forge variables set --encrypt GITHUB_TOKEN

# Deploy to apply changes
forge deploy
```

## Resolver to create issues

```typescript
import Resolver from '@forge/resolver';
import { fetch } from '@forge/api';

const resolver = new Resolver();

resolver.define('submitFeedback', async ({ payload, context }) => {
    const { title, body, type } = payload;
    const token = process.env.GITHUB_TOKEN;

    const response = await fetch(
        'https://api.github.com/repos/OWNER/REPO/issues',
        {
            method: 'POST',
            headers: {[.zshrc](../../../../../../.zshrc)
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
                title,
                body: `**Submitted by:** ${context.accountId}\n\n${body}`,
                labels: [type === 'bug' ? 'bug' : 'enhancement'],
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return { success: true };
});

export const handler = resolver.getDefinitions();
```

## GitHub PAT requirements

Create a [fine-grained PAT][gh-tokens] with:

- **Repository access**: Select your target repository
- **Permissions**: Issues → Read and write

# Benefits

- Users already authenticated via Atlassian
- No separate GitHub accounts required
- Feedback tied to Atlassian account ID (auditable)
- Fully integrated in the Confluence experience
- Single codebase with no external services

# Sources

- [Forge Fetch API][forge-fetch]
- [Forge Variables Set][forge-vars]
- [GitHub Issues API][gh-issues]
- [Forge External Authentication][forge-auth]

[gh-tokens]: https://github.com/settings/tokens?type=beta
[forge-fetch]: https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api/
[forge-vars]: https://developer.atlassian.com/platform/forge/cli-reference/variables-set/
[gh-issues]: https://docs.github.com/en/rest/issues/issues#create-an-issue
[forge-auth]: https://www.atlassian.com/blog/developer/new-forge-external-authentication-makes-outbound-oauth-easy
