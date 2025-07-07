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
import { Activity, Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";

export interface IssuesActions {
	refresh: () => void;
	resolve: (issues: ReadonlyArray<string>) => Promise<void>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useIssues(agreement: string): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const { getCache, setCache }=useCache();

	const key="issues";
	const cached=getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues]=useState<Status<ReadonlyArray<Issue>>>(cached || Activity.Submitting);

	const updateIssues=(issues: Status<ReadonlyArray<Issue>>) => {

		setIssues(issues);

		if ( isArray<Issue>(issues) ) {
			setCache(key, issues);
		}

	};

	const refresh=() => {
		execute<ReadonlyArray<Issue>>(updateIssues, {
			type: "issues",
			refresh: true,
			agreement
		});
	};

	const resolve=(ids: ReadonlyArray<string>): Promise<void> => {
		return execute<void>(() => {}, {
			type: "resolve",
			issues: ids
		}).then(() => { // remove resolved issues from local cache

			if ( isArray<Issue>(issues) ) {
				updateIssues((issues.filter(issue => !ids.includes(issue.id))));
			}

		});
	};

	useEffect(() => {

		if ( cached ) { setIssues(cached); } else if ( agreement.trim() !== "" ) {

			execute<ReadonlyArray<Issue>>(updateIssues, {

				type: "issues",

				agreement

			});

		}

	}, [cached, agreement]);

	return [issues, { refresh, resolve }];
}
