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

import { describe, expect, it, vi } from "vitest";
import type { Catalogue, Document } from "../shared/items/documents";
import type { Issue } from "../shared/items/issues";
import { Activity, type PageEvent, type PageStore, type Status } from "../shared/store";

import { createClientStore } from "./store";
import { createCache } from "./store.core";


/** Drains all pending microtasks (promise resolve callbacks). */
function flush(): Promise<void> {
	return new Promise(r => setTimeout(r, 0));
}


describe("createClientStore", () => {


	// test data

	const page = "page-1";

	const testCatalog: Catalogue = { "source-1": "Policy A" };

	const testDocument: Document = {
		original: true,
		language: "en",
		source: "source-1",
		created: "2025-01-01T00:00:00.000Z",
		title: "Test Policy",
		content: "# Test"
	};

	const testIssues: ReadonlyArray<Issue> = [{
		id: "issue-1",
		created: "2025-01-01T00:00:00.000Z",
		state: "pending",
		severity: 2,
		title: "Test Issue",
		description: ["Test description"]
	}];

	// event factories

	function policyUpdated(source: string, status: Status<Document>, language?: string): PageEvent {
		return { type: "policy-updated", page, source, language, status };
	}

	function issuesUpdated(status: Status<ReadonlyArray<Issue>>): PageEvent {
		return { type: "issues-updated", page, status };
	}

	// mock delegate returning controlled values

	function mockDelegate(overrides?: Partial<PageStore>): PageStore {
		return {

			page,

			getAgreement: vi.fn(async () => testDocument as Status<null | Document>),

			getPolicies: vi.fn(async () => ({}) as Status<Catalogue>),
			getPolicy: vi.fn(async () => ("(404) not found")),
			clearPolicy: vi.fn(async () => undefined as Status<void>),

			getIssues: vi.fn(async () => [] as Status<ReadonlyArray<Issue>>),
			analyseIssues: vi.fn(async () => undefined as Status<void>),
			clearIssues: vi.fn(async () => undefined as Status<void>),
			updateIssues: vi.fn(async () => undefined as Status<void>),

			...overrides

		};
	}


	describe("page identity", () => {

		it("should expose the page identifier on the observable", async () => {

			const { observable } = createClientStore(page, mockDelegate());

			expect(observable.page).toBe(page);

		});

	});

	describe("delegate forwarding", () => {

		it("should forward getPolicies to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledWith();

		});

		it("should forward getPolicy to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getPolicy("source-1", "en");

			expect(delegate.getPolicy).toHaveBeenCalledWith("source-1", "en");

		});

		it("should forward clearPolicy to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.clearPolicy("source-1", "en");

			expect(delegate.clearPolicy).toHaveBeenCalledWith("source-1", "en");

		});

		it("should forward getIssues to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getIssues();

			expect(delegate.getIssues).toHaveBeenCalledWith();

		});

		it("should forward analyseIssues to delegate", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate cache
			observable.getIssues();
			await flush();

			await observable.analyseIssues();

			expect(delegate.analyseIssues).toHaveBeenCalledWith();

		});

		it("should forward clearIssues to delegate", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate cache
			observable.getIssues();
			await flush();

			await observable.clearIssues();

			expect(delegate.clearIssues).toHaveBeenCalledWith();

		});

		it("should forward updateIssues to delegate", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate catalogue cache
			observable.getIssues();
			await flush();

			await observable.updateIssues("issue-1", { state: "resolved" });

			expect(delegate.updateIssues).toHaveBeenCalledWith("issue-1", { state: "resolved" });

		});

	});

	describe("observer registration", () => {

		it("should return a cleanup function from observePolicies", async () => {

			const { observable } = createClientStore(page, mockDelegate());

			const cleanup = observable.observePolicies(() => {});

			expect(cleanup).toBeInstanceOf(Function);

		});

		it("should return a cleanup function from observePolicy", async () => {

			const { observable } = createClientStore(page, mockDelegate());

			const cleanup = observable.observePolicy("source-1", "en", () => {});

			expect(cleanup).toBeInstanceOf(Function);

		});

		it("should return a cleanup function from observeIssues", async () => {

			const { observable } = createClientStore(page, mockDelegate());

			const cleanup = observable.observeIssues(() => {});

			expect(cleanup).toBeInstanceOf(Function);

		});

	});

	describe("observer notification", () => {

		it("should notify policy observer on matching policy-updated event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-1", "en", callback);
			await flush();
			callback.mockClear();
			dispatcher(policyUpdated("source-1", testDocument, "en"));
			await flush();

			expect(callback).toHaveBeenCalledOnce();

		});

		it("should not notify policies observer on issues event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicies(callback);
			callback.mockClear();
			dispatcher(issuesUpdated(testIssues));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify issues observer on policies event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);
			callback.mockClear();
			dispatcher(policyUpdated("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify policy observer for non-matching source", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-2", "en", callback);
			callback.mockClear();
			dispatcher(policyUpdated("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify policy observer for non-matching language", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-1", "fr", callback);
			callback.mockClear();
			dispatcher(policyUpdated("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

	});

	describe("observer cleanup", () => {

		it("should stop notifying after policies observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observePolicies(callback);
			callback.mockClear();

			cleanup();
			dispatcher(policyUpdated("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after policy observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observePolicy("source-1", "en", callback);
			callback.mockClear();

			cleanup();
			dispatcher(policyUpdated("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after issues observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observeIssues(callback);
			callback.mockClear();

			cleanup();
			dispatcher(issuesUpdated(testIssues));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not affect other observers when one is cleaned up", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const cleanup1 = observable.observeIssues(callback1);
			observable.observeIssues(callback2);
			await flush();
			callback1.mockClear();
			callback2.mockClear();

			cleanup1();
			dispatcher(issuesUpdated(testIssues));
			await flush();

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledOnce();

		});

	});

	describe("multiple events", () => {

		it("should notify observer on each dispatched event with correct status", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);
			await flush();
			callback.mockClear();

			dispatcher(issuesUpdated(Activity.Scheduling));
			dispatcher(issuesUpdated(Activity.Fetching));
			dispatcher(issuesUpdated(Activity.Analyzing));
			await flush();

			expect(callback).toHaveBeenCalledTimes(3);

		});

	});

	describe("caching", () => {

		it("should serve issues from cache after issues-updated event with result", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesUpdated(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should serve policy from cache after policy-updated event with result", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyUpdated("source-1", testDocument, "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toEqual(testDocument);
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should fall through to delegate on cache miss", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();

		});

		it("should cache policies delegate result on first read", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable } = createClientStore(page, delegate);

			observable.getPolicies();
			await flush();
			const result = await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();
			expect(result).toEqual(testCatalog);

		});

		it("should cache policy delegate result on first read", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => testDocument) });
			const { observable } = createClientStore(page, delegate);

			observable.getPolicy("source-1", "en");
			await flush();
			const result = await observable.getPolicy("source-1", "en");

			expect(delegate.getPolicy).toHaveBeenCalledOnce();
			expect(result).toEqual(testDocument);

		});

		it("should cache issues delegate result on first read", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			observable.getIssues();
			await flush();
			const result = await observable.getIssues();

			expect(delegate.getIssues).toHaveBeenCalledOnce();
			expect(result).toEqual(testIssues);

		});

		it("should report activity status from progress event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesUpdated(Activity.Scheduling));

			const result = await observable.getIssues();

			expect(result).toBe(Activity.Scheduling);
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should report activity status from policy progress event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyUpdated("source-1", Activity.Extracting, "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toBe(Activity.Extracting);
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should report trace from error event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesUpdated("analysis failed"));

			const result = await observable.getIssues();

			expect(result).toBe("analysis failed");
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should report trace from policy error event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyUpdated("source-1", "extraction failed", "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toBe("extraction failed");
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should cache trace from failed getPolicies read", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => "server error") });
			const { observable } = createClientStore(page, delegate);

			observable.getPolicies();
			await flush();
			const result = await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();
			expect(result).toBe("server error");

		});

		it("should cache trace from failed getIssues read", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => "server error") });
			const { observable } = createClientStore(page, delegate);

			observable.getIssues();
			await flush();
			const result = await observable.getIssues();

			expect(delegate.getIssues).toHaveBeenCalledOnce();
			expect(result).toBe("server error");

		});

		it("should cache trace from failed getPolicy read", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => "not found") });
			const { observable } = createClientStore(page, delegate);

			observable.getPolicy("source-1", "en");
			await flush();
			const result = await observable.getPolicy("source-1", "en");

			expect(delegate.getPolicy).toHaveBeenCalledOnce();
			expect(result).toBe("not found");

		});

		it("should update cache when newer event arrives", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// first event: activity
			dispatcher(issuesUpdated(Activity.Scheduling));

			// second event: result
			dispatcher(issuesUpdated(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);

		});

	});

	describe("submission guard", () => {

		it("should mark issues as submitting on clearIssues", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate catalogue cache
			observable.getIssues();
			await flush();

			// submit
			await observable.clearIssues();

			// catalogue should be marked as submitting
			const result = await observable.getIssues();

			expect(result).toBe(Activity.Submitting);
			expect(delegate.getIssues).toHaveBeenCalledOnce();

		});

		it("should purge issues cache and return submitting on analyseIssues", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate cache
			dispatcher(issuesUpdated(testIssues));

			// submit — deletes cache entry
			await observable.analyseIssues();

			// getter returns Submitting (via hardened fallback)
			const result = await observable.getIssues();

			expect(result).toBe(Activity.Submitting);

		});

		it("should replace submitting guard with event data", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// submit
			await observable.analyseIssues();

			// event arrives with progression
			dispatcher(issuesUpdated(Activity.Scheduling));

			const progress = await observable.getIssues();

			expect(progress).toBe(Activity.Scheduling);

			// event arrives with result
			dispatcher(issuesUpdated(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);

		});

		it("should notify catalogue observer on submission", async () => {

			const { observable } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			// trigger initial load so cache is populated
			observable.getIssues();
			await flush();

			observable.observeIssues(callback);
			await flush();
			callback.mockClear();

			await observable.analyseIssues();

			expect(callback).toHaveBeenCalledOnce();

		});

	});

	describe("mutation guards", () => {

		it("should short-circuit analyseIssues when cache holds activity", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate cache
			observable.getIssues();
			await flush();

			// first call deletes cache — guard treats undefined as submitting
			await observable.analyseIssues();

			// second call short-circuits on undefined
			const result = await observable.analyseIssues();

			expect(result).toBe(Activity.Submitting);
			expect(delegate.analyseIssues).toHaveBeenCalledOnce();

		});

		it("should short-circuit clearIssues when cache holds activity", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate cache
			observable.getIssues();
			await flush();

			// analyseIssues deletes cache — undefined treated as submitting
			await observable.analyseIssues();

			// clearIssues should short-circuit on undefined
			const result = await observable.clearIssues();

			expect(result).toBe(Activity.Submitting);
			expect(delegate.clearIssues).not.toHaveBeenCalled();

		});

		it("should short-circuit updateIssues when cache holds activity for the issue", async () => {

			const delegate = mockDelegate({
				updateIssues: vi.fn(async () => undefined as Status<void>)
			});
			const { observable } = createClientStore(page, delegate);

			// first call puts issueKey in Activity.Submitting state
			observable.updateIssues("issue-1", { state: "resolved" });

			// second call should short-circuit on Activity.Submitting
			const result = await observable.updateIssues("issue-1", { state: "active" });

			expect(result).toBe(Activity.Submitting);
			expect(delegate.updateIssues).toHaveBeenCalledOnce();

		});

		it("should replace trace with submitting on analyseIssues and notify observers", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);
			const callback = vi.fn();

			// put issues in trace state
			dispatcher(issuesUpdated("analysis failed"));

			observable.observeIssues(callback);
			await flush();
			callback.mockClear();

			await observable.analyseIssues();

			expect(callback).toHaveBeenCalledOnce();
			expect(await observable.getIssues()).toBe(Activity.Submitting);

		});

		it("should replace trace with submitting on clearIssues and notify observers", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);
			const callback = vi.fn();

			// put issues in trace state
			dispatcher(issuesUpdated("analysis failed"));

			observable.observeIssues(callback);
			await flush();
			callback.mockClear();

			await observable.clearIssues();

			expect(callback).toHaveBeenCalledOnce();
			expect(await observable.getIssues()).toBe(Activity.Submitting);

		});

	});

	describe("reset methods", () => {

		it("should clear cached policies and re-fetch from delegate on resetPolicies", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable } = createClientStore(page, delegate);

			// populate cache

			observable.getPolicies();
			await flush();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();

			// reset and re-read

			observable.resetPolicies();
			observable.getPolicies();
			await flush();

			expect(delegate.getPolicies).toHaveBeenCalledTimes(2);

		});

		it("should notify policies observer on resetPolicies", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable } = createClientStore(page, delegate);
			const callback = vi.fn();

			observable.observePolicies(callback);
			await flush();
			callback.mockClear();

			observable.resetPolicies();
			await flush();

			expect(callback).toHaveBeenCalled();

		});

		it("should clear cached policy and re-fetch from delegate on resetPolicy", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => testDocument) });
			const { observable } = createClientStore(page, delegate);

			// populate cache

			observable.getPolicy("source-1", "en");
			await flush();

			expect(delegate.getPolicy).toHaveBeenCalledOnce();

			// reset and re-read

			observable.resetPolicy("source-1", "en");
			observable.getPolicy("source-1", "en");
			await flush();

			expect(delegate.getPolicy).toHaveBeenCalledTimes(2);

		});

		it("should notify policy observer on resetPolicy", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => testDocument) });
			const { observable } = createClientStore(page, delegate);
			const callback = vi.fn();

			observable.observePolicy("source-1", "en", callback);
			await flush();
			callback.mockClear();

			observable.resetPolicy("source-1", "en");
			await flush();

			expect(callback).toHaveBeenCalled();

		});

		it("should clear cached issues and re-fetch from delegate on resetIssues", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate cache

			observable.getIssues();
			await flush();

			expect(delegate.getIssues).toHaveBeenCalledOnce();

			// reset and re-read

			observable.resetIssues();
			observable.getIssues();
			await flush();

			expect(delegate.getIssues).toHaveBeenCalledTimes(2);

		});

		it("should notify issues observer on resetIssues", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);
			const callback = vi.fn();

			observable.observeIssues(callback);
			await flush();
			callback.mockClear();

			observable.resetIssues();
			await flush();

			expect(callback).toHaveBeenCalled();

		});

		it("should clear cached agreement and re-fetch from delegate on resetAgreement", async () => {

			const delegate = mockDelegate({ getAgreement: vi.fn(async () => testDocument) });
			const { observable } = createClientStore(page, delegate);

			// populate cache

			observable.getAgreement();
			await flush();

			expect(delegate.getAgreement).toHaveBeenCalledOnce();

			// reset and re-read

			observable.resetAgreement();
			observable.getAgreement();
			await flush();

			expect(delegate.getAgreement).toHaveBeenCalledTimes(2);

		});

		it("should clear trace and transition through submitting on resetIssues", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable, dispatcher } = createClientStore(page, delegate);
			const states: Status<ReadonlyArray<Issue>>[] = [];

			// put issues in trace state

			dispatcher(issuesUpdated("analysis failed"));

			observable.observeIssues(status => states.push(status));
			await flush();

			// first observation sees the trace

			expect(states).toContain("analysis failed");
			states.length = 0;

			// reset clears trace, triggers re-fetch

			observable.resetIssues();
			await flush();

			// should have transitioned through submitting to fresh data

			expect(states).toContain(Activity.Submitting);

		});

	});


});

