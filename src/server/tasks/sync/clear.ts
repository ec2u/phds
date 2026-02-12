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
 * Cache clearing task.
 *
 * @module
 */

import { Activity, ClearTask, Payload } from "../../../shared/tasks";
import { setStatus } from "../../async";
import { lock, pageKey, purge } from "../../tools/cache";

/**
 * Clears all cached data for a Confluence page.
 *
 * Acquires a page-level lock to prevent concurrent access, then purges all cache entries for the page.
 *
 * @param job the job identifier for locking
 * @param page the Confluence page identifier
 */
export async function clear(job: string, page: string, {}: Payload<ClearTask>): Promise<void> {

	await lock(job, pageKey(page), async () => {

		await setStatus(job, Activity.Purging);

		await purge(page);

		await setStatus(job, undefined);

	});

}
