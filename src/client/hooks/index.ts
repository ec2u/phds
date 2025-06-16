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

import { isNumber, Trace } from "../../shared";


/**
 * Status type representing operation state as either an update, result data, or error trace.
 *
 * @template T the type of result data
 */
export type Status<T>=Update | T | Trace;

/**
 * Enumeration of operation update states.
 */
export const enum Update {
	Initializing,
	Scanning,
	Fetching,
	Extracting,
	Translating
}


export interface Observer<T> {

	(status: Status<T>): void;

}


/**
 * Checks if a value is a valid Update enum value.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a valid Update; `false` otherwise
 */
export function isUpdate(value: unknown): value is Update {
	return isNumber(value) && value >= Update.Initializing && value <= Update.Translating;
}

/**
 * Converts a value to an Update enum value if valid.
 *
 * @param value the value to convert
 *
 * @return the Update value if valid; `undefined` otherwise
 */
export function asUpdate(value: unknown): undefined | Update {
	return isUpdate(value) ? value : undefined;
}
