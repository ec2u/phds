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
 * PDF attachment catalogue hook.
 *
 * Provides the catalogue of PDF attachments on the current Confluence page by querying the server-side resolver.
 *
 * @module
 */

import { useEffect, useState } from "react";
import { isObject } from "../../shared";
import type { Catalog } from "../../shared/items/documents";
import { getAttachments } from "../ports/resources";


/**
 * Returns the PDF attachments on the current Confluence page as a catalogue mapping source identifiers to titles.
 *
 * Queries the server-side {@link getAttachments} resolver on mount. Returns `undefined` while loading.
 *
 * @return the attachments catalogue, or `undefined` while loading
 */
export function useAttachments(): undefined | Catalog {

	const [attachments, setAttachments] = useState<undefined | Catalog>(undefined);

	useEffect(() => {

		getAttachments()
			.then(status => setAttachments(isObject(status) ? status : {}));

	}, []);

	return attachments;

}
