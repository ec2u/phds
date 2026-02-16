---
title: Translation Prompt Evolution
summary: Design history of the academic document translation pipeline and the abandoned multi-phase architecture
description: |
  Reconstructs the evolution of the translation prompt family from legacy Langfuse versions, documenting the transition
  from a single-pass translator to a three-phase draft-improve-evaluate pipeline and the eventual consolidation back
  into a single prompt.
---

# Background

The system translates extracted Markdown versions of academic agreements (cotutelle PhD agreements, university
regulations) into a target language. The translation pipeline evolved through four distinct prompt families managed in
Langfuse between June and October 2025, before migrating to [local file-based management](.).

- **`TRANSLATION`**: 8 versions (June–October 2025) — the main translation prompt
- **`TRANSLATION_IMPROVEMENT`**: 6 versions (June–August 2025) — a second-pass refinement prompt
- **`TRANSLATION_DRAFTING`**: 2 versions (August 2025) — a first-pass draft prompt
- **`TRANSLATION_EVALUATION`**: 5 versions (August 2025) — a quality assurance prompt

# Single-Phase Translation (June 2025)

## Version 1 — Baseline (10 June 2025)

The initial prompt defined an "expert translator specializing in official academic and administrative documents" with
four rule categories:

- **Accuracy and fidelity**: exact, faithful representation; no additions, omissions, or interpretation
- **Layout and formatting**: replicate headings, lists, tables, bold/italic, headers/footers, signature blocks
- **Placeholder handling**: translate descriptive placeholder text (for instance, "First Name Last Name") into the target
  language while preserving the variable format; three worked examples provided
- **Proper nouns**: use official institutional name translations where they exist; retain originals otherwise

The prompt used mixed variable syntax (`{single}` and `{{double}}` braces) and included a three-step "translation
process" section instructing the model to read, translate section-by-section, then review.

The source document was embedded directly in the prompt template via `{{source_content}}`.

## Versions 2–3 — Template and Formatting Fixes (21 June 2025)

Two changes on the same day:

- **Variable syntax**: unified all variables to `{{double}}` braces, fixing template rendering failures from the mixed
  naming
- **Document type**: hardcoded to "academic regulation" instead of a variable placeholder
- **Language code clarification**: added "ISO 639-1 two-letter code" to disambiguate bare language codes
- **Front-matter exclusion**: added instruction to remove YAML front matter (`---` blocks) from the source, addressing
  front matter bleeding into translations
- **Prompt formatting**: stripped bold Markdown from the prompt text itself (version 3), which was being conflated with
  content formatting instructions

## Version 4 — JSON Output (15 August 2025)

Switched from raw text output to structured JSON with `language`, `title`, and `translation` fields. The three-step
process section was removed, as it consumed tokens without measurable quality gain.

## Versions 5–6 — Terminology Precision and Major Rewrite (15 August 2025)

Version 5 added term-precision rules (for instance, distinguishing "postgraduate" from "doctoral," "professor" from
"lecturer") and required valid Markdown output.

Version 6 was a major rewrite driven by multiple production failures:

- **Guiding principles**: "Assume High Stakes," "Think Like a University Registrar," "When in Doubt, Do Not Invent"
- **Cardinal rule**: explicit "No Content Alteration" section with three `DO NOT` directives (omit, add, interpret)
- **Terminology verification checklist**: five categories — institutional bodies, official roles, degrees, academic
  disciplines, institutional names — each with examples and action instructions
- **Semantic precision**: specific rules against meaning shifts (for instance, "support" vs "encouragement") and
  formality degradation (for instance, "Code of Conduct" becoming "Operating Instructions")

The production failures that motivated this rewrite included content omission/addition, formality degradation,
institutional terms translated literally instead of mapped to established equivalents (for instance, "Faculty of Arts"
becoming "Faculty of Philosophy"), and semantic drift with near-synonyms.

## Versions 7–8 — Deterministic Parameters and Input Decoupling (August–October 2025)

Version 7 added deterministic inference parameters (`temperature: 0`, `seed: 42`, `top_p: 0`, `top_k: 1`) for
reproducible outputs.

Version 8 decoupled the source document from the prompt template: instead of embedding via `{{source_content}}`, the
document was provided as separate input data. This enabled prompt caching independently of document content and avoided
"lost in the middle" effects with long documents.

# The Multi-Phase Experiment

## Architecture

Between June and August 2025, two additional prompts were developed alongside the main `TRANSLATION` prompt, suggesting
a three-phase pipeline:

