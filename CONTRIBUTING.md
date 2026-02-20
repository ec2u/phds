# Getting Involved

Code patches are not the only way to get involved: you can help the project by reporting bugs; improving docs; helping
others on [GitHub Issues](https://github.com/ec2u/phds/issues); telling the world about EC2U ;-)

# Reporting Bugs

Before opening an [issue](https://github.com/ec2u/phds/issues) to report a bug, search open issues for similar cases
and, if something is found, just add any additional details in the comments.

If you've really found a new bug, creating a helpful report using the dedicated template will make fixing it much easier
and quicker.

If you just want some help, start a [discussion](https://github.com/ec2u/phds/discussions) and describe your problem.

# Suggesting Features

If you think you have a good idea about improving or extending @ec2u/phds, feel free to open
an [issue](https://github.com/ec2u/phds/issues), using the dedicated template.

Again search open suggestions and, if something is found, just add any additional details in the comments.

# Submitting Pull Requests

All pull requests must reference an open issue. If one doesn't exist yet, create it first using the appropriate template.

## Branching Model

The repository follows a GitFlow-inspired branching model with the following long-lived branches:

- **`main`**: stable baseline; automatically synced from `release/production`
- **`release/development`**: integration branch for ongoing work
- **`release/production`**: pre-release staging branch

Feature and fix branches are short-lived and based on `release/development`.

## Branch Naming

Create branches from the related GitHub issue using this naming convention:

- `feature/gh-{number}-{slug}` for Feature issues
- `bug/gh-{number}-{slug}` for Bug issues
- `task/gh-{number}-{slug}` for Task issues

## Creating a Pull Request

1. Create a branch from `release/development` following the naming convention above
2. Make your changes, keeping commits focused and well-described
3. Open a pull request targeting **`release/development`** as the base branch
4. Reference the related issue in the PR description (for example, `Closes #123`)
5. Ensure the PR description clearly summarises the changes and their rationale
