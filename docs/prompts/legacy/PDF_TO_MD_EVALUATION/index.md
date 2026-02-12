---
title: PDF_TO_MD_EVALUATION Version History
summary: Issues addressed in each iteration of the PDF-to-Markdown evaluation prompt
description: |
  Quality assurance prompt that compares a source PDF against a replica Markdown file, reporting discrepancies as
  structured JSON. Checks content equivalence and structural integrity while ignoring non-substantive differences.
---

# Version History

| Transition     | Changes                                                                                                                                                                                                                                             | Likely Issue Addressed                                                                                                           |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| 001 (baseline) | Establishes comparison criteria (content equivalence, structural integrity) and exclusions (page headers/footers, watermarks, decorative images, minor formatting); "altered content" defined as "typos, changed wording, or paraphrased sentences" | Initial evaluation prompt                                                                                                        |
| 001 to 002     | Narrowed "altered content" to "changed the wording or the meaning"; moved typo fixes to exclusions; fixed list indentation; normalised casing ("PDF"/"MD")                                                                                          | Evaluator flagging legitimate typo corrections in the Markdown as content alterations (false positives)                          |
| 002 to 003     | Added "bold or italic differences" to exclusions                                                                                                                                                                                                    | Evaluator flagging inline formatting differences as errors; PDF bold/italic extraction is inherently ambiguous (false positives) |
| 003 to 004     | Added "differences in symbols used for bullets in lists" to exclusions                                                                                                                                                                              | Evaluator flagging different list bullet characters (for example, `-` vs `*` vs Unicode bullets) as errors (false positives)     |

The overall trajectory is progressive relaxation of evaluation criteria by expanding the exclusions list, each version
addressing a specific category of false positive observed in practice.
