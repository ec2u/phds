---
title: Prompt Testing Log for @extract.sys.md
description: |
  Memory for LLM assistants working with the document extraction prompt.
  Documents behavioral requirements, known issues, and validation procedures.
---

# Overview

This log serves as memory for LLM assistants when asked to modify or validate the policy-extract prompt.

It provides documentation of behavioral expectations, known issues and their fixes, and regression prevention guidance.

This is NOT an automated test suite - it's human-readable documentation for LLM-assisted prompt engineering.

**IMPORTANT**: Use this log under the guidance of the `prompt-engineer` skill, which provides validation workflows,
maintenance principles, and improvement procedures.

# Inbox

- Input specification is implicit (the document is "provided") with no explicit format or delivery mechanism described
- Heading hierarchy uses `###` for top-level sections instead of `#`/`##`; evaluate consistency with other prompts

---

# Test Cases

## Markdown Content Fidelity

**Input**: An academic document with substantive binding terms, definitions, and structural components

**Expected Behavior**:

- All essential text is retained verbatim (no summarization)
- Document hierarchy is replicated using markdown headings (`#`, `##`, `###`)
- Original section numbering is preserved in heading text
- Obvious OCR errors are corrected

**Validation**: Compare extracted markdown against source document for completeness and structural accuracy

## Formatting Rules Compliance

**Input**: A document containing headings, lists, tables, and inline formatting

**Expected Behavior**:

- `#` used only for main document title; `##` for major sections; `###` for subsections
- Unordered lists use `-`; ordered lists use `1.`
- Blank line after every list for proper rendering
- Data grids converted to GFM tables; layout-only tables converted to text/lists
- `**bold**` for key entities; `*italics*` for defined terms

**Validation**: Render the markdown and verify proper formatting of each element type

## Omissions and Placeholders

**Input**: A document with logos, headers/footers, signature blocks, and embedded figures

**Expected Behavior**:

- Logos, letterheads, borders, page headers/footers, page numbers are omitted
- Tables of Contents are omitted
- Signature blocks are omitted
- Charts and figures are replaced with `![Description]` placeholders

**Validation**: Verify no decorative/administrative content in output and placeholders exist for figures

## JSON Output Compliance

**Input**: Any valid document

**Expected Behavior**:

- Output is a single, valid JSON object with `title`, `language`, and `markdownContent` fields
- `title` is concise and descriptive, in title case
- `language` is an ISO 639-1 two-letter code
- `markdownContent` contains the full GFM text with newlines escaped as `\n`
- No markdown code block wrapping, no commentary

**Validation**: Parse output as JSON and verify schema, title format, language code, and markdown content integrity
