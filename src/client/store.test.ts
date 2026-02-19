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
import type { Catalog, Document } from "../shared/items/documents";
import type { Issue } from "../shared/items/issues";
import { Activity, type PageEvent, type PageStore, type Status } from "../shared/store";

import { createClientStore } from "./store";


// test data

const page = "page-1";

const testCatalog: Catalog = { "source-1": "Policy A" };

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

const testIssue: Issue = testIssues[0];


// event factories

function policiesCleared(status: Status<void> = undefined): PageEvent {
	return { type: "policies-cleared", page, status };
}

function policyConverted(source: string, status: Status<Document>, language?: string): PageEvent {
	return { type: "policy-converted", page, source, language, status };
}

function issuesAnalysed(status: Status<ReadonlyArray<Issue>>): PageEvent {
	return { type: "issues-analysed", page, status };
}

function issuesCleared(status: Status<void> = undefined): PageEvent {
	return { type: "issues-cleared", page, status };
}

function issueUpdated(issue: string, status: Status<Issue>): PageEvent {
	return { type: "issue-updated", page, issue, status };
}


// mock delegate returning controlled values

function mockDelegate(overrides?: Partial<PageStore>): PageStore {
	return {

		getPolicies: vi.fn(async () => ({}) as Status<Catalog>),
		getPolicy: vi.fn(async () => ("(404) not found")),
		clearPolicies: vi.fn(async () => undefined as Status<void>),

		getIssues: vi.fn(async () => [] as Status<ReadonlyArray<Issue>>),
		getIssue: vi.fn(async () => ("(404) not found")),
		analyseIssues: vi.fn(async () => undefined as Status<void>),
		clearIssues: vi.fn(async () => undefined as Status<void>),
		updateIssue: vi.fn(async () => undefined as Status<void>),

		...overrides

	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("observe", () => {

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

		it("should forward clearPolicies to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.clearPolicies();

			expect(delegate.clearPolicies).toHaveBeenCalledWith();

		});

		it("should forward getIssues to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getIssues();

			expect(delegate.getIssues).toHaveBeenCalledWith();

		});

		it("should forward getIssue to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.getIssue("issue-1");

			expect(delegate.getIssue).toHaveBeenCalledWith("issue-1");

		});

		it("should forward analyseIssues to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.analyseIssues();

			expect(delegate.analyseIssues).toHaveBeenCalledWith();

		});

		it("should forward clearIssues to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.clearIssues();

			expect(delegate.clearIssues).toHaveBeenCalledWith();

		});

		it("should forward updateIssue to delegate", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			await observable.updateIssue("issue-1", { state: "resolved" });

			expect(delegate.updateIssue).toHaveBeenCalledWith("issue-1", { state: "resolved" });

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

		it("should return a cleanup function from observeIssue", async () => {

			const { observable } = createClientStore(page, mockDelegate());

			const cleanup = observable.observeIssue("issue-1", () => {});

			expect(cleanup).toBeInstanceOf(Function);

		});

	});

	describe("observer notification", () => {

		it("should notify policies catalogue observer on policy-converted event when catalogue is cached", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable, dispatcher } = createClientStore(page, delegate);
			const callback = vi.fn();

			// populate catalogue cache
			await observable.getPolicies();

			observable.observePolicies(callback);
			callback.mockClear();

			dispatcher(policyConverted("source-1", testDocument, "en"));

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(testCatalog);

		});

		it("should notify issues observer with empty list on issues-cleared event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);
			callback.mockClear();
			dispatcher(issuesCleared());

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith([]);

		});

		it("should notify issues catalogue observer on issue-updated event when catalogue is cached", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable, dispatcher } = createClientStore(page, delegate);
			const callback = vi.fn();

			// populate catalogue cache
			await observable.getIssues();

			observable.observeIssues(callback);
			callback.mockClear();

			const updated = { ...testIssue, state: "resolved" as const };

			dispatcher(issueUpdated("issue-1", updated));

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith([updated]);

		});

		it("should notify policy observer with status on matching policy-converted event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-1", "en", callback);
			callback.mockClear();
			dispatcher(policyConverted("source-1", testDocument, "en"));

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(testDocument);

		});

		it("should notify issue observer with status on matching issue-updated event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssue("issue-1", callback);
			callback.mockClear();
			dispatcher(issueUpdated("issue-1", testIssue));

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(testIssue);

		});

		it("should not notify policies observer on issues event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicies(callback);
			callback.mockClear();
			dispatcher(issuesAnalysed(testIssues));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify issues observer on policies event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);
			callback.mockClear();
			dispatcher(policiesCleared());

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify policy observer for non-matching source", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-2", "en", callback);
			callback.mockClear();
			dispatcher(policyConverted("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify policy observer for non-matching language", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-1", "fr", callback);
			callback.mockClear();
			dispatcher(policyConverted("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not notify issue observer for non-matching issue", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssue("issue-2", callback);
			callback.mockClear();
			dispatcher(issueUpdated("issue-1", testIssue));

			expect(callback).not.toHaveBeenCalled();

		});

	});

	describe("hierarchical observers", () => {

		it("should notify policy item observer with submitting on policies-cleared event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observePolicy("source-1", "en", callback);
			callback.mockClear();
			dispatcher(policiesCleared());

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(Activity.Submitting);

		});

		it("should notify issue item observer with submitting on issues-analysed event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssue("issue-1", callback);
			callback.mockClear();
			dispatcher(issuesAnalysed(testIssues));

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(Activity.Submitting);

		});

		it("should notify issue item observer with submitting on issues-cleared event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssue("issue-1", callback);
			callback.mockClear();
			dispatcher(issuesCleared());

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(Activity.Submitting);

		});

		it("should notify catalogue and item observers on policies-cleared event", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable, dispatcher } = createClientStore(page, delegate);
			const catalogueCallback = vi.fn();
			const policyCallback = vi.fn();

			// populate catalogue cache
			await observable.getPolicies();

			observable.observePolicies(catalogueCallback);
			observable.observePolicy("source-1", "en", policyCallback);
			catalogueCallback.mockClear();
			policyCallback.mockClear();

			dispatcher(policiesCleared());

			expect(catalogueCallback).toHaveBeenCalledOnce();
			expect(catalogueCallback).toHaveBeenCalledWith(testCatalog);
			expect(policyCallback).toHaveBeenCalledOnce();
			expect(policyCallback).toHaveBeenCalledWith(Activity.Submitting);

		});

		it("should notify both catalogue and item observers on issues-analysed event", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const catalogueCallback = vi.fn();
			const itemCallback = vi.fn();

			observable.observeIssues(catalogueCallback);
			observable.observeIssue("issue-1", itemCallback);
			catalogueCallback.mockClear();
			itemCallback.mockClear();
			dispatcher(issuesAnalysed(testIssues));

			expect(catalogueCallback).toHaveBeenCalledOnce();
			expect(catalogueCallback).toHaveBeenCalledWith(testIssues);
			expect(itemCallback).toHaveBeenCalledOnce();
			expect(itemCallback).toHaveBeenCalledWith(Activity.Submitting);

		});

	});

	describe("observer cleanup", () => {

		it("should stop notifying after policies observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observePolicies(callback);
			callback.mockClear();

			cleanup();
			dispatcher(policiesCleared());

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after policy observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observePolicy("source-1", "en", callback);
			callback.mockClear();

			cleanup();
			dispatcher(policyConverted("source-1", testDocument, "en"));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after issues observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observeIssues(callback);
			callback.mockClear();

			cleanup();
			dispatcher(issuesAnalysed(testIssues));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should stop notifying after issue observer cleanup", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			const cleanup = observable.observeIssue("issue-1", callback);
			callback.mockClear();

			cleanup();
			dispatcher(issueUpdated("issue-1", testIssue));

			expect(callback).not.toHaveBeenCalled();

		});

		it("should not affect other observers when one is cleaned up", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			const cleanup1 = observable.observeIssues(callback1);
			observable.observeIssues(callback2);
			callback1.mockClear();
			callback2.mockClear();

			cleanup1();
			dispatcher(issuesAnalysed(testIssues));

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledOnce();

		});

	});

	describe("multiple events", () => {

		it("should notify observer on each dispatched event with correct status", async () => {

			const { observable, dispatcher } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);
			callback.mockClear();

			dispatcher(issuesAnalysed(Activity.Scheduling));
			dispatcher(issuesAnalysed(Activity.Fetching));
			dispatcher(issuesAnalysed(Activity.Analyzing));

			expect(callback).toHaveBeenCalledTimes(3);
			expect(callback).toHaveBeenNthCalledWith(1, Activity.Scheduling);
			expect(callback).toHaveBeenNthCalledWith(2, Activity.Fetching);
			expect(callback).toHaveBeenNthCalledWith(3, Activity.Analyzing);

		});

	});

	describe("caching", () => {

		it("should serve issues from cache after issues-analysed event with result", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesAnalysed(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should serve policy from cache after policy-converted event with result", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyConverted("source-1", testDocument, "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toEqual(testDocument);
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should serve issue from cache after issue-updated event with result", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issueUpdated("issue-1", testIssue));

			const result = await observable.getIssue("issue-1");

			expect(result).toEqual(testIssue);
			expect(delegate.getIssue).not.toHaveBeenCalled();

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

			await observable.getPolicies();
			const result = await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();
			expect(result).toEqual(testCatalog);

		});

		it("should cache policy delegate result on first read", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => testDocument) });
			const { observable } = createClientStore(page, delegate);

			await observable.getPolicy("source-1", "en");
			const result = await observable.getPolicy("source-1", "en");

			expect(delegate.getPolicy).toHaveBeenCalledOnce();
			expect(result).toEqual(testDocument);

		});

		it("should cache issues delegate result on first read", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			await observable.getIssues();
			const result = await observable.getIssues();

			expect(delegate.getIssues).toHaveBeenCalledOnce();
			expect(result).toEqual(testIssues);

		});

		it("should cache issue delegate result on first read", async () => {

			const delegate = mockDelegate({ getIssue: vi.fn(async () => testIssue) });
			const { observable } = createClientStore(page, delegate);

			await observable.getIssue("issue-1");
			const result = await observable.getIssue("issue-1");

			expect(delegate.getIssue).toHaveBeenCalledOnce();
			expect(result).toEqual(testIssue);

		});

		it("should resolve getIssue from cached issues catalogue without server call", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate the issues catalogue cache
			await observable.getIssues();

			const result = await observable.getIssue("issue-1");

			expect(delegate.getIssue).not.toHaveBeenCalled();
			expect(result).toEqual(testIssue);

		});

		it("should preserve policies catalogue cache on policies-cleared event", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate catalogue cache
			await observable.getPolicies();

			// clear translated documents
			dispatcher(policiesCleared());

			// catalogue still served from cache
			const result = await observable.getPolicies();

			expect(delegate.getPolicies).toHaveBeenCalledOnce();
			expect(result).toEqual(testCatalog);

		});

		it("should invalidate policy cache on policies-cleared event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate cache
			dispatcher(policyConverted("source-1", testDocument, "en"));

			// clear all policies
			dispatcher(policiesCleared());

			await observable.getPolicy("source-1", "en");

			expect(delegate.getPolicy).toHaveBeenCalledOnce();

		});

		it("should invalidate issues cache on issues-cleared event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate cache
			dispatcher(issuesAnalysed(testIssues));

			// clear all issues
			dispatcher(issuesCleared());

			await observable.getIssues();

			// catalogue was set to [] by cleared event, should return from cache
			const result = await observable.getIssues();

			expect(result).toEqual([]);

		});

		it("should invalidate issue cache on issues-cleared event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate cache
			dispatcher(issueUpdated("issue-1", testIssue));

			// clear all issues
			dispatcher(issuesCleared());

			await observable.getIssue("issue-1");

			expect(delegate.getIssue).toHaveBeenCalledOnce();

		});

		it("should report activity status from progress event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesAnalysed(Activity.Scheduling));

			const result = await observable.getIssues();

			expect(result).toBe(Activity.Scheduling);
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should report activity status from policy progress event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyConverted("source-1", Activity.Extracting, "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toBe(Activity.Extracting);
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should report trace from error event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(issuesAnalysed("analysis failed"));

			const result = await observable.getIssues();

			expect(result).toBe("analysis failed");
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should report trace from policy error event", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			dispatcher(policyConverted("source-1", "extraction failed", "en"));

			const result = await observable.getPolicy("source-1", "en");

			expect(result).toBe("extraction failed");
			expect(delegate.getPolicy).not.toHaveBeenCalled();

		});

		it("should update cache when newer event arrives", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// first event: activity
			dispatcher(issuesAnalysed(Activity.Scheduling));

			// second event: result
			dispatcher(issuesAnalysed(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);

		});

	});

	describe("optimistic submission", () => {

		it("should preserve policies catalogue cache on clearPolicies", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable } = createClientStore(page, delegate);

			// populate catalogue cache
			await observable.getPolicies();

			// submit
			await observable.clearPolicies();

			// catalogue should be preserved
			const result = await observable.getPolicies();

			expect(result).toEqual(testCatalog);
			expect(delegate.getPolicies).toHaveBeenCalledOnce();

		});

		it("should purge individual policy cache on clearPolicies", async () => {

			const delegate = mockDelegate({ getPolicy: vi.fn(async () => testDocument) });
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate item cache
			dispatcher(policyConverted("source-1", testDocument, "en"));

			// submit
			await observable.clearPolicies();

			// individual policy cache should be cleared, triggering a delegate fetch
			const result = await observable.getPolicy("source-1", "en");

			expect(result).toEqual(testDocument);
			expect(delegate.getPolicy).toHaveBeenCalledOnce();

		});

		it("should reset issues catalogue to empty on clearIssues", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate catalogue cache
			await observable.getIssues();

			// submit
			await observable.clearIssues();

			// catalogue should be empty — no re-fetch needed since server has no issues
			const result = await observable.getIssues();

			expect(result).toEqual([]);
			expect(delegate.getIssues).toHaveBeenCalledOnce();

		});

		it("should purge individual issue cache on clearIssues", async () => {

			const delegate = mockDelegate({ getIssue: vi.fn(async () => testIssue) });
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate item cache
			dispatcher(issueUpdated("issue-1", testIssue));

			// submit
			await observable.clearIssues();

			// individual issue cache should be cleared, triggering a delegate fetch
			const result = await observable.getIssue("issue-1");

			expect(result).toEqual(testIssue);
			expect(delegate.getIssue).toHaveBeenCalledOnce();

		});

		it("should purge issues cache and set submitting on analyseIssues", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate cache
			dispatcher(issuesAnalysed(testIssues));

			// submit
			await observable.analyseIssues();

			// should return Submitting without hitting delegate for read
			const result = await observable.getIssues();

			expect(result).toBe(Activity.Submitting);
			expect(delegate.getIssues).not.toHaveBeenCalled();

		});

		it("should replace optimistic submitting with event data", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);

			// submit (optimistic)
			await observable.analyseIssues();

			// event arrives with progression
			dispatcher(issuesAnalysed(Activity.Scheduling));

			const progress = await observable.getIssues();

			expect(progress).toBe(Activity.Scheduling);

			// event arrives with result
			dispatcher(issuesAnalysed(testIssues));

			const result = await observable.getIssues();

			expect(result).toEqual(testIssues);

		});

		it("should set submitting on updateIssue when no cached issue exists", async () => {

			const delegate = mockDelegate();
			const { observable } = createClientStore(page, delegate);

			// no cached issue — update without prior read
			await observable.updateIssue("issue-1", { state: "resolved" });

			// should return Submitting
			const result = await observable.getIssue("issue-1");

			expect(result).toBe(Activity.Submitting);

		});

		it("should preserve catalogue on policies-cleared event after clearPolicies", async () => {

			const delegate = mockDelegate({ getPolicies: vi.fn(async () => testCatalog) });
			const { observable, dispatcher } = createClientStore(page, delegate);

			// populate catalogue cache
			await observable.getPolicies();

			// clear — catalogue preserved, items cleared
			await observable.clearPolicies();

			expect(await observable.getPolicies()).toEqual(testCatalog);

			// completion event — catalogue still preserved
			dispatcher(policiesCleared());

			const result = await observable.getPolicies();

			expect(result).toEqual(testCatalog);

		});

		it("should notify catalogue observer with submitting on optimistic submission", async () => {

			const { observable } = createClientStore(page, mockDelegate());
			const callback = vi.fn();

			observable.observeIssues(callback);

			// initial sync submitting + async delegate result
			await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(2));
			callback.mockClear();

			await observable.analyseIssues();

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith(Activity.Submitting);

		});

		it("should optimistically update both catalogue and item on updateIssue", async () => {

			const delegate = mockDelegate({ getIssues: vi.fn(async () => testIssues) });
			const { observable } = createClientStore(page, delegate);

			// populate catalogue cache
			await observable.getIssues();

			// update issue state
			await observable.updateIssue("issue-1", { state: "resolved" });

			// both catalogue and individual item should reflect the optimistic update
			const catalogue = await observable.getIssues();
			const item = await observable.getIssue("issue-1");

			const expected = { ...testIssue, state: "resolved" };

			expect(catalogue).toEqual([expected]);
			expect(item).toEqual(expected);

		});

		it("should notify both catalogue and item observers on updateIssue", async () => {

			const delegate = mockDelegate({
				getIssues: vi.fn(async () => testIssues),
				getIssue: vi.fn(async () => testIssue)
			});
			const { observable } = createClientStore(page, delegate);
			const catalogueCallback = vi.fn();
			const itemCallback = vi.fn();

			observable.observeIssues(catalogueCallback);

			// initial sync submitting + async delegate result
			await vi.waitFor(() => expect(catalogueCallback).toHaveBeenCalledTimes(2));
			catalogueCallback.mockClear();

			observable.observeIssue("issue-1", itemCallback);
			await vi.waitFor(() => expect(itemCallback).toHaveBeenCalledTimes(2));
			itemCallback.mockClear();

			// update issue
			await observable.updateIssue("issue-1", { state: "resolved" });

			const expected = [{ ...testIssue, state: "resolved" }];

			expect(catalogueCallback).toHaveBeenCalledOnce();
			expect(catalogueCallback).toHaveBeenCalledWith(expected);

			expect(itemCallback).toHaveBeenCalledOnce();
			expect(itemCallback).toHaveBeenCalledWith(expected[0]);

		});

		it("should notify item observer with merged issue on optimistic update", async () => {

			const delegate = mockDelegate();
			const { observable, dispatcher } = createClientStore(page, delegate);
			const callback = vi.fn();

			// populate cache with known issue
			dispatcher(issueUpdated("issue-1", testIssue));

			observable.observeIssue("issue-1", callback);
			callback.mockClear();

			await observable.updateIssue("issue-1", { state: "resolved" });

			expect(callback).toHaveBeenCalledOnce();
			expect(callback).toHaveBeenCalledWith({ ...testIssue, state: "resolved" });

		});

	});

});
