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

import { useEffect, useState } from "react";
import { Activity, asTrace, isActivity, type Status } from "../../shared/index";
import { Document, Source } from "../../shared/items/documents";
import { Language } from "../../shared/items/languages";
import { getPolicy } from "../ports/resources";
import { useCache } from "./cache";
import { poll } from "./index";


/**
 * Cache key prefix for individual policy documents.
 */
export const PolicyKeyPrefix = "policy:";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches and caches a single policy document in the requested language.
 *
 * Returns the current status of the document retrieval, loading from the in-memory cache on subsequent renders.
 * Triggers extraction and translation via the backend when no cached version is available.
 *
 * @param source The source attachment identifier
 * @param language The target language code (defaults to `"en"`)
 *
 * @returns A tuple of `[status, actions]` where status is the document, an activity state, or an error trace
 */
export function usePolicy(source: Source, language: Language = "en"): Status<Document> {

	const { getCache, setCache, deleteCache } = useCache();

	const key = `${PolicyKeyPrefix}${source}-${language}`;
	const cached = getCache<Document>(key);

	const [policy, setPolicy] = useState<Status<Document>>(cached ?? Activity.Submitting);


	useEffect(() => {

		if ( cached && !isActivity(cached) ) {

			setPolicy(cached);

			return () => {};

		} else {

			setPolicy(cached ?? Activity.Submitting);

			return poll(() => getPolicy(source, language).catch(asTrace).then(status => {

				setPolicy(status);

				if ( !isActivity(status) ) {
					setCache(key, status);
				}

				return status;

			}));

		}

	}, [cached, source, language]);

	return policy;

}
