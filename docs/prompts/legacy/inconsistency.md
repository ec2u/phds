---
title: Inconsistency Analysis Prompt Evolution
summary: Design history of the compliance audit pipeline across 23 detection and 2 merging prompt versions
description: |
  Reconstructs the evolution of the inconsistency detection and merging prompts from legacy Langfuse versions,
  documenting the iterative refinement of clash taxonomy, false positive suppression, follow-up pass control, and the
  persistent tension between completeness and noise.
---

# Background

The system performs compliance audits by comparing a university document (for instance, a cotutelle PhD agreement)
against a governing policy, identifying substantive clashes. The results from multiple comparison passes are then
deduplicated into a clean list of unique findings. The pipeline evolved through two prompt families managed in Langfuse
between June and October 2025, before migrating to [local file-based management](.).

- **`INCONSISTENCY_DETECTION`**: 23 versions (June–October 2025) — the compliance audit prompt
- **`INCONSISTENCY_MERGING`**: 2 versions (July–October 2025) — the deduplication prompt

The detection prompt is by far the most heavily iterated prompt in the archive. Its 23 versions reveal several recurring
tensions that were never fully resolved through prompt wording alone.

# Detection Prompt Evolution

## Phase 1 — Initial Design (June 2025, versions 1–3)

The baseline established the core task: analyse a document against a policy, report clashes as structured JSON. Five
clash types were defined: direct contradiction, non-compliance, procedural mismatch, significant omission, and ambiguity
or definitional conflict.

- **Version 1**: documents embedded inline via template variables; flat output with policy excerpt, document excerpt, and
  a monolithic "reason" field
- **Version 2**: externalised document content; added `document_name` and `policy_name` variables for labelling
- **Version 3**: split the monolithic "reason" into separate title and description fields for better UI rendering

## Phase 2 — Feature Enrichment (July 2025, versions 4–6)

Version 4 was the first major enrichment, driven by multiple gaps:

- **Role persona**: added "meticulous compliance officer" framing
- **Translation support**: added `target_language` variable for the multilingual EC2U context
- **Known-issues exclusion**: added `existing_issues` (later renamed `known_issues` in version 5) for iterative use
  where previously found clashes are excluded from subsequent passes
- **Severity assessment**: high/medium/low ratings for each clash
- **Taxonomy reduction**: dropped the "Ambiguity or Definitional Conflict" category (5 → 4 types), which was generating
  noisy false positives

Version 6 repositioned the known-issues section to the end of the prompt and made severity values explicit, leveraging
end-of-prompt emphasis for better exclusion adherence.

## Phase 3 — False Positive Reduction (July 2025, versions 7–14)

Version 7 was a major overhaul that addressed three categories of false positive through a dedicated "What is NOT a
Clash" section:

- **Semantic variations**: different phrasing for the same concept (for instance, "Office of the Dean of Students" vs
  "Dean of Students' Office")
- **Super-compliance**: document exceeds the policy's minimum requirements (for instance, 48-hour notification vs
  5-business-day requirement)
- **Expansion into undefined areas**: document covers topics the policy is silent about

The clash taxonomy was further reduced to 3 types: direct contradiction, sub-compliance, and procedural conflict.

Versions 8–9 addressed a different noise source — **hallucinated findings**:

- **Version 8**: added explicit permission for empty output ("feel free to return an empty list"), addressing the model's
  tendency to force findings even when none existed
- **Version 9**: added explicit prohibition ("Never invent irrelevant or inexistent inconsistencies")

Version 10 strengthened translation enforcement to `MUST` with explicit prohibition of other languages, after the model
returned excerpts in the original document language instead of translating.

Versions 11–14 formed a **follow-up pass suppression arc**, progressively raising the threshold for reporting on
subsequent passes (when known issues already exist):

| Version | Wording | Effect |
|---|---|---|
| 11 | "only highlight clashes of critical severity" | Limited to critical |
| 12 | "only report critical severity clashes — although these are unlikely" | Added rarity hint |
| 13 | "return an empty list, unless super-critical clashes are found" | Default to empty |
| 14 | "return an empty list — unless there are extremely critical contradictions, which are unlikely" | Strongest suppression |

Each version raised the bar further, suggesting the previous wording was still not sufficient to suppress marginal
findings on follow-up passes.

## Phase 4 — Completeness and Architecture (August 2025, versions 15–18)

Having suppressed false positives, the focus shifted to the opposite problem: **missed genuine clashes**.

