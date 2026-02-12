---
title: TRANSLATION_DRAFTING Version History
summary: Issues addressed in each iteration of the translation drafting prompt
description: |
  First-pass translation prompt for official academic documents. Produces a fully localised draft preserving meaning,
  formal tone, structural layout, and placeholder fields.
---

# Version History

| Transition     | Changes                                                                                                                                             | Likely Issue Addressed                                                                                                         |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| 001 (baseline) | Complete prompt structure but non-functional: five `[object Object]` literals where variables should appear; no variables declared in YAML metadata | Broken export artefact from Langfuse-to-local migration; JavaScript objects coerced to strings via `.toString()` during export |
| 001 to 002     | Replaced all `[object Object]` with `{{target_language}}` and `{{source_content}}`; declared both variables in YAML                                 | Bug fix restoring prompt to working order after platform migration; no instructional content changed                           |

The version history reflects a single corrective change driven by the migration from Langfuse to local prompt
management. Version 001 is the broken export artefact; version 002 is the fix that adopted Mustache-style variable
syntax and declared the required inputs.