1. **Draft** (`TRANSLATION_DRAFTING`): first-pass translation
1. **Improve** (`TRANSLATION_IMPROVEMENT`): second-pass refinement comparing original text against the draft
1. **Evaluate** (`TRANSLATION_EVALUATION`): quality assurance comparing the improved translation against a ground-truth
   reference

## Drafting Prompt

Created on 22 August 2025 with 2 versions. Version 1 was a broken export artefact containing five `[object Object]`
literals where template variables should appear — a JavaScript `.toString()` coercion during Langfuse export. Version 2
fixed the variables to `{{target_language}}` and `{{source_content}}`.

The drafting prompt text is essentially identical to the `TRANSLATION` prompt at version 4 level (JSON output, front-
matter exclusion, same formatting rules). It did not incorporate the version 6 terminology and semantic precision
improvements, suggesting it was branched before the major rewrite and never updated.

## Improvement Prompt

Created on 10 June 2025 — the same day as the initial translation prompt — with 6 versions. This prompt took three
inputs: the original text, an initial translation, and a target language. It instructed the model to review and refine
the draft to "human-expert quality."

Key evolution:

- **Version 1**: basic refinement producing plain text
- **Version 2**: added ISO 639-1 language clarification; expanded output to three structured fields (language, title,
  translation)
- **Versions 3–5**: three successive attempts to suppress front-matter leakage, progressively escalating from an
  ambiguous instruction ("Do not include markdown from matter") to a clear reference ("the section between the `---` at
  the beginning of the document") to elevation into the "Absolute Constraints (Non-negotiable Rules)" section
- **Version 6**: enforced strict JSON output; prohibited markdown code fences around JSON

The front-matter leakage issue required three iterations to resolve (versions 3–5), illustrating the difficulty of
suppressing specific unwanted behaviours through prompt wording alone.

## Evaluation Prompt

Created on 11 August 2025 with 5 versions. Unlike `PDF_TO_MD_EVALUATION` which compared a source PDF against generated
Markdown, this prompt compared a *proposed translation* against a *ground-truth reference translation*.

The evaluation prompt followed the same progressive relaxation pattern seen in the PDF extraction evaluator:

| Version | Change | False Positive Addressed |
|---|---|---|
| 1 (baseline) | Four criteria: semantic accuracy, terminology, grammar/syntax, omissions/additions | — |
| 2 | Added exclusions: synonyms, sentence rearrangements, common-noun-to-proper-name substitutions | Trivial variations flagged as errors |
| 3 | Removed dedicated terminology criterion; broadened synonym exclusion to "equivalent expression" | Terminology criterion overlapped with semantic accuracy; redundant findings |
| 4 | Added casing exclusion; refined synonym tolerance to "in the common language" | Capitalisation differences flagged as errors |
| 5 | Simplified output format heading | Prompt hygiene |

Version 5 also declared a dependency on the `JSON_OUTPUT` prompt (version 1) in its Langfuse resolution graph — the
only inter-prompt dependency recorded in the entire archive.

## Outcome

The multi-phase architecture is not present in the current codebase. The `translate()` function in
[`policy.ts`](../../src/server/tasks/async/policy.ts) makes a single prompt call using the consolidated
[`policy-translate.sys.md`](../../src/server/tasks/async/policy-translate.sys.md) prompt, which corresponds to
`TRANSLATION` version 8.

No `TRANSLATION_DRAFTING`, `TRANSLATION_IMPROVEMENT`, or `TRANSLATION_EVALUATION` prompts are referenced in the
TypeScript code. No `Activity.Evaluating` or `Activity.Improving` steps exist in the task activity enum.

The archive shows that the drafting prompt was never updated beyond version 4 level of the main translation prompt,
while the main prompt continued evolving through the version 6 major rewrite. The improvement prompt's development
stalled at front-matter and JSON output fixes. The evaluation prompt followed the same false-positive exclusion
trajectory seen in the [PDF extraction evaluator](pdf-to-md.md).

# Related Resources

- Active prompt: [`policy-translate.sys.md`](../../../src/server/tasks/policy/policy-translate.sys.md)
- Development log: [`policy-translate.log.md`](../../../src/server/tasks/policy/policy-translate.log.md)
- Translation archive: [`TRANSLATION/`](TRANSLATION/)
- Drafting archive: [`TRANSLATION_DRAFTING/`](TRANSLATION_DRAFTING/)
- Improvement archive: [`TRANSLATION_IMPROVEMENT/`](TRANSLATION_IMPROVEMENT/)
- Evaluation archive: [`TRANSLATION_EVALUATION/`](TRANSLATION_EVALUATION/)
