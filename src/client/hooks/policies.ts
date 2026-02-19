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
import type { Catalog } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Available actions for managing policy data.
 */
export interface PoliciesActions {

	/**
	 * Clears all cached policy data. State transitions are handled reactively by the store.
	 */
	clear: () => Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches the catalogue of available policy documents and subscribes to reactive updates.
 *
 * Returns the current status of the policies catalogue and actions for cache management.
 *
 * @return a tuple of `[status, actions]` where status is the catalogue mapping, an activity state, or an error trace
 */
export function usePolicies(): [Status<Catalog>, PoliciesActions] {

	const store = useStore();

	const [policies, setPolicies] = useState<Status<Catalog>>(Activity.Submitting);


	useEffect(() => store.observePolicies(setPolicies), [store]);


	async function clear(): Promise<void> {
		await store.clearPolicies();
	}


	return [
		policies,
		{
			clear
		}
	];
}
