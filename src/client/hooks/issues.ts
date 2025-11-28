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

import {useEffect, useState} from "react";
import {isArray} from "../../shared";
import {Issue, State} from "../../shared/items/issues";
import {Status} from "../../shared/tasks";
import {useCache} from "./cache";
import {execute} from "./index";

export interface IssuesActions {
	refresh: () => Promise<void>;
	transition: (issue: string, state: State) => Promise<void>;
	classify: (issue: string, severity: Issue["severity"]) => Promise<void>;
	annotate: (issue: string, notes: string) => Promise<void>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useIssues(): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const { getCache, setCache } = useCache();

	const key = "issues";
	const cached = getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues] = useState<Status<ReadonlyArray<Issue>>>(cached ?? []);


	function update(issues: Status<ReadonlyArray<Issue>>) {

		setIssues(issues);

		if ( isArray<Issue>(issues) ) {
			setCache(key, issues);
		}

	}

	function mutate(id: string, changes: Partial<Issue>) {

		setIssues(current => {
			if ( isArray<Issue>(current) ) {

				const updated = current.map(issue => issue.id === id
					? { ...issue, ...changes }
					: issue
				);

				setCache(key, updated);

				return updated;

			} else {

				return current;

			}
		});

	}


	async function refresh(): Promise<void> {

		await execute<ReadonlyArray<Issue>>(update, {
			type: "issues",
			refresh: true
		});

	}

	async function transition(issue: string, state: State): Promise<void> {

		await execute<void>(() => { }, {
			type: "transition",
			issue,
			state
		});

		mutate(issue, { state });

	}

	async function classify(issue: string, severity: Issue["severity"]): Promise<void> {

		await execute<void>(() => { }, {
			type: "classify",
			issue,
			severity
		});

		mutate(issue, { severity });

	}

	async function annotate(issue: string, annotations: string): Promise<void> {

		await execute<void>(() => { }, {
			type: "annotate",
			issue,
			annotations
		});

		mutate(issue, { annotations });

	}


	useEffect(() => {

		if ( cached ) {

			setIssues(cached);

		} else {

			execute<ReadonlyArray<Issue>>(update, {

				type: "issues"

			});

		}

	}, [cached]);


	return [
		issues,
		{
			refresh,
			transition,
			classify,
			annotate
		}
	];

}
