---
title: Prompt Testing Log for @analyze-merge.sys.md
description: |
  Memory for LLM assistants working with the inconsistency deduplication/merge prompt.
  Documents behavioral requirements, known issues, and validation procedures.
---

# Overview

This log serves as memory for LLM assistants when asked to modify or validate the analyze-merge prompt.

It provides documentation of behavioral expectations, known issues and their fixes, and regression prevention guidance.

This is NOT an automated test suite - it's human-readable documentation for LLM-assisted prompt engineering.

**IMPORTANT**: Use this log under the guidance of the `prompt-engineer` skill, which provides validation workflows,
maintenance principles, and improvement procedures.

# Inbox

- Typo on line 9: "wil" should be "will"
- The output JSON schema is not specified beyond "single, valid JSON object"; consider defining the expected structure

---

# Test Cases

## Duplicate Grouping

**Input**: Multiple inconsistency reports describing the same core conflict in different wording

**Expected Behavior**:

- Reports referring to the same policy point, same subject, and same conflicting terms are grouped together
- A single canonical description is produced per group
- The canonical description summarizes the core conflict clearly and concisely

**Validation**: Verify that differently worded reports about the same factual discrepancy produce exactly one output entry

## Distinct Issue Preservation

**Input**: Inconsistency reports covering different policy points (e.g., committee composition vs. teaching hours)

**Expected Behavior**:

- Each distinct policy conflict produces a separate entry in the output
- No unrelated issues are merged together
- All unique conflicts from the input are represented in the output

**Validation**: Count unique policy points in input and verify output contains the same number of distinct entries

## Canonical Description Quality

**Input**: A group of duplicate inconsistency reports

**Expected Behavior**:

- The consolidated description captures the core policy point and both conflicting values
- Language is clear, concise, and neutral
- No information from the individual reports is lost in consolidation

**Validation**: Verify the canonical description includes the policy point, the conflicting terms, and is self-contained

## JSON Output Compliance

**Input**: Any valid set of inconsistency reports

**Expected Behavior**:

- Output is a single, valid JSON object
- No surrounding text, comments, or explanations
- Contains only the deduplicated list of unique inconsistencies

**Validation**: Parse output as JSON and verify it contains only canonical descriptions
