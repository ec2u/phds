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

import { kvs } from "@forge/kvs";
import { Activity, ResolveTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { issueKey, issuesKey, lock } from "../tools/cache";

export async function resolve(job: string, page: string, { issues: ids, reopen=false }: ResolveTask): Promise<void> {

	await lock(job, issuesKey(page), async () => {

		await setStatus(job, Activity.Purging);

		// mark individual issues as resolved or reopen them

		for (const issueId of ids) {

			const key=issueKey(page, issueId);
			const issue=await kvs.get(key);

			if ( issue ) {

				await kvs.set(key, {
					...issue,
					resolved: reopen ? undefined : new Date().toISOString()
				});

			}

		}

		await setStatus(job, undefined);

	});

}
