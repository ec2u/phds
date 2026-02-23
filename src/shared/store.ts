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
 * Shared page state interface defining the contract between client and server.
 *
 * All client requests are routed through the page state rather than sent directly to backend endpoints. The server
 * holds the authoritative state as single source of truth; clients maintain a local observable state kept in sync
 * via {@link PageEvent} notifications.
 *
 * @module
 */

import type { Catalogue, Document } from "./items/documents";
import type { Issue, IssueUpdate } from "./items/issues";
import { isFunction, isNumber, isString } from "./tools/core";


/**
 * Contract for resource-centric page operations shared between client and server.
 *
 * Operations are grouped by resource type:
 *
 * - **Policies**: catalogue derived from attachments; read and cache management for extracted policy content
 * - **Issues**: full CRUD and async analysis for compliance issues
 *
 * Each side binds the page identifier from its own context — the client from the component prop, the server from the
 * request payload. Methods return {@link Status} wrapping the result, an in-progress {@link Activity}, or a
 * {@link Trace} on failure.
 */
export interface PageStore {

	/**
	 * The Confluence page identifier.
	 */
	readonly page: string;


	/**
	 * Retrieves the agreement content from the Confluence page body.
	 *
	 * @returns A {@link Status} wrapping the agreement {@link Document}, or `null` if the document
	 *     structure is missing or corrupted
	 */
	getAgreement(): Promise<Status<null | Document>>;


	/**
	 * Retrieves the policy catalogue derived from attached policy documents.
	 *
	 * @returns A {@link Status} wrapping the policy {@link Catalogue}
	 */
	getPolicies(): Promise<Status<Catalogue>>;

	/**
	 * Retrieves cached policy content, optionally translated to the given language.
	 *
	 * Content is extracted and converted from the policy attachment identified by `source`.
	 * Publishes a {@link PolicyUpdated} event with the resulting status on completion.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag; omit for original language
	 *
	 * @returns A {@link Status} wrapping the requested {@link Document}
	 *
	 * @see {@link https://www.rfc-editor.org/info/bcp47 BCP 47 language tags}
	 */
	getPolicy(source: string, language?: string): Promise<Status<Document>>;

	/**
	 * Clears cached policy content for the given language or for the original one, if none is provided.
	 *
	 * Publishes a {@link PolicyUpdated} event with `null` status on completion.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag; omit for original language
	 *
	 * @returns A {@link Status} wrapping void on success
	 */
	clearPolicy(source: string, language?: string): Promise<Status<void>>;


	/**
	 * Retrieves the list of compliance issues.
	 *
	 * @returns A {@link Status} wrapping the list of {@link Issue} items
	 */
	getIssues(): Promise<Status<ReadonlyArray<Issue>>>;

	/**
	 * Triggers async policy analysis, refreshing the issue list.
	 *
	 * Spawns an async task; progress is reported via {@link PageEvent} on the page channel.
	 *
	 * @returns A {@link Status} wrapping void on acceptance
	 */
	analyseIssues(): Promise<Status<void>>;

	/**
	 * Clears all compliance issues.
	 *
	 * @returns A {@link Status} wrapping void on success
	 */
	clearIssues(): Promise<Status<void>>;

