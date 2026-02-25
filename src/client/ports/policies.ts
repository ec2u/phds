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
 * Forge bridge invocations for policy document operations.
 *
 * @module
 */

import { invoke } from "@forge/bridge";
import { Catalogue, Document, type Language, Source } from "../../shared/items/documents";
import type { Status } from "../../shared/store";


/**
 * Retrieves the catalogue of available policy documents for the current page.
 *
 * @param page The Confluence page identifier
 */
export function getPolicies(page: string): Promise<Status<Catalogue>> {
	return invoke("getPolicies", { page });
}


/**
 * Retrieves or triggers extraction of a single policy document.
 *
 * @param page The Confluence page identifier
 * @param source The policy source identifier
 * @param language The optional target language for translation
 */
export function getPolicy(page: string, source: Source, language?: Language): Promise<Status<Document>> {
	return invoke("getPolicy", { page, source, language });
}

/**
 * Clears cached policy content.
 *
 * @param page The Confluence page identifier
 * @param source The policy source identifier
 * @param language The optional target language
 */
export function clearPolicy(page: string, source: Source, language?: Language): Promise<Status<void>> {
	return invoke("clearPolicy", { page, source, language });
}
