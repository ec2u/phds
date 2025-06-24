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

import { Catalog } from "./documents";
import { isNumber, Trace } from "./index";


export type Task=
	| CatalogTask;


/**
 * Status type representing task state as either an activity, result data, or error trace.
 *
 * @template T the type of result data
 */
export type Status<T>=Activity | T | Trace;

/**
 * Enumeration of task activity states.
 */
export const enum Activity {
	Waiting,
	Initializing,
	Scanning,
	Fetching,
	Prompting,
	Extracting,
	Translating,
	Analyzing
}


export interface Observer<T> {

	(status: Status<T>): void;

}

export interface Provider<T> {

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
	return isNumber(value) && value >= Activity.Initializing && value <= Activity.Analyzing;
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface CatalogTask extends Provider<Catalog> {

	readonly type: "catalog";

}