	/**
	 * Updates mutable fields on a compliance issue.
	 *
	 * @param issue The unique issue identifier
	 * @param update The partial {@link IssueUpdate} with fields to modify
	 *
	 * @returns A {@link Status} wrapping void on success
	 */
	updateIssues(issue: string, update: IssueUpdate): Promise<Status<void>>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Event published on the page channel after a state mutation.
 *
 * Discriminated union keyed on `type`. Completion events carry full resource state so client caches update
 * without server round-trips. Error and timeout events are transient and not persisted.
 */
export type PageEvent =
	| AgreementUpdated
	| PolicyUpdated
	| IssuesUpdated;


/**
 * Notifies the outcome of an agreement retrieval by {@link PageStore.getAgreement getAgreement}.
 *
 * The status is `null` when the expected two-column layout structure is missing or corrupted,
 * or a {@link Document} on success.
 */
export type AgreementUpdated = {

	readonly type: "agreement-updated";

	readonly page: string;

	readonly status: Status<null | Document>

};

/**
 * Notifies the outcome of a policy content operation.
 *
 * Published by {@link PageStore.getPolicy getPolicy} with a {@link Document} on success or by
 * {@link PageStore.clearPolicy clearPolicy} with `null` to signal cache removal.
 */
export type PolicyUpdated = {

	readonly type: "policy-updated";

	readonly page: string;
	readonly source: string;
	readonly language?: string;

	readonly status: Status<null | Document>

};

/**
 * Notifies an update to the issues catalogue after any mutation operation on the issues resource.
 */
export type IssuesUpdated = {

	readonly type: "issues-updated";

	readonly page: string;

	readonly status: Status<ReadonlyArray<Issue>>

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Current state of an operation: either an in-progress activity, an error trace, or a result value.
 *
 * @typeParam T The type of result data
 */
export type Status<T> =
	| Activity
	| Trace
	| T;

/**
 * Enumeration of in-progress activity states.
 */
export enum Activity {

	/**
	 * Client-side optimistic state signalling that a request has been submitted.
	 */
	Submitting,

	/**
	 * Server-side state indicating that an async task has been queued for execution.
	 */
	Scheduling,


	/**
	 * Retrieving content from internal storage.
	 */
	Fetching,

	/**
	 * Uploading content to internal storage or third-party services.
	 */
	Uploading,


	/**
	 * Extracting content from attachments using an LLM.
	 */
	Extracting,

	/**
	 * Translating content using an LLM.
	 */
	Translating,

	/**
	 * Analysing content for compliance issues using an LLM.
	 */
	Analyzing

}

/**
 * Error trace message.
 */
export type Trace =
	| string;


/**
 * Observer callback receiving the current {@link Status} of a resource.
 */
export type StatusObserver<T> = {

	(status: Status<T>): void;

}

/**
 * Exhaustive handler mapping for {@link Status} pattern matching via {@link on}.
 *
 * Each field handles one variant of the {@link Status} union. Fields accept either a static value or a callback
 * receiving the narrowed variant.
 *
 * @typeParam T The type of the result value
 * @typeParam R The return type of all handlers
 */
export type StatusHandler<T, R> = {

	/**
	 * Handles an in-progress {@link Activity} variant.
	 */
	readonly state: R | ((state: Activity) => R),

	/**
	 * Handles a {@link Trace} error variant.
	 */
	readonly trace: R | ((trace: Trace) => R),

	/**
	 * Handles the result value variant.
	 */
	readonly value: R | ((value: T) => R),

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks whether a key is a direct or transitive descendant of another key in the colon-separated hierarchy.
 *
 * A key is considered nested if it starts with the parent key followed by a colon separator, as produced by
 * {@link prefixKey}. Used on the client side to locate and reset cache entries and observers scoped under a
 * parent resource key.
 *
 * @param key The parent resource key
 * @param nested The candidate descendant key to test
 *
 * @returns true if `nested` starts with `key` followed by a colon separator; false otherwise
 */
export function isNestedKey(key: string, nested: string): boolean {
	return nested.startsWith(prefixKey(key));
}


/**
 * Returns the prefix used to identify descendant keys in the colon-separated hierarchy.
 *
 * Appends a colon separator to the given key so that prefix queries (for example `startsWith`) match only genuine
 * descendants and never the parent key itself. Used by {@link isNestedKey} for client-side cache scoping and by
 * server-side storage scans to enumerate entries under a resource key.
 *
 * @param key The resource key to prefix
 *
 * @returns The key followed by a colon separator
 */
export function prefixKey(key: string) {
	return `${key}:`;
}


/**
 * Returns the root resource key for a page.
 *
 * All page-scoped resource keys are descendants of this key. Child keys are formed by appending a colon separator
 * and additional segments.
 *
 * @param page The Confluence page identifier
 *
 * @returns The resource key
 */
export function pageKey(page: string): string {
	return `${page}`;
}

/**
 * Returns the resource key for the agreement document.
 *
 * @param page The Confluence page identifier
 *
 * @returns The resource key
 */
export function agreementKey(page: string): string {
	return `${page}:agreement`;
}


/**
 * Returns the resource key for the policies catalogue.
 *
 * Child keys are formed by appending a colon separator and additional segments. Scan sites append the colon
 * explicitly so that prefix queries never match the catalogue key itself.
 *
 * @param page The Confluence page identifier
 *
 * @returns The resource key
 */
export function policiesKey(page: string): string {
	return `${page}:policies`;
}

/**
 * Returns the resource key for an individual policy document.
 *
 * Placed under the {@link policiesKey} prefix to be reachable by prefix scans.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag for translated documents
 *
 * @returns The resource key
 */
export function policyKey(page: string, source: string, language?: string): string {
	return language ? `${policiesKey(page)}:${source}:${language}` : `${policiesKey(page)}:${source}`;
}


/**
 * Returns the resource key for the issues catalogue.
 *
 * Child keys are formed by appending a colon separator and additional segments. Scan sites append the colon
 * explicitly so that prefix queries never match the catalogue key itself.
 *
 * @param page The Confluence page identifier
 *
 * @returns The resource key
 */
export function issuesKey(page: string): string {
	return `${page}:issues`;
}

/**
 * Returns the resource key for an individual issue.
 *
 * Placed under the {@link issuesKey} prefix to be reachable by prefix scans.
 *
 * @param page The Confluence page identifier
 * @param issue The issue identifier
 *
 * @returns The resource key
 */
export function issueKey(page: string, issue: string): string {
	return `${issuesKey(page)}:${issue}`;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid {@link Activity} enum member.
 *
 * @param value The value to check
 *
 * @returns true if the value is a finite number within the {@link Activity} range; false otherwise
 */
export function isActivity<T>(value: Status<T>): value is Activity {
	return isNumber(value) && Activity[value] !== undefined;
}

/**
 * Checks if a value is a {@link Trace} error message.
 *
 * @param value The value to check
 *
 * @returns true if the value is a string; false otherwise
 */
export function isTrace<T>(value: Status<T>): value is Trace {
	return isString(value);
}

/**
 * Checks if a {@link Status} holds a result value, narrowing out {@link Activity} and {@link Trace} variants.
 *
 * @param value The status to check
 *
 * @returns true if the value is a result; false if it is an activity or a trace
 */
export function isContent<T>(value: Status<T>): value is T {
	return !isActivity(value) && !isTrace(value);
}


/**
 * Pattern matches on a {@link Status} value and applies the appropriate handler.
 *
 * Accepts two handler shapes: a full {@link StatusHandler} providing `state`, `trace`, and `value` handlers for each
 * variant, or a partial handler with any subset of specific handlers plus a required `other` fallback receiving the
 * original `Status<T>` for unmatched cases.
 *
 * @typeParam T The type of the result value
 * @typeParam R The return type of all handlers
 *
 * @param status The {@link Status} value to match on
 * @param handler Handlers for each possible {@link Status} variant
 *
 * @returns The result of applying the matching handler
 */
export function on<T, R>(status: Status<T>, handler: StatusHandler<T, R> | Partial<StatusHandler<T, R>> & {

	readonly other: R | ((status: Status<T>) => R),

}): R {

	if ( isActivity(status) ) {

		return handler.state ? apply(handler.state, status)
			: apply((handler as { other: R | ((arg: Status<T>) => R) }).other, status);

	} else if ( isTrace(status) ) {

		return handler.trace ? apply(handler.trace, status)
			: apply((handler as { other: R | ((arg: Status<T>) => R) }).other, status);

	} else {

		return handler.value ? apply(handler.value, status as T)
			: apply((handler as { other: R | ((arg: Status<T>) => R) }).other, status);

	}


	function apply<S>(h: R | ((arg: S) => R), arg: S): R {
		return isFunction(h) ? (h as (arg: S) => R)(arg) : h;
	}

}
