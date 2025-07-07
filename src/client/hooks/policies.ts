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
import { Catalog } from "../../shared/documents";
import { Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";

export function usePolicies(): Status<Catalog> {

	const { getCache, setCache }=useCache();

	const key="policies";
	const cached=getCache<Catalog>(key);

	const [policies, setPolicies]=useState<Status<Catalog>>(cached ?? {});


	const update=(policies: Status<Catalog>) => {
		setPolicies(policies);
		setCache(key, policies);
	};


	useEffect(() => {

		if ( cached ) { setPolicies(cached); } else {

			execute<Catalog>(update, {

				type: "policies"

			});

		}

	}, [cached]);

	return policies;
}
