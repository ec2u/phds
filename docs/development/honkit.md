---
title: HonKit Documentation Site
summary: User documentation site powered by HonKit
description: |
  Configuration and usage notes for the HonKit-based user documentation site
  deployed to GitHub Pages.
---

# Overview

User-facing documentation under `docs/reference/` is published as a static site using
[HonKit](https://github.com/honkit/honkit), a Node-based markdown book generator forked from GitBook.

HonKit was selected for its minimal setup, built-in navigation sidebar and page table of contents, and clean default
theme. It requires no build configuration beyond a `SUMMARY.md` file that defines the content structure.

# Key Resources

| Resource                                                           | Description                                 |
|--------------------------------------------------------------------|---------------------------------------------|
| [HonKit Documentation](https://honkit.netlify.app/)                | Official documentation and usage guide      |
| [HonKit Repository](https://github.com/honkit/honkit)              | Source code, releases, and issue tracker    |
| [Pages and Summary](https://honkit.netlify.app/pages.html)         | `SUMMARY.md` structure and navigation setup |
| [Markdown Syntax](https://honkit.netlify.app/syntax/markdown.html) | Supported markdown features and extensions  |

# Project Setup

HonKit is installed as a dev dependency:

```bash
npm i -D honkit
```

# Content Structure

The documentation source lives in `docs/reference/` and follows HonKit conventions:

- **`README.md`**: landing page for the documentation site
- **`SUMMARY.md`**: defines the sidebar navigation as a nested markdown list
- **Markdown files**: individual documentation pages referenced from `SUMMARY.md`

# Built-in Features

- **Sidebar navigation**: generated from `SUMMARY.md` — supports nested chapters and parts
- **Page table of contents**: rendered automatically from page headings in the default theme
- **Search**: full-text search across all pages
- **Theming**: clean, minimalistic default theme with customisation support
