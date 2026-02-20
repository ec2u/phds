---
title: "Issue #9: Large PDF Translation Failure"
summary: Root cause analysis and action plan for large PDF extraction truncation
description: Documents findings from reproducing the Gemini output truncation issue with large policy PDFs.
---

# Findings

## Reproduction

Tested with `work/sample.pdf` (54 pages, 827KB) using standalone scripts calling the Gemini API directly with the same
parameters as the app (`gemini-2.5-flash`, `temperature: 0`, `seed: 42`, structured JSON output).

- **Upload**: succeeds (Gemini Files API handles the 827KB PDF without issues)
- **Extraction**: Gemini returns a response, but the JSON is **truncated mid-string** — the `markdownContent` value
  exceeds the model's output token budget, producing an unterminated string
- **Translation**: never reached — extraction output is unparseable

```
SyntaxError: Unterminated string in JSON at position 107407
```

## Root Cause

The structured JSON response for a 54-page document is truncated at exactly **107,407 chars** regardless of the
`maxOutputTokens` setting. Setting `maxOutputTokens: 65536` (the `gemini-2.5-flash` maximum) does not change the
truncation point, ruling out the output token budget as the cause. The truncation appears to be caused by a different
limit — possibly a response size cap, a content generation ceiling in the model, or a structured output constraint.

The `JSON.parse` catch block in `gemini.ts:256` then silently returns `{}`, causing downstream failures with undefined
`title`, `language`, and `markdownContent`.

## Observations

- The truncation point is **deterministic** at 107,407 chars — identical across runs and across different
  `maxOutputTokens` values (unset, 1024, 65536)
- The Gemini API does not signal truncation as an error — it returns a 200 with incomplete content
- The app's error handling silently swallows the parse failure, making the issue hard to diagnose

# Action Plan

## Increase Maximum Output Tokens

Set `maxOutputTokens: 65536` in the default Gemini generation config at `src/server/tools/gemini.ts:45-48`:

```typescript
config: {
    seed: 0,
    temperature: 0,
    maxOutputTokens: 65536
}
```

This covers extraction, translation, and analysis tasks uniformly since all go through `process()` which merges with
`defaults.config`. The 65,536-token limit (~260K chars) supports documents up to roughly 120+ pages.

**Affected file**: `src/server/tools/gemini.ts`

## Harden Response Validation

Add a reusable `matchesSchema(value, schema)` type guard that validates a parsed JSON value against a Gemini `Schema`
definition at runtime. Currently `process()` in `gemini.ts:252-264` trusts `JSON.parse` output blindly — if parsing
succeeds but the shape is wrong (missing required fields, wrong types), the caller gets a partial object with
`undefined` properties and no error.

### `matchesSchema()` Utility

Add to `src/shared/index.ts` alongside the existing `is*()` guards, since it composes them and has no server-only
dependencies (the `Schema` and `Type` types from `@google/genai` are pure type imports).

```typescript
function matchesSchema(value: unknown, schema: Schema): boolean
```

Validation logic mapped to `Type` enum:

| `Type`    | Guard                                            |
|-----------|--------------------------------------------------|
| `STRING`  | `isString(value)` + optional `enum` check        |
| `NUMBER`  | `isNumber(value)`                                |
| `INTEGER` | `isNumber(value) && Number.isInteger(value)`     |
| `BOOLEAN` | `isBoolean(value)`                               |
| `NULL`    | `isNull(value)`                                  |
| `ARRAY`   | `isArray(value)` + recursive `items` validation  |
| `OBJECT`  | `isObject(value)` + `required` + `properties`    |

For `OBJECT`: check all `required` keys exist, then recursively validate each property listed in `properties` against
its sub-schema. For `nullable` schemas, accept `null` as valid.

### `process()` Integration

Replace the silent `return {}` fallback in `process()` at `src/server/tools/gemini.ts:252-264` with schema validation:

```typescript
if ( schema ) {
    try {
        const parsed = responseText.trim() ? JSON.parse(responseText) : {};
        if ( matchesSchema(parsed, schema) ) {
            return parsed;
        } else {
            throw new Error("response doesn't match expected schema");
        }
    } catch ( error ) {
        console.error(`invalid gemini response <${responseText.substring(0, 500)}…>`);
        throw asTrace(error);
    }
}
```

This turns silent data corruption into an explicit error that surfaces in the task status, making failures diagnosable.

**Affected files**: `src/shared/index.ts`, `src/server/tools/gemini.ts`

# Verification

## Safeguard Test (`maxOutputTokens: 1024`)

Forced truncation by setting `maxOutputTokens: 1024` in the reproduction script. The `matches()` validation catches
the failure at the `JSON.parse` level:

```
response: 99 chars
CAUGHT: Unterminated string in JSON at position 99 (line 3 column 4)
  response preview: <{"title": "Satzung der Johannes Kepler Universität Linz …>
```

Without the validation, the old code would have silently returned `{}`.

## Full Budget Test (`maxOutputTokens: 65536`)

With `maxOutputTokens: 65536`, the 54-page PDF still truncates at exactly **107,407 chars** — the same position as the
initial reproduction without `maxOutputTokens` set:

```
response: 107407 chars
CAUGHT: Unterminated string in JSON at position 107407 (line 4 column 107292)
```

This is identical to the original error at line 20. Setting `maxOutputTokens` has **no effect** on the truncation point,
which means the output token budget is **not the root cause**. The truncation is caused by a different limit — possibly
a response size cap, a content generation ceiling in the model itself, or a structured output constraint.
