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

import Resolver from "@forge/resolver";
import { asTrace } from "../../../shared/index";
import { Status, Task } from "../../../shared/tasks";
import { setStatus, Specs } from "../../async";
import { purge } from "../../tools/cache";
import { analyze } from "./analyze";
import { policy } from "./policy";


interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const handler = new Resolver()

	.define("execute", async function ({

		payload: { page, task },
		context: { jobId: job }

	}: {

		payload: Specs
		context: AsyncEventContext

	}) {

		return await async(task, page, job);

	} as any)

	.getDefinitions();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function async<T>(task: Task<T>, page: string, job: string): Promise<Status<T>> {

	async function report(error: unknown) {

		console.error("async task failed:", error);

		const trace = asTrace(error);

		await setStatus(job, trace);

		return trace;
	}

	try {

		if ( task.type === "policy" ) {

			return await policy(job, page, task as any) as Status<T>;

		} else if ( task.type === "analyze" ) {

			return await analyze(job, page, task as any) as Status<T>;

		} else {

			return await report(new Error(`unknown task type`));

		}

	} catch ( error ) {

		return await report(error);

	} finally {

		// launch background tasks (fire-and-forget; resource locking handles contentions)

		Promise.all([

			purge() // global cache purge

		]).catch(error =>
			console.error("background task failed:", error)
		);

	}
}
