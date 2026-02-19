---
title: Prompt Testing Log for @translate.sys.md
description: |
  Memory for LLM assistants working with the academic document translation prompt.
  Documents behavioral requirements, known issues, and validation procedures.
---

# Overview

This log serves as memory for LLM assistants when asked to modify or validate the policy-translate prompt.

It provides documentation of behavioral expectations, known issues and their fixes, and regression prevention guidance.

This is NOT an automated test suite - it's human-readable documentation for LLM-assisted prompt engineering.

**IMPORTANT**: Use this log under the guidance of the `prompt-engineer` skill, which provides validation workflows,
maintenance principles, and improvement procedures.

# Inbox

- Content placeholder `{{target_language}}` is embedded in the prompt; evaluate whether it should be passed as a
  dedicated message instead
- Typo on line 10: "th text" should be "the text"
- Structured JSON output is now required but the exact schema (field names, nesting) is not formally documented in the
  log; consider adding a schema reference

---

# Test Cases

## Content Fidelity

**Input**: An academic regulation document in a source language with `{{target_language}}` set to a different language

**Expected Behavior**:

- Every word, phrase, and sentence is translated; nothing is omitted
- No words, qualifiers, or explanations are added beyond the source text
- Translation reflects what is written, not what is interpreted

**Validation**: Align source and translated documents paragraph-by-paragraph to verify completeness and fidelity

## Terminology Precision

**Input**: A document containing institutional bodies, official roles, academic degrees, discipline names, and
institutional names

**Expected Behavior**:

- Institutional and governing bodies use standard official names in the target country's university system
- Official roles and titles use established translated equivalents
- Academic degrees use the target country's educational framework terminology
- Semantically distinct academic terms are not conflated (for example, "postgraduate" vs "doctoral", "professor" vs
  "lecturer")
- Academic disciplines are translated with correct scope (no narrowing or broadening)
- Institutional names use their official published translation, or are retained in the original language if none exists

**Validation**: Verify each translated term against official target-language equivalents

## Formality and Tone

**Input**: A formal, legalistic academic document

**Expected Behavior**:

- The level of formality is matched exactly
- No colloquialisms or informal language introduced
- Formal terms are not replaced with less formal operational equivalents
- Semantic nuances are preserved (e.g., "support" vs. "encouragement")

**Validation**: Review translated text for tone consistency against the source

## Layout and Formatting Preservation

**Input**: A markdown document with headings, section numbering, lists, tables, bold, and italics

**Expected Behavior**:

- Document structure is replicated: headings, subheadings, section numbering, paragraph breaks
- Text formatting (bold, italics) is preserved via markdown syntax
- Lists and tables are replicated exactly
- Markdown front matter (between `---`) is removed

**Root Cause**: Front-matter leakage was a persistent issue in the improvement prompt, requiring three successive
refinements to suppress. The model reproduced YAML front matter from source documents despite instructions to exclude
it. Fixes progressed from vague ("do not include markdown from matter") to precise ("the section between the `---`") to
elevated ("Absolute Constraints" section with `DO NOT` convention).

**CRITICAL**: Front-matter exclusion instructions must remain explicit, precise, and prominently positioned. Vague or
buried instructions cause immediate regression.

**Validation**: Diff the markdown structure (headings, lists, tables) between source and translation; verify no YAML
front matter appears in output

## Placeholder Translation

**Input**: A document containing placeholder fields (e.g., `First Name Last Name`, `Working Title`, `Date of Signature`)

**Expected Behavior**:

- Descriptive text of placeholders is translated into `{{target_language}}`
- Original formatting (brackets, capitalization) is maintained to indicate variable fields

**Validation**: Verify all placeholders are translated while retaining their structural markers

## JSON Output Compliance

**Input**: Any valid academic document with `{{target_language}}` set

**Expected Behavior**:

- Output is a single, valid JSON object
- No surrounding text, explanations, or markdown formatting (for example, ` ```json `)
- Contains the required fields: target language code, translated title, and full translation
- Markdown content within JSON uses properly escaped newlines

**Root Cause**: Both the translation and improvement prompts required explicit JSON enforcement. The model wrapped JSON
in markdown code fences, breaking downstream parsers. The improvement prompt needed a dedicated fix (v005→006) with
explicit prohibition of code fence wrapping.

**CRITICAL**: JSON formatting instructions must explicitly prohibit markdown code fences around the output. Removing
this prohibition causes immediate parser failures.

**Validation**: Parse output as JSON and verify schema compliance, field presence, and absence of wrapping