- **Version 15**: re-embedded documents inline via `<policy>` and `<document>` XML tags (reversing the version 2
  externalisation), to improve cross-referencing accuracy. Added a completeness instruction ("You MUST be extremely
  sure"). This was the first of several architectural oscillations between inline embedding and external passing.
- **Version 16**: refined the completeness instruction with peer-review framing: "a second analysis would not reveal any
  new clashes"
- **Versions 17–18**: structural reorganisation; moved behavioural instructions to a dedicated `IMPORTANT NOTE` section
  at the prompt end for stronger influence

## Phase 5 — Methodology and Final Consolidation (August–October 2025, versions 19–23)

Version 19 was the second major rewrite:

- **Taxonomy consolidation**: reduced from 3 to 2 clash types — **Contradiction** (incompatible specifics) and
  **Insufficiency** (failure to fully implement a requirement, encompassing both omissions and lowered standards)
- **Methodology section**: introduced an explicit 4-step audit process — policy decomposition, systematic comparison,
  clash identification/filtering, report generation. This was the first version to prescribe *how* the model should
  approach the task rather than only defining what to look for.
- **JSON formatting guard**: explicit prohibition of wrapping JSON in markdown code fences

The remaining versions addressed residual issues:

- **Version 20**: fixed a section-name cross-reference
- **Version 21**: elevated completeness to a dedicated `CRITICAL INSTRUCTION` section with "100% coverage" language and
  peer-review framing
- **Version 22**: re-added document names as metadata labels; document content moved to a separate delivery mechanism
  (another oscillation)
- **Version 23**: formalised the known-issues input structure (title, severity, analysis, excerpts); removed
  `known_issues` from template variables; added `CRITICAL` emphasis on the exclusion rule

# Recurring Themes

The 23-version history reveals five persistent tensions:

## False Positives vs Completeness

The most fundamental tension. Versions 7–14 progressively suppressed false positives (semantic variations,
super-compliance, hallucinated findings), only for versions 15–21 to discover that completeness had suffered. The prompt
alternated between tightening filters and adding completeness mandates, never fully resolving the trade-off.

## Follow-Up Pass Control

Versions 11–14 show four successive attempts to suppress marginal findings on follow-up passes, each with stronger
wording than the last. The difficulty stems from the known-issues exclusion being a soft instruction that the model does
not reliably follow — a problem that persisted through version 23.

## Taxonomy Simplification

The clash taxonomy was reduced three times: 5 → 4 types (version 4), 4 → 3 (version 7), 3 → 2 (version 19). Each
reduction addressed classification confusion where the model assigned findings to overlapping categories. The final
taxonomy (Contradiction + Insufficiency) is the simplest partition that covers the problem space.

## Architectural Oscillation

Document content alternated between inline embedding and external passing:

| Versions | Architecture | Rationale |
|---|---|---|
| 1 | Inline (template variables) | Initial design |
| 2–14 | External (separate input) | Prompt-length management |
| 15–19 | Inline (`<policy>`/`<document>` XML tags) | Cross-referencing accuracy |
| 22–23 | External (separate mechanism) + metadata labels | Prompt caching; names for output labelling |

Each direction addressed a real trade-off: inline embedding improves the model's ability to cross-reference specific
clauses, while external passing keeps the prompt cacheable and avoids token limits with long documents.

## Methodology Prescription

Early versions defined *what* to look for (clash types, exclusions) but not *how* to approach the task. Version 19
introduced an explicit 4-step methodology (decompose → compare → filter → report), reflecting the insight that
structured reasoning instructions can improve both completeness and precision.

# Merging Prompt

The merging prompt operates downstream of detection, consolidating raw inconsistency reports into unique findings. Its
evolution was minimal:

- **Version 1** (July 2025): defined the "Expert Analyst in Academic Policy and Compliance" role with deduplication
  criteria, three worked examples illustrating duplicate vs unique findings, and JSON output. Input was a flat text block
  via `{{inconsistencies}}` template variable.
- **Version 2** (October 2025): replaced the template variable with a structured input description (title, severity,
  analysis, excerpts per entry), reflecting the upstream detection prompt's evolution to richer output fields. Reordered
  sections to "context first, then task."

The merging prompt's stability (2 versions vs detection's 23) suggests that deduplication was a well-defined problem from
the start, while the detection task required extensive iteration to calibrate precision and recall.

# Related Resources

- Active detection prompt: [`analyze-detect.sys.md`](../../../src/server/tasks/async/analyze-detect.sys.md)
- Active merging prompt: [`analyze-merge.sys.md`](../../../src/server/tasks/async/analyze-merge.sys.md)
- Detection development log: [`analyze-detect.log.md`](../../../src/server/tasks/async/analyze-detect.log.md)
- Merging development log: [`analyze-merge.log.md`](../../../src/server/tasks/async/analyze-merge.log.md)
- Detection archive: [`INCONSISTENCY_DETECTION/`](INCONSISTENCY_DETECTION/)
- Merging archive: [`INCONSISTENCY_MERGING/`](INCONSISTENCY_MERGING/)
