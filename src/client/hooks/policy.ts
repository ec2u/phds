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
 * Single policy document retrieval hook.
 *
 * @module
 */

import { useEffect, useMemo, useState } from "react";
import { Document, type Language, Source } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Available actions for managing a single policy document.
 */
export interface PolicyActions {

	/**
	 * Clears the cached policy content and retriggers extraction from the source PDF.
	 */
	clear: () => Promise<void>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches a single policy document in the requested language and subscribes to reactive updates.
 *
 * Returns the current status of the document retrieval and available actions. Triggers extraction and translation via
 * the backend when no cached version is available. When `source` is `undefined`, status holds `undefined` and actions
 * are no-ops.
 *
 * @param source The source attachment identifier, or `undefined` to skip fetching
 * @param language The target language code (defaults to `"en"`)
 *
 * @returns A tuple of `[status, actions]`
 */
export function usePolicy(source: undefined | Source, language: Language = "en"): [Status<undefined | Document>, PolicyActions] {

	const store = useStore();

	const [policy, setPolicy] = useState<Status<undefined | Document>>(source ? Activity.Submitting : undefined);


	useEffect(() => {

		if ( source ) {

			return store.observePolicy(source, language, setPolicy);

		} else {

			setPolicy(undefined);

			return undefined;

		}

	}, [store, source, language]);


	// ;) stable ref prevents render loops in consumers that include actions in useEffect deps

	const actions = useMemo(() => ({

		async clear(): Promise<void> {
			if ( source ) {
				await store.clearPolicy(source, language);
			}
		}

	}), [store, source, language]);

	return [policy, actions];

}
