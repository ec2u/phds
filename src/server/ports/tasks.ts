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
 * Task submission and monitoring endpoints for the Forge resolver.
 *
 * Routes tasks to synchronous or asynchronous execution based on task type, and provides polling-based status
 * monitoring for background jobs.
 *
 * @module
 */

import { Queue } from "@forge/events";
import { Activity, isActivity, Status, Task } from "../../shared/tasks";
import { getStatus, setStatus } from "../async";
import { Request } from "../index";
import { sync } from "../tasks/sync/index";


/**
 * The Forge event queue for scheduling asynchronous task execution.
 */
const queue = new Queue({ key: "executor-queue" });

/**
 * Task types that can be executed synchronously within the resolver request lifecycle.
 */
const isSync = new Set<Task["type"]>([

	"policies",

	"issues",
	"transition",
	"classify",
	"annotate",

	"clear"
]);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Submits a task for execution.
 *
 * Synchronous-capable tasks are executed immediately and their results returned directly. Long-running tasks are
 * queued for asynchronous execution and a job identifier is returned for status polling.
 *
 * @typeParam T the type of the task result value
 *
 * @param request the resolver request containing the task and Confluence context
 *
 * @return the task result for synchronous tasks, or a job identifier for asynchronous tasks
 */
export async function submitTask<T>({ payload: task, context }: Request<Task<T>>): Promise<string | Status<T>> {

	const page: string = context.extension.content.id;

	if ( isSync.has(task.type) ) { // execute synchronously for sync-capable tasks

		return await sync(task, page);

	} else { // fallback to async execution for long-running tasks

		const job = await queue.push({ page, task } as any); // !!! typing errors

		await setStatus(job, Activity.Scheduling); // create storage entry

		return job;

	}
}

/**
 * Polls the status of an asynchronous background job.
 *
 * Returns the current status and automatically cleans up storage entries for completed jobs.
 *
 * @typeParam T the type of the task result value
 *
 * @param request the resolver request containing the job identifier
 *
 * @return the current job status
 */
export async function monitorTask<T>({ payload: { id } }: Request<{ id: string }>): Promise<Status<T>> {
	try {

		const status = await getStatus<T>(id);

		if ( !isActivity(status) ) {
			await setStatus(id, undefined); // clean up storage after completion
		}

		return status;

	} catch ( e ) {

		await setStatus(id, undefined); // clean up storage on error

		throw e;

	}
}
