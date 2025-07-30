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

import { useEffect, useState } from "react";
import { isArray } from "../../shared";
import { Issue } from "../../shared/issues";
import { Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";

export interface IssuesActions {
	refresh: () => void;
	classify: (issue: string, severity: Issue["severity"]) => Promise<void>;
	annotate: (issue: string, notes: string) => Promise<void>;
	resolve: (issues: ReadonlyArray<string>, reopen?: boolean) => Promise<void>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useIssues(agreement: string): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const { getCache, setCache }=useCache();

	const key="issues";
	const cached=getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues]=useState<Status<ReadonlyArray<Issue>>>(cached ?? []);

	const update=(issues: Status<ReadonlyArray<Issue>>) => {

		setIssues(issues);

		if ( isArray<Issue>(issues) ) {
			setCache(key, issues);
		}

	};

	const refresh=() => {
		execute<ReadonlyArray<Issue>>(update, {
			type: "issues",
			refresh: true,
			agreement
		});
	};

	const classify=async (issue: string, severity: Issue["severity"]): Promise<void> => {

		await execute<void>(() => { }, {
			type: "classify",
			issue,
			severity
		});

		if ( isArray<Issue>(issues) ) {
			update(issues.map(item => item.id === issue
				? { ...item, severity }
				: item
			));
		}

	};

	const annotate=async (issue: string, notes: string): Promise<void> => {

		await execute<void>(() => { }, {
			type: "annotate",
			issue,
			notes
		});

		if ( isArray<Issue>(issues) ) {
			update(issues.map(item => item.id === issue
				? { ...item, annotations: notes }
				: item
			));
		}

	};

	const resolve=async (ids: ReadonlyArray<string>, reopen?: boolean): Promise<void> => {

		await execute<void>(() => { }, {
			type: "resolve",
			issues: ids,
			reopen
		});

		if ( isArray<Issue>(issues) ) {
			update(issues.map(issue => ids.includes(issue.id)
				? { ...issue, resolved: reopen ? undefined : new Date().toISOString() }
				: issue
			));
		}

	};


	useEffect(() => {

		if ( cached ) {

			setIssues(cached);

		} else if ( agreement.trim() === "" ) {

			setIssues([]);

		} else {

			execute<ReadonlyArray<Issue>>(update, {

				type: "issues",

				agreement

			});

		}

	}, [cached, agreement]);


	return [
		issues,
		{
			refresh,
			classify,
			annotate,
			resolve
		}
	];

}
