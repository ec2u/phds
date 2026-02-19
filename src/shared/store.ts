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

import type { Catalog, Document } from "./items/documents";
import type { Issue, IssueUpdate } from "./items/issues";
import { isFunction, isNumber, isString } from "./tools/core";


/**
 * Contract for resource-centric page operations shared between client and server.
 *
 * Operations are grouped by resource type:
 *
 * - **Policies**: read and cache management for policy documents
 * - **Issues**: full CRUD and async analysis for compliance issues
 *
 * Each side binds the page identifier from its own context — the client from the component prop, the server from the
 * request payload. Methods return {@link Status} wrapping the result, an in-progress {@link Activity}, or a
 * {@link Trace} on failure.
 */
export interface PageStore {

	/**
	 * Retrieves the catalog of cached policy documents.
	 *
	 * @returns A {@link Status} wrapping the policy {@link Catalog}
	 */
	getPolicies(): Promise<Status<Catalog>>;

	/**
	 * Clears cached policy documents.
	 *
	 * Purges the policy store; the attachment catalog remains unaffected.
	 *
	 * @returns A {@link Status} wrapping void on success
	 */
	clearPolicies(): Promise<Status<void>>;

	/**
	 * Retrieves a specific policy document, optionally translated to the given language.
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
	 * Retrieves a specific compliance issue.
	 *
	 * @param issue The unique issue identifier
	 *
	 * @returns A {@link Status} wrapping the matching {@link Issue}
	 */
	getIssue(issue: string): Promise<Status<Issue>>;

	/**
	 * Updates mutable fields on a compliance issue.
	 *
	 * @param issue The unique issue identifier
	 * @param update The partial {@link IssueUpdate} with fields to modify
	 *
	 * @returns A {@link Status} wrapping void on success
	 */
	updateIssue(issue: string, update: IssueUpdate): Promise<Status<void>>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Event published on the page channel after a state mutation.
 *
 * Flat discriminated union keyed on `type`. Async operations publish completion, error, and timeout
 * events; sync mutations publish completion events only (failures are returned directly to the caller via
 * {@link Status}).
 *
 * - `policies` — catalogue cleared by {@link PageStore.clearPolicies clearPolicies}
 * - `policy` — async extraction/translation by {@link PageStore.getPolicy getPolicy} (`source` + `language`)
 * - `issues` — async analysis pipeline by {@link PageStore.analyseIssues analyseIssues},
 *   including progress stages; catalogue cleared by {@link PageStore.clearIssues clearIssues}
 * - `issue` — individual issue updated by {@link PageStore.updateIssue updateIssue} (`issue`)
 *
 * Completion events carry full updated resource state so client caches update without server roundtrips. Error and
 * timeout events are transient — delivered to all clients currently subscribed to the page channel, not persisted
 * in resource state.
 */
export type PageEvent =

	| PoliciesCleared
	| PolicyConverted

	| IssuesAnalysed
	| IssuesCleared
	| IssueUpdated;


/**
 * Notifies that the policies catalogue was cleared by {@link PageStore.clearPolicies clearPolicies}.
 */
export type PoliciesCleared = {

	readonly type: "policies-cleared";

	readonly page: string

	readonly status: Status<void>

};

/**
 * Notifies the outcome of an async policy conversion by {@link PageStore.getPolicy getPolicy}.
 */
export type PolicyConverted = {

	readonly type: "policy-converted";

	readonly page: string;
	readonly source: string;
	readonly language?: string;

	readonly status: Status<Document>

};


/**
 * Notifies the outcome of an async issue analysis by {@link PageStore.analyseIssues analyseIssues}.
 */
export type IssuesAnalysed = {

	readonly type: "issues-analysed";

	readonly page: string;

	readonly status: Status<ReadonlyArray<Issue>>

};

/**
 * Notifies that the issues catalogue was cleared by {@link PageStore.clearIssues clearIssues}.
 */
export type IssuesCleared = {

	readonly type: "issues-cleared";

	readonly page: string

	readonly status: Status<void>

};

/**
 * Notifies the outcome of an issue update by {@link PageStore.updateIssue updateIssue}.
 */
export type IssueUpdated = {

	readonly type: "issue-updated";

	readonly page: string;
	readonly issue: string;

	readonly status: Status<Issue>

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Operation outcome as either an in-progress activity, a result value, or an error trace.
 *
 * @typeParam T The type of result data
 */
export type Status<T> =
	| Activity
	| Trace
	| T;

/**
 * Enumeration of in-progress activity states.
 *
 * > [!IMPORTANT]
 * > Activity stages are currently issues-specific; separate common vs resource-specific stages during implementation.
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
 * Exhaustive handler mapping for {@link Status} pattern matching via {@link on}.
 *
 * Each field handles one variant of the {@link Status} union. Fields accept either a static value or a callback
 * receiving the narrowed variant.
 *
 * @typeParam R The return type of all handlers
 * @typeParam T The type of the result value
 */
export type StatusHandler<R, T> = {

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
 * Returns the realtime channel key for a page.
 *
 * @param page The Confluence page identifier
 *
 * @returns The channel key
 */
export function channel(page: string): string {
	return `${page}`;
}


/**
 * Checks if a value is a valid {@link Activity} enum member.
 *
 * @param value The value to check
 *
 * @returns true if the value is a finite number within the {@link Activity} range; false otherwise
 */
export function isActivity(value: unknown): value is Activity {
	return isNumber(value) && Activity[value] !== undefined;
}

/**
 * Checks if a value is a {@link Trace} error message.
 *
 * @param value The value to check
 *
 * @returns true if the value is a string; false otherwise
 */
export function isTrace(value: unknown): value is Trace {
	return isString(value);
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
export function on<T, R>(status: Status<T>, handler: StatusHandler<R, T> | Partial<StatusHandler<R, T>> & {

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
