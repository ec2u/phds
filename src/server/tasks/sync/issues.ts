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
 * Cached issues retrieval task.
 *
 * @module
 */

import { kvs, WhereConditions } from "@forge/kvs";
import { Issue } from "../../../shared/items/issues";
import { Activity, IssuesTask, Payload } from "../../../shared/tasks";
import { setStatus } from "../../async";
import { issuesKey, keyPrefix, lock } from "../../tools/cache";

/**
 * Retrieves all cached compliance issues for a Confluence page.
 *
 * Acquires a read lock on the issues namespace, queries all issue entries from the KVS, and normalises their state
 * fields before returning.
 *
 * @param job the job identifier for locking
 * @param page the Confluence page identifier
 *
 * @return the cached issues
 */
export async function issues(job: string, page: string, {}: Payload<IssuesTask>): Promise<ReadonlyArray<Issue>> {

	return await lock(job, issuesKey(page), async () => {

		// query for existing issues for this page

		await setStatus(job, Activity.Fetching);

		const results: Array<{ key: string; value: any }> = [];

		let cursor: string | undefined;

		do {

			const query = kvs.query()
				.where("key", WhereConditions.beginsWith(keyPrefix(issuesKey(page))))
				.limit(100);

			const batch = await (cursor ? query.cursor(cursor) : query).getMany();

			results.push(...batch.results);
			cursor = batch.nextCursor;

		} while ( cursor );

		// normalize retrieved issues to ensure state defaults to "pending"

		const normalized = results.map(result => ({
			...result,
			value: normalize(result.value as Issue)
		}));

		// return cached values (even if empty)

		return normalized.map(result => result.value as Issue);

	});
}

/**
 * Normalises an issue by defaulting the state to "pending" if missing.
 *
 * @param issue the issue to normalise
 *
 * @return the normalised issue
 */
function normalize(issue: Issue): Issue {
	return {
		...issue,
		state: issue.state || "pending"
	};
}
