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
 * Policy catalogue retrieval hook.
 *
 * @module
 */

import { useEffect, useState } from "react";
import { Activity, asTrace, isActivity, type Status } from "../../shared/index";
import { Catalog } from "../../shared/items/documents";
import { clearPolicies, getPolicies } from "../ports/resources";
import { useCache } from "./cache";
import { PolicyKeyPrefix } from "./policy";


/**
 * Cache key for the policies catalogue.
 */
export const PoliciesKey = "policies";


/**
 * Available actions for managing policy data.
 */
export interface PoliciesActions {

	/**
	 * Clears all cached policy data and resets the policies state.
	 */
	clear: () => Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches and caches the catalogue of available policy documents.
 *
 * Returns the current status of the policies catalogue and actions for cache management, loading from the in-memory
 * cache on subsequent renders.
 *
 * @return a tuple of `[status, actions]` where status is the catalogue mapping, an activity state, or an error trace
 */
export function usePolicies(): [Status<Catalog>, PoliciesActions] {

	const { getCache, setCache, deleteCache } = useCache();

	const key = PoliciesKey;
	const cached = getCache<Catalog>(key);

	const [policies, setPolicies] = useState<Status<Catalog>>(cached ?? Activity.Submitting);


	async function clear(): Promise<void> {

		setCache(key, Activity.Submitting);

		await clearPolicies().catch(asTrace);

		deleteCache(PolicyKeyPrefix);
		deleteCache(key);

	}

	useEffect(() => {

		if ( cached && !isActivity(cached) ) {

			setPolicies(cached);

		} else {

			setPolicies(cached ?? Activity.Submitting);

			getPolicies().catch(asTrace).then(status => {

				setPolicies(status);

				if ( !isActivity(status) ) {
					setCache(key, status);
				}

			});

		}

	}, [cached]);

	return [
		policies,
		{
			clear
		}
	];
}
