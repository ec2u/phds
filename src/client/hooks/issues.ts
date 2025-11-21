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
import { Issue, State } from "../../shared/issues";
import { Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";

export interface IssuesActions {
	refresh: () => void;
	transition: (issue: string, state: State) => Promise<void>;
	classify: (issue: string, severity: Issue["severity"]) => Promise<void>;
	annotate: (issue: string, notes: string) => Promise<void>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useIssues(agreement: string): [Status<ReadonlyArray<Issue>>, IssuesActions] {

	const { getCache, setCache } = useCache();

	const key = "issues";
	const cached = getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues] = useState<Status<ReadonlyArray<Issue>>>(cached ?? []);

	const update = (issues: Status<ReadonlyArray<Issue>>) => {

		setIssues(issues);

		if ( isArray<Issue>(issues) ) {
			setCache(key, issues);
		}

	};

	const refresh = () => {
		execute<ReadonlyArray<Issue>>(update, {
			type: "issues",
			refresh: true,
			agreement
		});
	};

	const transition = async (issue: string, state: State): Promise<void> => {

		await execute<void>(() => { }, {
			type: "transition",
			issue,
			state
		});

		if ( isArray<Issue>(issues) ) {
			update(issues.map(item => item.id === issue
				? { ...item, state }
				: item
			));
		}

	};

	const classify = async (issue: string, severity: Issue["severity"]): Promise<void> => {

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

	const annotate = async (issue: string, notes: string): Promise<void> => {

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
			transition,
			classify,
			annotate
		}
	];

}
