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
import { Document, Source } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { Activity, Status } from "../../shared/tasks";
import { useCache } from "./cache";
import { execute } from "./index";

export function usePolicy(source: Source, language: Language = "en"): Status<Document> {

	const { getCache, setCache }=useCache();

	const key=`policy:${source}-${language}`;
	const cached=getCache<Document>(key);

	const [policy, setPolicy]=useState<Status<Document>>(cached || Activity.Submitting);


	function update(policy: Status<Document>) {
		setPolicy(policy);
		setCache(key, policy);
	}

	useEffect(() => {

		if ( cached ) { setPolicy(cached); } else {

			execute<Document>(update, {

				type: "policy",

				source,
				language

			});

		}

	}, [cached, source, language]);

	return policy;

}
