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
 * Single compliance issue retrieval and update hook.
 *
 * Provides reactive access to a single compliance issue with an action for persisting field updates.
 *
 * @module
 */

import { useEffect, useState } from "react";
import type { Issue, IssueUpdate } from "../../shared/items/issues";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Available actions for managing a single compliance issue.
 */
export interface IssueActions {

	/**
	 * Persists changes to the issue. State transitions are handled reactively by the store.
	 *
	 * @param update The mutable fields to update
	 */
	update: (update: IssueUpdate) => Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches a single compliance issue and subscribes to reactive updates.
 *
 * Returns the current status of the issue and an action for persisting field updates. The update action is
 * bound to the specified issue identifier.
 *
 * @param issue The unique issue identifier
 *
 * @returns A tuple of `[status, actions]` where status is the issue, an activity state, or an error trace
 */
export function useIssue(issue: string): [Status<Issue>, IssueActions] {

	const store = useStore();

	const [status, setStatus] = useState<Status<Issue>>(Activity.Submitting);


	useEffect(() => store.observeIssue(issue, setStatus), [store, issue]);


	async function update(changes: IssueUpdate): Promise<void> {
		await store.updateIssue(issue, changes);
	}


	return [
		status,
		{
			update
		}
	];

}
