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

import type { Schema } from "@google/genai";
import { Type } from "@google/genai";
import { describe, expect, it } from "vitest";

import { matches, trace } from "./gemini.core";


describe("matches", () => {

	describe("primitives", () => {

		describe("null", () => {

			const schema: Schema = { type: Type.NULL };

			it("should accept null", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should reject non-null values", async () => {
				expect(matches(undefined, schema)).toBeFalsy();
				expect(matches(0, schema)).toBeFalsy();
				expect(matches("", schema)).toBeFalsy();
				expect(matches(false, schema)).toBeFalsy();
			});

		});

		describe("boolean", () => {

			const schema: Schema = { type: Type.BOOLEAN };

			it("should accept booleans", async () => {
				expect(matches(true, schema)).toBeTruthy();
				expect(matches(false, schema)).toBeTruthy();
			});

			it("should reject non-booleans", async () => {
				expect(matches(0, schema)).toBeFalsy();
				expect(matches(1, schema)).toBeFalsy();
				expect(matches("true", schema)).toBeFalsy();
				expect(matches(null, schema)).toBeFalsy();
			});

		});

		describe("number", () => {

			const schema: Schema = { type: Type.NUMBER };

			it("should accept finite numbers", async () => {
				expect(matches(0, schema)).toBeTruthy();
				expect(matches(42, schema)).toBeTruthy();
				expect(matches(-1.5, schema)).toBeTruthy();
			});

			it("should reject non-finite numbers", async () => {
				expect(matches(Infinity, schema)).toBeFalsy();
				expect(matches(-Infinity, schema)).toBeFalsy();
				expect(matches(NaN, schema)).toBeFalsy();
			});

			it("should reject non-numbers", async () => {
				expect(matches("42", schema)).toBeFalsy();
				expect(matches(true, schema)).toBeFalsy();
				expect(matches(null, schema)).toBeFalsy();
			});

		});

		describe("number with minimum/maximum", () => {

			const schema: Schema = { type: Type.NUMBER, minimum: 0, maximum: 100 };

			it("should accept numbers within range", async () => {
				expect(matches(0, schema)).toBeTruthy();
				expect(matches(50, schema)).toBeTruthy();
				expect(matches(100, schema)).toBeTruthy();
			});

			it("should reject numbers below minimum", async () => {
				expect(matches(-1, schema)).toBeFalsy();
			});

			it("should reject numbers above maximum", async () => {
				expect(matches(101, schema)).toBeFalsy();
			});

		});

		describe("integer", () => {

			const schema: Schema = { type: Type.INTEGER };

			it("should accept integers", async () => {
				expect(matches(0, schema)).toBeTruthy();
				expect(matches(42, schema)).toBeTruthy();
				expect(matches(-7, schema)).toBeTruthy();
			});

			it("should reject non-integer numbers", async () => {
				expect(matches(1.5, schema)).toBeFalsy();
				expect(matches(-0.1, schema)).toBeFalsy();
			});

			it("should reject non-numbers", async () => {
				expect(matches("42", schema)).toBeFalsy();
				expect(matches(true, schema)).toBeFalsy();
			});

		});

		describe("integer with minimum/maximum", () => {

			const schema: Schema = { type: Type.INTEGER, minimum: 1, maximum: 10 };

			it("should accept integers within range", async () => {
				expect(matches(1, schema)).toBeTruthy();
				expect(matches(5, schema)).toBeTruthy();
				expect(matches(10, schema)).toBeTruthy();
			});

			it("should reject integers outside range", async () => {
				expect(matches(0, schema)).toBeFalsy();
				expect(matches(11, schema)).toBeFalsy();
			});

		});

		describe("string", () => {

			const schema: Schema = { type: Type.STRING };

			it("should accept strings", async () => {
				expect(matches("hello", schema)).toBeTruthy();
			});

			it("should accept empty strings", async () => {
				expect(matches("", schema)).toBeTruthy();
			});

			it("should reject non-strings", async () => {
				expect(matches(42, schema)).toBeFalsy();
				expect(matches(true, schema)).toBeFalsy();
				expect(matches(null, schema)).toBeFalsy();
				expect(matches(undefined, schema)).toBeFalsy();
				expect(matches([], schema)).toBeFalsy();
				expect(matches({}, schema)).toBeFalsy();
			});

		});

		describe("string with enum", () => {

			const schema: Schema = { type: Type.STRING, enum: ["red", "green", "blue"] };

			it("should accept values in enum", async () => {
				expect(matches("red", schema)).toBeTruthy();
				expect(matches("green", schema)).toBeTruthy();
				expect(matches("blue", schema)).toBeTruthy();
			});

			it("should reject values not in enum", async () => {
				expect(matches("yellow", schema)).toBeFalsy();
				expect(matches("", schema)).toBeFalsy();
			});

		});

		describe("string with pattern", () => {

			const schema: Schema = { type: Type.STRING, pattern: "^[A-Z]{3}$" };

			it("should accept strings matching the pattern", async () => {
				expect(matches("ABC", schema)).toBeTruthy();
			});

			it("should reject strings not matching the pattern", async () => {
				expect(matches("abc", schema)).toBeFalsy();
				expect(matches("AB", schema)).toBeFalsy();
				expect(matches("ABCD", schema)).toBeFalsy();
			});

		});

		describe("string with minLength/maxLength", () => {

			const schema: Schema = { type: Type.STRING, minLength: "2", maxLength: "5" };

			it("should accept strings within length bounds", async () => {
				expect(matches("ab", schema)).toBeTruthy();
				expect(matches("abc", schema)).toBeTruthy();
				expect(matches("abcde", schema)).toBeTruthy();
			});

			it("should reject strings below minimum length", async () => {
				expect(matches("a", schema)).toBeFalsy();
				expect(matches("", schema)).toBeFalsy();
			});

			it("should reject strings above maximum length", async () => {
				expect(matches("abcdef", schema)).toBeFalsy();
			});

		});

	});

	describe("composites", () => {

		describe("array", () => {

			const schema: Schema = { type: Type.ARRAY };

			it("should accept arrays without items schema", async () => {
				expect(matches([], schema)).toBeTruthy();
				expect(matches([1, "two", true], schema)).toBeTruthy();
			});

			it("should reject non-arrays", async () => {
				expect(matches("hello", schema)).toBeFalsy();
				expect(matches({}, schema)).toBeFalsy();
				expect(matches(42, schema)).toBeFalsy();
			});

		});

		describe("array with items schema", () => {

			const schema: Schema = { type: Type.ARRAY, items: { type: Type.NUMBER } };

			it("should accept arrays with matching items", async () => {
				expect(matches([1, 2, 3], schema)).toBeTruthy();
			});

			it("should accept empty arrays", async () => {
				expect(matches([], schema)).toBeTruthy();
			});

			it("should reject arrays with non-matching items", async () => {
				expect(matches([1, "two", 3], schema)).toBeFalsy();
			});

		});

		describe("array with object items", () => {

			const schema: Schema = {
				type: Type.ARRAY,
				items: {
					type: Type.OBJECT,
					properties: { id: { type: Type.INTEGER }, name: { type: Type.STRING } },
					required: ["id"]
				}
			};

			it("should accept arrays of valid objects", async () => {
				expect(matches([{ id: 1, name: "a" }, { id: 2 }], schema)).toBeTruthy();
			});

			it("should reject arrays with invalid objects", async () => {
				expect(matches([{ name: "a" }], schema)).toBeFalsy();
				expect(matches([{ id: 1.5 }], schema)).toBeFalsy();
			});

		});

		describe("array with minItems/maxItems", () => {

			const schema: Schema = { type: Type.ARRAY, items: { type: Type.STRING }, minItems: "1", maxItems: "3" };

			it("should accept arrays within item count bounds", async () => {
				expect(matches(["a"], schema)).toBeTruthy();
				expect(matches(["a", "b"], schema)).toBeTruthy();
				expect(matches(["a", "b", "c"], schema)).toBeTruthy();
			});

			it("should reject arrays below minimum item count", async () => {
				expect(matches([], schema)).toBeFalsy();
			});

			it("should reject arrays above maximum item count", async () => {
				expect(matches(["a", "b", "c", "d"], schema)).toBeFalsy();
			});

		});

		describe("object", () => {

			const schema: Schema = { type: Type.OBJECT };

			it("should accept plain objects without constraints", async () => {
				expect(matches({}, schema)).toBeTruthy();
				expect(matches({ a: 1 }, schema)).toBeTruthy();
			});

			it("should reject non-objects", async () => {
				expect(matches([], schema)).toBeFalsy();
				expect(matches("hello", schema)).toBeFalsy();
				expect(matches(42, schema)).toBeFalsy();
				expect(matches(null, schema)).toBeFalsy();
			});

		});

		describe("object with required only", () => {

			const schema: Schema = {
				type: Type.OBJECT,
				required: ["id", "name"]
			};

			it("should accept objects with all required keys", async () => {
				expect(matches({ id: 1, name: "Alice" }, schema)).toBeTruthy();
				expect(matches({ id: 1, name: "Alice", extra: true }, schema)).toBeTruthy();
			});

			it("should reject objects missing required keys", async () => {
				expect(matches({}, schema)).toBeFalsy();
				expect(matches({ id: 1 }, schema)).toBeFalsy();
			});

		});

		describe("object with required and properties", () => {

			const schema: Schema = {
				type: Type.OBJECT,
				properties: { name: { type: Type.STRING }, age: { type: Type.NUMBER } },
				required: ["name"]
			};

			it("should accept objects with all required fields", async () => {
				expect(matches({ name: "Alice" }, schema)).toBeTruthy();
				expect(matches({ name: "Alice", age: 30 }, schema)).toBeTruthy();
			});

			it("should reject objects missing required fields", async () => {
				expect(matches({}, schema)).toBeFalsy();
				expect(matches({ age: 30 }, schema)).toBeFalsy();
			});

			it("should reject objects with required field of wrong type", async () => {
				expect(matches({ name: 42 }, schema)).toBeFalsy();
			});

		});

		describe("object with properties", () => {

			const schema: Schema = {
				type: Type.OBJECT,
				properties: { name: { type: Type.STRING }, age: { type: Type.NUMBER } }
			};

			it("should accept objects with correctly typed properties", async () => {
				expect(matches({ name: "Alice", age: 30 }, schema)).toBeTruthy();
			});

			it("should accept objects with absent optional properties", async () => {
				expect(matches({}, schema)).toBeTruthy();
				expect(matches({ name: "Alice" }, schema)).toBeTruthy();
			});

			it("should reject objects with incorrectly typed properties", async () => {
				expect(matches({ name: 42 }, schema)).toBeFalsy();
				expect(matches({ age: "thirty" }, schema)).toBeFalsy();
			});

			it("should accept objects with extra properties", async () => {
				expect(matches({ name: "Alice", extra: true }, schema)).toBeTruthy();
			});

		});

		describe("object with minProperties/maxProperties", () => {

			const schema: Schema = { type: Type.OBJECT, minProperties: "1", maxProperties: "3" };

			it("should accept objects within property count bounds", async () => {
				expect(matches({ a: 1 }, schema)).toBeTruthy();
				expect(matches({ a: 1, b: 2 }, schema)).toBeTruthy();
				expect(matches({ a: 1, b: 2, c: 3 }, schema)).toBeTruthy();
			});

			it("should reject objects below minimum property count", async () => {
				expect(matches({}, schema)).toBeFalsy();
			});

			it("should reject objects above maximum property count", async () => {
				expect(matches({ a: 1, b: 2, c: 3, d: 4 }, schema)).toBeFalsy();
			});

		});

		describe("nested structures", () => {

			const schema: Schema = {
				type: Type.OBJECT,
				properties: {
					tags: { type: Type.ARRAY, items: { type: Type.STRING } },
					meta: {
						type: Type.OBJECT,
						properties: { count: { type: Type.INTEGER } },
						required: ["count"]
					}
				},
				required: ["tags", "meta"]
			};

			it("should accept deeply nested valid structures", async () => {
				expect(matches({ tags: ["a", "b"], meta: { count: 5 } }, schema)).toBeTruthy();
			});

			it("should reject invalid nested values", async () => {
				expect(matches({ tags: [1, 2], meta: { count: 5 } }, schema)).toBeFalsy();
				expect(matches({ tags: ["a"], meta: { count: 1.5 } }, schema)).toBeFalsy();
				expect(matches({ tags: ["a"], meta: {} }, schema)).toBeFalsy();
			});

		});

	});

	describe("modifiers", () => {

		describe("nullable string", () => {

			const schema: Schema = { type: Type.STRING, nullable: true };

			it("should accept null when nullable", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should accept valid values when nullable", async () => {
				expect(matches("hello", schema)).toBeTruthy();
			});

			it("should reject invalid non-null values when nullable", async () => {
				expect(matches(42, schema)).toBeFalsy();
			});

		});

		describe("nullable number", () => {

			const schema: Schema = { type: Type.NUMBER, nullable: true };

			it("should accept null when nullable", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should accept valid numbers when nullable", async () => {
				expect(matches(42, schema)).toBeTruthy();
			});

			it("should reject non-numbers when nullable", async () => {
				expect(matches("hello", schema)).toBeFalsy();
			});

		});

		describe("nullable object", () => {

			const schema: Schema = {
				type: Type.OBJECT,
				properties: { name: { type: Type.STRING } },
				nullable: true
			};

			it("should accept null when nullable", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should accept valid objects when nullable", async () => {
				expect(matches({ name: "Alice" }, schema)).toBeTruthy();
			});

			it("should reject non-objects when nullable", async () => {
				expect(matches("hello", schema)).toBeFalsy();
			});

		});

		describe("nullable array", () => {

			const schema: Schema = {
				type: Type.ARRAY,
				items: { type: Type.STRING },
				nullable: true
			};

			it("should accept null when nullable", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should accept valid arrays when nullable", async () => {
				expect(matches(["a", "b"], schema)).toBeTruthy();
			});

			it("should reject non-arrays when nullable", async () => {
				expect(matches("hello", schema)).toBeFalsy();
			});

		});

		describe("non-nullable", () => {

			const schema: Schema = { type: Type.STRING, nullable: false };

			it("should reject null when not nullable", async () => {
				expect(matches(null, schema)).toBeFalsy();
			});

			it("should accept valid values when not nullable", async () => {
				expect(matches("hello", schema)).toBeTruthy();
			});

		});

		describe("anyOf", () => {

			const schema: Schema = {
				anyOf: [
					{ type: Type.STRING },
					{ type: Type.NUMBER }
				]
			};

			it("should accept values matching any sub-schema", async () => {
				expect(matches("hello", schema)).toBeTruthy();
				expect(matches(42, schema)).toBeTruthy();
			});

			it("should reject values matching no sub-schema", async () => {
				expect(matches(true, schema)).toBeFalsy();
				expect(matches(null, schema)).toBeFalsy();
				expect(matches([], schema)).toBeFalsy();
			});

		});

		describe("anyOf with nullable sub-schemas", () => {

			const schema: Schema = {
				anyOf: [
					{ type: Type.STRING, nullable: true },
					{ type: Type.NUMBER }
				]
			};

			it("should accept null through nullable sub-schema", async () => {
				expect(matches(null, schema)).toBeTruthy();
			});

			it("should accept values matching any sub-schema", async () => {
				expect(matches("hello", schema)).toBeTruthy();
				expect(matches(42, schema)).toBeTruthy();
			});

		});

		describe("anyOf with object sub-schemas", () => {

			const schema: Schema = {
				anyOf: [
					{
						type: Type.OBJECT,
						properties: { kind: { type: Type.STRING, enum: ["a"] }, value: { type: Type.NUMBER } },
						required: ["kind", "value"]
					},
					{
						type: Type.OBJECT,
						properties: { kind: { type: Type.STRING, enum: ["b"] }, label: { type: Type.STRING } },
						required: ["kind", "label"]
					}
				]
			};

			it("should accept objects matching first sub-schema", async () => {
				expect(matches({ kind: "a", value: 42 }, schema)).toBeTruthy();
			});

			it("should accept objects matching second sub-schema", async () => {
				expect(matches({ kind: "b", label: "hello" }, schema)).toBeTruthy();
			});

			it("should reject objects matching no sub-schema", async () => {
				expect(matches({ kind: "c" }, schema)).toBeFalsy();
				expect(matches({}, schema)).toBeFalsy();
			});

		});

	});

	describe("edge cases", () => {

		describe("type unspecified", () => {

			const schema: Schema = { type: Type.TYPE_UNSPECIFIED };

			it("should reject all value types", async () => {
				expect(matches(null, schema)).toBeFalsy();
				expect(matches(true, schema)).toBeFalsy();
				expect(matches(42, schema)).toBeFalsy();
				expect(matches("hello", schema)).toBeFalsy();
				expect(matches([], schema)).toBeFalsy();
				expect(matches({}, schema)).toBeFalsy();
			});

		});

		describe("missing type", () => {

			it("should reject values when schema has no type", async () => {
				expect(matches("hello", {} as Schema)).toBeFalsy();
				expect(matches(42, {} as Schema)).toBeFalsy();
			});

		});

	});

});

