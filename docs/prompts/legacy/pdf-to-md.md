---
title: PDF Extraction Prompt Evolution
summary: Design history of the PDF-to-Markdown extraction pipeline and the abandoned two-phase evaluation approach
description: |
  Reconstructs the evolution of the PDF-to-Markdown conversion prompts from legacy Langfuse versions, documenting the
  transition from raw Markdown output to JSON-wrapped extraction and the attempted — then abandoned — two-phase
  extraction-plus-evaluation pipeline.
---

# Background

The system extracts substantive content from PDF academic agreements (cotutelle PhD agreements, university regulations)
and converts it to structured GitHub Flavoured Markdown for downstream analysis. The extraction pipeline evolved through
two distinct prompt families managed in Langfuse between June and August 2025, before migrating to
[local file-based management](.).

- **`PDF_TO_MD`**: 4 versions (June–August 2025) — the extraction prompt
- **`PDF_TO_MD_EVALUATION`**: 4 versions (August 2025) — a quality assurance prompt, created and abandoned within a
  single day

# Extraction Prompt Evolution

## Version 1 — Raw Markdown Output (10 June 2025)

The initial prompt defined the role as an "expert AI assistant specialising in converting complex documents" and produced
raw Markdown directly. Key design choices established in this baseline:

- **Substance over style**: extract binding terms, definitions, and structural components; omit decorative and
  administrative noise (logos, headers/footers, signature blocks, stamps)
- **Semantic structure**: replicate document hierarchy using headings (`#`, `##`, `###`), not visual layout
- **Content integrity**: retain substantive text verbatim; correct obvious OCR errors; never summarise
- **Strict GFM formatting**: precise rules for headings, lists (with mandatory trailing blank lines), tables, and inline
  emphasis

The output was plain Markdown with no metadata envelope. No inference parameters were configured.

## Version 2 — JSON Envelope and Role Reframing (17 June 2025)

The raw Markdown output was not programmatically parseable — the application needed structured metadata (document title,
language code) for downstream processing. This version introduced two major changes:

- **JSON wrapping**: output became a single JSON object with `title`, `language` (ISO 639-1), and `markdownContent`
  fields
- **Role reframing**: changed from "expert AI assistant" to "expert AI data extraction specialist," aligning the model's
  behaviour with structured data extraction rather than document formatting

The formatting rules were condensed and a new instruction was added: "Do not use tables for simple layout purposes,"
addressing cases where the model converted visual-layout tables (which were not actual data grids) into GFM tables.

## Version 3 — Title Case Enforcement (17 June 2025)

Created the same day as version 2. The only change was adding "in title case" to the `title` field specification,
addressing inconsistent title casing across outputs (sentence case, ALL CAPS, mixed).

## Version 4 — Deterministic Inference (27 August 2025)

No prompt text change. Added deterministic inference parameters to enable reproducible outputs for regression testing:

```json
{
  "temperature": 0,
  "seed": 42,
  "top_p": 0,
  "top_k": 1,
  "candidate_count": 1
}
```

This version was labelled `production` and `latest` in Langfuse. The prompt text is identical to version 3 and to the
current [`policy-extract.sys.md`](../../src/server/tasks/async/policy-extract.sys.md).

# The Two-Phase Experiment

## Motivation

On 11 August 2025 — between extraction versions 3 and 4 — a second prompt (`PDF_TO_MD_EVALUATION`) was created to
introduce a **two-phase pipeline**: extract first, then evaluate the extraction against the source PDF. The evaluation
prompt would compare the source PDF against the generated Markdown and report discrepancies as structured JSON.

All four evaluation versions were created and iterated within a single day, suggesting a rapid prototyping session.

## Evaluation Prompt Design

The evaluation prompt defined a "Document Comparison and Quality Assurance Agent" that checked two axes:

- **Content equivalence**: missing content, added content, altered content
- **Structural integrity**: tables, lists, headings, content order

It also specified an exclusions list of non-substantive differences to ignore (page headers/footers, watermarks,
decorative images, minor formatting differences).

## Progressive Relaxation of Criteria

Each iteration expanded the exclusions list to suppress a specific category of false positive:

| Version | Change | False Positive Addressed |
|---|---|---|
| 1 (baseline) | "Altered content" defined as "typos, changed wording, or paraphrased sentences" | — |
| 2 | Narrowed "altered content" to "changed the wording or the meaning"; moved typo corrections to exclusions | Evaluator flagged legitimate typo fixes as content alterations |
| 3 | Added "bold or italic differences" to exclusions | PDF bold/italic extraction is inherently ambiguous |
| 4 | Added "differences in symbols used for bullets in lists" to exclusions | Different bullet characters (`-` vs `*` vs Unicode) flagged as errors |

The trajectory is clear: each version addressed a specific false positive category by relaxing the evaluation criteria,
progressively eroding the evaluator's discriminating power.

## Outcome

The evaluation prompt was labelled `production` in Langfuse but **never integrated into the application code**. No
`Activity.Evaluating` step exists in the task pipeline, and no TypeScript code references `PDF_TO_MD_EVALUATION`.

The archive does not record why the two-phase approach was not pursued further. What the version history does show is
that all four evaluation iterations were spent expanding the exclusions list to suppress false positives, rather than
improving the evaluator's ability to catch genuine errors.

# Related Resources

- Active prompt: [`policy-extract.sys.md`](../../../src/server/tasks/async/policy-extract.sys.md)
- Development log: [`policy-extract.log.md`](../../../src/server/tasks/async/policy-extract.log.md)
- Extraction archive: [`PDF_TO_MD/`](PDF_TO_MD/)
- Evaluation archive: [`PDF_TO_MD_EVALUATION/`](PDF_TO_MD_EVALUATION/)