describe("createCache", () => {

	describe("lookup / insert", () => {

		it("should return undefined for unknown key", async () => {

			const cache = createCache();

			expect(cache.lookup("a")).toBeUndefined();

		});

		it("should store and retrieve a value", async () => {

			const cache = createCache();

			cache.insert("a", 1);

			expect(cache.lookup("a")).toBe(1);

		});

		it("should overwrite an existing value", async () => {

			const cache = createCache();

			cache.insert("a", 1);
			cache.insert("a", 2);

			expect(cache.lookup("a")).toBe(2);

		});

	});

	describe("lookup with generator", () => {

		it("should return cached value and ignore factory on cache hit", () => {

			const cache = createCache();
			const factory = vi.fn(() => "value");

			cache.insert("a", "cached");

			expect(cache.lookup("a", factory)).toBe("cached");
			expect(factory).not.toHaveBeenCalled();

		});

		it("should return undefined on cache miss", () => {

			const cache = createCache();

			expect(cache.lookup<string>("a", () => "value")).toBeUndefined();

		});

		it("should call factory on cache miss", () => {

			const cache = createCache();
			const factory = vi.fn(() => "value");

			cache.lookup("a", factory);

			expect(factory).toHaveBeenCalledOnce();

		});

		it("should store sync factory result in cache", () => {

			const cache = createCache();

			cache.lookup<string>("a", () => "value");

			expect(cache.lookup("a")).toBe("value");

		});

		it("should notify observers with sync factory result", () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			callback.mockClear();
			cache.lookup<string>("a", () => "value");

			expect(callback).toHaveBeenCalledOnce();

		});

		it("should store async factory result in cache", async () => {

			const cache = createCache();

			cache.lookup<string>("a", () => Promise.resolve("async-value"));
			await Promise.resolve();

			expect(cache.lookup("a")).toBe("async-value");

		});

		it("should notify observers with async factory result", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			await flush();
			callback.mockClear();
			cache.lookup<string>("a", () => Promise.resolve("async-value"));
			await flush();

			expect(callback).toHaveBeenCalledOnce();

		});

	});

	describe("insert nested reset", () => {

		it("should delete descendant entries on insert", async () => {

			const cache = createCache();

			cache.insert("a:b", 1);
			cache.insert("a:c", 2);
			cache.insert("a", 0);

			expect(cache.lookup("a:b")).toBeUndefined();
			expect(cache.lookup("a:c")).toBeUndefined();

		});

		it("should preserve the parent entry on insert", async () => {

			const cache = createCache();

			cache.insert("a:b", 1);
			cache.insert("a", 0);

			expect(cache.lookup("a")).toBe(0);

		});

		it("should not delete sibling entries on insert", async () => {

			const cache = createCache();

			cache.insert("a:b", 1);
			cache.insert("x:y", 2);
			cache.insert("a", 0);

			expect(cache.lookup("x:y")).toBe(2);

		});

		it("should notify descendant observers on insert", async () => {

			const cache = createCache();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			cache.observe("a:b", callback1);
			cache.observe("a:c", callback2);
			callback1.mockClear();
			callback2.mockClear();
			cache.insert("a", 0);

			expect(callback1).toHaveBeenCalledOnce();
			expect(callback2).toHaveBeenCalledOnce();

		});

		it("should notify parent observer on insert", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			callback.mockClear();
			cache.insert("a", 0);

			expect(callback).toHaveBeenCalledOnce();

		});

		it("should not notify sibling observers on insert", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("x:y", callback);
			callback.mockClear();
			cache.insert("a", 0);

			expect(callback).not.toHaveBeenCalled();

		});

	});

	describe("remove", () => {

		it("should remove the entry at the given key", async () => {

			const cache = createCache();

			cache.insert("a", 1);
			cache.remove("a");

			expect(cache.lookup("a")).toBeUndefined();

		});

		it("should remove descendant entries", async () => {

			const cache = createCache();

			cache.insert("a:b", 1);
			cache.insert("a:c", 2);
			cache.remove("a");

			expect(cache.lookup("a:b")).toBeUndefined();
			expect(cache.lookup("a:c")).toBeUndefined();

		});

		it("should not remove sibling entries", async () => {

			const cache = createCache();

			cache.insert("a:b", 1);
			cache.insert("x:y", 2);
			cache.remove("a");

			expect(cache.lookup("x:y")).toBe(2);

		});

		it("should notify observer at the deleted key", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.insert("a", 1);
			cache.observe("a", callback);
			callback.mockClear();
			cache.remove("a");

			expect(callback).toHaveBeenCalledOnce();

		});

		it("should notify descendant observers", async () => {

			const cache = createCache();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			cache.insert("a:b", 1);
			cache.insert("a:c", 2);
			cache.observe("a:b", callback1);
			cache.observe("a:c", callback2);
			callback1.mockClear();
			callback2.mockClear();
			cache.remove("a");

			expect(callback1).toHaveBeenCalledOnce();
			expect(callback2).toHaveBeenCalledOnce();

		});

		it("should not notify sibling observers", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("x:y", callback);
			callback.mockClear();
			cache.remove("a");

			expect(callback).not.toHaveBeenCalled();

		});

		it("should be safe to call on non-existent key", async () => {

			const cache = createCache();

			expect(() => cache.remove("nonexistent")).not.toThrow();

		});

		it("should allow lookup-with-generator to re-initialise after remove", async () => {

			const cache = createCache();

			cache.insert("a", "old");
			cache.remove("a");

			expect(cache.lookup<string>("a", () => "re-initialized")).toBeUndefined();
			expect(cache.lookup("a")).toBe("re-initialized");

		});

	});

	describe("observe / insert notification", () => {

		it("should notify registered observer on insert", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			callback.mockClear();
			cache.insert("a", 42);

			expect(callback).toHaveBeenCalledOnce();

		});

		it("should not notify observer on different key", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			callback.mockClear();
			cache.insert("b", 42);

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after cleanup", async () => {

			const cache = createCache();
			const callback = vi.fn();

			const cleanup = cache.observe("a", callback);
			callback.mockClear();

			cleanup();
			cache.insert("a", 42);

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not affect other observers when one is cleaned up", async () => {

			const cache = createCache();
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const cleanup1 = cache.observe("a", callback1);
			cache.observe("a", callback2);
			callback1.mockClear();
			callback2.mockClear();

			cleanup1();
			cache.insert("a", 42);

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledOnce();

		});

		it("should fire observer on registration", async () => {

			const cache = createCache();
			const callback = vi.fn();

			cache.observe("a", callback);
			await flush();

			expect(callback).toHaveBeenCalledOnce();

		});

	});

});
