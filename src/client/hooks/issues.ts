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
 * Compliance issues management hook.
 *
 * Provides reactive access to the list of compliance issues with actions for triggering analysis and clearing.
 *
 * @module
 */

import { useEffect, useState } from "react";
import type { Issue } from "../../shared/items/issues";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Available actions for managing compliance issues.
 */
export interface IssuesActions {

	/**
	 * Triggers a new compliance analysis. State transitions are handled reactively by the store.
	 */
	analyse: () => Promise<void>;

	/**
	 * Clears all cached issue data. State transitions are handled reactively by the store.
	 */
	clear: () => Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Manages the lifecycle of compliance issues for the current page.
 *
 * Loads issues on mount and subscribes to reactive updates via the store's observation system. Provides actions
 * for triggering analysis and clearing.
 *
 * @return a tuple of `[status, actions]` where status is the current issues list or activity/error state
 */
export function useIssues(): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const store = useStore();

	const [issues, setIssues] = useState<Status<ReadonlyArray<Issue>>>(Activity.Submitting);


	useEffect(() => store.observeIssues(setIssues), [store]);


	async function analyse(): Promise<void> {
		await store.analyseIssues();
	}

	async function clear(): Promise<void> {
		await store.clearIssues();
	}


	return [
		issues,
		{
			analyse,
			clear
		}
	];

}
