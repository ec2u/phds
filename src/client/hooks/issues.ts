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
 * Provides reactive access to the list of compliance issues with actions for triggering analysis, transitioning
 * issue states, updating severity levels, and adding annotations.
 *
 * @module
 */

import { useEffect, useState } from "react";
import { Activity, asTrace, isActivity, isArray, isTrace, type Status } from "../../shared";
import { Issue, IssueUpdate } from "../../shared/items/issues";
import { clearIssues, getIssues, refreshIssues, updateIssue } from "../ports/resources";
import { useCache } from "./cache";
import { poll } from "./index";

/**
 * Available actions for managing compliance issues.
 */
export interface IssuesActions {

	/**
	 * Triggers a new compliance analysis and refreshes the issues list.
	 */
	refresh: () => Promise<void>;

	/**
	 * Clears all cached issue data and resets the issues state.
	 */
	clear: () => Promise<void>;

	/**
	 * Persists changes to an issue and optimistically updates the local cache.
	 *
	 * @param issue the issue identifier
	 * @param changes the mutable fields to update
	 */
	update: (issue: string, changes: IssueUpdate) => Promise<void>;

}


/**
 * Cache key for the issues collection.
 */
export const IssuesKey = "issues";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Manages the lifecycle of compliance issues for the current page.
 *
 * Loads cached issues on mount, supports triggering new analyses, and provides optimistic mutation actions for state
 * transitions, severity classification, and annotations.
 *
 * @return a tuple of `[status, actions]` where status is the current issues list or activity/error state
 */
export function useIssues(): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const { getCache, setCache, deleteCache } = useCache();

	const key = IssuesKey;
	const cached = getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues] = useState<Status<ReadonlyArray<Issue>>>(cached ?? Activity.Submitting);


	async function refresh(): Promise<void> {

		setIssues(Activity.Submitting);

		const result = await refreshIssues().catch(asTrace);

		if ( isTrace(result) ) {
			setIssues(result);
		} else {
			deleteCache(key);
		}

	}

	async function clear(): Promise<void> {

		setIssues(Activity.Submitting);

		const result = await clearIssues().catch(asTrace);

		if ( isTrace(result) ) {
			setIssues(result);
		} else {
			deleteCache(key);
		}

	}

	async function update(issue: string, changes: IssueUpdate): Promise<void> {

		await updateIssue(issue, changes);

		setIssues(current => {
			if ( isArray<Issue>(current) ) {

				const updated = current.map(i => i.id === issue
					? { ...i, ...changes }
					: i
				);

				setCache(key, updated);

				return updated;

			} else {

				return current;

			}
		});

	}


	useEffect(() => {

		if ( cached && !isActivity(cached) ) {

			setIssues(cached);

			return () => {};

		} else {

			setIssues(cached ?? Activity.Submitting);

			return poll(() => getIssues().catch(asTrace).then(status => {

				setIssues(status);

				if ( !isActivity(status) ) {
					setCache(key, status);
				}

				return status;

			}));

		}

	}, [cached]);


	return [
		issues,
		{
			refresh,
			clear,
			update
		}
	];

}
