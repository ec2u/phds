# UniPV EC2U Testing Repo

This repository contains tests and experiments for the UniPV EC2U project.

We use:

- [`uv`](https://github.com/astral-sh/uv) for project management
- [`pre-commit`](https://pre-commit.com/) for code formatting and linting

## 🏗️ Setup

1. Install `uv` if you don't have it already

```bash
# macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

2. Install dependencies and pre-commit hooks

```bash
uv sync
uv run pre-commit install --install-hooks
```

3. When you need to update the dependencies, run:

```bash
uv sync --upgrade --all-groups
uv run pre-commit autoupdate
```
