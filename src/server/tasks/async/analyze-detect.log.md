---
title: Prompt Testing Log for @analyze-detect.sys.md
description: |
  Memory for LLM assistants working with the compliance clash detection prompt.
  Documents behavioral requirements, known issues, and validation procedures.
---

# Overview

This log serves as memory for LLM assistants when asked to modify or validate the analyze-detect prompt.

It provides documentation of behavioral expectations, known issues and their fixes, and regression prevention guidance.

This is NOT an automated test suite - it's human-readable documentation for LLM-assisted prompt engineering.

**IMPORTANT**: Use this log under the guidance of the `prompt-engineer` skill, which provides validation workflows,
maintenance principles, and improvement procedures.

# Inbox

- Content placeholders (`{{target_language}}`, `{{document_name}}`, `{{policy_name}}`) are embedded in the prompt;
  evaluate whether these should be passed as dedicated messages instead
- Known issues input structure (title, severity, analysis, excerpts) is described in the `INPUT DATA` section but has
  no formal schema validation; evaluate whether a JSON schema or example block would improve adherence
- Typo on line 9: "wil" should be "will"

---

# Test Cases

## Contradiction Detection

**Input**: A document-policy pair where the document specifies a value directly opposing the policy mandate

**Expected Behavior**:

- Clash is identified and classified as "Contradiction"
- Output includes the specific conflicting clauses from both document and policy
- Analysis explains why the values are incompatible
- Output is translated into the specified `{{target_language}}`

**Validation**: Verify that opposing values, conflicting authorities, and incompatible rules are all detected

## Insufficiency Detection

**Input**: A document that omits a mandated policy component or fails to meet a minimum standard

**Expected Behavior**:

- Clash is identified and classified as "Insufficiency"
- Both omissions of components and failures to meet quantitative/qualitative standards are detected
- Missing process steps are identified

**Validation**: Verify detection of lowered standards, omitted components, and omitted process steps

## Non-Clash Filtering

**Input**: A document-policy pair containing semantic variations, super-compliance, and expansions into undefined areas

**Expected Behavior**:

- Semantic or minor phrasing variations are NOT reported as clashes
- Super-compliance (stricter standards) is NOT reported as a clash
- Expansions into areas the policy is silent about are NOT reported as clashes

**Validation**: Confirm zero false positives for each of the three non-clash categories

## Known Issues Exclusion

**Input**: A document-policy pair where some clashes match entries in the exclusion list

**Expected Behavior**:

- Clashes substantively identical to exclusion list entries are filtered out
- Only new clashes not on the exclusion list are reported
- If all detected clashes are on the exclusion list, an empty result is returned

**Validation**: Verify that known issues are excluded and only novel clashes appear in output

## JSON Output Compliance

**Input**: Any valid document-policy pair

**Expected Behavior**:

- Output is a single, valid JSON object
- No surrounding text, explanations, or markdown formatting (e.g., ```json)
- Each clash entry includes: title, severity, governing policy excerpt, conflicting document excerpt, analysis
- All output text is translated into `{{target_language}}`

**Validation**: Parse output as JSON and verify schema compliance and target language

## Empty Output and Anti-Hallucination

**Input**: A document-policy pair with no genuine clashes (the document fully complies with the policy)

**Expected Behavior**:

- The model returns an empty JSON array
- No clashes are fabricated to fill the output
- No irrelevant or non-existent inconsistencies are invented

**Root Cause**: Models naturally resist producing empty output and tend to generate low-quality findings to appear
thorough. Required explicit permission for empty output and a direct prohibition against fabrication.

**CRITICAL**: The prompt must retain both the empty-output permission and the anti-hallucination prohibition. Removing
either causes regression to fabricated findings.

**Validation**: Submit a fully compliant document and verify the output is an empty JSON array with zero entries

## Follow-up Pass Suppression

**Input**: A document-policy pair where known issues are provided (simulating a second or subsequent analysis pass)

**Expected Behavior**:

- The model strongly defaults to empty output on follow-up passes
- Only extremely critical new contradictions justify non-empty output on subsequent passes
- Marginal or low-severity new findings are suppressed

**Root Cause**: Follow-up passes consistently produced redundant or marginal findings alongside the excluded known
issues. Required four prompt iterations (versions 011-014) to stabilise, progressively raising the reporting threshold
from "critical severity" to "return an empty list unless extremely critical contradictions."

**CRITICAL**: The follow-up pass suppression language in the exclusion section must remain aggressive. Weakening it
causes immediate regression to verbose second-pass output.

**Validation**: Provide a set of known issues covering the major clashes and verify the model returns empty or
near-empty output

## Completeness Coverage

**Input**: A document-policy pair containing multiple clashes of varying severity spread across different sections

**Expected Behavior**:

- All valid clashes are identified, not just the most obvious ones
- The model systematically decomposes the policy before comparing (per the METHODOLOGY section)
- A second independent analysis would not reveal additional missed clashes

**Root Cause**: False-positive reduction measures (non-clash filtering, follow-up suppression) occasionally caused the
model to over-filter, missing genuine clashes. Required a dedicated `CRITICAL INSTRUCTION` section with "100% coverage"
language and peer-review framing.

**CRITICAL**: The `CRITICAL INSTRUCTION` section must remain prominent. It counterbalances the false-positive reduction
rules. Removing or weakening it causes missed clashes.

**Validation**: Compare model output against a manually prepared ground truth of all clashes in the test pair

## Translation Enforcement

**Input**: A document-policy pair in a non-English language with `{{target_language}}` set to a different language

**Expected Behavior**:

- All output text (excerpts, analysis, titles) is in the target language
- Policy and document excerpts are translated, not left in the source language
- No mixed-language output

**Root Cause**: The model defaulted to returning excerpts in the original document language rather than translating
them. Required strengthening from soft guidance to "MUST" with explicit prohibition of other languages.

**Validation**: Verify that every text field in the JSON output is in the specified target language

## Taxonomy Strictness

**Input**: Any valid document-policy pair producing clashes

**Expected Behavior**:

- Every clash is classified as either "Contradiction" or "Insufficiency"
- No other classification labels appear (no "Ambiguity", "Procedural Mismatch", "Non-Compliance", or invented types)

**Root Cause**: The taxonomy was progressively simplified from 5 to 2 types across multiple prompt iterations because
additional categories caused classification confusion and inconsistent labelling.

**Validation**: Verify that all clash entries use only the two defined classification types
