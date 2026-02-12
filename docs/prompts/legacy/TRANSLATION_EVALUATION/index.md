---
title: TRANSLATION_EVALUATION Version History
summary: Issues addressed in each iteration of the translation evaluation prompt
description: |
  Linguistic quality assurance prompt that compares a proposed translation against a ground-truth reference, identifying
  discrepancies and evaluating their impact. Output is structured JSON.
---

# Version History

| Transition     | Changes                                                                                                                          | Likely Issue Addressed                                                                                                                                                                                           |
|----------------|----------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 001 (baseline) | Four analysis criteria: semantic accuracy, terminology, grammar/syntax, omissions/additions; no exclusions for minor differences | Initial evaluation prompt; every difference reported regardless of significance                                                                                                                                  |
| 001 to 002     | Added exclusion list: synonyms, sentence rearrangements, common-noun-to-proper-name substitutions                                | Evaluator flagging trivial, inconsequential translation variations as errors (false positives)                                                                                                                   |
| 002 to 003     | Removed dedicated Terminology criterion; broadened synonym exclusion to "or an equivalent expression"                            | Terminology criterion overlapped with semantic accuracy and generated redundant findings; synonym exclusion still too narrow                                                                                     |
| 003 to 004     | Added "difference in casing" exclusion; refined synonym tolerance to "in the common language"                                    | Evaluator flagging capitalisation differences (for example, "Master's Programme" vs "master's programme"); needed to preserve sensitivity to domain-specific terminology while tolerating everyday synonym swaps |
| 004 to 005     | Simplified output format heading from "Output Format: Strict JSON" to "Output Format"                                            | Prompt hygiene; "Strict" qualifier redundant with body instructions                                                                                                                                              |

The overall trajectory is progressive noise reduction. The initial prompt was too sensitive, and each version introduced
filters to suppress acceptable variation while preserving detection of genuine quality issues.
