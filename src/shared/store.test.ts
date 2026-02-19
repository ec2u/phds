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

import { describe, expect, it } from "vitest";
import { Activity, on, type Status } from "./store";


describe("on", () => {

	describe("full handler", () => {

		it("should route Activity.Submitting to state handler", async () => {

			const result = on<string, string>(Activity.Submitting, {
				state: activity => `state:${activity}`,
				trace: trace => `trace:${trace}`,
				value: value => `value:${value}`
			});

			expect(result).toBe(`state:${Activity.Submitting}`);

		});

		it("should route each activity variant to state handler", async () => {

			const activities = [
				Activity.Submitting,
				Activity.Scheduling,
				Activity.Fetching,
				Activity.Uploading,
				Activity.Extracting,
				Activity.Translating,
				Activity.Analyzing
			];

			activities.forEach(activity => {

				const result = on<string, string>(activity, {
					state: a => `state:${a}`,
					trace: () => "trace",
					value: () => "value"
				});

				expect(result).toBe(`state:${activity}`);

			});

		});

		it("should route trace string to trace handler", async () => {

			const result = on<string, string>("something went wrong", {
				state: () => "state",
				trace: trace => `trace:${trace}`,
				value: () => "value"
			});

			expect(result).toBe("trace:something went wrong");

		});

		it("should route object value to value handler", async () => {

			const data = { name: "test" };

			const result = on<{ name: string }, string>(data, {
				state: () => "state",
				trace: () => "trace",
				value: value => `value:${value.name}`
			});

			expect(result).toBe("value:test");

		});

		it("should route array value to value handler", async () => {

			const data = [1, 2, 3];

			const result = on<number[], number>(data, {
				state: () => -1,
				trace: () => -2,
				value: value => value.length
			});

			expect(result).toBe(3);

		});

		it("should accept static values instead of callbacks", async () => {

			expect(on<string, string>(Activity.Submitting, {
				state: "static-state",
				trace: "static-trace",
				value: "static-value"
			})).toBe("static-state");

			expect(on<string, string>("error", {
				state: "static-state",
				trace: "static-trace",
				value: "static-value"
			})).toBe("static-trace");

			expect(on<string, string>({ id: 1 } as unknown as string, {
				state: "static-state",
				trace: "static-trace",
				value: "static-value"
			})).toBe("static-value");

		});

	});

	describe("partial handler with other", () => {

		it("should route activity to other when state handler is missing", async () => {

			const result = on<string, string>(Activity.Submitting, {
				value: value => `value:${value}`,
				other: status => `other:${status}`
			});

			expect(result).toBe(`other:${Activity.Submitting}`);

		});

		it("should route Activity.Submitting (0) to other, not value", async () => {

			// Activity.Submitting is 0 (falsy) — must NOT fall through to value handler

			const result = on<{ name: string }, string>(Activity.Submitting as Status<{ name: string }>, {
				value: value => `value:${value.name}`,
				other: () => "other"
			});

			expect(result).toBe("other");

		});

		it("should route trace to other when trace handler is missing", async () => {

			const result = on<string, string>("error message", {
				value: value => `value:${value}`,
				other: status => `other:${status}`
			});

			expect(result).toBe("other:error message");

		});

		it("should route value to other when value handler is missing", async () => {

			const result = on<string, string>("data" as unknown as Status<string>, {
				state: activity => `state:${activity}`,
				other: status => `other:${status}`
			});

			// "data" is a string, so it matches trace first — test with non-string value

			const result2 = on<{ id: number }, string>({ id: 42 }, {
				state: () => "state",
				other: status => `other:${JSON.stringify(status)}`
			});

			expect(result2).toBe("other:{\"id\":42}");

		});

		it("should prefer specific handler over other when both exist", async () => {

			expect(on<string, string>(Activity.Fetching, {
				state: () => "specific-state",
				other: () => "other"
			})).toBe("specific-state");

			expect(on<string, string>("error", {
				trace: () => "specific-trace",
				other: () => "other"
			})).toBe("specific-trace");

			expect(on<string, string>({ id: 1 } as unknown as string, {
				value: () => "specific-value",
				other: () => "other"
			})).toBe("specific-value");

		});

		it("should accept static other value", async () => {

			const result = on<string, string>(Activity.Submitting, {
				other: "fallback"
			});

			expect(result).toBe("fallback");

		});

		it("should route all activity variants to other when state is missing", async () => {

			const activities = [
				Activity.Submitting,
				Activity.Scheduling,
				Activity.Fetching,
				Activity.Uploading,
				Activity.Extracting,
				Activity.Translating,
				Activity.Analyzing
			];

			activities.forEach(activity => {

				const result = on<string, string>(activity, {
					value: () => "value",
					other: () => "other"
				});

				expect(result).toBe("other");

			});

		});

	});

});
