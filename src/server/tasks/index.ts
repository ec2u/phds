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
 * error recovery.
 *
 * @module async
 */

import Resolver from "@forge/resolver";
import { createServerStore } from "../store";
import { analyse, type AnalyseTask } from "./analyse";
import { convert, type ConvertTask } from "./convert";


/**
 * Discriminated union of all asynchronous task descriptors.
 *
 * Used by the task executor to dispatch to the correct handler and by the server store to compute resource-scoped
 * job-tracking keys for deduplication.
 */
export type Task =
	| ConvertTask
	| AnalyseTask;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The Forge resolver handler definitions for asynchronous task execution.
 */
export const handler = new Resolver()

	.define("execute", async ({

		payload: {

			page,
			task

		},

		context

	}: {

		payload: {

			readonly page: string;
			readonly task: Task;

		};

		context: Record<string, unknown>;

	}) => {

		const { jobId } = context as { jobId: string };

		try {

			const store = createServerStore(page);

			// worker gate — ignore if a newer job has taken over this resource

			if ( await store.isActive(jobId, task) ) {
				if ( task.type === "convert" ) {

					await convert(page, task);

				} else if ( task.type === "analyse" ) {

					await analyse(page, task);

				} else {

					console.error("unknown task type:", task);

				}
			}

		} catch ( error ) {

			console.error("async task failed:", error);

		}

	})

	.getDefinitions();
