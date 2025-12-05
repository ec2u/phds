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

import { asTrace } from "../../../shared/index";
import { Status, Task } from "../../../shared/tasks";
import { annotate } from "./annotate";
import { classify } from "./classify";
import { clear } from "./clear";
import { issues } from "./issues";
import { policies } from "./policies";
import { transition } from "./transition";

export async function sync<T>(task: Task<T>, page: string): Promise<Status<T>> {

	function report(error: unknown) {

		console.error("sync task failed:", error);

		return asTrace(error);
	}

	try {

		const job = `sync-${Date.now()}-${Math.random()}`; // temporary job ID for resource locking

		if ( task.type === "policies" ) {

			return await policies(job, page, task as any) as Status<T>;


		} else if ( task.type === "issues" ) {

			return await issues(job, page, task as any) as Status<T>;

		} else if ( task.type === "transition" ) {

			return await transition(job, page, task as any) as Status<T>;

		} else if ( task.type === "classify" ) {

			return await classify(job, page, task as any) as Status<T>;

		} else if ( task.type === "annotate" ) {

			return await annotate(job, page, task as any) as Status<T>;

		} else if ( task.type === "clear" ) {

			return await clear(job, page, task as any) as Status<T>;

		} else {

			return report(new Error(`unsupported sync task type`));

		}

	} catch ( error ) {

		return report(error);


	}
}
