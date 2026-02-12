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
 * Asynchronous job status management via Forge key-value storage.
 *
 * Provides status tracking for background tasks, storing activity states and results in the Forge KVS with automatic
 * cleanup of completed job entries.
 *
 * @module
 */

import { kvs } from "@forge/kvs";
import { isDefined, isString } from "../shared";
import { Activity, isActivity, Status, Task } from "../shared/tasks";

/**
 * Timeout in milliseconds before completed job status entries are automatically deleted.
 */
const statusTimeout = 30*1000;

/**
 * Maximum character length for status values in log messages.
 */
const statusClipping = 80;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Specifications for an asynchronous job, combining the target page and task definition.
 */
export interface Specs {

	/**
	 * The Confluence page identifier.
	 */
	readonly page: string;

	/**
	 * The task to execute.
	 */
	readonly task: Task;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves the current status of a background job.
 *
 * @typeParam T the type of the task result value
 *
 * @param job the job identifier
 *
 * @return the current job status
 */
export async function getStatus<T>(job: string): Promise<Status<T>> {
	return await kvs.get<Status<T>>(jobKey(job)) as Status<T>;
}


/**
 * Updates the status of a background job.
 *
 * Stores the status in Forge KVS. For terminal statuses (non-activity values), schedules automatic cleanup after
 * a timeout period to prevent stale entries from accumulating.
 *
 * @typeParam T the type of the task result value
 *
 * @param job the job identifier
 * @param value the new status value, or `undefined` to delete the entry
 */
export async function setStatus<T>(job: string, value: undefined | Status<T>): Promise<void> {

	console.info(`${job || "background job"} status set to <${

		isActivity(value) ? Activity[value] : JSON.stringify(value, (_, value) =>
			isString(value) && value.length > statusClipping ? `${value.slice(0, statusClipping)}...` : value
		)

	}>`);

	if ( job ) {

		const key = jobKey(job);

		if ( isDefined(value) ) {

			await kvs.set<Status<T>>(key, value);

			if ( !isActivity(value) ) { // delete final status if not picked up by job monitor
				setTimeout(() => kvs.delete(key), statusTimeout);
			}

		} else {

			await kvs.delete(key);

		}

	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates the KVS storage key for a job's status entry.
 *
 * @param job the job identifier
 *
 * @return the prefixed storage key
 */
function jobKey(job: string) {
	return `job:${job}`;
}
