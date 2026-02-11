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
 * Asynchronous task executor for Forge event queue processing.
 *
 * Dispatches long-running tasks (policy extraction, compliance analysis) to their respective handlers, managing
 * status reporting and error recovery. Triggers background cache maintenance after task completion.
 *
 * @module index
 */

import Resolver from "@forge/resolver";
import { asTrace } from "../../../shared/index";
import { Status, Task } from "../../../shared/tasks";
import { setStatus, Specs } from "../../async";
import { purge } from "../../tools/cache";
import { analyze } from "./analyze";
import { policy } from "./policy";


/**
 * Context provided by the Forge event queue to async task handlers.
 */
interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The Forge resolver handler definitions for asynchronous task execution.
 */
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

/**
 * Dispatches an asynchronous task to the appropriate handler.
 *
 * Routes the task based on its type, reports errors as traces to the job status, and triggers background cache
 * maintenance on completion.
 *
 * @typeParam T the type of the task result value
 *
 * @param task the task to execute
 * @param page the Confluence page identifier
 * @param job the background job identifier
 *
 * @return the task result status
 */
async function async<T>(task: Task<T>, page: string, job: string): Promise<Status<T>> {

	/**
	 * Reports an error as a trace to the job status.
	 *
	 * @param error the error to report
	 *
	 * @return the error trace
	 */
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
