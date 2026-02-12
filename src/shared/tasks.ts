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
 * Asynchronous task definitions and status management.
 *
 * Defines the task type hierarchy for all server-side operations, along with status tracking utilities for monitoring
 * task progress through activity states, result values, and error traces.
 *
 * @module
 */

import { isNumber, isTrace, Trace } from "./index";
import { Catalog, Source } from "./items/documents";
import { Issue, State } from "./items/issues";
import { Language } from "./items/languages";


/**
 * Base interface for all asynchronous task types.
 *
 * @typeParam T the type of the task result value
 */
export interface Task<T = unknown> {

	readonly type:

		| "policies"
		| "policy"

		| "issues"
		| "analyze"
		| "transition"
		| "classify"
		| "annotate"

		| "clear";

}

/**
 * Extracts the payload fields from a task type, excluding the discriminator.
 *
 * @typeParam T the task type to extract payload from
 */
export type Payload<T extends Task> = Omit<T, "type">


/**
 * Status type representing task state as either an activity, result data, or error trace.
 *
 * @template T the type of result data
 */
export type Status<T> = Activity | T | Trace;

/**
 * Enumeration of task activity states.
 */
export enum Activity {

	Submitting,
	Scheduling,
	Locking,

	Scanning,
	Fetching,
	Caching,
	Purging,

	Prompting,
	Uploading,
	Extracting,
	Translating,
	Analyzing

}


/**
 * Callback for receiving task status updates.
 *
 * @typeParam T the type of the task result value
 */
export interface Observer<T> {

	/**
	 * Handles a task status update.
	 *
	 * @param status the current task status
	 */
	(status: Status<T>): void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a valid Activity enum value.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a valid Activity; `false` otherwise
 */
export function isActivity(value: unknown): value is Activity {
	return isNumber(value) && value >= Activity.Submitting && value <= Activity.Analyzing;
}

/**
 * Converts a value to an Activity enum value if valid.
 *
 * @param value the value to convert
 *
 * @return the Activity value if valid; `undefined` otherwise
 */
export function asActivity(value: unknown): undefined | Activity {
	return isActivity(value) ? value : undefined;
}


/**
 * Pattern matches on a Status value and applies the appropriate handler.
 *
 * @template T the type of the result value
 * @template R the return type of all handlers
 *
 * @param status the Status value to match on
 * @param cases handlers for each possible Status variant
 *
 * @return the result of applying the appropriate handler
 */
export function on<T, R>(status: Status<T>, cases: {

	state: R | ((state: Activity) => R),
	value: R | ((value: T) => R),
	trace: R | ((trace: Trace) => R),

}): R {

	function apply<S>(handler: R | ((arg: S) => R), arg: S): R {
		return typeof handler === "function"
			? (handler as (arg: S) => R)(arg)
			: handler;
	}

	if ( isActivity(status) ) {

		return apply(cases.state, status);

	} else if ( isTrace(status) ) {

		return apply(cases.trace, status);

	} else {

		return apply(cases.value, status);

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Task for retrieving the catalogue of available policy documents.
 */
export interface PoliciesTask extends Task<Catalog> {

	readonly type: "policies";

}

/**
 * Task for fetching and translating a single policy document.
 */
export interface PolicyTask extends Task<Document> {

	readonly type: "policy";

	/**
	 * The source attachment identifier.
	 */
	readonly source: Source;

	/**
	 * The target language for translation.
	 */
	readonly language: Language;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Task for loading cached compliance issues.
 */
export interface IssuesTask extends Task<ReadonlyArray<Issue>> {

	readonly type: "issues";

}

/**
 * Task for performing AI-powered compliance analysis.
 */
export interface AnalyzeTask extends Task<ReadonlyArray<Issue>> {

	readonly type: "analyze";

}

/**
 * Task for transitioning an issue to a new workflow state.
 */
export interface TransitionTask extends Task<void> {

	readonly type: "transition";

	/**
	 * The issue identifier.
	 */
	readonly issue: string;

	/**
	 * The target workflow state.
	 */
	readonly state: State;

}

/**
 * Task for updating the severity level of an issue.
 */
export interface ClassifyTask extends Task<void> {

	readonly type: "classify";

	/**
	 * The issue identifier.
	 */
	readonly issue: string;

	/**
	 * The target severity level.
	 */
	readonly severity: Issue["severity"];

}

/**
 * Task for updating the annotations of an issue.
 */
export interface AnnotateTask extends Task<void> {

	readonly type: "annotate";

	/**
	 * The issue identifier.
	 */
	readonly issue: string;

	/**
	 * The markdown annotations content.
	 */
	readonly annotations: string;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Task for clearing all cached data for the current page.
 */
export interface ClearTask extends Task<void> {

	readonly type: "clear";

}
