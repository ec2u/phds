---
title: TRANSLATION_IMPROVEMENT Version History
summary: Issues addressed in each iteration of the translation improvement prompt
description: |
  Second-pass prompt in the translation pipeline. Takes an original text, an initial machine translation, and a target
  language, then refines the translation to human-expert quality while preserving Markdown formatting.
---

# Version History

| Transition | Changes | Likely Issue Addressed |
|---|---|---|
| 001 (baseline) | Basic refinement prompt requesting a single plain-text improved translation; target language variable used directly as a language name | Initial improvement prompt |
| 001 to 002 | Added ISO 639-1 clarification for language variable; expanded output to three structured fields (language, title, translation); cleaned up prompt Markdown formatting (removed bold emphasis, switched to `#` headings) | Model misinterpreting two-letter language codes; downstream system needed structured metadata alongside translation; prompt-level formatting confused with output formatting |
| 002 to 003 | Appended "Do not include markdown from matter" to output section | Model reproducing YAML front matter from source documents in translation output |
| 003 to 004 | Clarified front-matter instruction to "the section between the `---` at the beginning of the document" | Abbreviated instruction ("markdown from matter") too ambiguous; model continued including front matter |
| 004 to 005 | Moved front-matter exclusion from output section to "Absolute Constraints (Non-negotiable Rules)" section with `DO NOT` uppercase convention | Front-matter exclusion not reliably followed as output guidance; elevated to hard constraint alongside other non-negotiable rules for stronger compliance |
| 005 to 006 | Enforced strict JSON output format; explicit prohibition of markdown code fences around JSON; removed redundant preamble instructions | Move from free-text to machine-parseable structured output; model was wrapping JSON in code blocks that broke downstream parsers |

The front-matter leakage issue required three successive refinements (versions 003 through 005), illustrating the
difficulty of suppressing specific unwanted behaviours through prompt instructions alone.
