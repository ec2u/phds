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
 * Client-side task execution orchestrator.
 *
 * Submits tasks to the server via the Forge bridge and manages status polling for asynchronous operations.
 *
 * @module index
 */

import { asTrace, isString } from "../../shared/index";
import { Activity, isActivity, Observer, Status, Task } from "../../shared/tasks";
import { monitorTask, submitTask } from "./tasks";

/**
 * Submits a task and delivers status updates to the observer.
 *
 * For synchronous tasks, the result is delivered immediately. For asynchronous tasks, polls the server at one-second
 * intervals until a terminal status is received.
 *
 * @typeParam T the type of the task result value
 *
 * @param observer the callback for receiving status updates
 * @param task the task to submit
 */
export async function execute<T>(observer: Observer<T>, task: Task<T> & Record<string, any>) {

	try {

		observer(Activity.Submitting);

		const response = await submitTask(task);

		if ( isString(response) ) {

			// async task: poll for status updates

			const poll = setInterval(async () => {

				const status = await monitorTask<T>(response);

				if ( !isActivity(status) ) {
					clearInterval(poll);
				}

				observer(status);

			}, 1000);

		} else {

			// sync task: immediate result

			observer(response as Status<T>);

		}

	} catch ( error ) {

		observer(asTrace(error));

	}

}
