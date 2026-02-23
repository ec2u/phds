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
 * Agreement content retrieval hook.
 *
 * @module
 */

import { useEffect, useMemo, useState } from "react";
import type { Document } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Available actions for managing the agreement document.
 */
export interface AgreementActions {

	/**
	 * Dismisses errors and resets the agreement cache, triggering a re-fetch from the server.
	 */
	reset: () => void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches the agreement document and subscribes to reactive updates.
 *
 * @return a tuple of `[status, actions]` where status is the current agreement or activity/error state
 */
export function useAgreement(): [Status<null | Document>, AgreementActions] {

	const store = useStore();

	const [agreement, setAgreement] = useState<Status<null | Document>>(Activity.Submitting);


	useEffect(() => store.observeAgreement(setAgreement), [store]);


	// ;) stable ref prevents render loops in consumers that include actions in useEffect deps

	const actions = useMemo(() => ({

		reset(): void {
			store.resetAgreement();
		}

	}), [store]);


	return [agreement, actions];
}
