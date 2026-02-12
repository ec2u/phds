---
title: PDF_TO_MD Version History
summary: Issues addressed in each iteration of the PDF-to-Markdown conversion prompt
description: |
  Converts PDF documents (academic agreements, regulations) into structured GitHub Flavoured Markdown, extracting
  substantive content while discarding decorative and administrative noise. Output wrapped in a JSON envelope with
  metadata.
---

# Version History

| Transition     | Changes                                                                                                                                                                                 | Likely Issue Addressed                                                                                                               |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| 001 (baseline) | Raw Markdown output with detailed formatting rules; role as "expert AI assistant specialising in converting complex documents"                                                          | Initial prompt for PDF-to-Markdown conversion                                                                                        |
| 001 to 002     | Wrapped output in JSON (`title`, `language`, `markdownContent`); role reframed as "data extraction specialist"; formatting rules condensed; added "do not use tables for simple layout" | Raw Markdown not programmatically parseable; application needed structured metadata (title, language code) for downstream processing |
| 002 to 003     | Added "in title case" to `title` field specification                                                                                                                                    | Inconsistent title casing across generated outputs (sentence case, ALL CAPS, mixed)                                                  |
| 003 to 004     | No prompt change; added deterministic inference parameters (`temperature: 0`, `seed: 42`, `top_p: 0`, `top_k: 1`, `candidate_count: 1`)                                                 | Non-reproducible outputs across identical inputs, hindering regression testing                                                       |
