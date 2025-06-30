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
import { Issue } from "../../shared/issues";
import { Activity, Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";


export function useIssues(): Status<ReadonlyArray<Issue>> {

	const { getCache, setCache }=useCache();

	const key="issues";
	const cached=getCache<ReadonlyArray<Issue>>(key);

	const [issues, setIssues]=useState<Status<ReadonlyArray<Issue>>>(cached || Activity.Submitting);

	const updateIssues=(issues: Status<ReadonlyArray<Issue>>) => {
		setIssues(issues);
		setCache(key, issues);
	};

	useEffect(() => {

		if ( cached ) { setIssues(cached); } else {

			execute<ReadonlyArray<Issue>>(updateIssues, {

				type: "issues"

			});

		}

	}, [cached]);

	return issues;
}
