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

import { storage } from "@forge/api";
import { Activity, AnnotateTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { issueKey } from "../tools/cache";

export async function annotate(job: string, page: string, { issue: id, notes }: AnnotateTask): Promise<void> {

	await setStatus(job, Activity.Caching);

	// add annotations to the specific issue

	const key=issueKey(page, id);
	const issue=await storage.get(key);

	if ( issue ) {
		await storage.set(key, { ...issue, annotations: notes });
	}

	await setStatus(job, undefined);

}
