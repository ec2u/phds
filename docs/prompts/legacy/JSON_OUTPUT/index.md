---
title: JSON_OUTPUT Version History
summary: Utility prompt enforcing strict JSON output format
description: |
  Lightweight, composable system-prompt fragment that forces the model to produce a single valid JSON object with no
  surrounding prose or markdown code fences. Designed to be composed with other task-specific prompts. Static and
  parameterless.
---

# Version History

| Transition     | Changes                                                                                                     | Likely Issue Addressed                                              |
|----------------|-------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| 001 (baseline) | Two-line instruction: output must be a single valid JSON object; no text, explanations, or markdown fencing | Reusable format-enforcement fragment for all JSON-producing prompts |

Single version with no subsequent iterations. No input variables or configuration metadata.
