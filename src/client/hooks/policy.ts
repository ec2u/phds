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
import { Document, type Language, Source } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches a single policy document in the requested language and subscribes to reactive updates.
 *
 * Returns the current status of the document retrieval. Triggers extraction and translation via the backend
 * when no cached version is available.
 *
 * @param source The source attachment identifier
 * @param language The target language code (defaults to `"en"`)
 *
 * @returns The document status: the document, an activity state, or an error trace
 */
export function usePolicy(source: Source, language: Language = "en"): Status<Document> {

	const store = useStore();

	const [policy, setPolicy] = useState<Status<Document>>(Activity.Submitting);


	useEffect(() => store.observePolicy(source, language, setPolicy), [store, source, language]);


	return policy;

}
