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
import { Issue } from "../../shared/issues";
import { Activity, ClassifyTask, Payload } from "../../shared/tasks";
import { setStatus } from "../async";
import { issueKey, lock } from "../tools/cache";

export async function classify(job: string, page: string, {

	issue,
	severity

}: Payload<ClassifyTask>): Promise<void> {

	const key=issueKey(page, issue);

	await lock(job, key, async () => {

		await setStatus(job, Activity.Caching);

		// update severity for the specific issue

		const issue=await kvs.get<Issue>(key);

		if ( issue ) {
			await kvs.set<Issue>(key, { ...issue, severity, updated: new Date().toISOString() });
		}

		await setStatus(job, undefined);

	});

}
