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
 * @module async
 */

import Resolver from "@forge/resolver";
import { kvs } from "@forge/kvs";
import type { Status } from "../../shared/index";
import { purge } from "../tools/cache";
import type { Task } from "./_index";
import { analyze } from "./analyze/analyze";
import { policy } from "./policy/policy";


/**
 * Callback for reporting async task status to the resource key.
 *
 * Accepts any {@link Status} value to write progress or results, or `undefined` to delete the key on completion.
 */
export type Report = <T>(status: undefined | Status<T>) => Promise<void>;


/**
 * Context provided by the Forge event queue to async task handlers.
 */
interface AsyncEventContext {
	jobId: string;
}

/**
 * Specifications for an asynchronous job, combining the target page and task definition.
 */
export interface Specs {

	/**
	 * The Confluence page identifier.
	 */
	readonly page: string;

	/**
	 * The resource key for status reporting and locking.
	 *
	 * Computed by the sync resolver and passed through the queue payload so that async handlers don't need to
	 * recompute it.
	 */
	readonly key: string;

	/**
	 * The task to execute.
	 */
	readonly task: Task;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The Forge resolver handler definitions for asynchronous task execution.
 */
export const handler = new Resolver()

	.define("execute", async function ({

		payload: { page, key, task },
		context: { jobId }

	}: {

		payload: Specs
		context: AsyncEventContext

	}) {

		await dispatch(task, page, key, jobId);

	} as any)

	.getDefinitions();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Dispatches an asynchronous task to the appropriate handler.
 *
 * Routes the task based on its type and reports errors to the console. Task handlers are responsible for writing
 * their own status and error traces to the resource key. Triggers background cache maintenance after task completion.
 *
 * @param task the task to execute
 * @param page the Confluence page identifier
 * @param key the resource key for status reporting and locking
 * @param jobId the Forge queue job identifier, used as lock owner
 */
async function dispatch(task: Task, page: string, key: string, jobId: string): Promise<void> {
	try {

		const owner = `${task.type}:${jobId}`;

		const report: Report = (status) =>
			status === undefined ? kvs.delete(key) : kvs.set(key, status);

		if ( task.type === "policy" ) {

			await policy(owner, key, report, page, task as any);

		} else if ( task.type === "analyze" ) {

			await analyze(owner, key, report, page, task as any);

		} else {

			console.error("unknown task type:", task);

		}

	} catch ( error ) {

		console.error("async task failed:", error);

	} finally {

		// fire-and-forget background maintenance; resource locking handles contentions

		purge().catch(error =>
			console.error("background task failed:", error)
		);

	}
}
