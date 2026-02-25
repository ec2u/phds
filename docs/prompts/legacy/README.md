---
title: Legacy Prompt Archive
summary: Archived Langfuse prompt versions exported before migration to local prompt management
description: |
  Read-only archive of all LLM prompt versions originally managed in Langfuse. Exported during the migration to local
  file-based prompt management to preserve the full iteration history for regression analysis and documentation.
---

# Purpose

This folder preserves the complete version history of LLM prompts that were originally managed in
[Langfuse](https://langfuse.com). The prompts were exported when the project migrated to local file-based prompt
management. The archive is read-only reference material for understanding how each prompt evolved and why.

# Folder Structure

Each prompt has its own top-level folder named after the Langfuse prompt (for example, `INCONSISTENCY_DETECTION/`).

## Prompt Level

```
PROMPT_NAME/
  index.md          version history summary with change analysis
  index.json        Langfuse prompt metadata (versions, labels, last config)
  YYYYMMDD-NNN/     one subfolder per version
  ...
```

- **`index.md`**: analysis of the issues addressed in each version transition
- **`index.json`**: raw API response from the Langfuse prompt list endpoint

## Version Level

Each version subfolder is named `YYYYMMDD-NNN` where `YYYYMMDD` is the Langfuse creation date (compact ISO 8601) and
`NNN` is the zero-padded version number.

```
YYYYMMDD-NNN/
  prompt.md         prompt text
  config.json       model parameters (temperature, seed, top_p, top_k, candidate_count)
  variables.yml     declared template variables (Mustache-style {{variable}} placeholders)
  index.json        full Langfuse API response for this version
```

- **`prompt.md`**: the prompt content as authored in Langfuse
- **`config.json`**: inference parameters passed to the model alongside the prompt
- **`variables.yml`**: YAML list of template variables the prompt expects
- **`index.json`**: complete Langfuse version metadata including timestamps, labels, commit messages, and dependency
  graph (`resolutionGraph`)

# Design Notes

Cross-cutting analyses reconstructing the evolution of each prompt family from the archived versions:

- [PDF-to-Markdown Extraction](pdf-to-md.md) — extraction pipeline and the abandoned two-phase evaluation approach
- [Translation](translation.md) — translation pipeline and the abandoned multi-phase draft-improve-evaluate architecture
- [Inconsistency Analysis](inconsistency.md) — compliance audit pipeline across 23 detection and 2 merging versions

# Prompts

| Prompt                    | Versions | Period             | Description                                                          |
|---------------------------|----------|--------------------|----------------------------------------------------------------------|
| `INCONSISTENCY_DETECTION` | 23       | 2025-06 to 2025-10 | Compliance audit identifying clashes between a document and a policy |
| `INCONSISTENCY_MERGING`   | 2        | 2025-07 to 2025-10 | Deduplication of raw inconsistency reports into unique findings      |
| `JSON_OUTPUT`             | 1        | 2025-08            | Reusable fragment enforcing strict JSON output formatting            |
| `PDF_TO_MD`               | 4        | 2025-06 to 2025-08 | PDF-to-Markdown conversion with metadata extraction                  |
| `PDF_TO_MD_EVALUATION`    | 4        | 2025-08            | Quality evaluation of PDF-to-Markdown conversions                    |
| `TRANSLATION`             | 8        | 2025-06 to 2025-10 | Academic document translation preserving formal register             |
| `TRANSLATION_DRAFTING`    | 2        | 2025-08            | First-pass translation draft generation                              |
| `TRANSLATION_EVALUATION`  | 5        | 2025-08            | Translation quality comparison against ground truth                  |
| `TRANSLATION_IMPROVEMENT` | 6        | 2025-06 to 2025-08 | Second-pass translation refinement                                   |
