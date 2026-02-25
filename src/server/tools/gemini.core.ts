/*
 * Copyright © 2025-2026 EC2U Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Utilities for the Gemini API.
 *
 * > [!IMPORTANT]
 * > The Gemini API is evolving rapidly — model deprecations, billing changes, and new features are frequent.
 * >
 * > **Official channels**
 * >
 * > - {@link https://ai.google.dev/gemini-api/docs/changelog Gemini API Changelog} — primary source for breaking
 * >   changes, deprecations, and new features (also available as
 * >   {@link https://ai.google.dev/gemini-api/docs/changelog.md.txt plain text} for diffing)
 * > - {@link https://developers.googleblog.com/ Google Developers Blog} — major release announcements (for example,
 * >   Gemini 3, Interactions API, Deep Research Agent)
 * > - {@link https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes Vertex AI Release Notes} — for
 * >   the Vertex AI variant of the same models
 * >
 * > **Monitoring**
 * >
 * > - The `changelog.md.txt` URL can be polled or fetched periodically to detect changes programmatically
 * > - {@link https://releasebot.io/updates/google Releasebot} aggregates Google release notes across products,
 * >   including Gemini API
 *
 * @module
 */

import { Schema, Type } from "@google/genai";
import { isArray, isBoolean, isNumber, isObject, isString, message } from "../../shared/tools/core";

/**
 * Actionable hints for known HTTP status codes.
 */
const hints: Record<number, string> = {
	400: "check request parameters",
	401: "check the API key",
	403: "check API key permissions",
	429: "rate limit exceeded, retry later",
	500: "Gemini internal error, retry later",
	503: "Gemini temporarily unavailable, retry later"
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value matches a Gemini {@link Schema} definition at runtime.
 *
 * The Gemini API guarantees syntactic JSON compliance via `responseSchema`, but does not enforce semantic constraints
 * such as `enum`, `pattern`, `minimum`/`maximum`, or `minLength`/`maxLength`. This function fills that gap by
 * recursively validating the value against the schema's `type`, `required`, `properties`, `items`, `enum`, `nullable`,
 * `pattern`, `minLength`/`maxLength`, `minimum`/`maximum`, `minItems`/`maxItems`, and `minProperties`/`maxProperties`
 * constraints, composing the existing `is*()` type guards.
 *
 * @param value The value to validate
 * @param schema The Gemini schema to validate against
 *
 * @returns true if the value conforms to the schema; false otherwise
 *
 * @see {@link https://ai.google.dev/gemini-api/docs/structured-output Gemini Structured Output}
 */
export function matches(value: unknown, schema: Schema): boolean {

	if ( schema.nullable && value === null ) {

		return true;

	} else if ( schema.anyOf ) {

		return schema.anyOf.some(sub => matches(value, sub));

	} else {

		switch ( schema.type ) {

			case Type.NULL:

				return value === null;

			case Type.BOOLEAN:

				return isBoolean(value);

			case Type.NUMBER:

				return isNumber(value)
					&& (schema.minimum === undefined || value >= schema.minimum)
					&& (schema.maximum === undefined || value <= schema.maximum);

			case Type.INTEGER:

				return isNumber(value) && Number.isInteger(value)
					&& (schema.minimum === undefined || value >= schema.minimum)
					&& (schema.maximum === undefined || value <= schema.maximum);

			case Type.STRING:

				return isString(value)
					&& (!schema.enum || schema.enum.includes(value))
					&& (!schema.pattern || new RegExp(schema.pattern).test(value))
					&& (!schema.minLength || value.length >= Number(schema.minLength))
					&& (!schema.maxLength || value.length <= Number(schema.maxLength));

			case Type.ARRAY:

				return isArray(value)
					&& (!schema.items || value.every(item => matches(item, schema.items!)))
					&& (!schema.minItems || value.length >= Number(schema.minItems))
					&& (!schema.maxItems || value.length <= Number(schema.maxItems));

			case Type.OBJECT:

				return isObject(value)
					&& (!schema.required || schema.required.every(key => key in value))
					&& (!schema.properties || Object.entries(schema.properties).every(([key, sub]) =>
						!(key in value) || matches(value[key], sub)
					))
					&& (!schema.minProperties || Object.keys(value).length >= Number(schema.minProperties))
					&& (!schema.maxProperties || Object.keys(value).length <= Number(schema.maxProperties));

			default:

				return false;

		}

	}

}

/**
 * Converts a Gemini API error to a human-readable trace string.
 *
 * For `ApiError` instances (duck-typed as `Error` with a numeric `status` property), extracts the HTTP status code
 * and the human-readable message from the JSON-encoded response body, appending an actionable hint when available.
 *
 * For non-API errors, falls back to {@link message}.
 *
 * @param error The error to trace
 *
 * @returns A formatted trace string like `(429) resource has been exhausted; retry later`
 *
 * @see {@link https://github.com/googleapis/js-genai/blob/main/src/errors.ts ApiError source}
 * @see {@link https://ai.google.dev/gemini-api/docs/troubleshooting Gemini API error codes}
 */
export function trace(error: unknown): string {

	if ( error instanceof Error && isNumber((error as any).status) ) {

		const status = (error as any).status as number;
		const hint = hints[status];

		// extract human-readable message from JSON-encoded API response body

		const detail = parse(error.message);
		const text = (isString(detail) ? detail : error.message).toLowerCase();

		return `(${status}) ${text}${hint ? `; ${hint}` : ""}`;


		function parse(body: string): unknown {
			try { return JSON.parse(body)?.error?.message; } catch { return undefined; }
		}

	} else {

		return message(error);

	}

}