describe("trace", () => {

	function apiError(status: number, apiMessage: string): Error & { status: number } {

		const error = new Error(JSON.stringify({
			error: { code: status, message: apiMessage, status: "SOME_STATUS" }
		})) as Error & { status: number };

		error.status = status;

		return error;

	}

	describe("ApiError with known status codes", () => {

		it("should format 400 errors with hint", () => {
			expect(trace(apiError(400, "Invalid argument"))).toBe("(400) invalid argument; check request parameters");
		});

		it("should format 401 errors with hint", () => {
			expect(trace(apiError(401, "API key not valid"))).toBe("(401) api key not valid; check the API key");
		});

		it("should format 403 errors with hint", () => {
			expect(trace(apiError(403, "Permission denied"))).toBe("(403) permission denied; check API key permissions");
		});

		it("should format 429 errors with hint", () => {
			expect(trace(apiError(429, "Resource has been exhausted"))).toBe("(429) resource has been exhausted; rate limit exceeded, retry later");
		});

		it("should format 500 errors with hint", () => {
			expect(trace(apiError(500, "Internal error"))).toBe("(500) internal error; Gemini internal error, retry later");
		});

		it("should format 503 errors with hint", () => {
			expect(trace(apiError(503, "Service unavailable"))).toBe("(503) service unavailable; Gemini temporarily unavailable, retry later");
		});

	});

	describe("ApiError with unknown status codes", () => {

		it("should format without hint for unmapped status codes", () => {
			expect(trace(apiError(418, "I'm a teapot"))).toBe("(418) i'm a teapot");
		});

	});

	describe("ApiError with malformed JSON message", () => {

		it("should use raw message when JSON is invalid", () => {

			const error = new Error("not json at all") as Error & { status: number };
			error.status = 500;

			expect(trace(error)).toBe("(500) not json at all; Gemini internal error, retry later");

		});

		it("should use raw message when JSON lacks error.message", () => {

			const error = new Error(JSON.stringify({ unexpected: "shape" })) as Error & { status: number };
			error.status = 400;

			expect(trace(error)).toBe("(400) {\"unexpected\":\"shape\"}; check request parameters");

		});

	});

	describe("non-API errors", () => {

		it("should pass through plain Error via message()", () => {
			expect(trace(new Error("something went wrong"))).toBe("something went wrong");
		});

		it("should pass through string errors", () => {
			expect(trace("a string error")).toBe("a string error");
		});

		it("should pass through unknown objects as JSON", () => {
			expect(trace({ code: 42 })).toBe("{\n  \"code\": 42\n}");
		});

	});

});
