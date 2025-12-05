/*
 * Copyright © 2025 EC2U Alliance
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

import { isNumber, isTrace, Trace } from "./index";
import { Catalog, Source } from "./items/documents";
import { Issue, State } from "./items/issues";
import { Language } from "./items/languages";


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


export interface Observer<T> {

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

export interface PoliciesTask extends Task<Catalog> {

	readonly type: "policies";

}

export interface PolicyTask extends Task<Document> {

	readonly type: "policy";

	readonly source: Source;
	readonly language: Language;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface IssuesTask extends Task<ReadonlyArray<Issue>> {

	readonly type: "issues";

}

export interface AnalyzeTask extends Task<ReadonlyArray<Issue>> {

	readonly type: "analyze";

}

export interface TransitionTask extends Task<void> {

	readonly type: "transition";

	readonly issue: string; // issue id
	readonly state: State; // target state

}

export interface ClassifyTask extends Task<void> {

	readonly type: "classify";

	readonly issue: string; // issue id
	readonly severity: Issue["severity"]; // severity level

}

export interface AnnotateTask extends Task<void> {

	readonly type: "annotate";

	readonly issue: string; // issue id
	readonly annotations: string; // markdown annotations

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface ClearTask extends Task<void> {

	readonly type: "clear";

}
