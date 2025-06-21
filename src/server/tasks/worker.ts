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

import { Trace } from "../../shared";
import { Activity, Task } from "../../shared/tasks";
import { setStatus } from "../async";


interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function execute({

	payload: task,
	context: { jobId: id }

}: {

	payload: Task
	context: AsyncEventContext

}) {

	try {

		// Update job status to processing

		await setStatus(id, Activity.Initializing);

		// Wait 5 seconds to simulate processing

		await new Promise(resolve => setTimeout(resolve, 5000));

		// switch ( task.type ) {
		//
		// }

		// Store successful result

		await setStatus(id, task.value);

	} catch ( error ) {

		await setStatus(id, {
			code: 500,
			text: error instanceof Error ? error.message : JSON.stringify(error)
		} as Trace);

	}
}
